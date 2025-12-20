# NSD Command Center

**A pure frontend Platform Shell UI for Neon Signs Depot (NSD)**

The NSD Command Center provides unified navigation, read-only dashboards, and an app registry for NSD's internal platform. This is a browser-only React SPA that consumes pre-computed metrics from backend APIs.

## Purpose

- **Unified Navigation:** Single entry point for all NSD internal applications
- **Read-Only Dashboards:** Executive, Operations, Design, Media, and Sales views
- **App Registry:** Feature-gated application launcher with RBAC support
- **Bootstrap Integration:** Consumes `/api/v1/me` for identity, permissions, and feature visibility

## Quick Start

```bash
npm install
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Architecture

### Frontend Only

This project is a **pure frontend SPA** with zero backend logic:

- **Framework:** React 18 with Vite
- **Routing:** wouter (client-side)
- **Styling:** Tailwind CSS with NSD design tokens
- **State:** TanStack Query for data fetching
- **Typography:** Poppins (headers), Inter (body)
- **Colors:** Deep Indigo `#020F5A`, Violet `#692BAA`, Magenta `#CC368F` (CTAs only)

### Bootstrap Flow

On application load:

1. Call `GET ${VITE_ODS_API_URL}/api/v1/me` with JWT Bearer token
2. Token source: `window.__NSD_AUTH_TOKEN__` (primary) or `VITE_NSD_DEV_JWT` (fallback)
3. Store response in React context memory only (no persistence)
4. Bootstrap provides: user identity, organization, roles, permissions, environment, feature_visibility

### Data Access

| Endpoint | Purpose |
|----------|---------|
| `/api/v1/me` | Bootstrap (identity, permissions, feature_visibility) |
| `/activity-spine/metrics/orders` | Order metrics |
| `/activity-spine/metrics/media` | Media processing metrics |
| `/activity-spine/metrics/mockups` | Design mockup metrics |
| `/activity-spine/funnels/orders` | Order conversion funnel |
| `/activity-spine/slas` | SLA overview |
| `/activity-spine/slas/mockups` | Mockup SLA details |

All Activity Spine endpoints accept `?period=7d|30d` query parameter.

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/     # MetricCard, SLABadge, FunnelChart, etc.
│   │   │   ├── layout/        # TopNav, DashboardLayout
│   │   │   └── ui/            # Shadcn UI components
│   │   ├── contexts/
│   │   │   └── BootstrapContext.tsx  # /api/v1/me integration
│   │   ├── data/
│   │   │   └── fixtures.ts    # Static fixtures for development
│   │   ├── lib/
│   │   │   ├── config.ts      # App registry, routes, API URLs
│   │   │   ├── sdk.ts         # Activity Spine API client
│   │   │   └── utils.ts       # Formatting utilities
│   │   ├── pages/
│   │   │   ├── executive-dashboard.tsx
│   │   │   ├── operations-dashboard.tsx
│   │   │   ├── design-dashboard.tsx
│   │   │   ├── media-dashboard.tsx
│   │   │   ├── sales-dashboard.tsx
│   │   │   └── apps.tsx       # App registry with feature_visibility gating
│   │   └── App.tsx
│   └── index.html
├── shared/
│   └── schema.ts              # TypeScript types matching API responses
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Redirects to Executive Dashboard |
| `/dashboard/executive` | High-level business metrics |
| `/dashboard/operations` | Order pipeline and SLAs |
| `/dashboard/design` | Mockup turnaround and designer performance |
| `/dashboard/media` | Media processing metrics |
| `/dashboard/sales` | Quote volume and conversion funnels |
| `/apps` | App registry with feature_visibility gating |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_ODS_API_URL` | Base URL for ODS API (bootstrap endpoint) |
| `VITE_ACTIVITY_SPINE_URL` | Base URL for Activity Spine API |
| `VITE_NSD_DEV_JWT` | JWT token for development (fallback) |
| `VITE_USE_FIXTURES` | Set to `true` to force static fixtures |

## Authentication

- JWT token read from `window.__NSD_AUTH_TOKEN__` (set by host application)
- Fallback to `VITE_NSD_DEV_JWT` environment variable for development
- Attached to all API calls as `Authorization: Bearer <token>`
- No login UI - authentication handled upstream in production
- No token minting or refresh - read-only consumption

---

## Governance & Non-Negotiables

### Strict Architecture Rules

1. **`/api/v1/me` is the ONLY bootstrap source**
   - All identity, permissions, roles, and feature visibility come from this endpoint
   - No other source of truth for access control

2. **No backend logic in frontend**
   - This is a pure browser client
   - No Express/Node servers
   - No mock API servers
   - No database access

3. **No SLA or metric calculations in UI**
   - UI displays pre-computed metrics from API
   - SLA tiers (exceptional/standard/breach/pending) are API-provided
   - No business logic calculations

4. **RBAC and feature visibility from bootstrap ONLY**
   - App visibility driven by `feature_visibility[]` from `/api/v1/me`
   - Permission checks reference `permissions[]` from bootstrap
   - No conditional logic based on app internals

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

### Static Fixtures

When API URLs are not configured, the SDK automatically uses static fixtures from `client/src/data/fixtures.ts`. These fixtures match real API response shapes for development.

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

### Vercel Configuration

Add `vercel.json` for SPA routing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Build Output

Production build outputs to `dist/public/`. Deploy this directory to any static host.

---

## Validation Checklist

Before deployment, verify:

- [ ] `/api/v1/me` is called once on app load via BootstrapContext
- [ ] Dashboards render with real API data (or fixtures when not configured)
- [ ] RBAC and feature gating come exclusively from bootstrap
- [ ] No business logic exists in UI
- [ ] App runs correctly with valid token
- [ ] App handles invalid token (401) gracefully
- [ ] App handles empty data scenarios with EmptyState components

---

## License

MIT
