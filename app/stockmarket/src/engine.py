from __future__ import annotations

import asyncio
import json
import math
import random
import time
import uuid
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Deque, Dict, List, Optional, Tuple

from .schemas import (
    MarketNewsItem,
    MarketRegime,
    OrderRequest,
    OrderResponse,
    OrderStatus,
    PortfolioHolding,
    PortfolioResponse,
    TickerSnapshot,
    TradeFill,
)


@dataclass
class TickerState:
    symbol: str
    name: str
    sector: str
    base_price: float
    volatility: float
    price: float
    open_price: float
    high_price: float
    low_price: float
    volume: int
    last_update: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class StockMarketEngine:
    """In-memory stock market simulator implementing lightweight order books."""

    def __init__(
        self,
        tickers: Dict[str, TickerState],
        regimes: List[MarketRegime],
        tick_interval: float = 1.0,
        news_interval: float = 45.0,
    ) -> None:
        self._tickers = tickers
        self._regimes = regimes
        self._tick_interval = tick_interval
        self._news_interval = news_interval
        self._active_regime_index = 0
        self._subscribers: Dict[asyncio.Queue, None] = {}
        self._order_books: Dict[str, Dict[str, List[Tuple[float, float, str, datetime]]]] = {
            symbol: {"BUY": [], "SELL": []} for symbol in tickers
        }
        self._orders: Dict[str, OrderStatus] = {}
        self._trades: Deque[TradeFill] = deque(maxlen=1000)
        self._portfolios: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
        self._cash_balances: Dict[str, float] = defaultdict(float)
        self._news: Deque[MarketNewsItem] = deque(maxlen=50)
        self._lock = asyncio.Lock()
        self._tasks: List[asyncio.Task] = []
        self._ready = asyncio.Event()

    @classmethod
    def from_dataset(
        cls,
        dataset_path: Path,
        *,
        tick_interval: float = 1.0,
        news_interval: float = 45.0,
    ) -> "StockMarketEngine":
        if not dataset_path.exists():
            raise FileNotFoundError(f"Dataset not found at {dataset_path}")
        with dataset_path.open("r", encoding="utf-8") as handle:
            companies = json.load(handle)
        tickers: Dict[str, TickerState] = {}
        for company in companies:
            symbol = company["ticker"].upper()
            base_price = float(company.get("base_price", 25.0))
            volatility = float(company.get("volatility", 0.08))
            tickers[symbol] = TickerState(
                symbol=symbol,
                name=company.get("name", symbol),
                sector=company.get("sector", "General"),
                base_price=base_price,
                volatility=max(0.01, volatility),
                price=base_price,
                open_price=base_price,
                high_price=base_price,
                low_price=base_price,
                volume=0,
            )
        regimes = cls._default_regimes()
        return cls(tickers, regimes, tick_interval=tick_interval, news_interval=news_interval)

    @staticmethod
    def _default_regimes() -> List[MarketRegime]:
        now = datetime.now(timezone.utc)
        return [
            MarketRegime(
                name="Calm",
                description="Low volatility baseline session with gentle drift",
                drift=0.0006,
                volatility_multiplier=0.8,
                started_at=now,
            ),
            MarketRegime(
                name="Rally",
                description="Broad-based optimism lifts most sectors",
                drift=0.0015,
                volatility_multiplier=1.2,
                started_at=now,
            ),
            MarketRegime(
                name="Turbulence",
                description="Event-driven chop with sharp reversals",
                drift=-0.0002,
                volatility_multiplier=1.8,
                started_at=now,
            ),
            MarketRegime(
                name="Correction",
                description="Risk-off rotation compressing valuations",
                drift=-0.001,
                volatility_multiplier=1.4,
                started_at=now,
            ),
        ]

    async def start(self) -> None:
        if self._tasks:
            return
        self._tasks = [
            asyncio.create_task(self._run_price_loop(), name="stockmarket-price-loop"),
            asyncio.create_task(self._run_news_loop(), name="stockmarket-news-loop"),
            asyncio.create_task(self._run_regime_rotation(), name="stockmarket-regime-loop"),
        ]
        self._ready.set()

    async def stop(self) -> None:
        for task in self._tasks:
            task.cancel()
        for task in self._tasks:
            try:
                await task
            except asyncio.CancelledError:
                pass
        self._tasks.clear()
        self._ready.clear()

    @property
    def is_ready(self) -> bool:
        return self._ready.is_set()

    def _active_regime(self) -> MarketRegime:
        return self._regimes[self._active_regime_index]

    async def _run_price_loop(self) -> None:
        try:
            while True:
                await asyncio.sleep(self._tick_interval)
                async with self._lock:
                    regime = self._active_regime()
                    updates: List[TickerSnapshot] = []
                    timestamp = datetime.now(timezone.utc)
                    for state in self._tickers.values():
                        delta = self._sample_return(state, regime)
                        new_price = max(0.5, state.price * math.exp(delta))
                        state.price = new_price
                        state.high_price = max(state.high_price, new_price)
                        state.low_price = min(state.low_price, new_price)
                        state.last_update = timestamp
                        snapshot = TickerSnapshot(
                            symbol=state.symbol,
                            name=state.name,
                            sector=state.sector,
                            price=round(state.price, 2),
                            open_price=round(state.open_price, 2),
                            high_price=round(state.high_price, 2),
                            low_price=round(state.low_price, 2),
                            volume=state.volume,
                            last_update=timestamp,
                        )
                        updates.append(snapshot)
                if updates:
                    payload = {
                        "type": "tick",
                        "regime": self._active_regime().model_dump(),
                        "data": [item.model_dump() for item in updates],
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                    await self._broadcast(payload)
        except asyncio.CancelledError:
            return

    async def _run_news_loop(self) -> None:
        try:
            while True:
                await asyncio.sleep(self._news_interval)
                async with self._lock:
                    news = self._generate_news_item()
                    if news:
                        self._news.appendleft(news)
                if news:
                    await self._broadcast({"type": "news", "data": news.model_dump()})
        except asyncio.CancelledError:
            return

    async def _run_regime_rotation(self) -> None:
        try:
            while True:
                await asyncio.sleep(300)
                async with self._lock:
                    self._active_regime_index = (self._active_regime_index + 1) % len(self._regimes)
                    now = datetime.now(timezone.utc)
                    self._regimes[self._active_regime_index].started_at = now
                    regime = self._active_regime()
                await self._broadcast({"type": "regime", "data": regime.model_dump()})
        except asyncio.CancelledError:
            return

    def _sample_return(self, state: TickerState, regime: MarketRegime) -> float:
        base_drift = regime.drift
        noise = random.gauss(0, state.volatility * regime.volatility_multiplier)
        sector_bias = self._sector_bias(state.sector)
        return base_drift + noise + sector_bias

    def _sector_bias(self, sector: str) -> float:
        seed_value = hash((sector, self._active_regime_index, int(time.time() // 3600))) & 0xFFFFFFFF
        rng = random.Random(seed_value)
        return rng.uniform(-0.0005, 0.0005)

    def register(self, queue: asyncio.Queue) -> None:
        self._subscribers[queue] = None

    def unregister(self, queue: asyncio.Queue) -> None:
        self._subscribers.pop(queue, None)

    async def _broadcast(self, payload: Dict) -> None:
        if not self._subscribers:
            return
        for queue in list(self._subscribers.keys()):
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                # Drop the subscriber if it cannot keep up.
                self._subscribers.pop(queue, None)

    async def tickers_snapshot(self) -> List[TickerSnapshot]:
        async with self._lock:
            return [
                TickerSnapshot(
                    symbol=state.symbol,
                    name=state.name,
                    sector=state.sector,
                    price=round(state.price, 2),
                    open_price=round(state.open_price, 2),
                    high_price=round(state.high_price, 2),
                    low_price=round(state.low_price, 2),
                    volume=state.volume,
                    last_update=state.last_update,
                )
                for state in self._tickers.values()
            ]

    async def regimes(self) -> List[MarketRegime]:
        async with self._lock:
            return list(self._regimes)

    async def active_regime(self) -> MarketRegime:
        async with self._lock:
            return self._active_regime()

    async def recent_news(self) -> List[MarketNewsItem]:
        async with self._lock:
            return list(self._news)

    async def place_order(self, payload: OrderRequest) -> OrderResponse:
        async with self._lock:
            if payload.symbol not in self._tickers:
                raise ValueError(f"Unknown symbol {payload.symbol}")
            order_id = str(uuid.uuid4())
            status = OrderStatus(
                order_id=order_id,
                user_id=payload.user_id,
                symbol=payload.symbol,
                side=payload.side,
                order_type=payload.order_type,
                quantity=payload.quantity,
                remaining_quantity=payload.quantity,
                price=payload.price,
                status="ACCEPTED",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            self._orders[order_id] = status
            fills = self._match_order(status)
            response = OrderResponse(order=status, fills=fills)
        await self._broadcast(
            {
                "type": "order",
                "data": {
                    "order": status.model_dump(),
                    "fills": [fill.model_dump() for fill in response.fills],
                },
            }
        )
        return response

    def _match_order(self, order: OrderStatus) -> List[TradeFill]:
        book = self._order_books[order.symbol]
        counter_side = "SELL" if order.side == "BUY" else "BUY"
        counter_book = book[counter_side]
        fills: List[TradeFill] = []
        trade_price: Optional[float] = None
        now = datetime.now(timezone.utc)

        def price_is_crossable(candidate_price: float) -> bool:
            if order.order_type == "market":
                return True
            if order.side == "BUY":
                return candidate_price <= float(order.price)
            return candidate_price >= float(order.price)

        while counter_book and order.remaining_quantity > 0:
            counter_book.sort(key=lambda entry: (entry[0], entry[3]))
            if order.side == "BUY":
                candidate_price, quantity, counter_order_id, created = counter_book[0]
            else:
                candidate_price, quantity, counter_order_id, created = counter_book[-1]
            if not price_is_crossable(candidate_price):
                break
            trade_qty = min(order.remaining_quantity, quantity)
            trade_price = candidate_price
            order.remaining_quantity -= trade_qty
            quantity -= trade_qty
            counter_status = self._orders[counter_order_id]
            counter_status.remaining_quantity -= trade_qty
            counter_status.updated_at = now
            if counter_status.remaining_quantity == 0:
                counter_status.status = "FILLED"
            else:
                counter_status.status = "PARTIALLY_FILLED"
            fill = TradeFill(
                order_id=order.order_id,
                counter_order_id=counter_order_id,
                symbol=order.symbol,
                price=round(trade_price, 2),
                quantity=trade_qty,
                executed_at=now,
            )
            self._trades.append(fill)
            fills.append(fill)
            self._apply_fill(order.user_id, order.symbol, order.side, trade_qty, trade_price)
            self._apply_fill(counter_status.user_id, counter_status.symbol, counter_status.side, trade_qty, trade_price)
            if quantity == 0:
                if order.side == "BUY":
                    counter_book.pop(0)
                else:
                    counter_book.pop()
            else:
                if order.side == "BUY":
                    counter_book[0] = (candidate_price, quantity, counter_order_id, created)
                else:
                    counter_book[-1] = (candidate_price, quantity, counter_order_id, created)

        if order.remaining_quantity == 0:
            order.status = "FILLED"
        elif order.remaining_quantity < order.quantity:
            order.status = "PARTIALLY_FILLED"
        else:
            order.status = "ACCEPTED"
            order.updated_at = now
            book[order.side].append(
                (
                    float(order.price) if order.price is not None else self._tickers[order.symbol].price,
                    order.remaining_quantity,
                    order.order_id,
                    now,
                )
            )
        if trade_price is not None:
            ticker = self._tickers[order.symbol]
            ticker.price = trade_price
            ticker.high_price = max(ticker.high_price, trade_price)
            ticker.low_price = min(ticker.low_price, trade_price)
            ticker.volume += sum(fill.quantity for fill in fills)
            ticker.last_update = now
        order.updated_at = now
        return fills

    def _apply_fill(self, user_id: str, symbol: str, side: str, quantity: int, price: float) -> None:
        multiplier = 1 if side == "BUY" else -1
        position = self._portfolios[user_id][symbol]
        self._portfolios[user_id][symbol] = position + multiplier * quantity
        cash_delta = -price * quantity if side == "BUY" else price * quantity
        self._cash_balances[user_id] += cash_delta

    async def order_status(self, order_id: str) -> Optional[OrderStatus]:
        async with self._lock:
            return self._orders.get(order_id)

    async def portfolio(self, user_id: str) -> PortfolioResponse:
        async with self._lock:
            positions = [
                PortfolioHolding(
                    symbol=symbol,
                    quantity=int(quantity),
                    market_value=round(quantity * self._tickers[symbol].price, 2),
                    last_price=round(self._tickers[symbol].price, 2),
                )
                for symbol, quantity in self._portfolios[user_id].items()
                if abs(quantity) > 0
            ]
            return PortfolioResponse(
                user_id=user_id,
                cash=round(self._cash_balances[user_id], 2),
                holdings=positions,
                last_updated=datetime.now(timezone.utc),
            )

    def _generate_news_item(self) -> Optional[MarketNewsItem]:
        if not self._tickers:
            return None
        symbol = random.choice(list(self._tickers.keys()))
        ticker = self._tickers[symbol]
        sentiment = random.choice(["positive", "neutral", "negative"])
        headline = {
            "positive": f"{ticker.name} surges on upbeat community momentum",
            "neutral": f"{ticker.name} reports steady progress in quarterly briefing",
            "negative": f"{ticker.name} faces short-term headwinds amid sector rotation",
        }[sentiment]
        return MarketNewsItem(
            symbol=symbol,
            headline=headline,
            sentiment=sentiment,
            created_at=datetime.now(timezone.utc),
        )

    async def recent_trades(self, limit: int = 50) -> List[TradeFill]:
        async with self._lock:
            return list(list(self._trades)[-limit:])

