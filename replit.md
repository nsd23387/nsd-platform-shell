# M67 Sales Engine UI

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