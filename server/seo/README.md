# SEO Intelligence Server Layer

This directory contains the server-side data access and business logic for the SEO Intelligence domain within NSD Platform Shell.

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
├── fetchers/           # Read-only data access
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
3. Add `NOT IMPLEMENTED` warning for stubs
4. Document data source in comments
5. Export from `fetchers/index.ts`

### Adding New Approval Actions

1. Create file in `approvals/` directory
2. Define `Context` type with user info
3. Add validation function
4. Throw `NotImplemented` error in stub
5. Document governance constraints
6. Export from `approvals/index.ts`

### Type Safety

- All public functions must have typed parameters and return types
- Use types from `lib/seo/types.ts`
- Prefer `readonly` arrays and objects
- Never use `any` type

## Status

**Current State**: Scaffolding only (no runtime logic)

All functions in this directory are stubs that:
- Log warnings when called
- Return empty/null placeholders (fetchers)
- Throw `NotImplemented` errors (approvals)

This is intentional - implementation requires:
1. Data source integration
2. Database schema design
3. Authentication integration
4. API route implementation
