from __future__ import annotations

import math
import random
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Dict, Iterable, List, Optional

from .schemas import MarketNewsItem, MarketRegime, TickerSnapshot


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


class PricingService:
    """Encapsulates pricing, regime rotation, and market news generation."""

    def __init__(self, tickers: Dict[str, TickerState], regimes: List[MarketRegime]) -> None:
        if not tickers:
            raise ValueError("PricingService requires at least one ticker")
        if not regimes:
            raise ValueError("PricingService requires at least one regime")
        self._tickers = tickers
        self._regimes = regimes
        self._active_regime_index = 0
        self._news: Deque[MarketNewsItem] = deque(maxlen=50)

    def tick(self) -> List[TickerSnapshot]:
        regime = self.active_regime()
        updates: List[TickerSnapshot] = []
        timestamp = datetime.now(timezone.utc)
        for state in self._tickers.values():
            delta = self._sample_return(state, regime)
            new_price = max(0.5, state.price * math.exp(delta))
            state.price = new_price
            state.high_price = max(state.high_price, new_price)
            state.low_price = min(state.low_price, new_price)
            state.last_update = timestamp
            updates.append(self._snapshot_from_state(state))
        return updates

    def record_trade(self, symbol: str, quantity: int, price: float) -> None:
        state = self._tickers.get(symbol)
        if not state:
            return
        state.price = price
        state.high_price = max(state.high_price, price)
        state.low_price = min(state.low_price, price)
        state.volume += quantity
        state.last_update = datetime.now(timezone.utc)

    def snapshot(self) -> List[TickerSnapshot]:
        return [self._snapshot_from_state(state) for state in self._tickers.values()]

    def active_regime(self) -> MarketRegime:
        return self._regimes[self._active_regime_index]

    def regimes(self) -> List[MarketRegime]:
        return list(self._regimes)

    def rotate_regime(self) -> MarketRegime:
        self._active_regime_index = (self._active_regime_index + 1) % len(self._regimes)
        regime = self._regimes[self._active_regime_index]
        regime.started_at = datetime.now(timezone.utc)
        return regime

    def generate_news(self) -> Optional[MarketNewsItem]:
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
        item = MarketNewsItem(
            symbol=symbol,
            headline=headline,
            sentiment=sentiment,
            created_at=datetime.now(timezone.utc),
        )
        self._news.appendleft(item)
        return item

    def recent_news(self) -> List[MarketNewsItem]:
        return list(self._news)

    def price_for(self, symbol: str) -> float:
        state = self._tickers[symbol]
        return state.price

    def symbols(self) -> Iterable[str]:
        return self._tickers.keys()

    def _sample_return(self, state: TickerState, regime: MarketRegime) -> float:
        base_drift = regime.drift
        noise = random.gauss(0, state.volatility * regime.volatility_multiplier)
        sector_bias = self._sector_bias(state.sector)
        return base_drift + noise + sector_bias

    def _sector_bias(self, sector: str) -> float:
        seed_value = hash((sector, self._active_regime_index, int(time.time() // 3600))) & 0xFFFFFFFF
        rng = random.Random(seed_value)
        return rng.uniform(-0.0005, 0.0005)

    def _snapshot_from_state(self, state: TickerState) -> TickerSnapshot:
        return TickerSnapshot(
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
