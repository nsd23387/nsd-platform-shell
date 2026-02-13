# SEO Intelligence Server Layer

This directory contains the server-side data access and business logic for the SEO Intelligence domain within NSD Platform Shell.

> **GOVERNANCE NOTICE**
> 
> This system does NOT execute SEO changes.
> This system does NOT modify website content.
> This system ONLY proposes and governs decisions.
> All execution happens externally (e.g., website repo via PR).

## Purpose

The SEO Intelligence domain provides:

- **Observability**: Monitor SEO performance across website pages
- **Recommendations**: Surface AI-generated improvement suggestions
- **Approval Workflow**: Human-in-the-loop review and approval process
- **Audit Trail**: Complete history of all actions and decisions
- **Learning Loop**: Feedback mechanism for improving recommendations

## Architecture

```
server/seo/
├── fetchers/           # Read-only data access (ODS GET calls)
│   ├── fetchSeoPages.ts
│   ├── fetchSeoQueries.ts
│   ├── fetchSeoSnapshots.ts
│   ├── fetchRecommendations.ts
│   └── fetchAuditLog.ts
│
├── approvals/          # Write operations (approval workflow only)
│   ├── approveRecommendation.ts
│   ├── rejectRecommendation.ts
│   └── deferRecommendation.ts
│
└── README.md           # This file
```

---

## ODS Canonical Alignment

This section documents the canonical ODS (nsd-ods-api) table structures that this domain will interface with. **No migrations are implemented here** — this is documentation for alignment purposes.

### System of Record

**ODS (nsd-ods-api) is the system of record for all SEO Intelligence data.**

Platform Shell is a **read-only façade** with the single exception of approval decisions, which are written back to ODS through governed paths.

### Table: `seo_recommendations`

Primary storage for AI-generated SEO recommendations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | **Primary Key** — Durable identifier for linking |
| `type` | `VARCHAR` | Recommendation family (enum) |
| `scope` | `JSONB` | Page scope, allowed changes, related pages |
| `evidence` | `JSONB` | Evidence signals from GSC, GA4, etc. |
| `current_state` | `JSONB` | Snapshot of current on-page state |
| `proposed_state` | `JSONB` | Diff-ready proposed changes |
| `confidence` | `JSONB` | Confidence model with factors |
| `expected_impact` | `JSONB` | Business impact estimates |
| `risk` | `JSONB` | Risk assessment |
| `status` | `VARCHAR` | Lifecycle status (enum) |
| `metadata` | `JSONB` | Traceability (model version, correlation) |
| `created_at` | `TIMESTAMPTZ` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Last update timestamp |

**Access Patterns:**
- **READ**: Platform Shell fetchers (via ODS API)
- **WRITE**: Recommendation Engine only (external system)
- **STATUS UPDATE**: Platform Shell approvals only

**Authoritative Fields:**
- `id`, `type`, `scope`, `evidence`, `current_state`, `proposed_state`, `confidence`, `expected_impact`, `risk`, `metadata`, `created_at` — Set by Recommendation Engine, immutable after creation

**Mutable Fields:**
- `status` — Updated by approval workflow
- `updated_at` — Auto-updated on any change

---

### Table: `seo_approvals`

Stores human approval decisions for recommendations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | **Primary Key** |
| `recommendation_id` | `UUID` | **Foreign Key** → `seo_recommendations.id` |
| `decision` | `VARCHAR` | approve / reject / defer |
| `decided_by` | `VARCHAR` | User ID or email |
| `decided_at` | `TIMESTAMPTZ` | Decision timestamp |
| `notes` | `TEXT` | Optional approval notes |
| `reason` | `TEXT` | Required for reject (learning loop) |
| `defer_until` | `TIMESTAMPTZ` | Required for defer |

**Access Patterns:**
- **READ**: Platform Shell fetchers
- **WRITE**: Platform Shell approvals (governed path)

