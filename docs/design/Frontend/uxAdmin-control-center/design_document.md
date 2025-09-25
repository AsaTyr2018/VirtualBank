# uxAdmin Command Center Design Document

## 1. Vision
The uxAdmin command center consolidates every lever VirtualBank staff need to monitor, configure,
and steer the virtual economy. The interface should feel decisive and calm under pressure, offering
clear situational awareness, frictionless investigations, and rapid mitigation actions.

## 2. Target Personas
| Persona | Primary Goals | Interface Needs |
| --- | --- | --- |
| **Economy Steward** | Maintain currency health, review market anomalies, tune events. | Macro dashboards, alert routing, scenario controls. |
| **Support Specialist** | Resolve player issues, process escalations, manage account limits. | Searchable customer profiles, guided flows, audit trails. |
| **Operations Engineer** | Keep systems performant, trace integration outages. | Real-time telemetry, deployment controls, runbook shortcuts. |
| **Security Analyst** | Detect fraud attempts, enforce compliance safeguards. | Threat surfaces, policy management, investigation tools. |

## 3. Experience Principles
1. **Command Readiness** – The home view must surface live health indicators and prioritized tasks.
2. **Progressive Disclosure** – Reveal advanced tools as context demands to avoid cognitive overload.
3. **Explainable Actions** – Every control shows impact, prerequisites, and audit linkage before
   execution.
4. **Always Recoverable** – Provide undo windows or confirmation gates on every irreversible action.

## 4. Information Architecture
- **Top Navigation Bar**
  - Organization switcher, alert inbox, quick actions tray, user profile.
- **Left Dock**
  - Primary modules grouped by responsibility: Operations, Economy, Customers, Security, Settings.
- **Main Canvas**
  - Tabbed workspaces that retain session context per module.
- **Right Context Rail**
  - Inline activity log, assignment panel, related documentation and runbooks.

## 5. Core Modules
### 5.1 Operations Overview
- Health grid for middleware, data stores, stock market engines, and scheduled jobs.
- Incident cards showing severity, impact scope, and time-to-breach SLAs.
- Live query inspector allowing read-only review of suspicious transactions.

### 5.2 Economy Orchestrator
- Currency supply and sink analytics with trend comparison toggles.
- Event scheduler for double-yield weekends, maintenance, or new quest releases.
- Scenario simulator for testing rule tweaks before production rollout.

### 5.3 Customer Command Desk
- Unified search that matches on handle, email, or account ID with fuzzy logic.
- Case timeline showing deposits, trades, support contacts, and risk flags.
- Action drawer with templated interventions (freeze account, grant credit, reset limits).

### 5.4 Security Watchtower
- Threat heatmap highlighting anomalous geos, devices, or behaviors.
- Policy manager with staged rollout and rollback controls.
- Investigation workspace for tracing multi-account fraud rings.

### 5.5 Configuration & Governance
- Role management with permission matrices and approval workflow.
- Feature flag overview with dependency indicators.
- Audit export center that bundles signed logs for compliance reviews.

## 6. Cross-Cutting Functions
- **Global Search** for commands, records, and documentation.
- **Notification Center** with SLA-aware reminders and one-click assignment.
- **Collaboration Hooks** via comments, mentions, and shareable incident timelines.
- **Runbook Drawer** pulling markdown guides from the knowledge base.

## 7. Data & Telemetry Strategy
- Frontend polls lightweight `/status` endpoints for live tiles and uses WebSockets for incident
  streams to reduce refresh fatigue.
- State management favors event sourcing snapshots so that back-in-time review is trivial.
- All charting components support anomaly overlays, thresholds, and drill-through actions.

## 8. Accessibility & Inclusivity
- Minimum AA contrast across tiles, charts, and text.
- Keyboard-first interactions: global command palette (`Ctrl/Cmd + K`), focus outlines, skip links.
- Live region announcements for alerts and streaming updates.
- Support for reduced motion preferences with subtle transitions.

## 9. Responsive Behavior
- **Desktop (≥1280px):** Full layout with context rail.
- **Tablet (768–1279px):** Collapsible left dock, context rail converts to bottom sheet.
- **Mobile (≤767px):** Prioritize alerting, search, and case interventions through compact cards.

## 10. Security Considerations
- Session timeouts visualized with countdown and extend controls.
- Inline secret redaction for sensitive fields by default.
- Role-based affordances ensure users only see eligible actions and data.
- Tamper-evident banners when the environment is in sandbox or maintenance mode.

## 11. Implementation Notes
- Extend existing design tokens for color, spacing, and typography to ensure parity with
  player-facing experiences.
- Compose UI in modular panels (`<vb-card>`, `<vb-table>`, `<vb-kpi-tile>`) to reuse across modules.
- Instrument analytics events (`uxAdmin.module.entered`, `uxAdmin.action.confirmed`) to validate
  navigation patterns and guardrail adoption.

## 12. Roadmap
1. Validate navigation taxonomy with current administrator interviews.
2. Produce low-fidelity wireframes for each module and test flows with clickable prototypes.
3. Iterate on data-density using real sample telemetry from middleware and stock market services.
4. Harden compliance features (audit exports, role approvals) before expanding automation controls.
