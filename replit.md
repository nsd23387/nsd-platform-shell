# M67 Sales Engine UI

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
- **Color Scheme**: Strictly adheres to Neon Signs Depot brand colors - NO yellow, green, or red. Uses only magenta (#CC368F, #912D73, #FCE7F3), indigo (#020F5A, #E8EAF6), and violet (#692BAA, #4A1D7A, #EDE7F6) from the logo gradient. CTA uses magenta.
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
- **ENM Governance Lock**: The Execution Narrative Mapper (ENM) is the SOLE interpreter of execution state. All execution-aware UI components must consume `ExecutionNarrative` output only. No component may access raw `campaign_runs`, `activity.events`, or derive state from timestamps/counts. See `app/sales-engine/lib/execution-governance.md` for full governance rules.

## External Dependencies
- **M60 Campaign Management APIs**: Primary source for campaign lifecycle, readiness, and outcome data.
- **ODS API**: Used for bootstrap and identity services.
- **Supabase**: Utilized for persistence of new `DRAFT` campaigns via the `/api/campaign-create` endpoint, specifically writing to the `core.campaigns` table.

## Recent Changes
- January 23, 2026: UX Enhancement Phase (Clarity, Trust, Self-Explanatory UI)
  - Created SectionHeader component with section labels and info tooltips
  - Created InfoTooltip component for inline contextual help
  - Created HelperText component for explanatory messaging under data sections
  - Campaign Detail Page: Added section headers (Administrative State, Last Execution Outcome, Market Reality, Operational Yield)
  - Created Executive Dashboard route (/sales-engine/executive) with read-only executive-focused layout
  - Executive Dashboard sections: System Health (top), Market Reality (left), Operational Yield (right), Campaign Distribution (bottom)
  - Clear data annotations: "Observed, not processed" for Market Reality, "Processed subset of observed" for Operational Yield
  - Helper text explains gaps represent untapped opportunity, not system failure
  - Updated ExecutionHealthIndicator: Zero-count completions use 'info' level (not warnings)
  - Softened empty state messaging: "No execution yet — campaign ready for first run"
  - Added "Executive View" button to campaigns list header
  - All new components use NSD-approved semantic colors (magenta/indigo/violet only)

- January 20, 2026: Comprehensive UX/UI Redesign (Minimalist Neon-Focused)
  - Added NSD_GLOW, NSD_GRADIENTS, NSD_TRANSITIONS design tokens for neon-inspired effects
  - Added gradient accent bar at top of all major pages (magenta → violet brand gradient)
  - Redesigned CampaignListHeader with glass-style stat cards: icons, large numbers, gradient top borders
  - Created SkeletonLoader component with brand-colored shimmer effect for loading states
  - Created EmptyState component with neon sign-style SVG illustration
  - Redesigned filter pills with gradient fill for active state and hover glow effects
  - Updated Button component with gradient CTA styling and hover glow animations
  - Redesigned WizardNav stepper with gradient connecting line and filled step circles
  - Updated search bar with rounded corners, shadow, and focus glow effect
  - Increased page margins (48-64px) and typography hierarchy for minimalist white space
  - All buttons have micro-animations (hover glow, translateY lift effect)

- January 20, 2026: NSD Brand Color Compliance (Complete Overhaul)
  - Removed ALL yellow (#FEF3C7, #92400E, #FCD34D), green (#D1FAE5, #6EE7B7, #065F46), and red (#FEE2E2, #FECACA, #991B1B) colors
  - Updated design-tokens.ts with NSD-only palette: magenta, indigo, violet
  - Semantic status colors now use brand palette:
    - semantic.attention (warning/review): magenta light (#FCE7F3, #912D73, #F9A8D4)
    - semantic.positive (success/completed): violet (#EDE7F6, #4A1D7A, #CE93D8)
    - semantic.critical (error/failed): magenta (#FCE7F3, #912D73, #F48FB1)
    - semantic.info (informational): indigo light (#E8EAF6, #020F5A, #C5CAE9)
    - semantic.active (running): indigo (#E8EAF6, #020F5A, #9FA8DA)
  - Updated all governance state, status, confidence, and provenance styling functions
  - Fixed 15+ components with hardcoded legacy colors
  - Brand reference: www.neonsignsdepot.com, logo gradient #CC368F → #912D73 → #692BAA

- January 20, 2026: Campaign-Centric UX Optimization (Option A: Minimal)
  - Simplified navigation from 5 sections to campaign-focused single view
  - Created CampaignListHeader component with collapsible summary stats (active campaigns, needs attention, daily capacity)
  - Created MiniPipelineIndicator component for compact pipeline visibility (Orgs → Contacts → Leads) in table rows
  - Created ExecutionStatusBadge component for execution state indicators (idle, running, completed, failed)
  - Enhanced campaigns table with execution status, pipeline progress, and relative time columns
  - Added smart filter pills: All, Draft, Pending Review, Ready, Running, Completed, Failed
  - Removed NavBar from campaigns page - replaced with inline filter pills
  - Updated /approvals, /runs, /monitoring pages to redirect to campaigns with appropriate filter query params
  - TagInput now supports paste with comma-separated values auto-splitting into tags
  - Contact Targeting step now auto-inherits ICP job_titles/seniority_levels (reduces duplicate data entry)
  - All hardcoded colors replaced with NSD_COLORS design tokens

- January 19, 2026: Keyword-Aware ENM Narrative for Org Sourcing Observability
  - Extended ExecutionNarrative with KeywordContext interface (totalKeywords, keywordsWithResults, keywordsWithZeroResults, hasLowCoverageWarning, warningMessage)
  - ENM mapper now parses org_sourcing:keyword_summary, org_sourcing:keyword_health, and run.warning (keyword_coverage_low) events
  - Added KEYWORD_COPY constants for informational messaging about keyword coverage
  - Created KeywordCoverageWarningBannerENM component for informational warnings (amber styling, not failure)
  - Updated ActiveStageFocusPanelENM to display keyword context and warning banner during org_sourcing stage
  - UI guardrail: Keyword warnings are INFORMATIONAL, not failures

- January 19, 2026: Fix Duplicate Campaign Edit Flow
  - Created `/api/campaign-get/[id]` endpoint to fetch campaigns from Supabase
  - Updated edit page to use Supabase-based fetch instead of M60 API
  - Duplicated campaigns now load correctly in the edit wizard
  - Root cause: Duplicates were created in Supabase but edit page fetched from M60 API

- January 18, 2026: ENM Governance Lock (Complete)
  - Created `execution-narrative-governance.ts` with strict ENM-only types
  - Created ENM-governed components: ExecutionHealthIndicatorENM, ActiveStageFocusPanelENM, LatestRunStatusCardENM, LastExecutionSummaryCardENM
  - All ENM components consume ONLY ExecutionNarrative output
  - Added governance documentation in `app/sales-engine/lib/execution-governance.md`
  - ENM is now the SOLE execution truth source - UI cannot regress into heuristics

- January 18, 2026: Canonical Execution Narrative Mapper (ENM) Implementation
  - Created `execution-narrative-mapper.ts` with truthful, event-driven execution storytelling
  - Implements canonical mapping rules: IDLE, QUEUED, RUNNING, STALLED, COMPLETED, FAILED
  - Parses stage.boundary events to show active stage with details
  - Enforces hard UI rules: never show "No orgs found" while running
  - Added trust accelerator copy for historical data and running states
  - Created `useExecutionNarrative` hook for component consumption
  - Created `ExecutionNarrativeCard` component for displaying narratives
  - ENM is deterministic, testable, and event-driven (not heuristic-driven)

- January 18, 2026: Campaign Edit & Duplicate Features (Complete)
  - Created `/api/campaign-update` endpoint for updating campaign configuration
  - Created `/sales-engine/campaigns/[id]/edit` wizard page for editing any campaign
  - Edit wizard loads existing campaign data and pre-populates all form fields
  - Created `/api/campaign-duplicate` endpoint to copy campaign data with new ID and DRAFT status
  - Copies: name (prefixed with "Copy of"), ICP, sourcing_config, lead_qualification_config
  - Does NOT copy: execution history, runs, metrics (fresh campaign)
  - Added "Edit Campaign" and "Duplicate Campaign" buttons to GovernanceActionsPanel
  - After duplication, navigates to edit wizard for review and adjustment