# Activity Event Taxonomy

> **Version:** 1.0  
> **Status:** Authoritative  
> **Last Updated:** 2024-12-20

---

## Governance Statement

This document is **authoritative** and defines the canonical event contract used by all producers and analytics consumers.

- **Changes require review** by data governance stakeholders
- **Implementation must conform** to these definitions
- **Documentation evolves slower than code** — stability is intentional
- Event types, once introduced, are **immutable** and cannot be renamed or removed

---

## 1. Event Naming Rules

### Format

All event types follow the `<entity>.<action>` format:

```
organization.created
user.role_updated
system.ingest_completed
```

### Conventions

| Rule | Description | Example |
|------|-------------|---------|
| **Lowercase** | All characters must be lowercase | `user.created` ✓ / `User.Created` ✗ |
| **Dot-Delimited** | Entity and action separated by single dot | `organization.archived` ✓ |
| **Snake Case for Actions** | Multi-word actions use underscores | `user.role_updated` ✓ |
| **Past Tense** | Actions describe completed events | `created` ✓ / `create` ✗ |
| **No Abbreviations** | Use full words for clarity | `organization` ✓ / `org` ✗ |

### Immutability Rule

**Once an event type is introduced, it cannot be:**

- Renamed
- Removed
- Redefined with different semantics

If semantics change, a **new event type** must be created (e.g., `user.role_updated_v2`).

---

## 2. Required Event Fields

