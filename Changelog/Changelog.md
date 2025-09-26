# Changelog

# [0.00.048] Ledger Schema Recovery
- **Change Type:** Emergency Change
- **Reason:** Middleware bootstraps failed because PostgreSQL instances created before the ledger schema refactor were missing the `account_id` column, so index creation aborted and the service never finished its startup.
- **What Changed:** Added a defensive migration step that backfills the `ledger_entries.account_id` column when absent before rebuilding the related index, restoring middleware compatibility with existing databases.

# [0.00.047] MinIO Health Probe Authentication
- **Change Type:** Emergency Change
- **Reason:** The datastore maintenance runs and compose health checks reported MinIO as unhealthy because the S3 API blocked unauthenticated requests to the `/minio/health/live` endpoint.
- **What Changed:** Updated the MinIO health check to authenticate with the configured root credentials so probes succeed and documented the behaviour in the README service table.

# [0.00.046] Datastore Stack Boot Recovery
- **Change Type:** Emergency Change
- **Reason:** Maintenance rebuilds stalled because the PostgreSQL replica rejected startup without the legacy `POSTGRESQL_MASTER_*` variables, Kafka refused to format storage with the deprecated cluster ID, and MinIO's health probe fired before the service finished its warm-up cycle.
- **What Changed:** Exported both legacy and modern PostgreSQL replication variables so the replica can locate the primary across Bitnami tag revisions, regenerated the Kafka KRaft cluster ID using a valid Base64URL value, extended the MinIO health-check start period, and refreshed the README with compatibility guidance for future overrides.

# [0.00.045] Middleware Plugin Timeout Extension
- **Change Type:** Emergency Change
- **Reason:** Middleware restarts continued because Fastify aborted the datastore plugin while it was still creating indexes on large datasets, preventing the API from ever exposing its health probes.
- **What Changed:** Raised the default `MIDDLEWARE_PLUGIN_TIMEOUT_MS` window to five minutes so schema preparation can finish, added a startup log announcing when schema checks begin, and refreshed the README with the new default and tuning guidance.

# [0.00.044] Automated Host Detection For Connectivity Bundles
- **Change Type:** Emergency Change
- **Reason:** Maintenance-driven installs still yielded frontends that attempted to reach the middleware on unreachable origins, forcing operators to hand-edit environment files after every rollout.
- **What Changed:** Enhanced `scripts/maintenance.sh` to auto-detect the primary host address (with overrides via `VIRTUALBANK_PUBLIC_HOST`) when generating connectivity bundles so middleware, frontend, and stockmarket URLs align out of the box, and refreshed the README with the new behaviour and override guidance.

# [0.00.043] Middleware Datastore Connection Retry
- **Change Type:** Emergency Change
- **Reason:** Maintenance installs reported middleware live probe failures because the service exited after the first PostgreSQL handshake attempt while the database was still warming up.
- **What Changed:** Added configurable datastore connection retries with `DATASTORE_CONNECT_MAX_RETRIES`/`DATASTORE_CONNECT_RETRY_DELAY_MS`, taught the middleware plugin to loop until PostgreSQL is reachable, and refreshed the README startup guardrails.

# [0.00.042] Maintenance Timeout Diagnostics
- **Change Type:** Emergency Change
- **Reason:** Maintenance runs stalled while waiting for containers that exited early, leaving operators without immediate insight into why the boot sequence failed.
- **What Changed:** Enhanced `scripts/maintenance.sh` to capture container status details plus the last 200 Docker log lines whenever readiness checks time out, refreshed the README to highlight the new diagnostics, and documented the fix here.

# [0.00.041] Forced Container Rebuilds For Connectivity
- **Change Type:** Emergency Change
- **Reason:** Provisioned API credentials were not reaching running containers, leaving the frontend unable to authenticate with the middleware after maintenance runs.
- **What Changed:** Updated `scripts/maintenance.sh` to tear down each Compose stack, rebuild images without cache, and recreate containers with `--force-recreate`, refreshed the README to highlight the new zero-cache rebuild behaviour, and documented the fix here.

# [0.00.040] Maintenance Connectivity Orchestration
- **Change Type:** Normal Change
- **Reason:** Ensure API credentials are provisioned automatically and containers start in a reliable order during unattended maintenance runs.
- **What Changed:** Extended `scripts/maintenance.sh` to generate and reuse connectivity bundles before and after stack rebuilds, taught it to wait for datastore, stockmarket, and middleware services in sequence, added a `--skip-checks` mode to `scripts/connectivity.sh` for pre-boot generation, refreshed the README with the new automation notes, and documented the improvement here.

