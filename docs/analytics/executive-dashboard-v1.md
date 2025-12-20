# Executive Dashboard Specification (v1)

> **Version:** 1.0  
> **Status:** Authoritative  
> **Last Updated:** 2024-12-20

---

## Governance Statement

This document is **authoritative** and defines the intent and scope of the first executive-facing dashboard.

- **Changes require review** by data governance and product stakeholders
- **Implementation must conform** to these definitions
- **Documentation evolves slower than code** — stability is intentional
- This specification defines **what** must be visible, not **how** it is rendered

---

## 1. Dashboard Goal

### Primary Question

The Executive Dashboard answers one question:

> **"Is the system alive, healthy, and moving?"**

### Design Principles

| Principle | Description |
|-----------|-------------|
| **Glanceability** | Key health indicators visible within 5 seconds |
| **Truthfulness** | Data reflects actual system state, never fixtures or mocks |
| **Simplicity** | No filters, no drill-downs, no configuration |
| **Safety** | Read-only, no mutations, no admin actions |

### Target Audience

- Executive leadership
- Operations managers
- On-call engineers (quick health check)

### Non-Goals

This dashboard does **not**:

- Provide detailed debugging information
- Allow data manipulation or admin actions
- Support complex filtering or segmentation
- Replace operational monitoring tools

---

## 2. Sections & Metrics

The dashboard is organized into four sections, each addressing a specific aspect of system health.

---

### 2.1 System Pulse

**Purpose:** At-a-glance vital signs showing the system is operational.

| Metric | Definition | Time Window | Source |
|--------|------------|-------------|--------|
| **Total Events** | Count of all events in `activity.events` | Last 24 hours | `activity.events` |
| **Active Organizations** | Count of distinct `organization_id` values with at least one event | Last 7 days | `activity.events` |
| **Active Users** | Count of distinct `actor_id` values (non-null) with at least one event | Last 7 days | `activity.events` |
| **Errors** | Count of events where `event_type = 'system.error'` | Last 24 hours | `activity.events` |

**Display Requirements:**

- Each metric displayed as a single prominent number
- Errors should be visually distinct (e.g., red if > 0)
- Zero is a valid state and should display as "0", not "No data"

**Empty State Behavior:**

| Condition | Display |
|-----------|---------|
| No events in time window | "0" (not an error state) |
| Query failure | Error indicator with "Unable to load" |
| Partial data | Show available data with freshness indicator |

---

### 2.2 Throughput

**Purpose:** Show the volume and distribution of system activity.

#### Events Over Time

| Metric | Definition | Granularity |
|--------|------------|-------------|
| **Events per Hour** | Count of events grouped by hour | Hourly for last 24 hours |
| **Events per Day** | Count of events grouped by day | Daily for last 7 days |

**Display Requirements:**

- Time-series visualization (line or bar chart)
- X-axis: time periods
- Y-axis: event count
- No interactive filtering

#### Entity Type Breakdown

| Metric | Definition |
|--------|------------|
| **Events by Entity Type** | Count of events grouped by `entity_type` |

**Display Requirements:**

- Distribution visualization (pie, donut, or horizontal bar)
- Show top entity types
- Include "Other" category if needed
- Time window: Last 24 hours

---

### 2.3 Latency / SLA

**Purpose:** Measure time-to-action and identify operational delays.

#### Primary SLA Metric

| Metric | Definition |
|--------|------------|
| **Time to First Follow-up** | Duration from `organization.created` to the next event for that `entity_id` |

**Calculation:**

```
For each organization.created event:
  Find the next event WHERE entity_id = organization.entity_id
  Calculate: next_event.created_at - organization_created.created_at
```

**Aggregations:**

| Aggregation | Definition | Display |
|-------------|------------|---------|
| **Average** | Mean time-to-follow-up across all organizations | Duration (e.g., "2h 15m") |
| **P95** | 95th percentile time-to-follow-up | Duration |
| **Outliers** | Count of organizations exceeding threshold | Count with threshold label |

**Outlier Threshold:**

- Default: Organizations with no follow-up event within 24 hours of creation
- Display as a count with visual indicator

**Display Requirements:**

- Prominent display of Average and P95 values
- Outlier count with clear threshold label
- Time window: Organizations created in last 7 days

---

### 2.4 Trends

**Purpose:** Show directional movement of system activity over time.

#### 7-Day Activity Trend

| Metric | Definition |
|--------|------------|
| **Daily Event Count** | Total events per day for the last 7 days |

**Display Requirements:**

