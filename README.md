# VirtualBank

VirtualBank is a playful online banking simulator for exploring modern money-management journeys with a fictional fun-currency. The focus is on safe experimentation—no real funds or external bank connectors are involved.

## Quickstart
1. Clone the repository and install dependencies for the middleware prototype: `cd app/middleware && npm install`.
2. Start the TypeScript Fastify server locally with `npm run dev` (listens on `http://localhost:8080`).
3. Bootstrap the new frontend shell with `cd app/frontend && npm install` followed by `FRONTEND_DEV_PORT=5317 npm run dev` when you need a custom dev port (defaults to `http://localhost:5173`).
4. Prefer Docker Compose for isolated stacks:
   - Middleware only: `docker compose -f middleware-compose.yml up --build` (publishes the API at `http://localhost:8080` and the bundled preview UI at `http://localhost:5174`; remap the UI port with `MIDDLEWARE_FRONTEND_WEB_PORT=5318 docker compose -f middleware-compose.yml up --build`).
   - Frontend only: `docker compose -f frontend-compose.yml up --build` (serves `http://localhost:5173` by default; override the host port with `FRONTEND_WEB_PORT=5317 docker compose -f frontend-compose.yml up --build` when another service already occupies `5173`).
   - Stockmarket simulator: `docker compose -f stockmarket-compose.yml up --build` (starts the synthetic market engine at `http://localhost:8100`, sharing the `virtualbank-backplane` network with middleware and wiring the dataset volume automatically; override the host port with `STOCKMARKET_WEB_PORT=58100 docker compose -f stockmarket-compose.yml up --build`).
5. Launch the data store foundation locally with `docker compose -f apps/datastore/datastore-compose.yml up --build` when you want PostgreSQL, Redis, Kafka, ClickHouse, and MinIO services that mirror the reference architecture. Host bindings avoid common developer ports (`15432/15433` for PostgreSQL and `19000` for the ClickHouse native wire) so local installations stay untouched. The maintenance script automatically seeds the `market_companies` table from [`docs/dataset/fake_companies.json`](docs/dataset/fake_companies.json) once PostgreSQL reports healthy and temporarily downgrades synchronous commit so the seed finishes even if the replica is still starting.
6. Explore the design blueprints in [`docs/designing/design.md`](docs/designing/design.md) to understand the planned player journeys and backend integrations.

## Automated Maintenance
The `scripts/maintenance.sh` helper orchestrates installation and lifecycle tasks for production-like environments. Execute the script as `root` (or with `sudo`) and pass one of the following commands:

| Command | Description |
| --- | --- |
| `install` | Clones the upstream repository into `/opt/VirtualBank`, verifies Docker tooling, and starts the datastore, stockmarket, and middleware stacks with shared networks. |
| `update` | Pulls the latest commits, rebuilds containers, and reapplies the datastore, stockmarket, and middleware stacks. |
| `uninstall` | Stops active Compose services, removes related volumes, and deletes `/opt/VirtualBank`. |
| `check-updates` | Contacts GitHub to determine whether newer commits are available without applying changes. |

Example usage: `sudo ./scripts/maintenance.sh install`.

Both `install` and `update` wait for the PostgreSQL primary to become ready, seed the `market_companies` table, and ensure the stockmarket simulator is reachable for middleware bridging before reporting success. The seed runs with `synchronous_commit=local` so it never blocks on a cold replica while the dataset is applied.

## Highlights
- **Best-in-class UX** with responsive, accessible interfaces and gamified feedback loops.
- **Secure middleware gateway** powered by Fastify, JSON Schema validation, and idempotent transaction intake.
- **Modular architecture** spanning the frontend, middleware orchestration, stock market simulation, and resilient data stores.
- **Multi-user economy** where players manage personal accounts while Game Masters steward the world through privileged tooling.
- **Dynamic stock market sandbox** with AI-driven price regimes, sector indices, and fair-play trading mechanics.

