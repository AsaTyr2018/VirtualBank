from __future__ import annotations
from __future__ import annotations

import uuid
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Deque, Dict, List, Optional, Set, Tuple

from .analytics import ClickHouseAnalyticsPipeline
from .pricing import PricingService
from .risk import RiskEngine
from .schemas import (
    OrderRequest,
    OrderResponse,
    OrderStatus,
    PortfolioHolding,
    PortfolioResponse,
    TradeFill,
)
from .storage import StockmarketStorage


class MatchingService:
    """Handles order matching, portfolio state, and persistence."""

    def __init__(
        self,
        pricing: PricingService,
        storage: StockmarketStorage,
        risk: RiskEngine,
        analytics: ClickHouseAnalyticsPipeline,
    ) -> None:
        self._pricing = pricing
        self._storage = storage
        self._risk = risk
        self._analytics = analytics
        self._order_books: Dict[str, Dict[str, List[Tuple[float, float, str, datetime]]]] = {
            symbol: {"BUY": [], "SELL": []} for symbol in pricing.symbols()
        }
        self._orders: Dict[str, OrderStatus] = {}
        self._trades: Deque[TradeFill] = deque(maxlen=1000)
        self._portfolios: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
        self._cash_balances: Dict[str, float] = defaultdict(float)

    async def warm_state(self) -> None:
        open_orders = await self._storage.load_open_orders()
        for order in open_orders:
            self._orders[order.order_id] = order
            if order.remaining_quantity > 0:
                price = order.price if order.price is not None else self._pricing.price_for(order.symbol)
                self._order_books[order.symbol][order.side].append(
                    (float(price), order.remaining_quantity, order.order_id, order.created_at)
                )
        portfolios = await self._storage.load_all_portfolios()
        for portfolio in portfolios:
            self._cash_balances[portfolio.user_id] = portfolio.cash
            for holding in portfolio.holdings:
                self._portfolios[portfolio.user_id][holding.symbol] = holding.quantity
        trades = await self._storage.load_recent_trades(limit=1000)
        for trade in sorted(trades, key=lambda item: item.executed_at):
            self._trades.append(trade)

    async def place_order(self, request: OrderRequest) -> OrderResponse:
        symbol = request.symbol.upper()
        if symbol not in self._order_books:
            raise ValueError(f"Unknown symbol {symbol}")
        normalised_request = request.model_copy(update={"symbol": symbol})
        notional_price = (
            normalised_request.price
            if normalised_request.price is not None
            else self._pricing.price_for(symbol)
        )
        notional = float(notional_price) * normalised_request.quantity
        await self._risk.ensure_credit_limit(normalised_request, notional)
        order_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        status = OrderStatus(
            order_id=order_id,
            user_id=normalised_request.user_id,
            symbol=symbol,
            side=normalised_request.side,
            order_type=normalised_request.order_type,
            quantity=normalised_request.quantity,
            remaining_quantity=normalised_request.quantity,
            price=normalised_request.price,
            status="ACCEPTED",
            created_at=now,
            updated_at=now,
        )
        self._orders[order_id] = status
        fills, touched_users = self._match(status)
        status.updated_at = datetime.now(timezone.utc)
        await self._storage.record_order_status(status)
        for counter_id in {fill.counter_order_id for fill in fills if fill.counter_order_id}:
            if not counter_id:
                continue
            counter_status = self._orders.get(counter_id)
            if counter_status:
                await self._storage.record_order_status(counter_status)
        if fills:
            await self._storage.record_trades(fills)
            await self._risk.publish_fills(status, fills)
        await self._risk.publish_order(status, notional)
        await self._persist_portfolios(touched_users)
        return OrderResponse(order=status, fills=fills)

    async def order_status(self, order_id: str) -> Optional[OrderStatus]:
        if order_id in self._orders:
            return self._orders[order_id]
        loaded = await self._storage.load_order(order_id)
        if loaded:
            self._orders[order_id] = loaded
        return loaded

    async def portfolio(self, user_id: str) -> PortfolioResponse:
        if user_id not in self._portfolios:
            stored = await self._storage.load_portfolio(user_id)
            if stored:
                self._cash_balances[user_id] = stored.cash
                for holding in stored.holdings:
                    self._portfolios[user_id][holding.symbol] = holding.quantity
                return stored
        holdings = [
            PortfolioHolding(
                symbol=symbol,
                quantity=int(quantity),
                market_value=round(quantity * self._pricing.price_for(symbol), 2),
                last_price=round(self._pricing.price_for(symbol), 2),
            )
            for symbol, quantity in self._portfolios[user_id].items()
            if abs(quantity) > 0
        ]
        snapshot = PortfolioResponse(
            user_id=user_id,
            cash=round(self._cash_balances[user_id], 2),
            holdings=holdings,
            last_updated=datetime.now(timezone.utc),
        )
        await self._storage.record_portfolio_snapshot(snapshot)
        await self._analytics.publish_portfolio_snapshot(snapshot)
        await self._risk.publish_portfolio(snapshot)
        return snapshot

    async def recent_trades(self, limit: int) -> List[TradeFill]:
        if limit <= len(self._trades):
            return list(list(self._trades)[-limit:])
        trades = await self._storage.load_recent_trades(limit)
        if trades:
            for trade in sorted(trades, key=lambda item: item.executed_at):
                self._trades.append(trade)
        return trades or list(self._trades)[-limit:]

    async def _persist_portfolios(self, users: Set[str]) -> None:
        if not users:
            return
        for user_id in users:
            holdings = [
                PortfolioHolding(
                    symbol=symbol,
                    quantity=int(quantity),
                    market_value=round(quantity * self._pricing.price_for(symbol), 2),
                    last_price=round(self._pricing.price_for(symbol), 2),
                )
                for symbol, quantity in self._portfolios[user_id].items()
                if abs(quantity) > 0
            ]
            snapshot = PortfolioResponse(
                user_id=user_id,
                cash=round(self._cash_balances[user_id], 2),
                holdings=holdings,
                last_updated=datetime.now(timezone.utc),
            )
            await self._storage.record_portfolio_snapshot(snapshot)
            await self._analytics.publish_portfolio_snapshot(snapshot)
            await self._risk.publish_portfolio(snapshot)

    def _match(self, order: OrderStatus) -> Tuple[List[TradeFill], Set[str]]:
        book = self._order_books[order.symbol]
        counter_side = "SELL" if order.side == "BUY" else "BUY"
        counter_book = book[counter_side]
        fills: List[TradeFill] = []
        touched_users: Set[str] = {order.user_id}
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
                price=round(candidate_price, 2),
                quantity=trade_qty,
                executed_at=now,
            )
            self._trades.append(fill)
            self._pricing.record_trade(order.symbol, trade_qty, candidate_price)
            fills.append(fill)
            touched_users.add(counter_status.user_id)
            self._apply_fill(order.user_id, order.symbol, order.side, trade_qty, candidate_price)
            self._apply_fill(counter_status.user_id, counter_status.symbol, counter_status.side, trade_qty, candidate_price)
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
            book[order.side].append(
                (
                    float(order.price)
                    if order.price is not None
                    else self._pricing.price_for(order.symbol),
                    order.remaining_quantity,
                    order.order_id,
                    now,
                )
            )
        order.updated_at = now
        return fills, touched_users

    def _apply_fill(self, user_id: str, symbol: str, side: str, quantity: int, price: float) -> None:
        multiplier = 1 if side == "BUY" else -1
        position = self._portfolios[user_id][symbol]
        self._portfolios[user_id][symbol] = position + multiplier * quantity
        cash_delta = -price * quantity if side == "BUY" else price * quantity
        self._cash_balances[user_id] += cash_delta


__all__ = ["MatchingService"]