# [0.00.039] Middleware Plugin Timeout Safeguard
- **Change Type:** Emergency Change
- **Reason:** The middleware container exited because the datastore plugin needed longer than Fastify's default 10-second readiness window when large schema migrations were running, triggering repeated boot failures.
- **What Changed:** Added a configurable `MIDDLEWARE_PLUGIN_TIMEOUT_MS` setting that widens the Fastify plugin timeout, logged successful datastore schema preparation, refreshed the README with the new guidance, and documented the fix here.

# [0.00.038] API Connectivity Automation
- **Change Type:** Normal Change
- **Reason:** Provide a turnkey way to generate aligned API credentials and confirm cross-service connectivity so teams can bring up the stack without manual key choreography.
- **What Changed:** Added the `scripts/connectivity.sh` helper to mint shared secrets, write environment overlays, and validate middleware/stockmarket/frontend endpoints; taught Compose stacks to honour injected auth variables; refreshed the README with the new workflow; and documented the improvement here.

# [0.00.037] Stockmarket Simulator Phase 4 Delivery
- **Change Type:** Normal Change
- **Reason:** Implement Phase 4 of the delivery roadmap so the stockmarket simulator gains modular services, durable storage, risk governance, and analytics parity with the documented architecture.
- **What Changed:** Decomposed the simulator into pricing, matching, risk, storage, and analytics modules; wired PostgreSQL and Redis persistence for orders, portfolios, and tick data; introduced a middleware-integrated risk feedback loop with HTTP-based credit checks and event emission; streamed tick and portfolio snapshots into ClickHouse; refreshed the REST bootstrap to manage new dependencies; updated the README and roadmap to capture the new configuration surface; and documented the delivery here.

# [0.00.036] Frontend Experience Modernization
- **Change Type:** Normal Change
- **Reason:** Deliver Phase 3 of the roadmap by replacing fixture-driven UI data with live middleware integrations, shipping real-time dashboards, polishing the transfer UX, and hardening the design system.
- **What Changed:** Added an experience snapshot API on the middleware, migrated the React frontend to React Query with WebSocket-powered cache updates, introduced optimistic transfer mutations with rollback guidance, refreshed theming tokens plus focus styles, stood up Storybook with accessibility tooling, updated the README and roadmap to reflect the new workflows, and logged the delivery here.

# [0.00.035] Middleware Data & Integration Layer
- **Change Type:** Normal Change
- **Reason:** Deliver Phase 2 of the roadmap so the middleware has the documented schema, event bridge, caching tier, and stockmarket integration needed for live trading flows.
- **What Changed:** Added a Prisma schema and typed SQL accessors covering accounts, transfers, ledger entries, credit applications, market orders, and session events; introduced Redis caching helpers and a Kafka event bridge that publish domain envelopes for transfers, credits, market orders, and session lifecycles; formalized REST/WebSocket clients for the stockmarket simulator and wired market workflows through them; refreshed services, routes, and documentation to use the new data layer and marked Phase 2 complete in the roadmap.

# [0.00.034] Middleware Foundation Hardening
- **Change Type:** Normal Change
- **Reason:** Complete the roadmap's Phase 1 middleware foundations so that request deduplication, transactional persistence, authentication, and observability align with the documented architecture.
- **What Changed:** Moved idempotency storage into PostgreSQL with replay protection, persisted transfers/credits/market orders through transactional workflows, introduced API key + session RBAC guards with metrics-protected routes, instrumented request logging and Prometheus telemetry, refreshed the README, and marked Phase 1 as delivered in the roadmap.

# [0.00.033] Delivery Roadmap Foundation
- **Change Type:** Standard Change
- **Reason:** Capture the prioritized follow-up work requested after reviewing the current implementation against the published documentation.
- **What Changed:** Authored a delivery roadmap outlining phased tasks across middleware, datastore integrations, frontend modernization, and simulator scaling, and linked the plan from the README so contributors can discover the next steps quickly.

# [0.00.032] Middleware Datastore Wiring Repair
- **Change Type:** Emergency Change
- **Reason:** The middleware container crashed because it attempted to reach PostgreSQL at `127.0.0.1:5432`, leaving the stack without a database connection and producing repeated boot failures alongside Docker network reuse warnings.
- **What Changed:** Pointed the middleware compose stack at the `postgres-primary` service on the shared datastore network, marked shared networks as external across compose files, taught the maintenance script to provision those bridges proactively, and refreshed the README with manual network setup guidance.

