from __future__ import annotations

import asyncio
import os
from pathlib import Path
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .engine import StockMarketEngine
from .schemas import (
    HealthStatus,
    MarketNewsItem,
    MarketRegime,
    OrderRequest,
    OrderResponse,
    OrderStatus,
    PortfolioResponse,
    TickerSnapshot,
    TradeFill,
)

app = FastAPI(title="VirtualBank Stockmarket Simulator", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_engine: StockMarketEngine | None = None


TICK_INTERVAL = float(os.environ.get("STOCKMARKET_TICK_INTERVAL", "1.0"))
NEWS_INTERVAL = float(os.environ.get("STOCKMARKET_NEWS_INTERVAL", "45"))


def dataset_path() -> Path:
    base = os.environ.get("STOCKMARKET_DATASET_PATH", "/app/data/dataset/fake_companies.json")
    return Path(base)


async def get_engine() -> StockMarketEngine:
    if _engine is None:
        raise RuntimeError("Stock market engine not initialised")
    return _engine


@app.on_event("startup")
async def _startup() -> None:
    global _engine
    data = dataset_path()
    if not data.exists():
        raise RuntimeError(f"Dataset not found at {data}")
    engine = StockMarketEngine.from_dataset(
        data,
        tick_interval=TICK_INTERVAL,
        news_interval=NEWS_INTERVAL,
    )
    await engine.start()
    _engine = engine


@app.on_event("shutdown")
async def _shutdown() -> None:
    if _engine is not None:
        await _engine.stop()


@app.get("/health/live", response_model=HealthStatus)
async def live() -> HealthStatus:
    return HealthStatus(status="ok")


@app.get("/health/ready", response_model=HealthStatus)
async def ready(engine: StockMarketEngine = Depends(get_engine)) -> HealthStatus:
    status = "ok" if engine.is_ready else "starting"
    return HealthStatus(status=status)


@app.get("/api/v1/markets/tickers", response_model=list[TickerSnapshot])
async def tickers(engine: StockMarketEngine = Depends(get_engine)) -> list[TickerSnapshot]:
    return await engine.tickers_snapshot()


@app.get("/api/v1/markets/regimes", response_model=list[MarketRegime])
async def regimes(engine: StockMarketEngine = Depends(get_engine)) -> list[MarketRegime]:
    return await engine.regimes()


@app.get("/api/v1/markets/news", response_model=list[MarketNewsItem])
async def news(engine: StockMarketEngine = Depends(get_engine)) -> list[MarketNewsItem]:
    return await engine.recent_news()


@app.post("/api/v1/orders", response_model=OrderResponse)
async def place_order(
    request: OrderRequest,
    engine: StockMarketEngine = Depends(get_engine),
) -> OrderResponse:
    try:
        return await engine.place_order(request)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/v1/orders/{order_id}", response_model=OrderStatus)
async def get_order(order_id: str, engine: StockMarketEngine = Depends(get_engine)) -> OrderStatus:
    status = await engine.order_status(order_id)
    if not status:
        raise HTTPException(status_code=404, detail="Order not found")
    return status


@app.get("/api/v1/portfolios/{user_id}", response_model=PortfolioResponse)
async def portfolio(user_id: str, engine: StockMarketEngine = Depends(get_engine)) -> PortfolioResponse:
    return await engine.portfolio(user_id)


@app.get("/api/v1/trades", response_model=list[TradeFill])
async def trades(limit: int = 50, engine: StockMarketEngine = Depends(get_engine)) -> list[TradeFill]:
    return await engine.recent_trades(limit=limit)


@asynccontextmanager
async def _subscription_queue(engine: StockMarketEngine) -> AsyncGenerator[asyncio.Queue, None]:
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    engine.register(queue)
    try:
        yield queue
    finally:
        engine.unregister(queue)


@app.websocket("/ws/ticks")
async def ws_ticks(websocket: WebSocket, engine: StockMarketEngine = Depends(get_engine)) -> None:
    await websocket.accept()
    async with _subscription_queue(engine) as queue:
        snapshot = [item.model_dump() for item in await engine.tickers_snapshot()]
        await websocket.send_json({"type": "snapshot", "data": snapshot})
        try:
            while True:
                payload = await queue.get()
                await websocket.send_json(payload)
        except WebSocketDisconnect:
            return

