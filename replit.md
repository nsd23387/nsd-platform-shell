# M67 Sales Engine UI

> **M68-01: Preview runtime flag validation branch.**

## Overview
The Sales Engine UI is a governed, read-only interface for campaign observability and approval. Its primary purpose is to provide situational awareness regarding campaign lifecycles, readiness, and outcomes by observing M60 Campaign Management APIs. This UI explicitly does not initiate execution, approval, sourcing, or governance transitions, as all state changes occur in backend systems. A single exception allows for campaign creation (POST /campaign-create), where campaigns are initialized in a `DRAFT` governance state without any execution or sourcing capabilities from this flow. The project adheres to a governance-first architecture, prioritizing truthfulness, explicit handling of `UNKNOWN` states, and avoiding implied autonomy or UI-initiated mutations.

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `docs/`.
Do not remove governance lock comments.

## System Architecture
The Sales Engine UI is built with Next.js 14 (App Router) and TypeScript, running on Node.js 20 with npm as the package manager. It leverages NSD Brand Tokens for its design system.

The application architecture follows a read-only principle, enforcing observation over control. All API interactions, except for the `campaign-create` endpoint, are read-only proxies to the M60 API. A runtime guard (`read-only-guard.ts`) enforces this principle.

**UI/UX Design:**
- **Color Scheme**: Uses NSD Brand Tokens with a primary Deep Indigo (`#020F5A`), secondary Violet (`#692BAA`), and a magenta CTA (`#CC368F`).
- **Campaign Creation Wizard (M67-14)**: Employs a mandatory vertical left-hand navigation stepper for campaign creation to ensure visibility of all steps without scrolling and independent navigation from form content. Horizontal steppers are explicitly forbidden.
- **Form Fields Governance (M67-14)**: Defines required fields (`name`, `keywords[]`, `geographies[]`) and explicitly forbids others (`max_organizations`, `source_type`, `technologies`, etc.) to maintain strict data integrity and prevent UI-initiated execution parameters.
- **Governance Components**: Includes `ReadOnlyBanner`, `CampaignStateBadge`, `ExecutionReadinessPanel`, `ConfidenceBadge`, `ProvenancePill`, and `LearningSignalsPanel` to visually communicate governance, readiness, and data quality.
- **Execution Explainability Components**: New components for outcome-oriented execution transparency:
  - `ExecutionConfidenceBadge`: Quick 1-second status signal with brand-aligned indicators (no emojis)
  - `ExecutionTimeline`: Outcome-oriented timeline explaining what happened during execution
  - `NextStepCard`: Single advisory recommendation when no work occurred
  - `ExecutionTooltip`: Inline "Why?" tooltips for execution terminology
  - `ExecutionExplainabilityPanel`: Combined panel integrating all explainability components

**Technical Implementations:**
- **Environment Variables**: Uses `NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL` (client-side), `SALES_ENGINE_API_BASE_URL` (server-side proxy), and `NEXT_PUBLIC_ODS_API_URL` for API bootstrapping.
- **Governance States**: UI-level governance states (`DRAFT`, `PENDING_REVIEW`, `APPROVED_READY`, `BLOCKED`, `EXECUTED_READ_ONLY`, `ARCHIVED`) represent the human approval lifecycle, distinct from backend runtime states.
- **Readiness vs. Governance**: These are orthogonal concepts; a campaign can be `APPROVED` but `NOT_READY` if system conditions (e.g., mailbox health) prevent execution.
- **Campaign Creation API (`/api/campaign-create`)**: This is a control-plane write, persisting a single row to `core.campaigns` in Supabase with `status = 'draft'`. It runs in the Node.js runtime and is explicitly bound to the `core` schema.
- **Read-Only Mode for Vercel Deployments**: For specific deployments (M67.9-01), the UI can operate in a strict read-only mode, disabling all API calls and modifications, indicating this state with a global banner.

## External Dependencies
- **M60 Campaign Management APIs**: Primary source for campaign lifecycle, readiness, and outcome data.
- **ODS API**: Used for bootstrap and identity services.
- **Supabase**: Utilized for persistence of new `DRAFT` campaigns via the `/api/campaign-create` endpoint, specifically writing to the `core.campaigns` table.

## Execution Explainability (New)

The Execution Timeline & Explainability feature replaces ambiguous execution indicators with clear, outcome-oriented states.