## [0.00.031] Middleware Fastify 5 Upgrade
- **Change Type:** Emergency Change
- **Reason:** The middleware container crashed because `@fastify/rate-limit` now requires Fastify v5 while the service was still pinned to v4, leaving the stack unable to boot.
- **What Changed:** Upgraded Fastify to v5 with matching plugin releases, regenerated the npm lockfile, refreshed README guidance to reference the Fastify 5 toolchain, and validated the TypeScript build.

## [0.00.030] Middleware Helmet Downgrade
- **Change Type:** Emergency Change
- **Reason:** The middleware Docker container failed at runtime because `@fastify/helmet` v12 demands Fastify v5 while the stack still ships Fastify v4, halting the service during startup.
- **What Changed:** Pinned `@fastify/helmet` to the Fastify v4-compatible v11 line, refreshed the npm lockfile, documented the troubleshooting step in the README, and confirmed the TypeScript build succeeds with the adjusted dependency set.

## [0.00.029] Fake Company Seed Unblock
- **Change Type:** Normal Change
- **Reason:** The maintenance script stalled because PostgreSQL waited for the synchronous replica to acknowledge commits while it was still warming up.
- **What Changed:** Updated the seed SQL to set `synchronous_commit` to `LOCAL` inside the transaction so seeding never blocks on the replica, refreshed README guidance to call out the behavior, and documented the fix here.

## [0.00.028] Stockmarket Simulation Stack Bootstrap
- **Change Type:** Normal Change
- **Reason:** Deliver an executable stockmarket simulator with zero-touch operations so maintainers can deploy the full trading sandbox alongside middleware and datastore services.
- **What Changed:** Added the FastAPI-based stockmarket engine with Docker packaging, introduced `stockmarket-compose.yml` and shared network configuration, updated the maintenance script to manage datastore → stockmarket → middleware lifecycles, refreshed the README with stack guidance, and documented the implementation snapshot in the stockmarket design blueprint.

## [0.00.027] Middleware Helmet Compatibility
- **Change Type:** Emergency Change
- **Reason:** The middleware container crashed during startup because `@fastify/helmet` v13 requires Fastify v5, while the stack still ships Fastify v4, causing Docker deployments to fail immediately.
- **What Changed:** Downgraded `@fastify/helmet` to the v12 line that remains compatible with Fastify v4 and refreshed the lockfile to keep the middleware container bootable.

