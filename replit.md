# M67 Sales Engine UI

## Overview
The Sales Engine UI is a governed, read-only interface for campaign observability and approval. Its primary goal is to provide situational awareness regarding campaign lifecycles, readiness, and outcomes by observing the M60 Campaign Management APIs. The UI focuses on displaying information and explicitly avoids initiating execution, approval, sourcing, or governance transitions. The only exception is campaign creation, where campaigns are initialized in a `DRAFT` governance state. The project emphasizes a governance-first architecture, ensuring truthfulness, explicit handling of `UNKNOWN` states, and providing clear, outcome-oriented execution transparency to users.

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `docs/`.
Do not remove governance lock comments.

## System Architecture
The Sales Engine UI is built with Next.js 14 (App Router) and TypeScript, running on Node.js 20 with npm. It utilizes NSD Brand Tokens for its design system.

The architecture enforces a read-only principle, prioritizing observation over control. All API interactions, except for the `campaign-create` endpoint, are read-only proxies to the M60 API.

**UI/UX Design:**
- **Color Scheme**: Adheres strictly to Neon Signs Depot brand colors (magenta, indigo, violet), avoiding yellow, green, or red.
- **Campaign Creation Wizard**: Features a mandatory vertical left-hand navigation stepper for visibility and independent navigation.
- **Form Fields Governance**: Strictly defines required fields and forbids others to maintain data integrity.
- **Governance Components**: Includes `ReadOnlyBanner`, `CampaignStateBadge`, `ExecutionReadinessPanel`, `ConfidenceBadge`, `ProvenancePill`, and `LearningSignalsPanel` for visual communication of governance and data quality.
- **Execution Explainability Components**: Features `ExecutionConfidenceBadge`, `ExecutionTimeline`, `NextStepCard`, `ExecutionTooltip`, and `ExecutionExplainabilityPanel` for outcome-oriented execution transparency.

**Technical Implementations:**
- **Environment Variables**: Uses `NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL` (client-side), `SALES_ENGINE_API_BASE_URL` (server-side proxy), and `NEXT_PUBLIC_ODS_API_URL`.
- **Governance States**: UI-level governance states (`DRAFT`, `PENDING_REVIEW`, `APPROVED_READY`, `BLOCKED`, `EXECUTED_READ_ONLY`, `ARCHIVED`) represent the human approval lifecycle, distinct from backend runtime states.
- **Campaign Creation API (`/api/campaign-create`)**: This is a control-plane write operation that persists a new campaign in a `draft` status to Supabase.
- **Read-Only Mode**: Deployments can operate in a strict read-only mode, disabling all API calls and modifications, indicated by a global banner.
- **Execution Explainability**: Replaces ambiguous execution indicators with clear, outcome-oriented states, mapping backend conditions to UI meanings without inference.
- **Run State Reconciliation**: A centralized `resolveCanonicalRunState()` function provides a single source of truth for execution states.
- **Run Staleness & Active Run Resolution**: A `resolveActiveRun.ts` utility handles run selection logic, considering staleness thresholds to prevent "Running" status for stalled executions.
- **Live Execution Observability**: Utilizes a `useExecutionPolling` hook for live updates during active execution, stopping automatically on terminal states.
- **UI Hardening for Future Execution Stages**: Uses `CANONICAL_STAGE_CONFIG` for all execution stages, ensuring components are stage-agnostic and handle unknown stages gracefully for extensibility.
- **ENM Governance Lock**: The Execution Narrative Mapper (ENM) is the sole interpreter of execution state. All execution-aware UI components must consume `ExecutionNarrative` output only.
- **Canonical Execution Narrative Mapper (ENM) Implementation**: Implements truthful, event-driven execution storytelling with canonical mapping rules for states like `IDLE`, `QUEUED`, `RUNNING`, `STALLED`, `COMPLETED`, `FAILED`.

## External Dependencies
- **M60 Campaign Management APIs**: Primary source for campaign lifecycle, readiness, and outcome data.
- **ODS API**: Used for bootstrap and identity services.
- **Supabase**: Utilized for persistence of new `DRAFT` campaigns via the `/api/campaign-create` endpoint, and for campaign editing and duplication.