Every event in `activity.events` **must** contain the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_type` | VARCHAR | Yes | Canonical event name from this taxonomy |
| `entity_type` | VARCHAR | Yes | Category of affected entity |
| `entity_id` | UUID | Yes | Identifier of the affected entity |
| `actor_id` | UUID | Conditional | User who triggered the event (null for system events) |
| `payload` | JSONB | Yes | Event-specific data (may be empty object `{}`) |
| `created_at` | TIMESTAMP | Yes | When the event occurred (set by system) |

### Field Semantics

**`event_type`**
- Must exactly match a value from the Canonical Event List (Section 3)
- Producers must not invent new event types without governance approval

**`entity_type`**
- Coarse category: `organization`, `user`, `system`
- Used for filtering and routing

**`entity_id`**
- The UUID of the specific entity affected
- For system events, use a well-known system identifier

**`actor_id`**
- The user who caused the event
- Must be null for system-initiated events (no impersonation)

**`payload`**
- JSON object with event-specific context
- Structure varies by event type (see Section 3)
- Must never contain secrets, tokens, or PII beyond what is necessary

**`created_at`**
- Timestamp set by the Activity Spine at ingestion
- Producers should not set this field

---

## 3. Canonical Event List (v1)

### 3.1 Organization Events

Events related to the lifecycle and management of organizations.

---

#### `organization.created`

**Description:** A new organization has been created in the system.

| Attribute | Value |
|-----------|-------|
| Entity Type | `organization` |
| Actor Required | Yes |
| Reversible | No |

**Expected Payload:**

```json
{
  "name": "string",
  "slug": "string",
  "initial_status": "string"
}
```

---

#### `organization.updated`

**Description:** An organization's attributes have been modified.

| Attribute | Value |
|-----------|-------|
| Entity Type | `organization` |
| Actor Required | Yes |
| Reversible | No (append correction event) |

**Expected Payload:**

```json
{
  "changed_fields": ["string"],
  "previous_values": {},
  "new_values": {}
}
```

---

#### `organization.archived`

**Description:** An organization has been archived and is no longer active.

| Attribute | Value |
|-----------|-------|
| Entity Type | `organization` |
| Actor Required | Yes |
| Reversible | Via `organization.updated` with status change |

**Expected Payload:**

```json
{
  "reason": "string",
  "archived_by": "uuid",
  "previous_status": "string"
}
```

---

### 3.2 User Events

Events related to the lifecycle and role management of users.

---

#### `user.created`

**Description:** A new user has been created within an organization.

| Attribute | Value |
|-----------|-------|
| Entity Type | `user` |
| Actor Required | Yes |
| Reversible | No |

**Expected Payload:**

```json
{
  "email": "string",
  "organization_id": "uuid",
  "initial_role": "string",
  "invitation_method": "string"
}
```

---

#### `user.role_updated`

**Description:** A user's role within the organization has been changed.

| Attribute | Value |
|-----------|-------|
| Entity Type | `user` |
| Actor Required | Yes |
| Reversible | Via another `user.role_updated` event |

**Expected Payload:**

```json
{
  "previous_role": "string",
  "new_role": "string",
  "reason": "string"
}
```

---

#### `user.deactivated`

**Description:** A user has been deactivated and can no longer access the system.

| Attribute | Value |
|-----------|-------|
| Entity Type | `user` |
| Actor Required | Yes |
| Reversible | Via `user.reactivated` event (if implemented) |

**Expected Payload:**

```json
{
  "reason": "string",
  "deactivated_by": "uuid",
  "previous_status": "string"
}
```

---

### 3.3 System Events

Events generated by automated processes, jobs, and system operations.

---

#### `system.ingest_started`

**Description:** A data ingestion job has begun processing.

| Attribute | Value |
|-----------|-------|
| Entity Type | `system` |
| Actor Required | No |
| Reversible | N/A |

**Expected Payload:**

```json
{
  "job_id": "string",
  "source": "string",
  "expected_records": "number",
  "initiated_by": "string"
}
```

---

#### `system.ingest_completed`

**Description:** A data ingestion job has finished processing successfully.

| Attribute | Value |
|-----------|-------|
| Entity Type | `system` |
| Actor Required | No |
| Reversible | N/A |

**Expected Payload:**

```json
{
  "job_id": "string",
  "source": "string",
  "records_processed": "number",
  "duration_ms": "number",
  "status": "string"
}
```

---

#### `system.error`

**Description:** A system error has occurred that requires attention.

| Attribute | Value |
|-----------|-------|
| Entity Type | `system` |
| Actor Required | No |
| Reversible | N/A |

**Expected Payload:**

```json
{
  "error_code": "string",
  "error_message": "string",
  "severity": "string",
  "component": "string",
  "context": {}
}
```

**Severity Levels:**
- `critical`: Requires immediate attention
- `error`: Requires investigation
- `warning`: Should be monitored

---

## 4. Immutability & Correction Rules

### The Immutability Principle

Events in `activity.events` are **immutable**. This is a foundational guarantee of the Activity Spine.

| Action | Allowed | Rationale |
|--------|---------|-----------|
| Insert new event | ✓ Yes | Normal operation |
| Update existing event | ✗ No | Violates immutability |
| Delete existing event | ✗ No | Violates append-only |
| Backdate events | ✗ No | Violates temporal integrity |

### Correction Pattern

When an event contains incorrect data, the correction is **always** a new event:

```
┌─────────────────────────────────────────────────────────┐
│ INCORRECT APPROACH (forbidden)                          │
│                                                         │
│ UPDATE activity.events                                  │
│ SET payload = '{"role": "admin"}'                       │
│ WHERE id = 'abc-123';                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ CORRECT APPROACH                                        │
│                                                         │
│ INSERT INTO activity.events (event_type, ...)           │
│ VALUES ('user.role_updated', ...);                      │
│                                                         │
│ -- The new event records the correction                 │
│ -- The original event remains for audit                 │
└─────────────────────────────────────────────────────────┘
```

### Why Immutability Matters

1. **Audit Trail**: Complete history is preserved
2. **Replayability**: Events can be replayed for debugging or recovery
3. **Trust**: Consumers can rely on events not changing
4. **Compliance**: Regulatory requirements often mandate immutable logs

---

## 5. Extensibility

### Adding New Event Types

New event types may be added following this process:

1. **Proposal**: Document the new event type with all required metadata
2. **Review**: Data governance stakeholders review for consistency and necessity
3. **Approval**: Event type is added to this taxonomy
4. **Implementation**: Producers may begin emitting the new event

### Versioning Events

If an event's payload structure must change significantly:

1. **Do not modify** the existing event type
2. **Create a new version**: `event.action_v2`
3. **Deprecate** the old version (but do not remove)
4. **Migrate** producers to the new version

### Reserved Entity Types

The following entity types are reserved for platform use:

- `organization`
- `user`
- `system`
- `integration`
- `workflow`

---

## 6. References

- **[Data Dictionary](./data-dictionary.md)**: Schema definitions for `activity.events` table
- **[Executive Dashboard Specification](../analytics/executive-dashboard-v1.md)**: Analytics requirements that consume these events

---

## Appendix: Quick Reference Card

### Event Types at a Glance

| Event Type | Entity | Description |
|------------|--------|-------------|
| `organization.created` | organization | New organization created |
| `organization.updated` | organization | Organization attributes changed |
| `organization.archived` | organization | Organization archived |
| `user.created` | user | New user created |
| `user.role_updated` | user | User role changed |
| `user.deactivated` | user | User deactivated |
| `system.ingest_started` | system | Ingestion job started |
| `system.ingest_completed` | system | Ingestion job completed |
| `system.error` | system | System error occurred |

### Required Fields Checklist

- [ ] `event_type` — matches canonical list
- [ ] `entity_type` — valid entity category
- [ ] `entity_id` — valid UUID
- [ ] `actor_id` — valid UUID or null for system events
- [ ] `payload` — valid JSON object
- [ ] `created_at` — set by Activity Spine