## [0.00.026] Compose Port Isolation
- **Change Type:** Standard Change
- **Reason:** Running multiple stacks concurrently caused Docker to compete for port `5173`, blocking the middleware stack when the standalone frontend was already bound to the host.
- **What Changed:** Gave the middleware stack a dedicated `MIDDLEWARE_FRONTEND_WEB_PORT` host binding (default `5174`), kept the standalone frontend on a configurable `FRONTEND_WEB_PORT`, exposed `FRONTEND_DEV_PORT` overrides in the Vite config, and refreshed the README with the new port guidance.
## [0.00.025] Frontend Port Override
- **Change Type:** Standard Change
- **Reason:** Local development environments frequently already use port `5173`, preventing the frontend Docker stack from starting.
- **What Changed:** Added a `FRONTEND_WEB_PORT` override to the frontend Compose stack and documented the troubleshooting steps in the README so engineers can remap the host port without editing Compose files.
## [0.00.024] Compose Stack Separation
- **Change Type:** Standard Change
- **Reason:** Combined Docker orchestration blurred the intended boundary between frontend and middleware services, complicating targeted deployments and violating the component separation blueprint.
- **What Changed:** Removed the frontend container from `middleware-compose.yml`, introduced a dedicated `frontend-compose.yml`, refreshed the README quickstart and frontend notes to highlight isolated stacks, and aligned the middleware dependencies so Fastify plugins match the deployed major version.
## [0.00.023] Middleware Stack Recovery
- **Change Type:** Emergency Change
- **Reason:** The middleware container crashed on boot due to a Fastify plugin version mismatch and the maintenance script could not seed PostgreSQL because authentication details were missing; the shared stack also never exposed the frontend, leaving the experience inaccessible.
- **What Changed:** Pinned `@fastify/sensible` to the Fastify v4-compatible line, updated the maintenance script to pass the PostgreSQL password when checking readiness and running the seed SQL, introduced a Docker image for the Vite frontend, wired the frontend into `middleware-compose.yml`, and refreshed the README to document the combined stack endpoints.
## [0.00.022] Datastore Port Collision Fix
- **Change Type:** Emergency Change
- **Reason:** Docker reported binding failures because PostgreSQL and ClickHouse ports overlapped with existing host services and other stack assignments, preventing the datastore stack from starting.
- **What Changed:** Remapped the PostgreSQL primary/replica to host ports `15432/15433`, shifted the ClickHouse native listener to host port `19000`, and refreshed the README with updated port guidance and a service table so developers can connect without clashes.
## [0.00.021] Middleware Datastore Wiring
- **Change Type:** Normal Change
- **Reason:** Ensure the middleware can talk to PostgreSQL out of the box and ship environments with the fake market dataset preloaded.
- **What Changed:** Added a Fastify datastore plugin with health-aware readiness reporting, introduced PostgreSQL connection configuration via `DATASTORE_*` variables, updated the maintenance script to wait for the primary and seed `market_companies` from `docs/dataset/fake_companies.json`, refreshed the README with the new readiness probe and configuration notes, and documented the enhancement here.
## [0.00.020] Automated Maintenance Toolkit
- **Change Type:** Normal Change
- **Reason:** Provide administrators with a reliable way to install, update, and remove VirtualBank environments with minimal manual effort.
- **What Changed:** Added the `scripts/maintenance.sh` automation script that manages cloning, dependency checks, Docker Compose stacks, updates, and full removal; refreshed the README with usage guidance for the new tooling; and documented the enhancement here.
## [0.00.019] Frontend Experience Shell
- **Change Type:** Normal Change
- **Reason:** Deliver an executable foundation for the heart of the VirtualBank experience so teams can iterate on the documented UX flows.
- **What Changed:** Added the `app/frontend` Vite + React application with onboarding, dashboard, transfer, market, admin, and settings views; introduced shared UI components and state stores inspired by the design prototypes; refreshed the README with frontend instructions and highlights; and recorded the update here.
## [0.00.018] Data Store Stack Folder Alignment
- **Change Type:** Standard Change
- **Reason:** Align infrastructure assets with the expected `apps` hierarchy so the compose stack is discoverable alongside other components.
- **What Changed:** Moved `datastore-compose.yml` to `apps/datastore/datastore-compose.yml`, refreshed README instructions and structure references to point at the new location, and documented the adjustment here.

## [0.00.017] Data Store Stack Bootstrap
- **Change Type:** Normal Change
- **Reason:** Provide an executable storage stack so teams can validate integration paths defined in the data store architecture blueprint.
- **What Changed:** Added `datastore-compose.yml` with PostgreSQL primary/replica, Redis, Kafka, ClickHouse, and MinIO services; refreshed the README with stack usage guidance and quickstart steps; and recorded the update here.

## [0.00.016] Middleware API Surface Expansion
- **Change Type:** Normal Change
- **Reason:** Bring the executable middleware in line with the architecture blueprint by exposing credit, market, and session stream touchpoints for downstream teams.
- **What Changed:** Added credit application and market order endpoints with schema validation, introduced the real-time session WebSocket stream with heartbeat configuration, expanded shared utilities/logging, refreshed the README middleware summary, and updated dependencies to support the new transports.

## [0.00.015] Middleware Core Service Bootstrap
- **Change Type:** Normal Change
- **Reason:** Begin implementing the middleware gateway so the documented transaction flow has an executable foundation for future ledger and stock market integrations.
- **What Changed:** Introduced the `app/middleware` Fastify server with idempotent transfer intake, health checks, TypeScript toolchain, Docker image, and a dedicated compose stack; refreshed the README with runtime guidance; and recorded the update here.

## [0.00.014] Changelog Versioning Alignment
- **Change Type:** Standard Change
- **Reason:** Replace misleading future-dated entries with version numbers that reflect the ongoing design phase.
- **What Changed:** Renamed all changelog headings to the `0.00.xxx` scheme and logged this correction for historical clarity.

## [0.00.013] Market Dataset Enrichment
- **Change Type:** Normal Change
- **Reason:** Pre-seed planning requires a richer fake market so investors can experience diverse scenarios.
- **What Changed:** Expanded `dataset/fake_companies.json` to 100 curated fictional firms, refreshed the README dataset summary, and documented the update here.

