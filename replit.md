# M67 Sales Engine UI

## Overview
The Sales Engine UI is a governed, read-only interface for campaign observability and approval. Its primary goal is to provide situational awareness regarding campaign lifecycles, readiness, and outcomes by observing M60 Campaign Management APIs. The UI focuses on displaying information and explicitly avoids initiating execution, approval, sourcing, or governance transitions, as all state changes occur in backend systems. The only exception is campaign creation (POST /campaign-create), where campaigns are initialized in a `DRAFT` governance state. The project emphasizes a governance-first architecture, truthfulness, explicit handling of `UNKNOWN` states, and aims to provide clear, outcome-oriented execution transparency to users.

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `docs/`.
Do not remove governance lock comments.

## System Architecture
The Sales Engine UI is built with Next.js 14 (App Router) and TypeScript, running on Node.js 20 with npm. It leverages NSD Brand Tokens for its design system.

The architecture strictly adheres to a read-only principle, enforcing observation over control. All API interactions, with the sole exception of the `campaign-create` endpoint, are read-only proxies to the M60 API, enforced by a runtime guard.

**UI/UX Design:**
- **Color Scheme**: Strictly adheres to Neon Signs Depot brand colors (magenta, indigo, violet from the logo gradient).
- **Campaign Creation Wizard**: Employs a mandatory vertical left-hand navigation stepper.
- **Form Fields Governance**: Strictly defines required fields and explicitly forbids others to maintain data integrity.
- **Governance Components**: Includes `ReadOnlyBanner`, `CampaignStateBadge`, `ExecutionReadinessPanel`, `ConfidenceBadge`, `ProvenancePill`, and `LearningSignalsPanel` for visual communication.
- **Execution Explainability Components**: Features `ExecutionConfidenceBadge`, `ExecutionTimeline`, `NextStepCard`, `ExecutionTooltip`, and `ExecutionExplainabilityPanel` for outcome-oriented execution transparency.

**Technical Implementations:**
- **Environment Variables**: Uses `NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL` (client-side) and `SALES_ENGINE_API_BASE_URL` (server-side proxy).
- **Governance States**: UI-level governance states (`DRAFT`, `PENDING_REVIEW`, `APPROVED_READY`, `BLOCKED`, `EXECUTED_READ_ONLY`, `ARCHIVED`) represent the human approval lifecycle.
- **Readiness vs. Governance**: These are orthogonal concepts.
- **Campaign Creation API (`/api/campaign-create`)**: This is a control-plane write, persisting a single row to `core.campaigns` in Supabase with `status = 'draft'`.
- **Read-Only Mode**: Specific deployments can operate in a strict read-only mode, disabling all API calls and modifications.
- **Execution Explainability**: Replaces ambiguous execution indicators with clear, outcome-oriented states, mapping backend conditions to UI meanings without inference.
- **Run State Reconciliation**: A centralized `resolveCanonicalRunState()` function provides a single source of truth for execution states.
- **Run Staleness & Active Run Resolution**: A `resolveActiveRun.ts` utility handles run selection logic, considering staleness thresholds to prevent "Running" status for stalled executions.
- **Live Execution Observability**: Utilizes a `useExecutionPolling` hook for live updates during active execution. All timestamps are displayed in America/New_York timezone.
- **UI Hardening for Future Execution Stages**: Uses `CANONICAL_STAGE_CONFIG` for all execution stages, ensuring components are stage-agnostic and handle unknown stages gracefully.
- **ENM Governance Lock**: The Execution Narrative Mapper (ENM) is the sole interpreter of execution state. All execution-aware UI components must consume `ExecutionNarrative` output only, preventing direct access to raw backend data.

## External Dependencies
- **M60 Campaign Management APIs**: Primary source for campaign lifecycle, readiness, and outcome data.
- **ODS API**: Used for bootstrap and identity services.
- **Supabase**: Utilized for persistence of new `DRAFT` campaigns via the `/api/campaign-create` endpoint, specifically writing to the `core.campaigns` table.

## Recent Changes
- January 24, 2026: Mobile-First Responsive Design
  - **Campaign List Table Mobile Fix**: DataTable now hides non-essential columns on mobile (< 640px) - Pipeline, Activity, and View columns hidden, showing only Campaign name and Status. Added horizontal scroll as fallback.
  - **Campaign Details Mobile Fix**: Fixed text overflow and cut-off issues on mobile - timestamps now display below status content instead of right side, responsive padding using clamp(), Decision Summary checks grid stacks to 1 column on narrow screens, PageHeader titles use word-break for long campaign names
  - **NavBar Added**: Both campaigns list and executive dashboard have NavBar for easy navigation
  - **Mobile-First Layouts**: All pages use clamp() for responsive typography, flexWrap for stacking, CSS Grid auto-fit for responsive grids