# VirtualBank Data Store Architecture

## 1. Purpose & Scope
The VirtualBank data store stack safeguards every fictional balance, transaction, and market insight. It must feel as trustworthy as a real bank while retaining the agility to power playful experiences. This document defines the storage landscape, data flows, and integration points with the middleware, stock market engine, and frontend.

## 2. Core Requirements
- **Low-latency access** for balance lookups and portfolio views (<50 ms P99 for most reads).
- **High-throughput writes** to absorb bursts of simulated trading and account activity (10k+ transactions per minute sustained).
- **Strict consistency** for account balances and ledger states.
- **Horizontal scalability** via read replicas and partitioning to support future player growth.
- **Zero data loss objectives** with point-in-time recovery, continuous archiving, and strong backups.
- **Operational simplicity** through automation, observability, and least-privilege access control.

## 3. Logical Architecture Overview
```
[Frontend Clients]
        |
        v
[Middleware API Gateway] <----> [Redis Edge Cache]
        |
        v
[Primary PostgreSQL Cluster] <----> [Read Replicas]
        |
        +--> [Kafka Event Bus] --> [Analytics Warehouse]
        |
        +--> [S3-compatible Archive Storage]
```

### Component Summary
- **Primary PostgreSQL Cluster:** Authoritative source of truth for accounts, transactions, market positions, and reference data. Runs in HA mode with synchronous replication across two availability zones.
- **Read Replicas:** Asynchronous replicas serving analytical queries, reporting, and intensive read paths without touching the primary.
- **Redis Edge Cache:** In-memory cache for session tokens, market snapshots, and rate-limit counters; sits close to middleware to cut round trips.
- **Kafka Event Bus:** Carries append-only change events (transaction committed, quote updated) to downstream consumers such as the market simulator and analytics warehouse.
- **Analytics Warehouse (e.g., ClickHouse/BigQuery):** Optimized for historical insights, compliance reporting, and experience tuning; sourced from Kafka streams and replica snapshots.
- **Archive Storage:** Immutable object storage for ledger snapshots, compliance exports, and recovery artifacts.

## 4. Data Domains & Schemas
| Domain | Tables/Streams | Description |
| --- | --- | --- |
| **Identity & Access** | `users`, `roles`, `sessions` | Profiles, role assignments, authentication metadata. Session tokens cached in Redis. |
| **Ledger & Transfers** | `accounts`, `account_balances`, `transfers`, `ledger_entries` | Double-entry ledger guaranteeing deterministic balances. Write path uses serializable transactions. |
| **Market Trading** | `orders`, `trades`, `positions`, `quotes` | Handles order lifecycle, executed trades, and holdings per user. Quotes ingested from the stock market engine via Kafka. |
| **Market Reference Data** | `securities`, `indices`, `market_calendar` | Static/semi-static metadata fed by world-building scripts. |
| **Risk & Limits** | `exposure_limits`, `breach_events`, `alerts` | Tracks automated guardrails triggered by middleware or market engine. |
| **Telemetry & Audit** | `event_audit`, `api_logs`, `system_metrics` | Append-only audit logs enriched with middleware metadata for traceability. |

## 5. Data Flow with the Middleware
1. **API Requests:** Middleware authenticates the caller, performs business validation, and issues SQL or cached reads using a connection pool (PgBouncer or built-in pool).
2. **Transaction Processing:** Middleware wraps transfers and trades in stored procedures to guarantee atomic multi-table updates.
3. **Caching Strategy:** Frequently accessed aggregates (balances, daily P&L) are cached in Redis with short TTLs and invalidated through pub/sub events emitted after writes.
4. **Event Streaming:** Middleware publishes domain events to Kafka after committing database transactions. Consumers (notification service, stock market engine) react asynchronously without blocking the main flow.
5. **Monitoring & Observability:** Middleware emits metrics (query latency, cache hit ratio) to Prometheus/Grafana dashboards to detect data store stress early.

