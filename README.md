# VirtualBank

VirtualBank is a playful online banking simulator that lets users explore modern money-management journeys with a fictional fun-currency. The platform focuses on safe experimentation—no real funds or external bank connectors are involved.

## Highlights
- **Best-in-class UX** with responsive, accessible interfaces and gamified feedback loops.
- **Warm customer journeys** featuring premium login, registration, and dashboard concepts tailored for players and staff alike.
- **Modular architecture** spanning a rich frontend, a secure middleware gateway with embedded ledger services, and resilient market simulation components.
- **Multi-user economy** where every player controls a personal account, Game Masters steward the world, and the system supports credits, yields, and diverse income streams.
- **Dynamic stock market sandbox** featuring AI-driven price regimes, sector indices, and fair-play trading mechanics for users to buy and sell virtual equities.

## Project Structure
- `designing/design.md` – End-to-end blueprint covering frontend, middleware, and backend design decisions.
- `design/` – Thematic workspaces (`Frontend`, `Middleware`, `Data Stores`, `Stockmarket`) ready for focused design notes.
  - [`design/Frontend/index.html`](design/Frontend/index.html) – Customer welcome screen with sign-in and registration prototypes.
  - [`design/Frontend/dashboard.html`](design/Frontend/dashboard.html) – Post-login banking overview showcasing account, transfer, and portfolio insights.
  - [`design/Frontend/uxAdmin.html`](design/Frontend/uxAdmin.html) – Staff-only access point with dedicated authentication controls.
  - [`design/Frontend/uxAdmin-control-center/index.html`](design/Frontend/uxAdmin-control-center/index.html) – Admin command center preview highlighting live oversight, queue triage, and collaboration modules.
  - [`design/Frontend/uxAdmin-control-center/`](design/Frontend/uxAdmin-control-center/) – Concept workspace for the admin command center, including design rationale, feature catalog, and journey maps.
  - [`design/Middleware/middleware-core-service.md`](design/Middleware/middleware-core-service.md) – Middleware server architecture covering APIs, sagas, SSH operations, and deployment practices.
  - [`design/Stockmarket/stockmarket-simulation.md`](design/Stockmarket/stockmarket-simulation.md) – Real-time market simulation blueprint spanning data generation, matching, risk, and analytics services.
  - [`design/Data Stores/data-store-architecture.md`](design/Data%20Stores/data-store-architecture.md) – High-availability storage blueprint detailing database, cache, and event streaming integrations.
- Market simulation architecture, gameplay surfaces, and risk controls are detailed in Section 5.4 of the design blueprint.
- `dataset/` – Curated fake companies and portfolio seeds for market-simulation testing.
- `Changelog/Changelog.md` – Running log of product and documentation updates.

## Experience Previews
- Open `design/Frontend/index.html` in a browser to explore the player-focused onboarding flow with toggled sign-in and registration states.
- Visit `design/Frontend/dashboard.html` for a warm, data-rich customer dashboard concept featuring transfers, customer center access, and portfolio highlights.
- Use `design/Frontend/uxAdmin.html` to review the dedicated administrator entry point at `/uxAdmin` with role-aware access controls.
- Open `design/Frontend/uxAdmin-control-center/index.html` to preview the command center layout with live status, escalations, and playbook actions.
- Explore `design/Frontend/uxAdmin-control-center/` for the command center concept, including detailed module definitions and administrator journeys.

## Datasets
The `dataset` folder contains ready-to-use JSON files for stock-market prototyping:

- `fake_companies.json` lists roughly one hundred sector-diverse fictional firms with baseline pricing and volatility hints.
- `sample_portfolios.json` provides example allocations that feature different strategies and risk profiles.

These assets let designers and engineers populate market simulations instantly without crafting data from scratch.

## Getting Started
1. Clone the repository.
2. Explore the design blueprint in [`designing/design.md`](designing/design.md) to understand the planned experience, architecture, and virtual economy mechanics.
3. Preview the frontend experience files in `design/Frontend/` to align UI implementation with the desired UX mood.
4. Follow upcoming implementation guides (to be added) to bring the VirtualBank vision to life.

## Contributing
We welcome thoughtful contributions that keep the experience modern, accessible, and fun. Please update the changelog and documentation with every meaningful change.
