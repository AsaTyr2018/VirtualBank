from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from .analytics import ClickHouseAnalyticsPipeline
from .matching import MatchingService
from .pricing import PricingService, TickerState
from .risk import RiskEngine, RiskRejection
from .schemas import (
    MarketNewsItem,
    MarketRegime,
    OrderRequest,
    OrderResponse,
    OrderStatus,
    PortfolioResponse,
    TickerSnapshot,
    TradeFill,
)
from .storage import StockmarketStorage


class StockMarketEngine:
    """Stock market orchestrator coordinating pricing, matching, and persistence."""

    def __init__(
        self,
        pricing: PricingService,
        storage: StockmarketStorage,
        risk: RiskEngine,
        analytics: ClickHouseAnalyticsPipeline,
        *,
        tick_interval: float = 1.0,
        news_interval: float = 45.0,
    ) -> None:
        self._pricing = pricing
        self._storage = storage
        self._risk = risk
        self._analytics = analytics
        self._tick_interval = tick_interval
        self._news_interval = news_interval
        self._matching = MatchingService(pricing, storage, risk, analytics)
        self._subscribers: Dict[asyncio.Queue, None] = {}
        self._lock = asyncio.Lock()
        self._tasks: List[asyncio.Task] = []
        self._ready = asyncio.Event()

    @classmethod
    async def bootstrap(
        cls,
        dataset_path: Path,
        *,
        storage: StockmarketStorage,
        risk: RiskEngine,
        analytics: ClickHouseAnalyticsPipeline,
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
        pricing = PricingService(tickers, regimes)
        engine = cls(
            pricing,
            storage,
            risk,
            analytics,
            tick_interval=tick_interval,
            news_interval=news_interval,
        )
        await engine._matching.warm_state()
        return engine

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

    async def _run_price_loop(self) -> None:
        try:
            while True:
                await asyncio.sleep(self._tick_interval)
                async with self._lock:
                    updates = self._pricing.tick()
                    regime = self._pricing.active_regime()
                if updates:
                    await self._storage.record_ticks(updates, regime.name)
                    await self._storage.cache_tickers(updates)
                    await self._analytics.publish_ticks(updates, regime)
                    payload = {
                        "type": "tick",
                        "regime": regime.model_dump(mode="json"),
                        "data": [item.model_dump(mode="json") for item in updates],
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
                    news = self._pricing.generate_news()
                if news:
                    await self._broadcast({"type": "news", "data": news.model_dump(mode="json")})
        except asyncio.CancelledError:
            return

    async def _run_regime_rotation(self) -> None:
        try:
            while True:
                await asyncio.sleep(300)
                async with self._lock:
                    regime = self._pricing.rotate_regime()
                await self._broadcast({"type": "regime", "data": regime.model_dump(mode="json")})
        except asyncio.CancelledError:
            return

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
                self._subscribers.pop(queue, None)

    async def tickers_snapshot(self) -> List[TickerSnapshot]:
        cached = await self._storage.load_cached_tickers()
        if cached:
            return cached
        async with self._lock:
            return self._pricing.snapshot()

    async def regimes(self) -> List[MarketRegime]:
        async with self._lock:
            return self._pricing.regimes()

    async def active_regime(self) -> MarketRegime:
        async with self._lock:
            return self._pricing.active_regime()

    async def recent_news(self) -> List[MarketNewsItem]:
        async with self._lock:
            return self._pricing.recent_news()

    async def place_order(self, payload: OrderRequest) -> OrderResponse:
        async with self._lock:
            response = await self._matching.place_order(payload)
        await self._broadcast(
            {
                "type": "order",
                "data": {
                    "order": response.order.model_dump(mode="json"),
                    "fills": [fill.model_dump(mode="json") for fill in response.fills],
                },
            }
        )
        return response

    async def order_status(self, order_id: str) -> Optional[OrderStatus]:
        return await self._matching.order_status(order_id)

    async def portfolio(self, user_id: str) -> PortfolioResponse:
        return await self._matching.portfolio(user_id)

    async def recent_trades(self, limit: int = 50) -> List[TradeFill]:
        return await self._matching.recent_trades(limit)


__all__ = ["StockMarketEngine", "RiskRejection"]
