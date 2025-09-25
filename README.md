# VirtualBank

VirtualBank is a playful online banking simulator that lets users explore modern money-management journeys with a fictional fun-currency. The platform focuses on safe experimentation—no real funds or external bank connectors are involved.

## Highlights
- **Best-in-class UX** with responsive, accessible interfaces and gamified feedback loops.
- **Modular architecture** spanning a rich frontend, a secure middleware gateway, and resilient backend microservices.
- **Multi-user economy** where every player controls a personal account, Game Masters steward the world, and the system supports credits, yields, and diverse income streams.
- **Fictional currency** that mimics real banking flows without touching actual money.
- **Dynamic stock market sandbox** featuring AI-driven price regimes, sector indices, and fair-play trading mechanics for users to buy and sell virtual equities.

## Project Structure
- `designing/design.md` – End-to-end blueprint covering frontend, middleware, and backend design decisions.
- `design/` – Thematic workspaces (`Frontend`, `Middleware`, `Core Banking`, `Data Stores`, `Stockmarket`) ready for focused design notes.
  - [`design/Middleware/middleware-core-service.md`](design/Middleware/middleware-core-service.md) – Middleware server architecture covering APIs, sagas, SSH operations, and deployment practices.
- Market simulation architecture, gameplay surfaces, and risk controls are detailed in Section 5.4 of the design blueprint.
- `dataset/` – Curated fake companies and portfolio seeds for market-simulation testing.
- `Changelog/Changelog.md` – Running log of product and documentation updates.

## Datasets
The `dataset` folder contains ready-to-use JSON files for stock-market prototyping:

- `fake_companies.json` lists sector-diverse fictional firms with baseline pricing and volatility hints.
- `sample_portfolios.json` provides example allocations that feature different strategies and risk profiles.

These assets let designers and engineers populate market simulations instantly without crafting data from scratch.

## Getting Started
1. Clone the repository.
2. Explore the design blueprint in [`designing/design.md`](designing/design.md) to understand the planned experience, architecture, and virtual economy mechanics.
3. Follow upcoming implementation guides (to be added) to bring the VirtualBank vision to life.

## Contributing
We welcome thoughtful contributions that keep the experience modern, accessible, and fun. Please update the changelog and documentation with every meaningful change.