**Constraints:**
- `recommendation_id` must exist in `seo_recommendations`
- `decision` must be valid enum value
- `reason` required when `decision = 'reject'`
- `defer_until` required when `decision = 'defer'`

**Authoritative Fields:**
- All fields are authoritative once written
- Approval records are **append-only** (no updates, no deletes)

---

### Table: `seo_implementation_refs`

Tracks external implementation of approved recommendations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | **Primary Key** |
| `recommendation_id` | `UUID` | **Foreign Key** → `seo_recommendations.id` |
| `method` | `VARCHAR` | manual / ai_generated_diff |
| `repo` | `VARCHAR` | Target repo (e.g., "nsd-website") |
| `pr_url` | `VARCHAR` | Pull request URL |
| `commit_hash` | `VARCHAR` | Merged commit reference |
| `implemented_by` | `VARCHAR` | User ID or email |
| `implemented_at` | `TIMESTAMPTZ` | Implementation timestamp |
| `rollback_pr_url` | `VARCHAR` | Rollback PR if rolled back |
| `rolled_back_at` | `TIMESTAMPTZ` | Rollback timestamp |

**Access Patterns:**
- **READ**: Platform Shell fetchers
- **WRITE**: External systems only (CI/CD, manual tracking)

**Important:**
- Platform Shell **NEVER** writes to this table
- This table tracks that changes happened elsewhere
- Implementation records are created by the website repo's CI/CD or manual process

---

### Table: `seo_learning_outcomes`

Stores measured outcomes after implementation (learning loop).

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | **Primary Key** |
| `recommendation_id` | `UUID` | **Foreign Key** → `seo_recommendations.id` |
| `evaluation_window_days` | `INTEGER` | Measurement period (14, 30, 60 days) |
| `observed_impact` | `JSONB` | Measured changes (CTR, ranking, etc.) |
| `verdict` | `VARCHAR` | positive / neutral / negative |
| `notes` | `TEXT` | Optional analysis notes |
| `measured_at` | `TIMESTAMPTZ` | Measurement timestamp |

**Access Patterns:**
- **READ**: Platform Shell fetchers
- **WRITE**: Analytics pipeline only (external system)

**Important:**
- Platform Shell **NEVER** writes to this table
- Outcomes are measured by analytics systems after the evaluation window
- Data feeds back into recommendation engine for model improvement

---

### Activity Events (Audit Trail)

In addition to the tables above, all significant actions emit events to `activity.events`:

| Event Type | Trigger |
|------------|---------|
| `seo.recommendation.created` | Recommendation engine creates new rec |
| `seo.recommendation.approved` | Admin approves via Platform Shell |
| `seo.recommendation.rejected` | Admin rejects via Platform Shell |
| `seo.recommendation.deferred` | Admin defers via Platform Shell |
| `seo.recommendation.implemented` | External system marks as implemented |
| `seo.recommendation.rolled_back` | External system marks as rolled back |
| `seo.recommendation.outcome.measured` | Analytics measures outcome |

**Access Patterns:**
- **READ**: Platform Shell audit log fetchers
- **WRITE**: Each system writes its own events

---

### Summary: Platform Shell Permissions

| Table | READ | WRITE |
|-------|------|-------|
| `seo_recommendations` | ✅ Yes | ❌ No (status only via approvals) |
| `seo_approvals` | ✅ Yes | ✅ Yes (governed) |
| `seo_implementation_refs` | ✅ Yes | ❌ No |
| `seo_learning_outcomes` | ✅ Yes | ❌ No |
| `activity.events` | ✅ Yes | ✅ Yes (append only) |

---

## Governance Rules

### Explicit Non-Goals

This system is **NOT** designed for:

1. **Auto-publishing**: No automatic deployment of SEO changes
2. **CMS writes**: No direct modification of website content
3. **Metadata injection**: No automated meta tag updates
4. **Page mutations**: No creation, deletion, or modification of pages
5. **Crawl triggering**: No programmatic indexing requests
6. **AI prompt execution**: No real-time AI generation (recommendations are pre-generated)

