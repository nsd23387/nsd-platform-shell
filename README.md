# nsd-platform-shell

Unified internal platform shell for the NSD Unified Business Platform.

This application is the single entry point for internal users and provides:
- Authentication
- Global navigation
- App registry
- **Read-only executive visibility dashboards**

---

## 🚫 Governance: What This Shell Does NOT Do

This repository enforces strict governance boundaries:

| ❌ Not Allowed | ✅ Allowed |
|----------------|------------|
| CRUD operations | Read-only data consumption |
| Business logic | UI presentation |
| Metric calculations | Display pre-computed metrics |
| Direct database access | Activity Spine SDK calls only |
| Bypassing SDKs | Using `nsd-shared-sdk` |

**All data access must go through the Activity Spine API.**

---

## 📊 Activity Spine Dashboards

The shell provides read-only dashboards powered entirely by the Activity Spine analytics service.

### Available Dashboards

| Route | Purpose | Key Metrics |
|-------|---------|-------------|
| `/dashboard/executive` | High-level executive visibility | Orders volume, cycle times, SLA compliance |
| `/dashboard/operations` | Production & fulfillment | Bottlenecks, stage distribution, P95 times |
| `/dashboard/design` | Design team performance | Mockup turnaround, tiered SLA distribution, breach analysis |
| `/dashboard/media` | Media asset workflows | Created vs approved, utilization rates |
| `/dashboard/sales` | Sales funnel health | Conversion rates, drop-off analysis |

### Activity Spine Endpoints

The SDK consumes these read-only endpoints:

```
GET /activity-spine/metrics/orders    # Order volume and cycle times
GET /activity-spine/metrics/media     # Media creation and approval
GET /activity-spine/metrics/mockups   # Mockup turnaround metrics
GET /activity-spine/funnels/orders    # Lead → Quote → Order conversion
GET /activity-spine/slas              # Production SLA compliance
GET /activity-spine/slas/mockups      # Mockup SLA (2h target)
```

All requests are:
- **Read-only** (GET only)
- **Org-scoped** (via `X-Org-Id` header)
- **Authenticated** (via Bearer token)

---

## 🔐 RBAC (Role-Based Access Control)

All users can view dashboards. This is intentionally read-only.

| Role | Dashboard Access |
|------|-----------------|
| `readonly` | ✅ View all dashboards |
| `user` | ✅ View all dashboards |
| `manager` | ✅ View all dashboards |
| `admin` | ✅ View all dashboards |

No mutation permissions are required for dashboard access.

---

## 🏗️ Project Structure

```
nsd-platform-shell/
├── app/
│   └── dashboard/
│       ├── layout.tsx          # Shared dashboard layout
│       ├── page.tsx            # Dashboard index (redirects)
│       ├── executive/page.tsx  # Executive dashboard
│       ├── operations/page.tsx # Operations dashboard
│       ├── design/page.tsx     # Design dashboard
│       ├── media/page.tsx      # Media dashboard
│       └── sales/page.tsx      # Sales dashboard
├── components/
│   └── dashboard/
│       ├── DashboardCard.tsx   # Base card component
│       ├── DashboardGrid.tsx   # Grid layout
│       ├── DashboardHeader.tsx # Header with time selector
│       ├── MetricCard.tsx      # Single metric display
│       ├── DistributionCard.tsx# Bar distribution chart
│       ├── FunnelCard.tsx      # Funnel visualization
│       ├── SLACard.tsx         # SLA compliance display
│       ├── BreachListCard.tsx  # Breach breakdown list
│       ├── TieredSLADistributionCard.tsx  # Tiered SLA visualization
│       └── DetailedBreachListCard.tsx     # Detailed breach items
├── hooks/
│   ├── useActivitySpine.ts     # Data fetching hooks
│   └── useRBAC.ts              # Access control hooks
├── lib/
│   └── sdk.ts                  # Activity Spine SDK client
├── types/
│   ├── activity-spine.ts       # API response types
│   └── rbac.ts                 # Permission types
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Access to Activity Spine API

### Installation

```bash
npm install
```

### Configuration

Copy the environment example and configure:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
NEXT_PUBLIC_ACTIVITY_SPINE_URL=/api/activity-spine
ACTIVITY_SPINE_API_URL=http://your-activity-spine-api:3001
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

---

## 🎨 UI Principles

All dashboards follow these principles:

1. **Read-only cards and charts** - No edit actions
2. **Clear time windows** - 7d / 30d period selectors
3. **Loading states** - Skeleton loaders during fetch
4. **Empty states** - Clear messaging when no data
5. **Error states** - Retry functionality on failures
6. **Responsive grid** - 2-4 column layouts

---

## 📋 Dashboard Widget Reference

### Executive Dashboard
- Orders volume (30 days)
- Avg order cycle time
- Avg mockup turnaround
- Mockup SLA compliance %
- Production SLA breaches

### Operations Dashboard
- Bottleneck stage (highest avg duration)
- Orders exceeding SLA
- Production stage distribution
- P95 order cycle time

### Design Dashboard
- Avg mockup turnaround (minutes)
- % Exceptional (≤ 2h)
- % Breach (> 24h)
- Tiered SLA distribution visualization
- Breach details by quote

### Media Dashboard
- Media created vs approved
- Avg internal → marketing approval time
- Unused approved assets

### Sales Dashboard
- Funnel conversion (lead → quote → order)
- Drop-off by stage
- Volume trends

---

## 📐 Mockup SLA Interpretation

The Design Dashboard uses a **tiered SLA model** (Activity Spine v1.5.1+) that provides more nuanced performance visibility than binary pass/fail metrics.

### Tier Definitions

| Tier | Threshold | Color | Meaning |
|------|-----------|-------|---------|
| **Exceptional** | ≤ 2 hours | 🟢 Green | Outstanding turnaround - exceeds expectations |
| **Standard** | 2–24 hours | 🟡 Yellow | Acceptable performance - within normal range |
| **Breach** | > 24 hours | 🔴 Red | Requires attention - exceeds maximum threshold |
| **Pending** | In progress | ⚪ Gray | No delivery yet - mockup still being created |

### Why Standard ≠ Failure

The **Standard** tier (2–24 hours) represents acceptable, normal business performance:

- Not all mockups require immediate turnaround
- Complex designs naturally take longer
- Standard performance maintains quality while meeting expectations
- Only **Breach** (> 24h) requires investigation or escalation

### How to Read the Dashboard

1. **% Exceptional**: Higher is better - indicates fast turnaround capacity
2. **% Breach**: Lower is better - should be minimized
3. **Standard count**: Normal operations - not a concern
4. **Distribution bar**: Visual health check - green/yellow is healthy, watch for red growth

### Data Source

All tier classifications are computed by **Activity Spine** (the source of truth). The shell:
- Does NOT calculate SLA tiers locally
- Does NOT define threshold values
- Only displays pre-computed distributions

---

## ⚠️ Important: Read-Only Governance

This shell is designed as a **read-only consumer** of Activity Spine analytics.

### Non-Negotiables

1. **No local metric calculations** - All metrics come pre-computed from Activity Spine
2. **No direct database access** - SDK only
3. **No duplicated analytics logic** - Activity Spine is the single source of truth
4. **No CRUD operations** - Display only

### Why This Matters

- **Consistency**: All users see the same metrics
- **Performance**: Heavy calculations happen server-side
- **Governance**: Single source of truth prevents drift
- **Security**: No direct data access from the shell

---

## 📄 License

Internal use only. Part of the NSD Unified Business Platform.