**Core Principle**: A user can determine in under 10 seconds whether execution happened, whether it was expected, and whether action is required—without reading logs.

**State Mapping** (`app/sales-engine/lib/execution-state-mapping.ts`):
| Backend Condition (CANONICAL MESSAGING MATRIX) | UI Meaning |
|---------------------------------------|------------|
| No run exists (noRuns=true) | "No execution has run yet" (idle) |
| Run + status=queued | "Execution queued" |
| Run + status=running | "Execution in progress" |
| Run + status=running + >30 min | "Execution stalled — system will mark failed" |
| Run + status=completed | "Last execution completed successfully" |
| Run + status=failed | "Last execution failed" |
| Run + unknown status | "Status unknown" |

**OBSERVATION**: The LatestRun model provides only start/end timestamps without intermediate execution steps. When a run completes, we observe that no execution steps are visible in the data. This is stated as an observation ("no execution steps were observed"), not inference about what the system did or didn't do.

**Key Features**:
- Outcome-oriented timeline showing what explicitly happened during execution
- "No execution steps observed" surfaced as a valid terminal outcome for completed runs
- NextStepCard shown for completed runs with no observable execution (with guidance to check pipeline funnel)
- Inline tooltips explaining Queue mode and No Steps Observed states
- OBSERVATION-BASED: Only displays states based on what we can observe in the data

**Hard Constraints**:
- READ-ONLY: No backend changes, no schema changes, no new API endpoints
- NO INFERENCE: Only use explicit signals from existing data
- Consume existing `/api/v1/campaigns/:id/runs/latest` endpoint only

## Recent Changes
- January 17, 2026: Last Execution Summary Card (Complete)
  - Created `LastExecutionSummaryCard` component for historical execution context
  - Shows when status is failed or completed (terminal states only)
  - Displays: timestamp (when execution finished), terminal reason (if failed), counts (orgs/contacts/leads), link to observability
  - UX Trust Accelerator: Reinforces "The system is idle. You are looking at history."
  - Read-only with no execution controls
  - Integrated into Overview tab's right column after ExecutionStageTracker

- January 17, 2026: P0 Canonical Run State Reconciliation (Complete)
  - Created `resolveCanonicalRunState()` function as single source of truth for execution state
  - Mandatory messaging matrix enforced across all components:
    - failed = "Last execution failed"
    - completed = "Last execution completed successfully"
    - stalled = "Execution stalled — system will mark failed"
    - idle = "No execution has run yet"
    - queued = "Execution queued"
    - running = "Execution in progress"
  - "Stalled" messaging ONLY appears when status='running' AND >30 min (never for terminal runs)
  - Removed all misleading "cleanup" or "awaiting cleanup" messaging
  - Updated all observability components: ExecutionHealthIndicator, ActiveStageFocusPanel, LatestRunStatusCard, ExecutionConfidenceBadge
  - campaign_runs.status is the ONLY authoritative source of truth

- January 17, 2026: P0 Run Staleness & Active Run Resolution
  - Created `resolveActiveRun.ts` utility with centralized run selection logic
  - Run precedence: queued > running (non-stale) > most recent terminal
  - Staleness threshold: 30 minutes (`RUN_STALE_THRESHOLD_MS = 30 * 60 * 1000`) matching backend watchdog
  - Stale runs NEVER show as "Running" - use warning copy: "Execution stalled — system will mark failed"
  - All execution components receive `runStartedAt` prop for staleness calculation
  - Updated ExecutionConfidenceBadge with `stale` confidence type
  - useExecutionPolling stops polling for stale runs automatically
  - Campaign detail page uses centralized `resolveActiveRun` to select effective run for all components
  - Components updated: LatestRunStatusCard, ExecutionStageTracker, ActiveStageFocusPanel, ExecutionHealthIndicator

- January 17, 2026: Side-by-Side Campaign Overview Layout
  - Restructured OverviewTab to use two-column grid (40% scope / 60% execution)
  - Left column: CampaignScopeSummary + FunnelSummaryWidget (campaign context)
  - Right column: ExecutionHealthIndicator, PollingStatusIndicator, ActiveStageFocusPanel, ExecutionStageTracker
  - ResultsBreakdownCards and AdvisoryCallout remain full-width below
  - Responsive CSS in globals.css stacks columns on screens < 900px

