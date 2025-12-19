# NSD Platform Shell

> **Unified Internal Platform UI ("Operating Shell")** for the NSD Business Platform

## What This Is

The **NSD Platform Shell** is the **single entry point** for all internal users of the NSD Unified Business Platform. It provides:

- **Single Sign-On (SSO)** - One login for all platform applications
- **Centralized Navigation** - Unified app launcher and global navigation
- **Role-Based Access Control (RBAC)** - Enforced at the shell level
- **Universal Search** - Search across all entities (read-only)
- **Notification Center** - Activity feed and SLA warnings
- **Executive Dashboard** - Read-only business metrics

## What This Is NOT

This application is **NOT** a business logic system. It does not:

- Contain domain-specific business logic
- Have direct database access
- Duplicate functionality from modular apps
- Process transactions or modify business data

All data access is through the `nsd-shared-sdk` library only.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     NSD Platform Shell                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │   Auth &    │ │    App      │ │  Universal  │ │ Executive  │ │
│  │   RBAC      │ │  Registry   │ │   Search    │ │ Dashboard  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │
│                            │                                      │
│                   ┌────────┴────────┐                            │
│                   │  nsd-shared-sdk │                            │
│                   └────────┬────────┘                            │
└────────────────────────────│────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  Sales   │  │   OMS    │  │ Finance  │
        │  Engine  │  │          │  │ Console  │
        └──────────┘  └──────────┘  └──────────┘
            (Modular Applications)
```

---

## Project Structure

```
nsd-platform-shell/
├── app/
│   ├── layout.tsx              # Root layout with AuthGuard
│   ├── page.tsx                # Redirect to dashboard
│   ├── auth/
│   │   └── page.tsx            # Login page
│   └── (shell)/                # Authenticated shell layout
│       ├── layout.tsx          # Shell layout (sidebar + header)
│       ├── dashboard/
│       │   └── page.tsx        # Executive Command Center
│       ├── search/
│       │   └── page.tsx        # Universal Search
│       ├── notifications/
│       │   └── page.tsx        # Activity Feed
│       └── apps/
│           ├── page.tsx        # App Launcher
│           └── [appId]/
│               └── page.tsx    # Dynamic app embedding
│
├── components/
│   ├── AuthGuard.tsx           # Route protection + RBAC
│   ├── Sidebar.tsx             # Global navigation
│   ├── Header.tsx              # Breadcrumbs + quick actions
│   ├── AppCard.tsx             # App launcher card
│   ├── DashboardCard.tsx       # Dashboard widget card
│   ├── SearchInput.tsx         # Universal search input
│   └── ActivityItem.tsx        # Notification item
│
├── config/
│   ├── apps.ts                 # App Registry configuration
│   └── roles.ts                # Role definitions & RBAC mapping
│
├── lib/
│   ├── sdk.ts                  # nsd-shared-sdk wrapper
│   └── auth.ts                 # Session & token management
│
└── public/                     # Static assets
```

---

## How to Add a New Application

Adding a new application to the platform is **config-driven**. No code changes to the shell are required.

### Step 1: Add to App Registry

Edit `config/apps.ts` and add your app to the `APP_REGISTRY` array:

```typescript
{
  app_id: 'my-new-app',
  display_name: 'My New App',
  description: 'Description of what this app does',
  route: '/apps/my-new-app',      // Internal route
  is_external: false,              // Set true for external URLs
  required_roles: ['sales_rep', 'admin'],
  icon: MyIcon,                    // Lucide icon component
  status: 'active',                // 'active' | 'coming_soon' | 'maintenance'
  category: 'sales',               // Category for grouping
}
```

### Step 2: Define Required Roles

If your app needs new roles, add them to `config/roles.ts`:

```typescript
{
  role_id: 'new_role',
  display_name: 'New Role',
  description: 'What this role can do',
  level: 50,
}
```

### Step 3: Integration Options

For the app itself, choose one of these integration methods:

1. **Internal Module** - Build within the shell's app directory
2. **Iframe Embed** - Embed existing web app via iframe
3. **Micro-Frontend** - Use module federation
4. **External Link** - Set `is_external: true` and provide full URL

---

## How RBAC Works

### Role Hierarchy

Roles are defined in `config/roles.ts` with a level system:

| Level | Example Roles |
|-------|---------------|
| 100   | admin |
| 80    | sales_manager, wholesale_manager |
| 70    | operations |
| 60    | finance |
| 50    | sales_rep, estimator, production, designer |
| 30    | partner |
| 10    | viewer |

### Access Enforcement

RBAC is enforced at **three levels**:

1. **Route Level** - `AuthGuard` component checks route access
2. **App Level** - App Registry checks `required_roles` before showing apps
3. **Feature Level** - Individual features can check roles via `hasRole()`

### Example Usage

```typescript
import { hasRole, hasAnyRole, getUserRoles } from '@/lib/auth';

// Check single role
if (hasRole('admin')) {
  // Show admin-only feature
}

// Check multiple roles
if (hasAnyRole(['sales_manager', 'admin'])) {
  // Show management features
}
```

---

## API Integration

All data access goes through the `nsd-shared-sdk` wrapper in `lib/sdk.ts`.

### Available Endpoints

| Function | Description | Read-Only |
|----------|-------------|-----------|
| `universalSearch()` | Search across all entities | ✓ |
| `getActivities()` | Get activity feed | ✓ |
| `getSlaWarnings()` | Get SLA warning activities | ✓ |
| `getDashboardData()` | Get executive dashboard data | ✓ |
| `getOrdersByStatus()` | Get orders summary | ✓ |
| `getRevenueSummary()` | Get revenue metrics | ✓ |
| `getProductionThroughput()` | Get production metrics | ✓ |
| `getSalesPipeline()` | Get pipeline snapshot | ✓ |

### Example Usage

```typescript
import { universalSearch, getDashboardData } from '@/lib/sdk';

// Search across entities
const results = await universalSearch({
  query: 'acme',
  types: ['account', 'contact'],
  limit: 20,
});

// Get dashboard data
const dashboard = await getDashboardData();
```

---

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

### Environment Variables

```env
NEXT_PUBLIC_API_BASE_URL=https://api.nsd-platform.internal
NEXT_PUBLIC_MOCK_MODE=true  # Enable mock data for development
```

### Demo Login

In development mode (`MOCK_MODE=true`), you can log in with any email/password:

- Email containing "admin" → Gets admin role
- Email containing "sales" → Gets sales_rep role
- Email containing "manager" → Gets sales_manager + operations roles
- Any other email → Gets sales_rep + viewer roles

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Icons**: Lucide React
- **Data Access**: nsd-shared-sdk (API wrapper)

---

## Non-Negotiable Principles

1. ✅ **Single Sign-On (SSO)** - All users authenticate through the shell
2. ✅ **Centralized RBAC** - Access control enforced at shell level
3. ❌ **No Direct Database Access** - All data via nsd-shared-sdk
4. ❌ **No Domain Business Logic** - This is an operating shell only
5. ✅ **Config-Driven Apps** - New apps added via configuration
6. ✅ **Modular Architecture** - Apps plug in without refactoring

---

## License

Internal use only - NSD Platform