- Time-series visualization (line chart preferred)
- Show all 7 days even if some have zero events
- No comparative period (e.g., "vs last week")
- No forecasting or projections

**Trend Indicator:**

| Direction | Condition | Display |
|-----------|-----------|---------|
| Up | Today > Yesterday | Upward arrow or green indicator |
| Down | Today < Yesterday | Downward arrow or amber indicator |
| Flat | Today = Yesterday | Horizontal line or neutral indicator |

---

## 3. Rules & Constraints

### 3.1 Read-Only Guarantee

The Executive Dashboard is **strictly read-only**.

| Action | Allowed |
|--------|---------|
| View metrics | ✓ Yes |
| Refresh data | ✓ Yes |
| Filter data | ✗ No |
| Export data | ✗ No |
| Modify data | ✗ No |
| Admin actions | ✗ No |

### 3.2 No Mutations

The dashboard must not:

- Write to any database
- Modify any system state
- Trigger any workflows
- Send any notifications

All database connections should use read-only credentials.

### 3.3 No Admin Actions

The dashboard must not include:

- User management controls
- System configuration options
- Data correction tools
- Approval workflows

### 3.4 Safe Empty States

Every metric must handle the absence of data gracefully.

| Scenario | Required Behavior |
|----------|-------------------|
| Zero events | Display "0" |
| No organizations | Display "0" |
| No errors | Display "0" (this is good!) |
| Query timeout | Display error state with retry option |
| Partial failure | Display available data with indicator |

**Forbidden Behaviors:**

- Displaying sample/fixture data
- Showing "N/A" without explanation
- Hiding sections with no data
- Crashing or showing blank screen

### 3.5 No Fixture Fallback

The dashboard must **never** display mock or fixture data.

| Data Source | Allowed |
|-------------|---------|
| Live database queries | ✓ Yes |
| Cached query results | ✓ Yes (with freshness indicator) |
| Hardcoded fixtures | ✗ No |
| Sample data | ✗ No |
| Demo mode | ✗ No |

If data cannot be retrieved, display an error state — never fake data.

---

## 4. Data Sources

All metrics are derived from the ODS as defined in the [Data Dictionary](../data/data-dictionary.md).

| Section | Primary Source | Key Fields |
|---------|---------------|------------|
| System Pulse | `activity.events` | `event_type`, `organization_id`, `actor_id`, `created_at` |
| Throughput | `activity.events` | `entity_type`, `created_at` |
| Latency/SLA | `activity.events` | `event_type`, `entity_id`, `created_at` |
| Trends | `activity.events` | `created_at` |

### Event Types Used

The dashboard consumes the following event types from the [Activity Event Taxonomy](../data/activity-event-taxonomy.md):

- `organization.created` — for SLA measurement baseline
- `system.error` — for error counting
- All event types — for throughput and trend calculations

---

## 5. Refresh & Freshness

### Refresh Behavior

| Aspect | Specification |
|--------|---------------|
| **Auto-refresh** | Every 5 minutes |
| **Manual refresh** | User-triggered, no rate limit |
| **Freshness indicator** | Display "Last updated: X minutes ago" |

### Data Latency Expectations

| Metric Type | Expected Latency |
|-------------|------------------|
| Event counts | < 1 minute from event occurrence |
| Aggregations | < 5 minutes |
| SLA calculations | < 5 minutes |

---

## 6. Access Control

### Visibility

The Executive Dashboard should be accessible to:

- Users with `executive` role
- Users with `admin` role
- Users with `operations` role

### Authentication

- Requires authenticated session
- No anonymous access
- No public URL

---

## 7. References

- **[Data Dictionary](../data/data-dictionary.md)**: Schema definitions for source tables
- **[Activity Event Taxonomy](../data/activity-event-taxonomy.md)**: Event type definitions and semantics

---

## Appendix: Metric Summary

| Section | Metric | Time Window | Visualization |
|---------|--------|-------------|---------------|
| System Pulse | Total Events | 24h | Single number |
| System Pulse | Active Organizations | 7d | Single number |
| System Pulse | Active Users | 7d | Single number |
| System Pulse | Errors | 24h | Single number (highlighted) |
| Throughput | Events per Hour | 24h | Time series |
| Throughput | Events per Day | 7d | Time series |
| Throughput | Events by Entity Type | 24h | Distribution chart |
| Latency/SLA | Avg Time to Follow-up | 7d | Duration |
| Latency/SLA | P95 Time to Follow-up | 7d | Duration |
| Latency/SLA | Outliers | 7d | Count |
| Trends | 7-Day Activity | 7d | Line chart |