- January 17, 2026: Side-by-Side Layout for Observability & Learning Tabs
  - MonitoringTab: Left column (status/context: ApprovalAwarenessPanel, LatestRunStatusCard, ExecutionExplainabilityPanel), Right column (metrics: ExecutionStatusCard, PipelineFunnel, SendMetrics)
  - LearningTab: Left column (About Learning Signals context card), Right column (LearningSignalsPanel)
  - All tabs now use shared `.overview-two-column-grid` class for consistent responsive behavior

- January 17, 2026: P0 UI Hardening for Future Execution Stages (Complete)
  - Created centralized `CANONICAL_STAGE_CONFIG` in `lib/execution-stages.ts` with all 8 canonical stages
  - Refactored `ExecutionStageTracker` to render from config array with unknown stage fallback
    - Completion ONLY when funnelCount > 0 (no inference from runStatus alone)
    - Unknown stages return "not_observed" even when run is completed
  - Refactored `ActiveStageFocusPanel` to support any stage ID with neutral copy for unknown stages
    - Exact-match stage lookup only (no substring inference)
  - Refactored `ExecutionHealthIndicator` to be stage-agnostic (no 3-stage assumptions)
    - Exact-match record lookup (no substring inference)
  - Refactored `ResultsBreakdownCards` to key by stage ID, render only when backend emits data
    - Zero-count cards render when backend emits data (explains zero outcomes)
    - No speculative future-stage funnel IDs
  - Added extensibility placeholder architecture to `GovernanceActionsPanel` (no new actions)
  - All components now render unknown backend stages safely with "Additional Stage" / "Not yet observed" labels
  - Future stages can be added to backend without UI code changes
  - Explicit governance comments document observational-only constraints

- January 16, 2026: Execution Clarity & Real-Time Observability (P0)
  - **ExecutionStageTracker**: Vertical tracker showing org_sourcing, contact_discovery, lead_creation stages with Waiting/Running/Completed status
  - **ActiveStageFocusPanel**: Live-updating panel answering "What is the system doing right now?" with human-readable status
  - **ExecutionHealthIndicator**: Single sentence health line visible without scrolling (e.g., "Execution completed — contacts discovered, no promotable leads")
  - **ResultsBreakdownCards**: Post-stage completion cards with counts and skip reasons (uses "Skipped" not "Failed")
  - **AdvisoryCallout**: Non-blocking contextual guidance labeled as "Advisory"
  - **PollingStatusIndicator**: Shows "Auto-refreshing every 7s" during execution, "Execution idle" when terminal
  - Layout reorganized: Execution-first UI above the fold in Overview tab
  - User can answer "What is happening now?" in under 3 seconds
  - Zero leads promoted is explained without implying failure
  - All data derived from observed backend funnel stages only (no inference)

- January 16, 2026: ET Timezone + Live Execution Observability
  - Created timezone utility (`app/sales-engine/lib/time.ts`) with DST-aware ET formatting
  - All timestamps now display in America/New_York timezone with explicit "ET" label
  - Added `useExecutionPolling` hook for live observability during execution
  - Polling runs every 7 seconds while status is queued/running/in_progress
  - Polling automatically stops on terminal states (completed, failed, etc.)
  - Added `LastUpdatedIndicator` component showing "Last updated X seconds ago"
  - Added pulse animation to ExecutionConfidenceBadge when execution is active
  - Added "Refresh now" button for manual data refresh
  - CampaignStatusHeader now shows last updated time and auto-refresh indicator
  - FunnelSummaryWidget displays last updated timestamp in ET
  - Consolidated polling to single useExecutionPolling mechanism

- January 15, 2026: UX Enhancements for Campaign Detail Page
  - Added CampaignScopeSummary for full ICP criteria display
  - Added CampaignStatusHeader for above-the-fold governance and execution state
  - Added FunnelSummaryWidget for compact pipeline funnel snapshot
  - Added ForwardMomentumCallout for advisory guidance

- January 15, 2026: Execution Timeline & Explainability UI
  - Added execution state mapping adapter with explicit backend→UI translations
  - Created ExecutionConfidenceBadge with brand-aligned status indicators
  - Built ExecutionTimeline component with outcome-oriented timeline
  - Added NextStepCard for single advisory recommendations
  - Implemented ExecutionTooltip for inline "Why?" explanations
  - Integrated ExecutionExplainabilityPanel into Campaign detail page