## 6. Data Flow with the Stock Market Engine
- **Market Data Ingestion:** The engine streams tick updates and synthetic fundamentals into Kafka topics (`market.quotes`, `market.news`). A Kafka Connect pipeline hydrates PostgreSQL (`quotes` table) and Redis caches.
- **Order Routing:** Middleware receives orders from the frontend, validates limits, and writes to `orders`. A dedicated market-matching service pulls from the order queue (via PostgreSQL LISTEN/NOTIFY or Kafka) to execute trades.
- **Trade Settlement:** Executed trades result in atomic updates across `trades`, `positions`, and the middleware ledger tables to reflect debits/credits.
- **Risk Feedback Loop:** Breach events detected by the engine are written back into `breach_events` and surfaced to the middleware for user messaging.

## 7. Data Flow with the Frontend
- **Read Path:** Frontend only talks to the middleware. Middleware aggregates read models (balances, holdings, performance charts) using SQL views and cached fragments before returning JSON.
- **Write Path:** All mutation requests (transfers, order placements, settings updates) flow through middleware validation, ensuring the frontend never touches the database directly.
- **Real-time Updates:** WebSocket channels from the middleware push Redis-sourced market snapshots and Kafka-derived notifications to connected clients.

## 8. Performance & Scalability Blueprint
- **Connection Management:** Middleware maintains short-lived pooled connections, scaling horizontally with stateless pods. PgBouncer enforces limits and protects the primary.
- **Partitioning:** Time-based partitioning for `ledger_entries` and `trades` keeps indexes lean and simplifies archival. Market data partitions roll daily.
- **Read Scaling:** Additional read replicas can be promoted regionally to feed localized middleware clusters. Feature flags allow routing non-critical reads to eventually consistent replicas.
- **Caching Rules:** Write-through cache for profile data, read-through cache for quotes, and aggressive invalidation for balance-related keys to guarantee correctness.
- **Capacity Planning:** Daily batch jobs analyze throughput metrics and trigger infrastructure-as-code workflows to scale storage, add replicas, or expand cache memory.

## 9. Reliability & Disaster Recovery
- **Backups:** Continuous WAL archiving with 15-minute snapshots retained for 35 days. Nightly full backups shipped to multi-region object storage.
- **Failover:** Patroni or managed PostgreSQL orchestrates automatic failover between HA nodes. Redis runs in cluster mode with sentinel/managed failover.
- **Disaster Testing:** Quarterly game-day exercises simulate region loss, verifying RPO (0) and RTO (<15 minutes) commitments.
- **Schema Governance:** Migrations run via Liquibase/Flyway pipelines with automated rollback plans and pre-production validation datasets.

## 10. Security & Compliance Guardrails
- **Encryption:** TLS in transit for all connections, transparent data encryption at rest, and secrets stored in a vault service with dynamic credentials.
- **Access Control:** RBAC enforced through IAM; only the middleware and controlled analytics jobs receive direct database roles. All ad-hoc access requires just-in-time approval and is fully audited.
- **Data Masking:** Sensitive PII (even fictional) uses masking in non-production environments to simulate privacy best practices.
- **Compliance Simulation:** Retain audit trails and approvals to mimic SOC2/PCI-style control expectations for educational realism.

## 11. Operational Playbooks
- **Schema Change Checklist:** Capacity review → migration dry run → maintenance window scheduling → rollout with monitoring.
- **Incident Response:** 24/7 on-call rotation with runbooks covering replication lag, cache saturation, and event bus degradation.
- **Cost Monitoring:** Automated reports compare storage spend vs. budget targets, enabling proactive tuning of retention policies.

## 12. Future Extensions
- Add columnar extensions (Citus/Timescale) for high-frequency market analytics.
- Explore CRDT-backed offline caches to support mobile-first experiences.
- Introduce synthetic data generators that produce load-test datasets aligned with gameplay seasons.
