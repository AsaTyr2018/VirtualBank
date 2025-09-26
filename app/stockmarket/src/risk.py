from __future__ import annotations

from typing import Optional, Sequence

import httpx

from .schemas import OrderRequest, OrderStatus, PortfolioResponse, TradeFill


class RiskRejection(Exception):
    """Raised when an order breaches credit limits."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class RiskEngine:
    """Coordinates credit checks and risk event emission to the middleware."""

    def __init__(
        self,
        middleware_base_url: Optional[str],
        http_client: httpx.AsyncClient,
        *,
        credit_endpoint: str = "internal/risk/credit",
        events_endpoint: str = "internal/risk/events",
    ) -> None:
        self._base_url = middleware_base_url.rstrip("/") if middleware_base_url else None
        self._http = http_client
        self._credit_endpoint = credit_endpoint.strip("/")
        self._events_endpoint = events_endpoint.strip("/")

    async def ensure_credit_limit(self, order: OrderRequest, notional: float) -> None:
        if not self._base_url:
            return
        url = f"{self._base_url}/{self._credit_endpoint}/{order.user_id}"
        try:
            response = await self._http.get(url, params={"symbol": order.symbol, "notional": notional})
            response.raise_for_status()
            payload = response.json()
        except httpx.HTTPError as exc:
            raise RiskRejection(f"Risk service unavailable: {exc}") from exc
        available = float(payload.get("available", 0.0))
        if available < notional:
            await self.publish_event(
                "risk.limit_breach",
                {
                    "user_id": order.user_id,
                    "symbol": order.symbol,
                    "requested_notional": round(notional, 2),
                    "available_notional": round(available, 2),
                },
            )
            raise RiskRejection(
                f"Insufficient credit for order notional {notional:.2f}. Available: {available:.2f}"
            )

    async def publish_order(self, status: OrderStatus, notional: float) -> None:
        await self.publish_event(
            "risk.order.accepted",
            {"order": status.model_dump(mode="json"), "notional": round(notional, 2)},
        )

    async def publish_fills(self, status: OrderStatus, fills: Sequence[TradeFill]) -> None:
        await self.publish_event(
            "risk.order.filled",
            {
                "order": status.model_dump(mode="json"),
                "fills": [fill.model_dump(mode="json") for fill in fills],
            },
        )

    async def publish_portfolio(self, snapshot: PortfolioResponse) -> None:
        await self.publish_event(
            "risk.portfolio.snapshot",
            snapshot.model_dump(mode="json"),
        )

    async def publish_event(self, event_type: str, payload: dict) -> None:
        if not self._base_url:
            return
        url = f"{self._base_url}/{self._events_endpoint}"
        body = {"type": event_type, "payload": payload}
        try:
            response = await self._http.post(url, json=body)
            response.raise_for_status()
        except httpx.HTTPError:
            # Do not let downstream connectivity prevent trading operations.
            return


__all__ = ["RiskEngine", "RiskRejection"]
