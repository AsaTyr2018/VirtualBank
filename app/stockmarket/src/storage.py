from __future__ import annotations

import json
from datetime import datetime
from typing import List, Optional, Sequence

import asyncpg
from redis.asyncio import Redis

from .schemas import (
    OrderStatus,
    PortfolioHolding,
    PortfolioResponse,
    TickerSnapshot,
    TradeFill,
)


class StockmarketStorage:
    """Persists market state into PostgreSQL and Redis."""

    def __init__(self, postgres_dsn: Optional[str], redis_url: Optional[str]) -> None:
        self._postgres_dsn = postgres_dsn
        self._redis_url = redis_url
        self._pool: Optional[asyncpg.Pool] = None
        self._redis: Optional[Redis] = None

    async def connect(self) -> None:
        if self._postgres_dsn:
            self._pool = await asyncpg.create_pool(self._postgres_dsn, min_size=1, max_size=5)
            async with self._pool.acquire() as conn:
                await self._initialise_postgres(conn)
        if self._redis_url:
            self._redis = Redis.from_url(self._redis_url, encoding="utf-8", decode_responses=True)

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()
            self._pool = None
        if self._redis:
            await self._redis.close()
            self._redis = None

    @property
    def has_postgres(self) -> bool:
        return self._pool is not None

    @property
    def has_redis(self) -> bool:
        return self._redis is not None

    async def record_order_status(self, status: OrderStatus) -> None:
        if not self._pool:
            return
        query = """
            INSERT INTO market_orders (
                order_id, user_id, symbol, side, order_type, quantity,
                remaining_quantity, price, status, created_at, updated_at
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            ON CONFLICT (order_id)
            DO UPDATE SET
                remaining_quantity = EXCLUDED.remaining_quantity,
                status = EXCLUDED.status,
                price = EXCLUDED.price,
                updated_at = EXCLUDED.updated_at
        """
        async with self._pool.acquire() as conn:
            await conn.execute(
                query,
                status.order_id,
                status.user_id,
                status.symbol,
                status.side,
                status.order_type,
                status.quantity,
                status.remaining_quantity,
                status.price,
                status.status,
                status.created_at,
                status.updated_at,
            )

    async def record_trades(self, fills: Sequence[TradeFill]) -> None:
        if not self._pool or not fills:
            return
        query = """
            INSERT INTO market_trades (
                order_id,
                counter_order_id,
                symbol,
                price,
                quantity,
                executed_at
            )
            VALUES ($1,$2,$3,$4,$5,$6)
            ON CONFLICT (order_id, executed_at, symbol)
            DO NOTHING
        """
        rows = [
            (
                fill.order_id,
                fill.counter_order_id,
                fill.symbol,
                fill.price,
                fill.quantity,
                fill.executed_at,
            )
            for fill in fills
        ]
        async with self._pool.acquire() as conn:
            await conn.executemany(query, rows)

    async def record_portfolio_snapshot(self, snapshot: PortfolioResponse) -> None:
        if not self._pool:
            return
        query = """
            INSERT INTO market_portfolios (user_id, cash, holdings, last_updated)
            VALUES ($1,$2,$3,$4)
            ON CONFLICT (user_id)
            DO UPDATE SET
                cash = EXCLUDED.cash,
                holdings = EXCLUDED.holdings,
                last_updated = EXCLUDED.last_updated
        """
        holdings_payload = [holding.model_dump() for holding in snapshot.holdings]
        async with self._pool.acquire() as conn:
            await conn.execute(
                query,
                snapshot.user_id,
                snapshot.cash,
                json.dumps(holdings_payload),
                snapshot.last_updated,
            )

    async def record_ticks(self, ticks: Sequence[TickerSnapshot], regime_name: str) -> None:
        if not self._pool or not ticks:
            return
        query = """
            INSERT INTO market_ticks (
                symbol,
                price,
                open_price,
                high_price,
                low_price,
                volume,
                regime,
                recorded_at
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        """
        rows = [
            (
                tick.symbol,
                tick.price,
                tick.open_price,
                tick.high_price,
                tick.low_price,
                tick.volume,
                regime_name,
                tick.last_update,
            )
            for tick in ticks
        ]
        async with self._pool.acquire() as conn:
            await conn.executemany(query, rows)

    async def load_order(self, order_id: str) -> Optional[OrderStatus]:
        if not self._pool:
            return None
        query = """
            SELECT order_id, user_id, symbol, side, order_type, quantity,
                   remaining_quantity, price, status, created_at, updated_at
            FROM market_orders
            WHERE order_id = $1
        """
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(query, order_id)
        if not row:
            return None
        return OrderStatus(
            order_id=row["order_id"],
            user_id=row["user_id"],
            symbol=row["symbol"],
            side=row["side"],
            order_type=row["order_type"],
            quantity=row["quantity"],
            remaining_quantity=row["remaining_quantity"],
            price=row["price"],
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def load_open_orders(self) -> List[OrderStatus]:
        if not self._pool:
            return []
        query = """
            SELECT order_id, user_id, symbol, side, order_type, quantity,
                   remaining_quantity, price, status, created_at, updated_at
            FROM market_orders
            WHERE status != 'FILLED'
        """
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query)
        return [
            OrderStatus(
                order_id=row["order_id"],
                user_id=row["user_id"],
                symbol=row["symbol"],
                side=row["side"],
                order_type=row["order_type"],
                quantity=row["quantity"],
                remaining_quantity=row["remaining_quantity"],
                price=row["price"],
                status=row["status"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
            for row in rows
        ]

    async def load_portfolio(self, user_id: str) -> Optional[PortfolioResponse]:
        if not self._pool:
            return None
        query = """
            SELECT user_id, cash, holdings, last_updated
            FROM market_portfolios
            WHERE user_id = $1
        """
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(query, user_id)
        if not row:
            return None
        holdings = json.loads(row["holdings"] or "[]")
        return PortfolioResponse(
            user_id=row["user_id"],
            cash=float(row["cash"]),
            holdings=[PortfolioHolding(**item) for item in holdings],
            last_updated=row["last_updated"],
        )

    async def load_recent_trades(self, limit: int) -> List[TradeFill]:
        if not self._pool:
            return []
        query = """
            SELECT order_id, counter_order_id, symbol, price, quantity, executed_at
            FROM market_trades
            ORDER BY executed_at DESC
            LIMIT $1
        """
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, limit)
        return [
            TradeFill(
                order_id=row["order_id"],
                counter_order_id=row["counter_order_id"],
                symbol=row["symbol"],
                price=float(row["price"]),
                quantity=row["quantity"],
                executed_at=row["executed_at"],
            )
            for row in rows
        ]

    async def load_all_portfolios(self) -> List[PortfolioResponse]:
        if not self._pool:
            return []
        query = """
            SELECT user_id, cash, holdings, last_updated
            FROM market_portfolios
        """
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query)
        responses: List[PortfolioResponse] = []
        for row in rows:
            holdings = json.loads(row["holdings"] or "[]")
            responses.append(
                PortfolioResponse(
                    user_id=row["user_id"],
                    cash=float(row["cash"]),
                    holdings=[PortfolioHolding(**item) for item in holdings],
                    last_updated=row["last_updated"],
                )
            )
        return responses

    async def cache_tickers(self, snapshots: Sequence[TickerSnapshot]) -> None:
        if not self._redis or not snapshots:
            return
        mapping = {
            snapshot.symbol: json.dumps(snapshot.model_dump(mode="json"))
            for snapshot in snapshots
        }
        await self._redis.hset("market:tickers", mapping=mapping)

    async def load_cached_tickers(self) -> List[TickerSnapshot]:
        if not self._redis:
            return []
        data = await self._redis.hgetall("market:tickers")
        snapshots: List[TickerSnapshot] = []
        for value in data.values():
            payload = json.loads(value)
            payload["last_update"] = datetime.fromisoformat(payload["last_update"])
            snapshots.append(TickerSnapshot(**payload))
        return snapshots

    async def _initialise_postgres(self, conn: asyncpg.Connection) -> None:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS market_orders (
                order_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                side TEXT NOT NULL,
                order_type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                remaining_quantity INTEGER NOT NULL,
                price NUMERIC,
                status TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL
            )
            """
        )
        await conn.execute(
            """
            ALTER TABLE market_orders
            ADD COLUMN IF NOT EXISTS user_id TEXT
            """
        )
        await conn.execute(
            """
            UPDATE market_orders
            SET user_id = 'legacy-user'
            WHERE user_id IS NULL
            """
        )
        await conn.execute(
            """
            ALTER TABLE market_orders
            ALTER COLUMN user_id SET NOT NULL
            """
        )
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS market_trades (
                order_id TEXT NOT NULL,
                counter_order_id TEXT,
                symbol TEXT NOT NULL,
                price NUMERIC NOT NULL,
                quantity INTEGER NOT NULL,
                executed_at TIMESTAMPTZ NOT NULL,
                PRIMARY KEY (order_id, executed_at, symbol)
            )
            """
        )
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS market_portfolios (
                user_id TEXT PRIMARY KEY,
                cash NUMERIC NOT NULL,
                holdings JSONB NOT NULL,
                last_updated TIMESTAMPTZ NOT NULL
            )
            """
        )
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS market_ticks (
                symbol TEXT NOT NULL,
                price NUMERIC NOT NULL,
                open_price NUMERIC NOT NULL,
                high_price NUMERIC NOT NULL,
                low_price NUMERIC NOT NULL,
                volume INTEGER NOT NULL,
                regime TEXT NOT NULL,
                recorded_at TIMESTAMPTZ NOT NULL
            )
            """
        )
