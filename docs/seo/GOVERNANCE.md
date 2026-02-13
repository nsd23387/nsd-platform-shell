# SEO Intelligence - Governance

This document defines the governance rules, constraints, and safety mechanisms
for the SEO Intelligence domain.

## Core Principles

### 1. Read-Only by Default

The vast majority of operations in SEO Intelligence are read-only:

- Fetching page data
- Viewing query performance
- Browsing recommendations
- Reading audit logs

**No data mutations occur without explicit user action.**

### 2. Human-in-the-Loop

All changes require human approval:

- AI generates recommendations
- Humans review diffs
- Humans approve/reject/defer
- Humans implement changes

**No auto-approval. No auto-deploy.**

### 3. Audit Everything

Every action is logged:

- Recommendation generation
- Approval decisions
- Rejection reasons
- Deferral dates

**Audit entries are immutable and retained indefinitely.**

### 4. Separation of Concerns

SEO Intelligence observes and recommends. It does not execute:

- No CMS access
- No website writes
- No deployment triggers
- No metadata injection

**Implementation is handled by a separate team/process.**

## Permission Model

### Hierarchy

```
seo:admin
    ├── seo:dashboard:view
    ├── seo:pages:view
    ├── seo:queries:view
    ├── seo:recommendations:view
    ├── seo:recommendations:approve
    ├── seo:recommendations:reject
    ├── seo:recommendations:defer
    └── seo:audit:view
```

### Permission Sources

All permissions come from the bootstrap context (`/api/v1/me`).
No permissions are hardcoded or inferred from roles.

### Example Permission Check

```typescript
import { hasPermission, SEO_PERMISSIONS } from '@/lib/seo/permissions';

// Check if user can approve recommendations
const canApprove = hasPermission(
  user.permissions,
  SEO_PERMISSIONS.APPROVE_RECOMMENDATIONS
);
```

## Write Operations

Only three write operations exist in SEO Intelligence:

### 1. Approve Recommendation

**Purpose**: Mark a recommendation as approved for implementation.

**Requirements**:
- User must be authenticated
- User must have `seo:recommendations:approve` permission
- Recommendation must be in `pending` status

**Effect**:
- Status changes to `approved`
- Audit entry created
- Timestamp and reviewer recorded

**Does NOT**:
- Deploy changes
- Modify website
- Update CMS

### 2. Reject Recommendation

**Purpose**: Mark a recommendation as rejected with reason.

**Requirements**:
- User must be authenticated
- User must have `seo:recommendations:reject` permission
- Recommendation must be in `pending` status
- **Reason must be provided** (minimum 10 characters)

**Effect**:
- Status changes to `rejected`
- Rejection reason stored
- Audit entry created
- Data fed to learning loop

**Does NOT**:
- Delete the recommendation
- Remove from history

### 3. Defer Recommendation

**Purpose**: Temporarily set aside a recommendation for later.

**Requirements**:
- User must be authenticated
- User must have `seo:recommendations:defer` permission
- Recommendation must be in `pending` status
- **Deferral date required** (1-90 days from now)

**Effect**:
- Status changes to `deferred`
- Deferral date stored
- Audit entry created
- Recommendation resurfaces after deferral period

**Does NOT**:
- Permanently dismiss recommendation
- Remove from approval queue

## Forbidden Operations

The following operations are explicitly forbidden:

| Operation | Why Forbidden |
|-----------|---------------|
| Auto-approve | Bypasses human review |
| Auto-deploy | Allows unreviewed changes |
| Bulk approve | Encourages insufficient review |
| Delete audit | Destroys accountability |
| CMS write | Outside domain scope |
| Direct publish | Bypasses deployment process |

## Approval Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Recommendation Engine                      │
│                    (Generates suggestions)                       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
                        ┌───────────────┐
                        │   PENDING     │
                        │ (Awaiting     │
                        │  Review)      │
                        └───────┬───────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
                    ▼           ▼           ▼
            ┌───────────┐ ┌───────────┐ ┌───────────┐
            │  APPROVED │ │  REJECTED │ │  DEFERRED │
            └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
                  │             │             │
                  │             │             │
                  ▼             ▼             ▼
          ┌─────────────┐ ┌───────────┐ ┌───────────┐
          │   Manual    │ │  Learning │ │ Resurface │
          │Implementation│ │   Loop   │ │  Later    │
          └─────────────┘ └───────────┘ └───────────┘
```

## Implementation Handoff

When a recommendation is approved:

1. **Export**: Approved recommendation is available for export
2. **Diff**: Clear before/after diff is provided
3. **Context**: Rationale and confidence included
4. **Handoff**: Website team receives the change request
5. **Implementation**: Changes are made through standard deployment
6. **Tracking**: Status updated to `implemented` when deployed

## Future Automation Rules

If Codex-style AI automation is introduced:

1. **Diff-Only**: Automation generates diffs, never deploys
2. **Human Gate**: All AI outputs require human approval
3. **Confidence Limits**: Low-confidence suggestions flagged
4. **Audit Trail**: Every AI decision logged
5. **Reversibility**: All changes must be reversible
6. **No Autonomous Deploy**: Even approved changes need manual deployment

## Compliance

### Data Retention

- Audit logs: Retained indefinitely
- Recommendations: Retained indefinitely
- Snapshots: Retained per data retention policy

### Access Logging

All access to SEO Intelligence is logged:
- User ID
- Timestamp
- Action taken
- Entities accessed

### Security

- All routes require authentication
- All write operations require specific permissions
- All data transmission over HTTPS
- No credentials stored client-side

## Enforcement

Governance rules are enforced at multiple levels:

1. **Type System**: TypeScript types prevent invalid operations
2. **API Layer**: Routes reject unauthorized requests
3. **Server Layer**: Functions throw on unauthorized actions
4. **Audit Layer**: All actions create audit entries
5. **Review**: Code changes reviewed for governance compliance
