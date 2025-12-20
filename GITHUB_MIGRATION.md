# GitHub Migration Guide

This document provides the complete instructions for porting the NSD Command Center from Replit to the canonical GitHub repository (`nsd-platform-shell`).

## Files to Delete Before Commit

Delete the following files and directories:

### Replit Configuration Files
- `.replit` - Replit workflow configuration
- `replit.nix` - Replit Nix environment (if present)
- `replit.md` - Replit-specific documentation (replaced by README.md)

### Replit-Only Scripts
- `server/index.ts` - Replit Vite launcher workaround
- `script/build.ts` - Replit build script

### Unused Configuration
- `drizzle.config.ts` - Database config (no database in this project)
- `generated-icon.png` - Replit-generated favicon

### Directories to Delete
- `server/` - Entire directory (only contained Vite launcher)
- `script/` - Entire directory (only contained build script)
- `attached_assets/` - Replit paste/upload artifacts (optional, review contents)

## Package.json Updates

Replace current scripts with:

```json
{
  "name": "nsd-platform-shell",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "vite --host",
    "build": "vite build",
    "preview": "vite preview",
    "check": "tsc"
  }
}
```

### Dependencies to Remove

Remove from `devDependencies`:
- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`
- `@replit/vite-plugin-runtime-error-modal`
- `tsx` (no longer needed without server launcher)
- `esbuild` (no longer needed)
- `@types/ws` (no websocket usage)

Remove from `dependencies`:
- `ws` (no websocket usage)

Remove `overrides` section (drizzle-kit workaround).

Remove `optionalDependencies` section.

## Vite Configuration Updates

Replace `vite.config.ts` with:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
});
```

Key changes:
- Remove Replit plugins
- Remove `allowedHosts` restriction
- Simplify build output to `dist/`

## Final Directory Structure for GitHub

```
nsd-platform-shell/
├── client/
│   ├── public/
│   │   └── favicon.png
│   ├── src/
│   │   ├── assets/
│   │   │   └── logo/
│   │   │       └── nsd-logo.png
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   ├── layout/
│   │   │   └── ui/
│   │   ├── contexts/
│   │   │   └── BootstrapContext.tsx
│   │   ├── data/
│   │   │   └── fixtures.ts
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── config.ts
│   │   │   ├── queryClient.ts
│   │   │   ├── sdk.ts
│   │   │   └── utils.ts
│   │   ├── pages/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   └── index.html
├── shared/
│   └── schema.ts
├── .gitignore
├── components.json
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
├── vercel.json
└── README.md
```

## Add vercel.json

Create `vercel.json` for SPA routing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## Verification Steps

After migration, verify:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```
   Confirm app loads at `http://localhost:5173`

3. **Build for production:**
   ```bash
   npm run build
   ```
   Confirm build completes without errors

4. **Preview production build:**
   ```bash
   npm run preview
   ```
   Confirm app works correctly

5. **Type check:**
   ```bash
   npm run check
   ```
   Confirm no TypeScript errors

## Confirmation: No Sandbox-Only Code

The following have been verified:

- No Replit-specific environment variables assumed
- No `process.env.REPL_ID` checks in production code
- No hardcoded `.replit.dev` domains in production code
- SDK uses configurable `VITE_*` env vars for API URLs
- Fixtures automatically used when env vars not set
- No mock servers or backend logic

## Recommended Commit Message

```
feat: Initial NSD Command Center platform shell

Pure frontend SPA for NSD internal platform navigation and dashboards.

Features:
- Bootstrap integration via /api/v1/me
- Five role-based dashboards (Executive, Operations, Design, Media, Sales)
- App registry with feature_visibility gating
- Static fixtures for development
- NSD design system (Poppins/Inter, Indigo/Violet/Magenta)

Architecture:
- React 18 + Vite + Tailwind CSS
- TanStack Query for data fetching
- wouter for client-side routing
- Zero backend logic (read-only UI)

Governance:
- RBAC from bootstrap only
- No JWT parsing in UI
- No metric calculations
- No permission inference
```

## Post-Migration Checklist

- [ ] All Replit files deleted
- [ ] package.json updated with clean scripts
- [ ] vite.config.ts cleaned of Replit plugins
- [ ] vercel.json added
- [ ] npm install succeeds
- [ ] npm run dev works
- [ ] npm run build succeeds
- [ ] npm run check passes
- [ ] README.md present with governance docs
