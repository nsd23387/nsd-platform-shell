# NSD Platform Shell

## Overview
Unified internal platform shell for the NSD Business Platform with read-only Activity Spine dashboards. This is a Next.js 14 application providing analytics dashboard views.

## Tech Stack
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Package Manager**: npm

## Project Structure
```
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Dashboard pages (executive, operations, design, media, sales)
│   └── functions/v1/       # Mock API routes for development
├── components/             # React components
│   └── dashboard/          # Dashboard-specific components
├── contexts/               # React contexts (BootstrapContext)
├── design/                 # Design system
│   ├── components/         # Shared UI components
│   ├── patterns/           # UI patterns
│   └── tokens/             # Design tokens (colors, spacing, typography)
├── hooks/                  # Custom React hooks
├── lib/                    # SDK and utilities
├── types/                  # TypeScript type definitions
└── docs/                   # Documentation
```

## Development

### Running the Dev Server
The development server runs on port 5000:
```bash
npm run dev -- -p 5000 -H 0.0.0.0
```

### Build
```bash
npm run build
```

### Production
```bash
npm run start -- -p 5000 -H 0.0.0.0
```

## Key Features
- Read-only analytics dashboards
- Bootstrap context for user/permissions
- Activity Spine integration (mocked for development)
- Design system with tokens

## Mock API
A mock API route at `/functions/v1/ods-api/me` provides bootstrap data for development. In production, this would connect to the actual ODS API.

## Recent Changes
- December 30, 2025: Initial Replit environment setup
  - Configured Next.js to allow all dev origins for Replit proxy
  - Created mock bootstrap API for development
  - Set up deployment configuration
