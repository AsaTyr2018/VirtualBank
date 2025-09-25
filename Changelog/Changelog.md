# Changelog

# [2025-10-03] Middleware Ledger Consolidation
- **Change Type:** Normal Change
- **Reason:** Retire the separate core banking layer now that middleware owns ledger responsibilities, keeping documentation aligned with the updated architecture.
- **What Changed:** Removed the legacy core banking workspace, updated the design blueprint, middleware, stockmarket, and data store documents to describe the middleware-led ledger flow, refreshed the README to reflect the streamlined structure, and documented the update here.

## [2025-10-02] Data Store Architecture Blueprint
- **Change Type:** Normal Change
- **Reason:** Define a resilient storage backbone so engineering teams can build VirtualBank features atop a trustworthy data platform.
- **What Changed:** Authored the comprehensive data store architecture document detailing database, cache, and event integrations; removed the placeholder file; refreshed the README to highlight the new resource.

## [2025-09-25] VirtualBank Design Documentation
- **Change Type:** Standard Change
- **Reason:** Establish a cohesive blueprint and updated documentation to guide upcoming development of the VirtualBank experience.
- **What Changed:** Added a comprehensive design document (`designing/design.md`) covering frontend, middleware, and backend architecture, and refreshed the main README to highlight the design vision and documentation structure.

## [2025-09-26] Multi-User Economy Blueprint
- **Change Type:** Normal Change
- **Reason:** Capture the newly defined multi-user gameplay expectations and virtual economy mechanics requested for the next design iteration.
- **What Changed:** Expanded `designing/design.md` with role-aware flows, backend services for credits and yields, and dedicated economy governance guidance; refreshed the README highlights to showcase the multi-user world, and documented the update here.

## [2025-09-27] Market Simulation Expansion
- **Change Type:** Normal Change
- **Reason:** Introduce a modular stock market sandbox that lets players trade fictional equities with organic price movements and fair safeguards.
- **What Changed:** Augmented `designing/design.md` with a market simulation bounded context, covering market-data generation, matching, portfolios, risk, and analytics; expanded frontend flows for the Market Desk experience; refreshed the README highlights and structure references to spotlight the new service.

## [2025-09-28] Market Dataset Seed
- **Change Type:** Normal Change
- **Reason:** Provide ready-made fake companies and starter portfolios to accelerate stock market prototyping.
- **What Changed:** Added the `dataset/` directory with curated company and portfolio JSON files, refreshed the README to surface the dataset resources, and documented the update here.

## [2025-09-29] Architecture Workspace Setup
- **Change Type:** Standard Change
- **Reason:** Organize dedicated design areas and clarify how the stockmarket integrates through the middleware.
- **What Changed:** Created structured subdirectories under `design/` with placeholder notes, refreshed the architecture overview diagram in `designing/design.md`, and updated the README to surface the new workspace.

## [2025-09-30] Middleware Core Service Blueprint
- **Change Type:** Normal Change
- **Reason:** Define the core middleware server so implementation can begin with clear technology, API, and operations guidance.
- **What Changed:** Authored `design/Middleware/middleware-core-service.md` describing the Fastify-based transaction gateway, SSH console, and deployment model; refreshed the README to link the new document and keep documentation discoverable.

## [2025-10-01] Stockmarket Simulation Design
- **Change Type:** Normal Change
- **Reason:** Establish a dedicated blueprint for the stockmarket component so real-time trading features can be implemented with confidence.
- **What Changed:** Replaced the placeholder in `design/Stockmarket/` with a comprehensive simulation design covering architecture, data generation, risk controls, and integration touchpoints, and updated the README to surface the new documentation.
