# M67 Sales Engine UI

> **M68-01: Preview runtime flag validation branch.**

## Overview
The Sales Engine UI is a governed, read-only interface for campaign observability and approval. Its core purpose is to provide situational awareness regarding campaign lifecycles, readiness, and outcomes by observing M60 Campaign Management APIs. The UI focuses on displaying information and explicitly does not initiate execution, approval, sourcing, or governance transitions, as all state changes occur in backend systems. A single exception is campaign creation (POST /campaign-create), where campaigns are initialized in a `DRAFT` governance state without execution or sourcing capabilities from this UI. The project prioritizes a governance-first architecture, emphasizing truthfulness, explicit handling of `UNKNOWN` states, and avoiding implied autonomy or UI-initiated mutations. The project aims to provide clear, outcome-oriented execution transparency to users.

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `docs/`.
Do not remove governance lock comments.

## System Architecture
The Sales Engine UI is built with Next.js 14 (App Router) and TypeScript, running on Node.js 20 with npm. It uses NSD Brand Tokens for its design system.

The architecture adheres to a read-only principle, enforcing observation over control. All API interactions, except for the `campaign-create` endpoint, are read-only proxies to the M60 API, enforced by a runtime guard (`read-only-guard.ts`).

**UI/UX Design:**
- **Color Scheme**: Utilizes NSD Brand Tokens with Deep Indigo, Violet, and a magenta CTA.
- **Campaign Creation Wizard**: Employs a mandatory vertical left-hand navigation stepper for visibility of all steps and independent navigation.
- **Form Fields Governance**: Strictly defines required fields (`name`, `keywords[]`, `geographies[]`) and explicitly forbids others to maintain data integrity and prevent UI-initiated execution parameters.
- **Governance Components**: Includes `ReadOnlyBanner`, `CampaignStateBadge`, `ExecutionReadinessPanel`, `ConfidenceBadge`, `ProvenancePill`, and `LearningSignalsPanel` for visual communication of governance, readiness, and data quality.
- **Execution Explainability Components**: Features `ExecutionConfidenceBadge`, `ExecutionTimeline`, `NextStepCard`, `ExecutionTooltip`, and `ExecutionExplainabilityPanel` to provide outcome-oriented execution transparency.

**Technical Implementations:**
- **Environment Variables**: Uses `NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL` (client-side), `SALES_ENGINE_API_BASE_URL` (server-side proxy), and `NEXT_PUBLIC_ODS_API_URL`.
- **Governance States**: UI-level governance states (`DRAFT`, `PENDING_REVIEW`, `APPROVED_READY`, `BLOCKED`, `EXECUTED_READ_ONLY`, `ARCHIVED`) represent the human approval lifecycle, distinct from backend runtime states.
- **Readiness vs. Governance**: These are orthogonal; a campaign can be `APPROVED` but `NOT_READY`.
- **Campaign Creation API (`/api/campaign-create`)**: This is a control-plane write, persisting a single row to `core.campaigns` in Supabase with `status = 'draft'`, running in the Node.js runtime.
- **Read-Only Mode**: Specific deployments can operate in a strict read-only mode, disabling all API calls and modifications, indicated by a global banner.
- **Execution Explainability**: Replaces ambiguous execution indicators with clear, outcome-oriented states. It maps backend conditions to UI meanings (e.g., "No run exists" to "No execution has run yet"). All data is derived from observed backend funnel stages without inference.
- **Run State Reconciliation**: A centralized `resolveCanonicalRunState()` function provides a single source of truth for execution states, enforcing mandatory messaging across components.
- **Run Staleness & Active Run Resolution**: A `resolveActiveRun.ts` utility handles run selection logic, considering staleness thresholds (30 minutes) to prevent "Running" status for stalled executions.
- **Live Execution Observability**: Utilizes a `useExecutionPolling` hook for live updates every 7 seconds during active execution, stopping automatically on terminal states. All timestamps are displayed in America/New_York timezone with an "ET" label.
- **UI Hardening for Future Execution Stages**: Uses `CANONICAL_STAGE_CONFIG` for all execution stages, ensuring components like `ExecutionStageTracker`, `ActiveStageFocusPanel`, and `ExecutionHealthIndicator` are stage-agnostic and handle unknown stages gracefully, promoting extensibility.

## External Dependencies
- **M60 Campaign Management APIs**: Primary source for campaign lifecycle, readiness, and outcome data.
- **ODS API**: Used for bootstrap and identity services.
- **Supabase**: Utilized for persistence of new `DRAFT` campaigns via the `/api/campaign-create` endpoint, specifically writing to the `core.campaigns` table.

## Recent Changes
- January 18, 2026: Campaign Edit & Duplicate Features (Complete)
  - Created `/api/campaign-update` endpoint for updating campaign configuration
  - Created `/sales-engine/campaigns/[id]/edit` wizard page for editing any campaign
  - Edit wizard loads existing campaign data and pre-populates all form fields
  - Created `/api/campaign-duplicate` endpoint to copy campaign data with new ID and DRAFT status
  - Copies: name (prefixed with "Copy of"), ICP, sourcing_config, lead_qualification_config
  - Does NOT copy: execution history, runs, metrics (fresh campaign)
  - Added "Edit Campaign" and "Duplicate Campaign" buttons to GovernanceActionsPanel
  - After duplication, navigates to edit wizard for review and adjustment