# VirtualBank

VirtualBank is a playful online banking simulator for exploring modern money-management journeys with a fictional fun-currency. The focus is on safe experimentation—no real funds or external bank connectors are involved.

## Quickstart
1. Clone the repository and install dependencies for the middleware prototype: `cd app/middleware && npm install`.
2. Start the TypeScript Fastify server locally with `npm run dev` (listens on `http://localhost:8080`).
3. Alternatively, use Docker Compose to run the middleware stack: `docker compose -f middleware-compose.yml up --build`.
4. Launch the data store foundation locally with `docker compose -f apps/datastore/datastore-compose.yml up --build` when you want PostgreSQL, Redis, Kafka, ClickHouse, and MinIO services that mirror the reference architecture.
5. Explore the design blueprints in [`docs/designing/design.md`](docs/designing/design.md) to understand the planned player journeys and backend integrations.

## Highlights
- **Best-in-class UX** with responsive, accessible interfaces and gamified feedback loops.
- **Secure middleware gateway** powered by Fastify, JSON Schema validation, and idempotent transaction intake.
- **Modular architecture** spanning the frontend, middleware orchestration, stock market simulation, and resilient data stores.
- **Multi-user economy** where players manage personal accounts while Game Masters steward the world through privileged tooling.
- **Dynamic stock market sandbox** with AI-driven price regimes, sector indices, and fair-play trading mechanics.

## Project Structure
- `app/` – Runtime services under active development.
  - [`app/middleware/`](app/middleware/) – Fastify-based middleware core service with TypeScript source, Docker image, and Compose stack.
- `apps/` – Docker Compose stacks grouped by component for local infrastructure bring-up.
  - [`apps/datastore/datastore-compose.yml`](apps/datastore/datastore-compose.yml) – PostgreSQL, Redis, Kafka, ClickHouse, and MinIO sandbox aligned with the data store blueprint.
- `docs/` – Centralized documentation hub with licenses, datasets, and design workspaces.
  - [`docs/design/Middleware/middleware-core-service.md`](docs/design/Middleware/middleware-core-service.md) – Middleware architecture covering APIs, sagas, observability, and operations.
  - [`docs/design/Frontend/`](docs/design/Frontend/) – Conceptual HTML previews for login, dashboard, and administrator experiences.
  - [`docs/design/Stockmarket/stockmarket-simulation.md`](docs/design/Stockmarket/stockmarket-simulation.md) – Real-time market simulation blueprint spanning data generation, matching, risk, and analytics.
  - [`docs/design/Data Stores/data-store-architecture.md`](docs/design/Data%20Stores/data-store-architecture.md) – High-availability storage blueprint detailing database, cache, and event streaming integrations.
- [`docs/dataset/`](docs/dataset/) – Curated fake companies and portfolio seeds for market-simulation testing.
- [`middleware-compose.yml`](middleware-compose.yml) – Dedicated Docker Compose stack for the middleware core service.
- [`Changelog/Changelog.md`](Changelog/Changelog.md) – Running log of product and documentation updates.

## Data Store Stack
The `apps/datastore/datastore-compose.yml` stack mirrors the architecture defined in the data store blueprint. It provisions:

- **PostgreSQL primary and read replica** with synchronous replication defaults for ledger-grade consistency.
- **Redis cache** to accelerate hot lookups and pub/sub invalidation flows.
- **Kafka broker (KRaft mode)** to emit change-data-capture events for downstream consumers.
- **ClickHouse warehouse** for analytical workloads and compliance-grade reporting drills.
- **MinIO object storage** acting as the archive bucket for snapshots, exports, and recovery artifacts.

Bring the stack online with `docker compose -f apps/datastore/datastore-compose.yml up --build` and connect services using the shared `datastore-net` bridge network. Default credentials are scoped to local development and should be replaced in production-like scenarios.

## Middleware Core Service
- **Endpoints:**
  - Health probe at `/health/live`.
  - Transfer intake at `/api/v1/transfers` with status retrieval at `/api/v1/transfers/:id`.
  - Credit line intake at `/api/v1/credits/applications` for Game Master scoring workflows.
  - Market order intake at `/api/v1/market/orders` with limit-order validation.
- **Streaming:** WebSocket stream at `/api/v1/sessions/stream` that emits ready, heartbeat, and demo portfolio updates so the frontend can wire real-time dashboards.
- **Operational guarantees:** Built-in rate limiting, in-memory idempotency cache, structured logging hooks for transfers/credits/orders, and configurable environment via `MIDDLEWARE_*` variables (including session heartbeat tuning).
- **Local development:** Hot-reloading through `npm run dev`, TypeScript compilation with `npm run build`, and production-ready Docker image leveraging a distroless runtime.

## Datasets
The `docs/dataset` folder contains ready-to-use JSON files for stock-market prototyping:
- `fake_companies.json` lists roughly one hundred sector-diverse fictional firms with baseline pricing and volatility hints.
- `sample_portfolios.json` provides example allocations that feature different strategies and risk profiles.

These assets let designers and engineers populate market simulations instantly without crafting data from scratch.

## Contributing
We welcome thoughtful contributions that keep the experience modern, accessible, and fun. Please update the changelog and documentation with every meaningful change.
