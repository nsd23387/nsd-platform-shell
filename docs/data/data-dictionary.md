# Data Dictionary

> **Version:** 1.0  
> **Status:** Authoritative  
> **Last Updated:** 2024-12-20

---

## Governance Statement

This document is **authoritative** and defines the canonical meaning of all schemas, tables, and fields in the NSD Operational Data Store (ODS).

- **Changes require review** by data governance stakeholders
- **Implementation must conform** to these definitions
- **Documentation evolves slower than code** — stability is intentional
- This dictionary is the **single source of truth** for data semantics

---

## 1. Overview

### What is the ODS?

The Operational Data Store (ODS) is the **golden source of truth** for all operational data within the NSD Unified Business Platform. It consolidates data from multiple source systems into a unified, queryable layer that serves both operational and analytical workloads.

### Definition of "Golden Source of Truth"

A golden source of truth is:

- **Authoritative**: The definitive version of a data entity
- **Consistent**: Uniform meaning across all consumers
- **Governed**: Changes are controlled and documented
- **Traceable**: Every value has a known origin and timestamp

### Append-Only and Immutability Principles

The ODS adheres to the following data integrity principles:

| Principle | Description |
|-----------|-------------|
| **Append-Only Events** | Activity events are never modified or deleted after creation |
| **Entity Versioning** | Core entities maintain history through timestamped records |
| **No Silent Mutations** | All state changes are captured as events |
| **Correction by Addition** | Errors are corrected by appending new records, not modifying existing ones |

### Relationship Between Data, Events, and Analytics

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Source Systems │────▶│   ODS (Golden)  │────▶│    Analytics    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │ Activity Events │
                        │ (Append-Only)   │
                        └─────────────────┘
