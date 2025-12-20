# NSD Command Center

**A pure frontend Platform Shell UI for Neon Signs Depot (NSD)**

The NSD Command Center provides unified navigation, read-only dashboards, and an app registry for NSD's internal platform. This is a frontend-only application that consumes pre-computed metrics from backend APIs.

## Purpose

- **Unified Navigation:** Single entry point for all NSD internal applications
- **Read-Only Dashboards:** Executive, Operations, Design, Media, and Sales views
- **App Registry:** Feature-gated application launcher with RBAC support
- **Bootstrap Integration:** Consumes `/api/v1/me` for identity, permissions, and feature visibility

## Quick Start

```bash
npm install
npm run dev        # Start Next.js dev server
npm run build      # Build for production
npm run start      # Start production server
npm run type-check # Run TypeScript type checking
npm run lint       # Run ESLint
```

## Architecture

### Frontend Only

This project is a **pure frontend application** with zero backend logic:

- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS with NSD design tokens
- **Deployment:** Vercel (static export compatible)
- **Typography:** System fonts (Poppins for headers, Inter for body)
- **Colors:** Deep Indigo `#020F5A`, Violet `#692BAA`, Magenta `#CC368F` (CTAs only)

### Bootstrap Flow

On application load:

1. Call `GET /api/v1/me` with JWT Bearer token (exactly once)
2. Token source: `window.__NSD_AUTH_TOKEN__` or `NEXT_PUBLIC_NSD_DEV_JWT` fallback
3. Store response in React context memory only (no persistence)
4. No retries, caching, or transforms
5. Provide: user identity, organization, roles, permissions, environment, feature_visibility

### Bootstrap Helpers

The bootstrap context exposes two helpers:

- `hasPermission(permission: string): boolean` - Check if user has a specific permission
- `isFeatureVisible(feature: string): boolean` - Check if a feature is visible

**These helpers read directly from bootstrap data. No inference, no role mapping, no hierarchy logic.**

