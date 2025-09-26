from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class TickerSnapshot(BaseModel):
    symbol: str
    name: str
    sector: str
    price: float
    open_price: float
    high_price: float
    low_price: float
    volume: int
    last_update: datetime


class MarketRegime(BaseModel):
    name: str
    description: str
    drift: float
    volatility_multiplier: float
    started_at: datetime


class MarketNewsItem(BaseModel):
    symbol: str
    headline: str
    sentiment: Literal["positive", "neutral", "negative"]
    created_at: datetime


class OrderRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    symbol: str = Field(..., min_length=1)
    side: Literal["BUY", "SELL"]
    order_type: Literal["limit", "market"] = "limit"
    quantity: int = Field(..., gt=0)
    price: Optional[float] = Field(None, gt=0)

    @field_validator("price")
    @classmethod
    def _ensure_price_for_limit(cls, value: Optional[float], info):
        order_type = info.data.get("order_type", "limit")
        if order_type == "limit" and value is None:
            raise ValueError("price is required for limit orders")
        return value


class OrderStatus(BaseModel):
    order_id: str
    user_id: str
    symbol: str
    side: Literal["BUY", "SELL"]
    order_type: Literal["limit", "market"]
    quantity: int
    remaining_quantity: int
    price: Optional[float]
    status: Literal["ACCEPTED", "PARTIALLY_FILLED", "FILLED"]
    created_at: datetime
    updated_at: datetime


class TradeFill(BaseModel):
    order_id: str
    counter_order_id: Optional[str]
    symbol: str
    price: float
    quantity: int
    executed_at: datetime


class OrderResponse(BaseModel):
    order: OrderStatus
    fills: list[TradeFill]


class PortfolioHolding(BaseModel):
    symbol: str
    quantity: int
    market_value: float
    last_price: float


class PortfolioResponse(BaseModel):
    user_id: str
    cash: float
    holdings: list[PortfolioHolding]
    last_updated: datetime


class HealthStatus(BaseModel):
    status: Literal["ok", "starting"]
    details: dict[str, str] | None = None

