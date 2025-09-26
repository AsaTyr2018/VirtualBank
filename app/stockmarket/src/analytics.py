from __future__ import annotations

import asyncio
import json
from typing import Optional, Sequence

import clickhouse_connect

from .schemas import MarketRegime, PortfolioResponse, TickerSnapshot


class ClickHouseAnalyticsPipeline:
    """Streams tick and portfolio data to ClickHouse for analytics."""

    def __init__(
        self,
        *,
        host: Optional[str],
        port: int = 8123,
        username: Optional[str] = None,
        password: Optional[str] = None,
        database: str = "default",
        enabled: bool = True,
    ) -> None:
        self._host = host
        self._port = port
        self._username = username
        self._password = password
        self._database = database
        self._enabled = enabled and bool(host)
        self._client: Optional[clickhouse_connect.driver.client.Client] = None

    async def connect(self) -> None:
        if not self._enabled:
            return
        try:
            self._client = await asyncio.to_thread(
                clickhouse_connect.get_client,
                host=self._host,
                port=self._port,
                username=self._username,
                password=self._password,
                database=self._database,
            )
            await asyncio.to_thread(self._ensure_tables)
        except Exception:
            self._client = None

    async def close(self) -> None:
        if self._client:
            await asyncio.to_thread(self._client.close)
            self._client = None

    async def publish_ticks(self, ticks: Sequence[TickerSnapshot], regime: MarketRegime) -> None:
        if not self._client or not ticks:
            return
        rows = [
            (
                tick.symbol,
                tick.price,
                tick.open_price,
                tick.high_price,
                tick.low_price,
                tick.volume,
                regime.name,
                tick.last_update,
            )
            for tick in ticks
        ]
        try:
            await asyncio.to_thread(
                self._client.insert,
                "market_ticks",
                rows,
                column_names=[
                    "symbol",
                    "price",
                    "open_price",
                    "high_price",
                    "low_price",
                    "volume",
                    "regime",
                    "recorded_at",
                ],
            )
        except Exception:
            return

    async def publish_portfolio_snapshot(self, snapshot: PortfolioResponse) -> None:
        if not self._client:
            return
        holdings_json = json.dumps(snapshot.model_dump(mode="json")["holdings"])
        try:
            await asyncio.to_thread(
                self._client.insert,
                "portfolio_snapshots",
                [
                    (
                        snapshot.user_id,
                        snapshot.cash,
                        holdings_json,
                        snapshot.last_updated,
                    )
                ],
                column_names=["user_id", "cash", "holdings", "last_updated"],
            )
        except Exception:
            return

    def _ensure_tables(self) -> None:
        assert self._client is not None
        self._client.command(
            """
            CREATE TABLE IF NOT EXISTS market_ticks (
                symbol String,
                price Float64,
                open_price Float64,
                high_price Float64,
                low_price Float64,
                volume UInt64,
                regime String,
                recorded_at DateTime64(3, 'UTC')
            )
            ENGINE = MergeTree()
            ORDER BY (symbol, recorded_at)
            """
        )
        self._client.command(
            """
            CREATE TABLE IF NOT EXISTS portfolio_snapshots (
                user_id String,
                cash Float64,
                holdings JSON,
                last_updated DateTime64(3, 'UTC')
            )
            ENGINE = ReplacingMergeTree(last_updated)
            ORDER BY (user_id, last_updated)
            """
        )


__all__ = ["ClickHouseAnalyticsPipeline"]