### Data Access

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/api/v1/me` | Bootstrap (identity, permissions, feature_visibility) | ✅ Active |
| `/activity-spine/metrics/orders` | Order metrics | ✅ Active |
| `/activity-spine/metrics/media` | Media processing metrics | ✅ Active |
| `/activity-spine/metrics/mockups` | Design mockup metrics | ✅ Active |
| `/activity-spine/funnels/orders` | Order conversion funnel | ✅ Active |
| `/activity-spine/slas` | SLA overview | ✅ Active |
| `/activity-spine/slas/mockups` | Mockup SLA details | ✅ Active |

All Activity Spine endpoints accept `?period=7d|30d` query parameter.

## Project Structure

```
├── app/
│   ├── dashboard/
│   │   ├── design/
│   │   │   └── page.tsx         # Design dashboard
│   │   ├── executive/
│   │   │   └── page.tsx         # Executive dashboard
│   │   ├── media/
│   │   │   └── page.tsx         # Media dashboard
│   │   ├── operations/
│   │   │   └── page.tsx         # Operations dashboard
│   │   ├── sales/
│   │   │   └── page.tsx         # Sales dashboard
│   │   ├── layout.tsx           # Dashboard layout with navigation
│   │   └── page.tsx             # Dashboard index
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout with BootstrapProvider
│   ├── providers.tsx            # Client-side providers
│   └── page.tsx                 # Landing page
├── components/
│   ├── dashboard/               # Dashboard-specific components
│   │   ├── DashboardCard.tsx
│   │   ├── DashboardGrid.tsx
│   │   ├── DashboardHeader.tsx
│   │   ├── MetricCard.tsx
│   │   ├── SLACard.tsx
│   │   ├── TieredSLADistributionCard.tsx
│   │   └── index.ts
│   └── index.ts
├── contexts/
│   ├── BootstrapContext.tsx     # /api/v1/me integration
│   └── index.ts
├── hooks/
│   ├── useActivitySpine.ts      # Activity Spine data hooks
│   ├── useRBAC.tsx              # Bootstrap-driven RBAC hook
│   └── index.ts
├── lib/
│   ├── sdk.ts                   # Bootstrap + Activity Spine API client
│   └── index.ts
├── types/
│   ├── activity-spine.ts        # Activity Spine types
│   ├── bootstrap.ts             # Bootstrap response types
│   └── index.ts
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Landing page with dashboard links |
| `/dashboard` | Dashboard index |
| `/dashboard/executive` | High-level business metrics |
| `/dashboard/operations` | Order pipeline and SLAs |
| `/dashboard/design` | Mockup turnaround and tiered SLA performance |
| `/dashboard/media` | Media processing metrics |
| `/dashboard/sales` | Quote volume and conversion funnels |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_ODS_API_URL` | Base URL for ODS API (bootstrap endpoint) |
| `NEXT_PUBLIC_ACTIVITY_SPINE_URL` | Base URL for Activity Spine API |
| `NEXT_PUBLIC_NSD_DEV_JWT` | JWT token for development (fallback) |
| `ACTIVITY_SPINE_API_URL` | Backend URL for API proxy (development) |

---

## Governance & Non-Negotiables

### Strict Architecture Rules

1. **`/api/v1/me` is the ONLY bootstrap source**
   - All identity, permissions, roles, and feature visibility come from this endpoint
   - No other source of truth for access control
   - Called exactly once on app load

2. **No backend logic in frontend**
   - This is a pure browser client
   - No Express/Node servers
   - No mock API servers
   - No database access

3. **No SLA or metric calculations in UI**
   - UI displays pre-computed metrics from API
   - SLA tiers (exceptional/standard/breach/pending) are API-provided
   - No business logic calculations
   - Display-only transformations (e.g., formatting percentages) are acceptable

4. **RBAC and feature visibility from bootstrap ONLY**
   - App visibility driven by `feature_visibility[]` from `/api/v1/me`
   - Permission checks reference `permissions[]` from bootstrap
   - No conditional logic based on app internals
   - No hardcoded permission matrices

5. **Platform Shell is strictly read-only**
   - No write operations
   - No state mutations beyond UI preferences
   - Navigation is link-based only

### Explicit Prohibitions

- **Do NOT** parse JWTs in UI code
- **Do NOT** infer permissions from other data
- **Do NOT** hardcode roles or role-based logic
- **Do NOT** derive feature visibility logic
- **Do NOT** recreate RBAC rules
- **Do NOT** add neon effects, shadows, or glows (minimalist design)
- **Do NOT** use Magenta except for CTAs

### SLA Tiered Visualization

UI renders API-provided tiers without computation:

| Tier | Description | Visual |
|------|-------------|--------|
| `exceptional` | Response within 2 hours | Green/Violet |
| `standard` | Response within 24 hours | Yellow/Indigo |
| `breach` | Response exceeded 24 hours | Red/Magenta |
| `pending` | Not yet evaluated | Gray |

**Critical:** UI does NOT calculate SLA tiers - it only renders what the API returns.

---

## Development

### API Proxy

In development, the Next.js config proxies Activity Spine API calls:

```javascript
// next.config.js
async rewrites() {
  return [
    {
      source: '/api/activity-spine/:path*',
      destination: `${process.env.ACTIVITY_SPINE_API_URL}/:path*`,
    },
  ];
}
```

### Error Handling

The UI handles:

- Loading states (skeleton components)
- Empty states (via `emptyReason` from API)
- Error states using canonical error codes
- 401 unauthorized (authentication failed)

### Design System

- Minimalist design with high whitespace
- Flat cards with subtle borders (no shadows, no glows)
- No decorative animations
- Charts use Violet and Deep Indigo only

---

## Deployment

### Vercel

This application is designed for Vercel deployment with Next.js:

```bash
npm run build
```

The build outputs a production-ready Next.js application.

### Environment Configuration

Set the following environment variables in Vercel:

- `NEXT_PUBLIC_ODS_API_URL` - ODS API base URL (for bootstrap)
- `NEXT_PUBLIC_ACTIVITY_SPINE_URL` - Activity Spine API base URL
- `ACTIVITY_SPINE_API_URL` - Backend proxy target (if using rewrites)

---

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard UI | ✅ Complete | All 5 dashboards implemented |
| Activity Spine Integration | ✅ Complete | SDK and hooks functional |
| Tiered SLA Visualization | ✅ Complete | v1.5.1 tier model supported |
| Bootstrap (`/api/v1/me`) | ✅ Complete | Wired via BootstrapContext |
| RBAC Enforcement | ✅ Complete | Bootstrap-driven permissions |
| Feature Visibility Gating | ✅ Complete | Bootstrap-driven features |

---

## License

MIT
