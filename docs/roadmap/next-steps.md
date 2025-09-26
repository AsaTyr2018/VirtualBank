# VirtualBank Delivery Plan

This roadmap translates the documentation gaps into actionable workstreams so contributors can bring the simulator in line with the published blueprints.

## Guiding Principles
- **Documentation-first:** Align each milestone with the architecture and UX documents, updating them as capabilities land.
- **Safety before spectacle:** Implement authentication, observability, and data durability ahead of advanced gameplay loops.
- **Incremental integration:** Expand the middleware outward—first to the datastore, then the stockmarket, and finally to external channels.

## Phase 1 – Middleware Foundations
- [x] **Durable idempotency store** – Idempotency keys now persist in PostgreSQL with checksum validation, replay detection, and TTL-driven cleanup for consistent request deduplication.
- [x] **Datastore-backed workflows** – Transfer, credit, and market order endpoints execute transactional workflows that create domain records, status steps, and ledger scaffolding inside the datastore.
- [x] **Authentication shell** – Configurable API keys, session header validation, and role-based authorization guard every non-public route and streaming endpoint.
- [x] **Observability baseline** – Structured request logs, Prometheus metrics at `/internal/metrics`, and centralized error handling provide actionable telemetry for middleware operations.

## Phase 2 – Data & Integration Layer
1. [x] **Prisma/SQL schema implementation** – Materialized the documented account, ledger, workflow, and session tables in PostgreSQL and shipped a Prisma schema plus typed data-access helpers that transactions use within the middleware.
2. [x] **Event streaming bridge** – Added a Kafka-backed event bridge that serializes domain envelopes for transfers, credits, market orders, and session lifecycle updates, ensuring every workflow emits auditable topics.
3. [x] **Cache tier wiring** – Introduced a Redis cache plugin with configurable TTLs and helper APIs that the transfer, credit, and market services now leverage for hot lookups and invalidation.
4. [x] **Stockmarket contract** – Formalized REST and WebSocket clients for the stockmarket simulator so market orders route through the middleware and trading telemetry can stream from the simulator.

## Phase 3 – Frontend Experience
1. [x] **API-powered stores** – Added `/api/v1/experience/snapshot`, migrated the frontend to React Query, and hydrated dashboards, market views, and the transfer wizard with live middleware data.
2. [x] **Real-time dashboards** – Wired the client session WebSocket with authenticated query parameters to stream portfolio cash balances and activity directly into the React Query cache.
3. [x] **Validation and error UX** – Upgraded the transfer wizard with optimistic cache updates, rollback-aware error messaging, and actionable guidance when validations fail.
4. [x] **Design system hardening** – Introduced theme tokens, focus treatments, Storybook stories with the a11y addon, and scripts for automated accessibility checks.

## Phase 4 – Stockmarket Simulator
1. **Service decomposition** – Split matching, pricing, risk, and analytics into dedicated modules/services.
2. **Persistent storage** – Move portfolios, orders, and ticks into PostgreSQL/Redis for durability.
3. **Risk feedback loop** – Emit risk events to middleware and adjust order intake based on credit signals.
4. **Analytics pipeline** – Stream tick/portfolio snapshots into ClickHouse for dashboards.

## Cross-Cutting Initiatives
- **Security hardening** – TLS everywhere, anomaly detection hooks, and admin console protections.
- **Operational tooling** – GitHub workflows, container scans, synthetic monitoring, and runbooks.
- **Documentation upkeep** – Refresh READMEs, blueprints, and API references as features mature.

## Immediate Next Steps
- Prioritize Phase 1 tasks, beginning with durable idempotency storage and persistence-backed transfer flows.
- Draft technical spikes for authentication and observability to estimate effort.
- Schedule alignment reviews after each phase to revisit documentation and adjust priorities.