## Frontend Experience
- **Technology stack:** React + TypeScript + Vite with React Query and Zustand managing optimistic data flows.
- **Feature highlights:** Guided onboarding journey, real-time dashboard metrics, celebratory transfer wizard, market desk heatmaps, and Game Master governance console.
- **Design language:** Inspired by the [HTML concept previews](docs/design/Frontend/) with soft gradients, accessible typography, and micro-interaction friendly components.
- **Docker support:** Use the dedicated Compose stack (`docker compose -f frontend-compose.yml up --build`) to build the image and run `vite preview`, making the UI available at `http://localhost:5173` (override with `FRONTEND_WEB_PORT`) without coupling it to other services.

## Project Structure
- `app/` – Runtime services under active development.
  - [`app/middleware/`](app/middleware/) – Fastify-based middleware core service with TypeScript source, Docker image, and Compose stack.
  - [`app/frontend/`](app/frontend/) – Vite + React experience shell implementing the onboarding, dashboard, transfer wizard, market desk, and Game Master console blueprints.
  - [`app/stockmarket/`](app/stockmarket/) – Python FastAPI market simulator with real-time pricing, lightweight order matching, and WebSocket broadcasting.
- `apps/` – Docker Compose stacks grouped by component for local infrastructure bring-up.
  - [`apps/datastore/datastore-compose.yml`](apps/datastore/datastore-compose.yml) – PostgreSQL, Redis, Kafka, ClickHouse, and MinIO sandbox aligned with the data store blueprint.
- `docs/` – Centralized documentation hub with licenses, datasets, and design workspaces.
  - [`docs/design/Middleware/middleware-core-service.md`](docs/design/Middleware/middleware-core-service.md) – Middleware architecture covering APIs, sagas, observability, and operations.
  - [`docs/design/Frontend/`](docs/design/Frontend/) – Conceptual HTML previews for login, dashboard, and administrator experiences.
 - [`docs/design/Stockmarket/stockmarket-simulation.md`](docs/design/Stockmarket/stockmarket-simulation.md) – Real-time market simulation blueprint spanning data generation, matching, risk, and analytics.
 - [`docs/design/Data Stores/data-store-architecture.md`](docs/design/Data%20Stores/data-store-architecture.md) – High-availability storage blueprint detailing database, cache, and event streaming integrations.
- [`docs/dataset/`](docs/dataset/) – Curated fake companies and portfolio seeds for market-simulation testing.
- [`middleware-compose.yml`](middleware-compose.yml) – Dedicated Docker Compose stack for the middleware core service.
- [`stockmarket-compose.yml`](stockmarket-compose.yml) – Synthetic market engine stack that mounts datasets and joins the shared backplane network.
- [`Changelog/Changelog.md`](Changelog/Changelog.md) – Running log of product and documentation updates.

### Troubleshooting
- **Frontend port already in use:** Use `FRONTEND_DEV_PORT` (for `npm run dev`), `FRONTEND_PREVIEW_PORT` (for `npm run preview`), `FRONTEND_WEB_PORT` (for the standalone Compose stack), or `MIDDLEWARE_FRONTEND_WEB_PORT` (for the middleware stack) to remap the host port when `5173/5174` are occupied.
- **Middleware container fails with a Fastify plugin mismatch:** Ensure dependencies are installed from the repository lockfile (`cd app/middleware && npm install`) so `@fastify/helmet` stays on the Fastify 4-compatible release line used by the Docker image.
- **Stockmarket port already in use:** Set `STOCKMARKET_WEB_PORT` before running `docker compose -f stockmarket-compose.yml up --build` to relocate the simulator from `8100` to an available host port.

## Data Store Stack
The `apps/datastore/datastore-compose.yml` stack mirrors the architecture defined in the data store blueprint. It provisions:

- **PostgreSQL primary and read replica** with synchronous replication defaults for ledger-grade consistency.
- **Redis cache** to accelerate hot lookups and pub/sub invalidation flows.
- **Kafka broker (KRaft mode)** to emit change-data-capture events for downstream consumers.
- **ClickHouse warehouse** for analytical workloads and compliance-grade reporting drills.
- **MinIO object storage** acting as the archive bucket for snapshots, exports, and recovery artifacts.