## [0.00.012] uxAdmin Command Center Preview
- **Change Type:** Normal Change
- **Reason:** Provide a tangible HTML preview so stakeholders can experience the proposed administrator control center flow.
- **What Changed:** Added an interactive `index.html` prototype under `design/Frontend/uxAdmin-control-center/`, refreshed the README to highlight the new preview, and documented the update here.

## [0.00.011] uxAdmin Command Center Concept
- **Change Type:** Normal Change
- **Reason:** Equip administrators with a clear vision for the command center so they can govern the virtual economy confidently.
- **What Changed:** Added the `design/Frontend/uxAdmin-control-center/` workspace with a design document, feature catalog, and journey map; refreshed the main README and highlighted the new resources.

## [0.00.010] Frontend Experience Prototypes
- **Change Type:** Normal Change
- **Reason:** Craft a warm, professional customer journey that reflects the desired UX-first VirtualBank experience for players and staff.
- **What Changed:** Designed the frontend workspace with polished login, registration, dashboard, and administrator HTML prototypes, introduced shared styling and interaction scripts, refreshed the README to surface the new assets, and documented the update here.

## [0.00.009] Middleware Ledger Consolidation
- **Change Type:** Normal Change
- **Reason:** Retire the separate core banking layer now that middleware owns ledger responsibilities, keeping documentation aligned with the updated architecture.
- **What Changed:** Removed the legacy core banking workspace, updated the design blueprint, middleware, stockmarket, and data store documents to describe the middleware-led ledger flow, refreshed the README to reflect the streamlined structure, and documented the update here.

## [0.00.008] Data Store Architecture Blueprint
- **Change Type:** Normal Change
- **Reason:** Define a resilient storage backbone so engineering teams can build VirtualBank features atop a trustworthy data platform.
- **What Changed:** Authored the comprehensive data store architecture document detailing database, cache, and event integrations; removed the placeholder file; refreshed the README to highlight the new resource.

## [0.00.001] VirtualBank Design Documentation
- **Change Type:** Standard Change
- **Reason:** Establish a cohesive blueprint and updated documentation to guide upcoming development of the VirtualBank experience.
- **What Changed:** Added a comprehensive design document (`designing/design.md`) covering frontend, middleware, and backend architecture, and refreshed the main README to highlight the design vision and documentation structure.

## [0.00.002] Multi-User Economy Blueprint
- **Change Type:** Normal Change
- **Reason:** Capture the newly defined multi-user gameplay expectations and virtual economy mechanics requested for the next design iteration.
- **What Changed:** Expanded `designing/design.md` with role-aware flows, backend services for credits and yields, and dedicated economy governance guidance; refreshed the README highlights to showcase the multi-user world, and documented the update here.

## [0.00.003] Market Simulation Expansion
- **Change Type:** Normal Change
- **Reason:** Introduce a modular stock market sandbox that lets players trade fictional equities with organic price movements and fair safeguards.
- **What Changed:** Augmented `designing/design.md` with a market simulation bounded context, covering market-data generation, matching, portfolios, risk, and analytics; expanded frontend flows for the Market Desk experience; refreshed the README highlights and structure references to spotlight the new service.

## [0.00.004] Market Dataset Seed
- **Change Type:** Normal Change
- **Reason:** Provide ready-made fake companies and starter portfolios to accelerate stock market prototyping.
- **What Changed:** Added the `dataset/` directory with curated company and portfolio JSON files, refreshed the README to surface the dataset resources, and documented the update here.

## [0.00.005] Architecture Workspace Setup
- **Change Type:** Standard Change
- **Reason:** Organize dedicated design areas and clarify how the stockmarket integrates through the middleware.
- **What Changed:** Created structured subdirectories under `design/` with placeholder notes, refreshed the architecture overview diagram in `designing/design.md`, and updated the README to surface the new workspace.

## [0.00.006] Middleware Core Service Blueprint
- **Change Type:** Normal Change
- **Reason:** Define the core middleware server so implementation can begin with clear technology, API, and operations guidance.
- **What Changed:** Authored `design/Middleware/middleware-core-service.md` describing the Fastify-based transaction gateway, SSH console, and deployment model; refreshed the README to link the new document and keep documentation discoverable.

## [0.00.007] Stockmarket Simulation Design
- **Change Type:** Normal Change
- **Reason:** Establish a dedicated blueprint for the stockmarket component so real-time trading features can be implemented with confidence.
- **What Changed:** Replaced the placeholder in `design/Stockmarket/` with a comprehensive simulation design covering architecture, data generation, risk controls, and integration touchpoints, and updated the README to surface the new documentation.
