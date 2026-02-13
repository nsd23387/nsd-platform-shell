# SEO Intelligence - Overview

## What is SEO Intelligence?

SEO Intelligence is an admin-only domain within the NSD Platform Shell that provides:

1. **Observability**: Monitor SEO performance across all website pages
2. **AI Recommendations**: Surface AI-generated improvement suggestions
3. **Approval Workflows**: Human-in-the-loop review and approval process
4. **Audit Trail**: Complete history of all actions for accountability
5. **Learning Loop**: Feedback mechanism to improve future recommendations

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SEO Intelligence UI                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ Dashboard│ │  Pages   │ │Recommendations│ │   Approvals    │  │
│  └──────────┘ └──────────┘ └──────────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ /pages   │ │ /queries │ │/recommendations│ │  /approvals   │  │
│  │ (READ)   │ │ (READ)   │ │    (READ)     │ │ (READ/WRITE)  │  │
│  └──────────┘ └──────────┘ └──────────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Server Layer                               │
│  ┌───────────────────────┐    ┌─────────────────────────────┐   │
│  │       Fetchers        │    │        Approvals            │   │
│  │  (Read-Only Access)   │    │   (Write with Audit)        │   │
│  └───────────────────────┘    └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Sources                                │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────────────┐  │
│  │Search Console│ │  Analytics   │ │   Recommendation DB     │  │
│  │  (External)  │ │  (External)  │ │      (Internal)         │  │
│  └──────────────┘ └──────────────┘ └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

### Dashboard
- Overview of SEO health metrics
- Trend visualization
- Recommendation queue status
- Action items summary

### Pages
- List of all tracked pages
- Index status monitoring
- Performance metrics per page
- Links to page-specific recommendations

### Queries
- Search query performance from Search Console
- Intent classification
- Position and CTR tracking
- Opportunity identification

### Recommendations
- AI-generated improvement suggestions
- Confidence scores for reliability
- Impact assessments for prioritization
- Full diff view for transparency

### Approvals
- Pending recommendations queue
- Review workflow
- Approve / Reject / Defer actions
- Rejection reasons for learning

### Audit Log
- Complete action history
- Immutable records
- User accountability
- Learning data for AI improvement

## Access Control

- **Admin-only**: All SEO routes require authentication
- **Permission-based**: Granular permissions for different actions
- **Bootstrap-driven**: Permissions come from `/api/v1/me`

### Permissions

| Permission | Description |
|------------|-------------|
| `seo:dashboard:view` | View dashboard |
| `seo:pages:view` | View pages list |
| `seo:queries:view` | View queries |
| `seo:recommendations:view` | View recommendations |
| `seo:recommendations:approve` | Approve recommendations |
| `seo:recommendations:reject` | Reject recommendations |
| `seo:recommendations:defer` | Defer recommendations |
| `seo:audit:view` | View audit log |
| `seo:admin` | Full access |

## Data Flow

### Read Path (Most Common)
```
Data Sources → Fetchers → API Routes → UI Components
```

All read operations flow through read-only fetchers. No mutations are possible
through the read path.

### Write Path (Approvals Only)
```
User Action → UI → API Route → Approval Handler → Audit Log → Response
```

Write operations are limited to approval actions and always create audit entries.

## Integration Points

### Data Sources (Read-Only)
- Google Search Console
- Website Analytics
- Internal Crawl Database
- AI Recommendation Engine

### Handoff Points (Output)
- Approved recommendations → Website team (manual)
- Audit data → Learning system
- Performance data → Executive dashboards

## Current Status

**Scaffolding Complete** - The SEO Intelligence domain has been scaffolded with:

- [x] Type definitions
- [x] Constants and configuration
- [x] API route stubs
- [x] UI components
- [x] Page layouts
- [x] Permission structure
- [x] Governance documentation

**Not Yet Implemented**:

- [ ] Data source integration
- [ ] Authentication middleware
- [ ] Recommendation engine
- [ ] Audit logging backend
- [ ] Learning loop integration

## Next Steps

1. **Connect Data Sources**: Integrate with Search Console and analytics
2. **Implement Auth**: Wire up authentication and permission checks
3. **Build Recommendation Engine**: Set up AI pipeline for suggestions
4. **Add Audit Backend**: Implement persistent audit logging
5. **Create Learning Loop**: Feed approval outcomes back to AI