| Service | Host Port(s) | Notes |
| --- | --- | --- |
| PostgreSQL primary | `15432` | Maps to container port `5432`; avoids clashing with local Postgres installs. |
| PostgreSQL replica | `15433` | Exposes the replica for read-only validation. |
| Redis cache | `6379` | Standard Redis port for quick testing. |
| Kafka broker | `9092` | PLAINTEXT listener for local event streaming. |
| ClickHouse HTTP | `8123` | Default HTTP endpoint for queries and health checks. |
| ClickHouse native | `19000` | Non-default host binding for the native protocol to prevent overlap with MinIO. |
| MinIO API | `9000` | S3-compatible API surface. |
| MinIO console | `9001` | Web console for inspecting buckets and objects. |

Bring the stack online with `docker compose -f apps/datastore/datastore-compose.yml up --build` and connect services using the shared `datastore-net` bridge network. Default credentials are scoped to local development and should be replaced in production-like scenarios.

## Stockmarket Simulation Stack
The `stockmarket-compose.yml` stack provides the executable market sandbox referenced throughout the design blueprint.

- **Service:** `stockmarket-simulator` container (`vb-stockmarket`) built from [`app/stockmarket`](app/stockmarket/) and powered by FastAPI.
- **Endpoints:** REST API on `http://localhost:8100` exposing tickers, regimes, orders, portfolios, and trades plus a WebSocket stream at `ws://localhost:8100/ws/ticks` for live updates.
- **Datasets:** Automatically mounts [`docs/dataset`](docs/dataset/) read-only so the simulator ingests the curated tickers without manual copying.
- **Networks:** Joins `virtualbank-backplane` (shared with middleware) and `virtualbank-datastore` so future datastore integrations do not require manual wiring.
- **Configuration:** Tune tick cadence (`STOCKMARKET_TICK_INTERVAL`), news frequency (`STOCKMARKET_NEWS_INTERVAL`), dataset path, and host port (`STOCKMARKET_WEB_PORT`) purely through environment variables.

| Service | Host Port | Notes |
| --- | --- | --- |
| Stockmarket simulator | `8100` | REST + WebSocket gateway for the synthetic market engine. |

Run the stack with `docker compose -f stockmarket-compose.yml up --build` after the datastore stack is online (creates the shared `virtualbank-datastore` network) to expose the full simulator locally, or rely on `scripts/maintenance.sh install` for zero-touch provisioning.

## Middleware Core Service
- **Endpoints:**
  - Liveness probe at `/health/live` and readiness probe at `/health/ready` (includes datastore status).
  - Transfer intake at `/api/v1/transfers` with status retrieval at `/api/v1/transfers/:id`.
  - Credit line intake at `/api/v1/credits/applications` for Game Master scoring workflows.
  - Market order intake at `/api/v1/market/orders` with limit-order validation.
- **Streaming:** WebSocket stream at `/api/v1/sessions/stream` that emits ready, heartbeat, and demo portfolio updates so the frontend can wire real-time dashboards.
- **Operational guarantees:** Built-in rate limiting, in-memory idempotency cache, structured logging hooks for transfers/credits/orders, and configurable environment via `MIDDLEWARE_*` variables (including session heartbeat tuning).
- **Configuration:** Use the `DATASTORE_*` variables to point the middleware at PostgreSQL. Defaults target the Compose network service (`vb_app`/`vb_app_password` on `postgres-primary:5432`). When running the middleware outside Docker, point it at `localhost:15432` (or override the compose ports) to reach the primary database, or provide a `DATASTORE_URL` connection string when using managed instances.
- **Stockmarket bridge:** The middleware discovers the simulator through `STOCKMARKET_BASE_URL` (defaults to `http://vb-stockmarket:8100` inside Docker via the shared `virtualbank-backplane` network) so order APIs and WebSocket fan-out can reach the synthetic market without manual host overrides.
- **Local development:** Hot-reloading through `npm run dev`, TypeScript compilation with `npm run build`, and production-ready Docker image leveraging a distroless runtime.

## Datasets
The `docs/dataset` folder contains ready-to-use JSON files for stock-market prototyping:
- `fake_companies.json` lists roughly one hundred sector-diverse fictional firms with baseline pricing and volatility hints.
- `sample_portfolios.json` provides example allocations that feature different strategies and risk profiles.

These assets let designers and engineers populate market simulations instantly without crafting data from scratch.

## Contributing
We welcome thoughtful contributions that keep the experience modern, accessible, and fun. Please update the changelog and documentation with every meaningful change.
