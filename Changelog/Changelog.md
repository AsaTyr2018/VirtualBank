# Changelog
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