### Read-Only by Default

The vast majority of operations in this domain are **read-only**:

- All fetchers return immutable data snapshots
- No fetcher can modify external systems
- Data flows in one direction: sources → SEO Intelligence → UI

### Approval-Only Write Paths

The **only** write operations allowed are:

| Operation | Description | Creates Audit Entry |
|-----------|-------------|---------------------|
| `approveRecommendation` | Mark recommendation as approved | Yes |
| `rejectRecommendation` | Mark recommendation as rejected | Yes |
| `deferRecommendation` | Defer recommendation for later | Yes |

All write operations:
- Require authenticated user context
- Create immutable audit log entries
- Do not modify any external system
- Only change internal recommendation status

### Handoff-Only Publishing

When a recommendation is approved:

1. Status changes to `approved` (internal state)
2. Audit entry is created
3. **STOP** - That's it for this system

Publishing happens through a **separate, manual process**:

1. Approved recommendations are exported as diffs
2. Website team reviews the diff manually
3. Changes are applied through standard deployment process
4. Implementation is tracked separately

This separation ensures:
- No accidental auto-publishing
- Human review at every step
- Clear audit trail
- Rollback capability

## Integration Points

### Data Sources (Read-Only)

The SEO Intelligence system reads from:

| Source | Data Type | Access Pattern |
|--------|-----------|----------------|
| Search Console | Query performance | Scheduled sync |
| Analytics | Traffic data | Scheduled sync |
| Crawl Database | Page metadata | Event-driven |
| Recommendation Engine | AI suggestions | Async generation |

### Downstream Systems (Handoff Only)

The SEO Intelligence system hands off to:

| Target | Data Type | Handoff Pattern |
|--------|-----------|-----------------|
| Website Repo | Change diffs | Manual export |
| Learning System | Approval outcomes | Event stream |

## Future Automation (Codex-Style)

If AI-powered automation is introduced:

1. **Diff-only**: Automation generates diffs, never deploys
2. **Human approval required**: All changes need explicit approval
3. **Audit everything**: Every AI decision is logged
4. **Confidence gates**: Low-confidence suggestions are flagged
5. **No autonomous deployment**: Even approved changes need manual deployment

## Security Considerations

### Access Control

- All routes require authentication
- Permissions are bootstrap-driven (no hardcoded roles)
- Read permissions are separated from write permissions
- Admin permission grants all access but still cannot bypass audit

### Audit Requirements

- All state changes create audit entries
- Audit entries are immutable
- User identity is captured from authenticated session
- Timestamps are server-generated

### Data Isolation

- SEO data is isolated from CMS data
- No direct database connections to website
- API boundaries enforce read-only access
- Credentials are never stored in client-accessible locations

## Development Guidelines

### Adding New Fetchers

1. Create file in `fetchers/` directory
2. Export async function that returns typed data
3. Mark ODS integration points with `// ODS API: GET ...` comments
4. Document data source in comments
5. Export from `fetchers/index.ts`

### Adding New Approval Actions

1. Create file in `approvals/` directory
2. Define `Context` type with user info
3. Add validation function
4. Mark ODS integration points with `// ODS API: POST ...` comments
5. Document governance constraints
6. Export from `approvals/index.ts`

### Type Safety

- All public functions must have typed parameters and return types
- Use types from `lib/seo/types.ts`
- Prefer `readonly` arrays and objects
- Never use `any` type

## Status

**Current State**: Infrastructure + Contracts (no runtime ODS integration)

All functions in this directory are:
- Typed according to canonical schema
- Stubbed with mock data or TODO placeholders
- Ready for ODS API integration
- Documented with governance constraints

Next steps:
1. ODS API client integration
2. Authentication middleware
3. Real data flow testing