```

- **Core entities** represent the current state of business objects
- **Activity events** capture the history of all state changes
- **Analytics** derives insights from both entities and events

---

## 2. Schemas

### 2.1 Core Schema (`core`)

The `core` schema contains foundational business entities that represent the current state of the system.

---

#### Table: `core.organizations`

**Description:** Represents business organizations that are tenants or customers within the platform. Each organization is a discrete entity with its own users, permissions, and operational context.

| Column Name | Data Type | Nullable | Description | Source of Truth |
|-------------|-----------|----------|-------------|-----------------|
| `id` | UUID | No | Unique identifier for the organization | System |
| `name` | VARCHAR | No | Display name of the organization | User |
| `slug` | VARCHAR | No | URL-safe unique identifier | Derived |
| `status` | VARCHAR | No | Current lifecycle status (active, archived, suspended) | System |
| `created_at` | TIMESTAMP | No | Timestamp when the organization was created | System |
| `updated_at` | TIMESTAMP | No | Timestamp of last modification | System |
| `metadata` | JSONB | Yes | Extensible attributes for organization-specific data | User |

**Notes:**
- `slug` is derived from `name` at creation time and is immutable thereafter
- `status` transitions are governed by business rules and emit corresponding events

---

#### Table: `core.users`

**Description:** Represents individual users who belong to one or more organizations. Users are the actors who perform actions within the system.

| Column Name | Data Type | Nullable | Description | Source of Truth |
|-------------|-----------|----------|-------------|-----------------|
| `id` | UUID | No | Unique identifier for the user | System |
| `organization_id` | UUID | No | Foreign key to the user's primary organization | System |
| `email` | VARCHAR | No | User's email address (unique per organization) | User |
| `display_name` | VARCHAR | Yes | Human-readable name for display purposes | User |
| `role` | VARCHAR | No | User's role within the organization | User |
| `status` | VARCHAR | No | Current lifecycle status (active, deactivated, pending) | System |
| `created_at` | TIMESTAMP | No | Timestamp when the user was created | System |
| `updated_at` | TIMESTAMP | No | Timestamp of last modification | System |
| `last_active_at` | TIMESTAMP | Yes | Timestamp of user's last activity | System |

**Notes:**
- `email` uniqueness is scoped to `organization_id`
- `role` values are defined by the RBAC system
- `last_active_at` is updated by activity event processing

---

### 2.2 Activity Schema (`activity`)

The `activity` schema contains the immutable event log that captures all system activity.

---

#### Table: `activity.events`

**Description:** The append-only event log that records every significant action in the system. This table is the foundation for audit trails, analytics, and SLA measurement.

| Column Name | Data Type | Nullable | Description | Source of Truth |
|-------------|-----------|----------|-------------|-----------------|
| `id` | UUID | No | Unique identifier for the event | System |
| `event_type` | VARCHAR | No | Canonical event name (e.g., `organization.created`) | System |
| `entity_type` | VARCHAR | No | Type of entity affected (e.g., `organization`, `user`) | System |
| `entity_id` | UUID | No | Identifier of the affected entity | System |
| `actor_id` | UUID | Yes | User who triggered the event (null for system events) | System |
| `organization_id` | UUID | Yes | Organization context for the event | System |
| `payload` | JSONB | No | Event-specific data and context | Derived |
| `created_at` | TIMESTAMP | No | Timestamp when the event occurred | System |

**Append-Only Guarantees:**

| Guarantee | Description |
|-----------|-------------|
| **No Updates** | Rows in `activity.events` are never modified after insertion |
| **No Deletes** | Rows are never deleted (retention policies are handled externally) |
| **Immutable Payload** | The `payload` column is written once and never changed |
| **Monotonic Timestamps** | `created_at` values always increase for a given producer |

**Column Semantics:**

- **`event_type`**: The canonical name of the event, following the `<entity>.<action>` convention. See [Activity Event Taxonomy](./activity-event-taxonomy.md) for the authoritative list.

- **`entity_type`**: The category of the affected entity. Used for filtering and aggregation.

- **`entity_id`**: The specific instance affected. Combined with `entity_type`, this uniquely identifies the subject of the event.

- **`actor_id`**: The user responsible for the action. Null when the action is performed by the system (e.g., scheduled jobs, automated processes).

- **`payload`**: A JSON object containing event-specific details. The structure varies by `event_type` and is documented in the Event Taxonomy.

**Relationship to SLAs and Metrics:**

The `activity.events` table is the primary source for:

- **SLA Measurement**: Time between related events (e.g., `organization.created` → first user action)
- **Throughput Metrics**: Event counts over time windows
- **Error Tracking**: Events of type `system.error`
- **User Activity**: Aggregations by `actor_id` and `organization_id`

---

## 3. Data Ownership & Guarantees

### 3.1 Core Schema Ownership

| Aspect | Value |
|--------|-------|
| **Owning System** | NSD Platform Core Services |
| **Write Authority** | Platform API (via authenticated requests) |
| **Read Guarantees** | Eventually consistent within 1 second |
| **Mutation Rules** | Updates allowed; all changes emit activity events |

**Access Pattern:**
- Core entities are read/write for authorized platform services
- Direct database access is prohibited for external consumers
- All reads should go through the Platform API or ODS read replicas

### 3.2 Activity Schema Ownership

| Aspect | Value |
|--------|-------|
| **Owning System** | NSD Activity Spine |
| **Write Authority** | Event producers via Activity Spine SDK |
| **Read Guarantees** | Strongly consistent for same-producer reads |
| **Mutation Rules** | **None** — append-only, no updates or deletes |

**Access Pattern:**
- Write access is exclusively through the Activity Spine SDK
- Read access is available to all analytics consumers
- No service may modify or delete events under any circumstance

---

## 4. References

- **[Activity Event Taxonomy](./activity-event-taxonomy.md)**: Authoritative reference for all event types, naming conventions, and payload structures
- **[Executive Dashboard Specification](../analytics/executive-dashboard-v1.md)**: Analytics requirements derived from this data dictionary

---

## Appendix: Glossary

| Term | Definition |
|------|------------|
| **Entity** | A business object with identity and state (e.g., organization, user) |
| **Event** | An immutable record of something that happened |
| **Actor** | The user or system that caused an event |
| **Payload** | Event-specific data carried within an event record |
| **ODS** | Operational Data Store — the golden source of truth |
| **Append-Only** | A data structure where records are only added, never modified or removed |
