# Sales Engine UI Architecture Contract

> **Version:** 1.1  
> **Status:** Pending Approval (M67-01)  
> **Classification:** Architecture Contract — Governance Controlled  
> **Milestone:** M67-01 — Sales Engine UI Architecture Contract  
> **Date:** 2024-12-30  
> **Owner:** Platform Architecture Team

---

## Table of Contents

1. [Purpose & Scope](#1-purpose--scope)
2. [Architectural Principles](#2-architectural-principles)
3. [Roles & Responsibilities](#3-roles--responsibilities)
4. [UI → API Interaction Model](#4-ui--api-interaction-model)
5. [Allowed API Surface (M60-Only)](#5-allowed-api-surface-m60-only)
6. [Explicitly Forbidden Patterns](#6-explicitly-forbidden-patterns)
7. [Environment & Auth Enforcement Model](#7-environment--auth-enforcement-model)
8. [Execution / Approval Safety Guarantees](#8-execution--approval-safety-guarantees)
9. [Observability Boundaries](#9-observability-boundaries)
10. [Change Control & Governance](#10-change-control--governance)
11. [Appendix: Ambiguities / Open Questions](#11-appendix-ambiguities--open-questions)

---

## 1. Purpose & Scope

### 1.1 Purpose

This document establishes the **binding architecture contract** between the Platform Shell UI and the `nsd-sales-engine` backend service. It defines:

1. **Allowed Interactions** — What the UI may request from the Sales Engine
2. **Forbidden Patterns** — What the UI must never do
3. **Safety Boundaries** — How M65 (Approval Gates) and M66 (Execution Safety) are preserved
4. **Enforcement Model** — How environment, auth, and access control are applied

This contract is the **single source of truth** for all Sales Engine UI development. Implementation decisions that deviate from this contract are invalid.

### 1.2 Scope

| In Scope | Out of Scope |
|----------|--------------|
| Platform Shell ↔ nsd-sales-engine interaction rules | Sales Engine backend implementation |
| Allowed M60 API surface for UI consumption | API design or schema changes |
| UI behavior boundaries and constraints | Database schema modifications |
| Environment and auth enforcement requirements | Edge function implementation |
| Safety gate preservation (M65/M66) | Approval workflow logic |
| Observability read-only boundaries | ODS table structures |
| Code review enforcement patterns | Backend execution logic |

### 1.3 Binding Authority

This contract is **binding and enforceable** in the following contexts:

| Context | Enforcement |
|---------|-------------|
| **Code Review** | PRs violating this contract MUST be rejected |
| **Architecture Review** | Designs violating this contract MUST be revised |
| **Implementation** | Code violating this contract MUST NOT be merged |
| **Testing** | Tests MUST verify contract compliance |
| **Audit** | Violations MUST be documented and remediated |

### 1.4 Referenced Contracts

This contract builds upon and must not contradict:

| Contract | Relevance |
|----------|-----------|
| **M13 — Platform Shell UX Specification** | Read-only semantics, navigation model |
| **M60 — Sales Engine API Contract** | Allowed API surface (UI-facing extract, 2024-12-30) |
| **M65 — Approval Gate Contract** | Human approval requirements |
| **M66 — Execution Safety Contract** | Kill switch and execution boundaries |
| **Environment Matrix** | DEV/STAGING/PROD isolation rules |
| **Secrets Registry** | Permitted secret scopes |

---

## 2. Architectural Principles

### 2.1 Core Principles

| Principle | Definition | Enforcement |
|-----------|------------|-------------|
| **API-Mediated Access Only** | UI accesses Sales Engine exclusively through documented M60 APIs exposed via Platform Shell's API layer | Hard gate |
| **Zero Direct Coupling** | UI has no direct connection to Supabase, ODS, Edge Functions, or internal services | Hard gate |
| **Environment Opacity** | UI does not know or select its environment; environment is injected by Platform Shell | Hard gate |
| **Auth Passthrough** | UI does not manage, parse, or interpret auth tokens; tokens are injected by Platform Shell | Hard gate |
| **Render-Only Logic** | UI renders state returned by APIs; UI does not compute, derive, or infer business state | Hard gate |
| **No Embedded Authority** | UI cannot grant itself permissions, bypass gates, or elevate access | Hard gate |

### 2.2 Layered Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PLATFORM SHELL UI                           │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Render State │ Collect Input │ Display Confirmations/Errors  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              PLATFORM SHELL API LAYER (M60 ONLY)              │  │
│  │   Auth Injection │ Environment Injection │ Surface Exposure   │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼ (HTTPS / Governed API Calls)
┌─────────────────────────────────────────────────────────────────────┐
│                        NSD-SALES-ENGINE                             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  M60 API Surface │ M65 Approval Gates │ M66 Execution Safety  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │    Supabase │ ODS │ Edge Functions │ Internal Services        │  │
│  │                    (INVISIBLE TO UI)                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Trust Boundaries

| Boundary | UI Trust Level | Notes |
|----------|----------------|-------|
| **Platform Shell API Layer** | Trusted | UI may call documented endpoints |
| **M60 API Surface** | Trusted (via Platform Shell) | UI never calls directly |
| **nsd-sales-engine internals** | Untrusted | UI has no visibility |
| **Supabase** | Forbidden | UI must not access |
| **ODS Tables** | Forbidden | UI must not query |
| **Edge Functions** | Forbidden | UI must not invoke |
| **Service Role Keys** | Forbidden | UI must never possess |

---

## 3. Roles & Responsibilities

### 3.1 Platform Shell Responsibilities

The Platform Shell is the **sole mediator** between the UI and the Sales Engine.

| Responsibility | Implementation | Verification |
|----------------|----------------|--------------|
| **Expose M60 API Surface** | Proxy or re-expose only documented M60 endpoints | API surface audit |
| **Inject Authentication** | Attach Bearer token from authenticated session | Auth header verification |
| **Inject Environment** | Set environment identifier (DEV/STAGING/PROD) server-side | Environment header verification |
| **Enforce Endpoint Allowlist** | Block requests to non-M60 endpoints (including legacy `/api/campaigns/*`) | Allowlist enforcement |
| **Prevent Secret Leakage** | Never expose service role keys to client | Secret audit |
| **Log API Interactions** | Record all UI → API calls for audit | Log verification |
| **Handle Auth Failures** | Return standardized 401/403 responses | Error handling audit |
| **Enforce Rate Limits** | Apply rate limiting to prevent abuse | Rate limit verification |

### 3.2 nsd-sales-engine Responsibilities

The Sales Engine is the **sole authority** for business logic, approval, and readiness validation.

| Responsibility | Implementation | Verification |
|----------------|----------------|--------------|
| **Expose M60 API Surface** | Provide documented read/write endpoints only | API contract audit |
| **Enforce M65 Approval Gates** | Require human approval for gated actions | Gate verification |
| **Enforce M66 Execution Safety** | Implement kill switch and execution boundaries | Safety verification |
| **Validate All Inputs** | Never trust UI-provided data without validation | Input validation audit |
| **Enforce Authorization** | Verify permissions for every request | Auth enforcement audit |
| **Return Canonical State** | Provide authoritative state including governance metadata | State consistency audit |
| **Audit All Mutations** | Log all write actions with actor attribution | Audit log verification |
| **Enforce Environment Isolation** | Respect environment boundaries in all operations | Isolation verification |

### 3.3 UI Responsibilities

The UI is a **stateless rendering layer** with no business authority.

| Responsibility | Implementation | Verification |
|----------------|----------------|--------------|
| **Render Returned State** | Display state exactly as returned by API | UI audit |
| **Render Governance Metadata** | Use `canEdit`, `canSubmit`, `canApprove`, `isRunnable` to enable/disable actions | UI audit |
| **Collect User Input** | Capture and forward user input to API | Input handling audit |
| **Display Confirmations** | Show success/error messages from API responses | Confirmation audit |
| **Display Warnings** | Surface warnings and blocking reasons from API | Warning audit |
| **No State Computation** | Never calculate, derive, or infer business state | Code review |
| **No Auth Logic** | Never parse, validate, or interpret tokens | Code review |
| **No Environment Logic** | Never branch on environment or select environment | Code review |
| **No Approval Logic** | Never implement approval workflows | Code review |
| **No Execution Logic** | Never implement execution triggers | Code review |

---

## 4. UI → API Interaction Model

### 4.1 Interaction Sequence

The following sequence defines the ONLY valid interaction pattern:

```
┌──────────┐          ┌──────────────────┐          ┌─────────────────┐
│    UI    │          │  Platform Shell  │          │ nsd-sales-engine│
│          │          │    API Layer     │          │                 │
└────┬─────┘          └────────┬─────────┘          └────────┬────────┘
     │                         │                             │
     │ 1. User Action          │                             │
     │ (click, input, etc.)    │                             │
     │                         │                             │
     │ 2. API Call             │                             │
     │ (relative endpoint)     │                             │
     ├────────────────────────►│                             │
     │                         │                             │
     │                         │ 3. Inject Auth Header       │
     │                         │ 4. Inject Environment       │
     │                         │ 5. Validate Allowlist       │
     │                         │                             │
     │                         │ 6. Forward Request          │
     │                         ├────────────────────────────►│
     │                         │                             │
     │                         │                             │ 7. Validate Auth
     │                         │                             │ 8. Enforce Gates (M65)
     │                         │                             │ 9. Validate Readiness
     │                         │                             │ 10. Process Request
     │                         │                             │ 11. Return State
     │                         │                             │
     │                         │ 12. Response                │
     │                         │◄────────────────────────────┤
     │                         │                             │
     │ 13. Response            │                             │
     │◄────────────────────────┤                             │
     │                         │                             │
     │ 14. Render State        │                             │
     │ 15. Display Messages    │                             │
     │                         │                             │
```

### 4.2 Request Rules

| Rule | Requirement | Violation Response |
|------|-------------|-------------------|
| **Endpoint Format** | UI calls relative endpoints only (e.g., `/api/v1/campaigns`) | Code review rejection |
| **No Absolute URLs** | UI never constructs URLs to external services | Code review rejection |
| **No Query String Auth** | Auth tokens never appear in query strings | Security rejection |
| **No Body Auth** | Auth tokens never appear in request bodies | Security rejection |
| **Content-Type** | Always `application/json` for POST/PATCH | API validation |
| **No Custom Headers** | UI does not add custom headers (Shell adds required headers) | Code review rejection |

### 4.3 Response Handling Rules

| Rule | Requirement | Violation Response |
|------|-------------|-------------------|
| **Render As-Is** | UI displays returned data without transformation (except formatting) | Code review rejection |
| **No State Derivation** | UI does not compute additional state from responses | Code review rejection |
| **Error Display** | UI displays error messages from API verbatim | UX audit |
| **Warning Display** | UI surfaces all warnings and blocking reasons from API responses | UX audit |
| **No Retry Logic** | UI does not implement automatic retry (user-initiated only) | Code review rejection |
| **No Caching** | UI does not cache Sales Engine responses | Code review rejection |

### 4.4 Interaction Boundaries

| Interaction | Allowed | Forbidden |
|-------------|---------|-----------|
| **Read campaign list** | ✅ | — |
| **Read campaign detail** | ✅ | — |
| **Read campaign metrics/runs/variants/throughput** | ✅ | — |
| **Create draft campaign** | ✅ | — |
| **Update draft configuration** | ✅ (DRAFT status only) | — |
| **Submit for approval** | ✅ (API handles lifecycle) | UI implements approval logic |
| **Approve campaign** | ✅ (API handles lifecycle) | UI implements approval logic |
| **Execute/run/trigger campaign** | — | ❌ **Forbidden — No endpoints exist** |
| **Override approval** | — | ❌ Forbidden |
| **Bypass kill switch** | — | ❌ Forbidden |
| **Direct DB query** | — | ❌ Forbidden |
| **Direct service call** | — | ❌ Forbidden |

---

## 5. Allowed API Surface (M60-Only)

### 5.1 API Surface Principle

> **The UI may ONLY call endpoints explicitly documented in the M60 UI-Facing Contract Extract (2024-12-30).**

**Base Namespace:** `/api/v1/campaigns`

Endpoints not listed below are **forbidden** regardless of their existence in the Sales Engine.

### 5.2 Read APIs (8 Endpoints)

Read APIs return current state. UI renders returned data without modification.

| Method | Endpoint | Purpose | UI Behavior |
|--------|----------|---------|-------------|
| GET | `/api/v1/campaigns` | List all campaigns | Render list as returned; supports `?status=` filter |
| GET | `/api/v1/campaigns/:id` | Campaign details with governance metadata | Render detail; use governance flags for action enablement |
| GET | `/api/v1/campaigns/:id/metrics` | Latest campaign metrics snapshot (M56) | Render metrics as returned |
| GET | `/api/v1/campaigns/:id/metrics/history` | Historical metrics snapshots | Render history as returned |
| GET | `/api/v1/campaigns/:id/runs` | Campaign run summaries (M59) | Render run list as returned |
| GET | `/api/v1/campaigns/:id/runs/latest` | Most recent run summary | Render latest run as returned |
| GET | `/api/v1/campaigns/:id/variants` | Personalization variants (M57) | Render variants as returned |
| GET | `/api/v1/campaigns/:id/throughput` | Active throughput configuration (M58) | Render throughput config as returned |

#### Governance Metadata (Required UI Handling)

The `GET /api/v1/campaigns/:id` response includes governance metadata that UI **MUST** use:

| Field | Type | UI Requirement |
|-------|------|----------------|
| `canEdit` | boolean | Enable/disable edit controls |
| `canSubmit` | boolean | Enable/disable submit action |
| `canApprove` | boolean | Enable/disable approve action |
| `isRunnable` | boolean | Display runnable status indicator |

UI MUST render these flags and enable/disable actions accordingly. UI MUST NOT compute these values locally.

#### Read API Guarantees

| Guarantee | Description |
|-----------|-------------|
| **Idempotent** | Multiple identical requests return consistent results |
| **Side-Effect Free** | Read requests never mutate state |
| **Environment-Scoped** | Results are scoped to injected environment |
| **Permission-Filtered** | Results filtered by user permissions |

### 5.3 Write APIs (4 Endpoints)

Write APIs mutate state. UI collects input and submits; API validates, enforces lifecycle, and persists.

| Method | Endpoint | Purpose | Constraints |
|--------|----------|---------|-------------|
| POST | `/api/v1/campaigns` | Create new campaign | Always created in `DRAFT` status; enforced at API layer |
| PATCH | `/api/v1/campaigns/:id` | Update campaign configuration | Only `DRAFT` campaigns; `status` field cannot be changed via this endpoint |
| POST | `/api/v1/campaigns/:id/submit` | Submit campaign for review | Requires `submittedBy` actor ID; transitions `DRAFT` → `PENDING_REVIEW` |
| POST | `/api/v1/campaigns/:id/approve` | Approve campaign | Requires `approvedBy` actor ID; transitions `PENDING_REVIEW` → `RUNNABLE` |

#### Write API Constraints

| Constraint | Description | Enforcement |
|------------|-------------|-------------|
| **DRAFT Only for Edits** | PATCH only works on campaigns in `DRAFT` status | Server-side validation |
| **No Direct Status Change** | Status cannot be modified via PATCH; only via `/submit` and `/approve` | Server-side enforcement |
| **Actor Attribution Required** | `/submit` requires `submittedBy`; `/approve` requires `approvedBy` | Server-side validation |
| **Audit Logged** | All writes logged with actor attribution | Server-side logging |

#### Campaign Lifecycle States

| Status | Mutability | Governance Flags |
|--------|------------|------------------|
| `DRAFT` | Fully editable | `canEdit: true`, `canSubmit: true` |
| `PENDING_REVIEW` | Immutable configuration | `canEdit: false`, `canApprove: true` |
| `APPROVED` / `RUNNABLE` | Immutable | ICP and name frozen; execution gated separately |
| `ARCHIVED` | Immutable | Preserved for learning |

**Note:** `/submit` and `/approve` are **lifecycle transition endpoints**, NOT execution triggers. They change campaign status but do not trigger outbound execution.

### 5.4 Execute APIs — NONE EXIST

> **⚠️ NO EXECUTE ENDPOINTS EXIST IN THE M60 API**

The M60 API explicitly does **NOT** expose any execution triggers. The following patterns are **explicitly prohibited** and return 404:

| Forbidden Pattern | Status |
|-------------------|--------|
| `POST /api/v1/campaigns/:id/execute` | Returns 404 |
| `POST /api/v1/campaigns/:id/run` | Returns 404 |
| `POST /api/v1/campaigns/:id/trigger` | Returns 404 |
| `POST /api/v1/campaigns/:id/schedule` | Returns 404 |
| `PATCH /api/v1/campaigns/:id/runs/:runId` | Returns 404 |
| `DELETE /api/v1/campaigns/:id/runs/:runId` | Returns 404 |

**UI MUST NOT:**
- Attempt to call any execute/run/trigger endpoints
- Display execute/run buttons that imply direct execution capability
- Implement any client-side execution logic

**Execution happens entirely outside the M60 API surface.** Passing readiness validation does NOT trigger execution; outbound delivery requires separate gated operations not exposed to UI.

---

## 6. Explicitly Forbidden Patterns

### 6.1 Hard Prohibitions

The following patterns are **unconditionally forbidden**. Violations block merge.

#### 6.1.1 Direct Data Access

| Pattern | Reason | Detection |
|---------|--------|-----------|
| `import { createClient } from '@supabase/supabase-js'` | Direct Supabase access | Static analysis |
| `supabase.from('*').select(*)` | Direct table query | Static analysis |
| `supabase.rpc('*')` | Direct RPC call | Static analysis |
| `fetch('*/functions/v1/*')` | Direct Edge Function call | Static analysis |
| `fetch('*/rest/v1/*')` | Direct PostgREST call | Static analysis |
| Any import from `@supabase/*` | Supabase SDK usage | Static analysis |

#### 6.1.2 Secret Access

| Pattern | Reason | Detection |
|---------|--------|-----------|
| `process.env.SUPABASE_SERVICE_ROLE_KEY` | Service role key access | Static analysis |
| `process.env.*_SERVICE_*` | Any service key access | Static analysis |
| `process.env.NSD_ODS_SERVICE_ROLE_KEY` | ODS service key access | Static analysis |
| Hardcoded keys or tokens | Embedded secrets | Static analysis + secret scanning |

#### 6.1.3 Business Logic Implementation

| Pattern | Reason | Detection |
|---------|--------|-----------|
| `if (campaign.status === 'RUNNABLE')` with execution logic | Execution logic in UI | Code review |
| Throughput calculation functions | Business logic in UI | Code review |
| Readiness validation functions | Business logic in UI | Code review |
| State machine implementation | Lifecycle logic in UI | Code review |
| Permission inference logic | Auth logic in UI | Code review |

#### 6.1.4 Environment Manipulation

| Pattern | Reason | Detection |
|---------|--------|-----------|
| `process.env.NODE_ENV` for business logic | Environment branching | Code review |
| Environment selector UI | User environment selection | Code review |
| Conditional API URLs by environment | Environment-aware routing | Code review |
| `if (isProd) { ... }` business logic | Environment-specific logic | Code review |

#### 6.1.5 Auth Manipulation

| Pattern | Reason | Detection |
|---------|--------|-----------|
| JWT parsing or decoding | Token inspection | Static analysis |
| `jwt_decode()` or equivalent | Token decoding | Static analysis |
| Permission inference from token claims | Auth logic in UI | Code review |
| Role hierarchy implementation | RBAC logic in UI | Code review |
| `setAuthToken()` or equivalent | Token management | Code review |

#### 6.1.6 Legacy Endpoint Access

| Pattern | Reason | Detection |
|---------|--------|-----------|
| `fetch('/api/campaigns/*')` | Legacy non-versioned API | Static analysis |
| Any call to `/api/campaigns/` (without `/v1/`) | Not part of M60 governed access | Code review |

**Only `/api/v1/campaigns/*` endpoints are permitted.** Legacy `/api/campaigns/*` (non-versioned) endpoints exist in the backend but are **NOT part of M60 governed access** and MUST be blocked at the Platform Shell level.

### 6.2 Conditional Prohibitions

These patterns are forbidden in specific contexts.

| Pattern | Context | Allowed Alternative |
|---------|---------|---------------------|
| `localStorage.setItem('campaign_*')` | Persisting business state | Use API for state persistence |
| `sessionStorage.setItem('campaign_*')` | Persisting business state | Use API for state persistence |
| `setInterval()` for polling | Auto-refresh | User-initiated refresh only |
| `setTimeout()` for retry | Automatic retry | User-initiated retry only |
| Optimistic UI updates | Assuming mutation success | Wait for API confirmation |

### 6.3 Code Review Checklist

Reviewers MUST verify the following before approving any Sales Engine UI PR:

```markdown
## Sales Engine UI Architecture Compliance

### Hard Prohibitions
- [ ] No Supabase imports or usage
- [ ] No direct Edge Function calls
- [ ] No direct ODS/PostgREST access
- [ ] No service role key references
- [ ] No hardcoded secrets or tokens
- [ ] No legacy endpoint calls (`/api/campaigns/*` without `/v1/`)

### Logic Boundaries
- [ ] No approval workflow logic
- [ ] No execution/run/trigger logic
- [ ] No state machine implementation
- [ ] No readiness/throughput calculations
- [ ] No permission inference

### Environment & Auth
- [ ] No environment selection UI
- [ ] No environment-conditional business logic
- [ ] No JWT parsing or decoding
- [ ] No token management logic

### API Interaction
- [ ] Only documented M60 endpoints called (`/api/v1/campaigns/*`)
- [ ] Relative endpoint URLs only
- [ ] No custom auth headers
- [ ] Responses rendered without transformation
- [ ] Governance metadata (`canEdit`, `canSubmit`, `canApprove`, `isRunnable`) used correctly

### Safety Boundaries
- [ ] M65 blocking reasons displayed verbatim
- [ ] M66 kill switch responses displayed verbatim
- [ ] No workarounds for blocked actions
- [ ] No execute/run/trigger buttons or actions
```

---

## 7. Environment & Auth Enforcement Model

### 7.1 Environment Injection

The Platform Shell injects environment context. UI never selects or interprets environment.

| Principle | Implementation |
|-----------|----------------|
| **Server-Side Injection** | Environment identifier set by Platform Shell API layer |
| **Opaque to UI** | UI receives no environment information |
| **No Branching** | UI code contains no environment-conditional logic |
| **Single Codebase** | Same UI code deploys to all environments |

#### Environment Header Flow

```
UI Request → Platform Shell API Layer → Inject X-NSD-Environment Header → Sales Engine

UI sees: Nothing
Platform Shell sets: X-NSD-Environment: prod (or staging, dev)
Sales Engine receives: Environment-scoped request
```

### 7.2 Auth Injection

The Platform Shell injects authentication. UI never manages tokens.

| Principle | Implementation |
|-----------|----------------|
| **Server-Side Injection** | Bearer token attached by Platform Shell API layer |
| **Opaque to UI** | UI does not see or handle tokens |
| **No Token Storage** | UI does not store tokens in localStorage/sessionStorage |
| **No Token Refresh** | UI does not implement token refresh logic |
| **No Token Parsing** | UI does not decode or inspect tokens |

#### Auth Header Flow

```
UI Request → Platform Shell API Layer → Inject Authorization Header → Sales Engine

UI sees: Nothing
Platform Shell sets: Authorization: Bearer <token>
Sales Engine receives: Authenticated request
```

### 7.3 Session Boundary

| Aspect | Behavior |
|--------|----------|
| **Session Start** | Bootstrap context loaded on app initialization |
| **Session Validation** | Platform Shell validates session server-side |
| **Session End** | Redirect to auth flow on 401 response |
| **No Local Auth State** | UI maintains no auth state beyond bootstrap context |

### 7.4 Environment Isolation Enforcement

Per the Environment Matrix, the following rules apply:

| Rule | DEV | STAGING | PROD |
|------|-----|---------|------|
| **Data Classification** | Synthetic only | Anonymized only | Real customer data |
| **API Target** | Dev Sales Engine | Staging Sales Engine | Prod Sales Engine |
| **Cross-Environment Access** | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden |
| **Secret Scope** | dev-only secrets | staging-only secrets | prod-only secrets |

UI code MUST NOT contain any logic that references these rules. Enforcement is entirely server-side.

---

## 8. Execution / Approval Safety Guarantees

### 8.1 Defense-in-Depth Model

Safety is enforced at multiple layers. No single layer failure compromises safety.

```
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 1: UI CANNOT                                                  │
│ • Implement approval logic                                          │
│ • Implement execution logic (no endpoints exist)                    │
│ • Bypass API responses                                              │
│ • Access backend directly                                           │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 2: PLATFORM SHELL ENFORCES                                    │
│ • Endpoint allowlist (M60 /api/v1/campaigns/* only)                 │
│ • Legacy endpoint blocking (/api/campaigns/* blocked)               │
│ • Auth injection (no token leakage)                                 │
│ • Environment injection (no selection)                              │
│ • Request logging (audit trail)                                     │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 3: SALES ENGINE ENFORCES                                      │
│ • M65 readiness validation (server-side)                            │
│ • M66 kill switch (server-side)                                     │
│ • Throughput validation (server-side)                               │
│ • Permission validation (server-side)                               │
│ • Input validation (server-side)                                    │
│ • Audit logging (server-side)                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 M65 Readiness Validation (Server-Enforced)

The M65 Approval Gate Contract defines readiness conditions that are **enforced entirely server-side**. UI displays results but cannot bypass or recompute.

#### Blocking Reasons (UI Must Display)

The following blocking reasons may be returned by the API. UI MUST display these verbatim:

| Block Reason Code | Meaning |
|-------------------|---------|
| `MISSING_HUMAN_APPROVAL` | Campaign requires human approval before proceeding |
| `PERSISTENCE_ERRORS` | Data persistence errors exist; cannot proceed |
| `NO_LEADS_PERSISTED` | No leads have been persisted; nothing to process |
| `KILL_SWITCH_ENABLED` | System-wide kill switch is currently enabled |
| `SMARTLEAD_NOT_CONFIGURED` | Smartlead integration not configured |
| `INSUFFICIENT_CREDITS` | Insufficient credit balance for operation |

**UI Behavior:**
- Display blocking reason messages verbatim from API
- Disable affected actions based on API response
- Do NOT attempt to recompute readiness locally
- Do NOT implement workarounds for blocked states

### 8.3 M66 Kill Switch Preservation

The M66 Execution Safety Contract defines execution boundaries. UI preserves these by:

| Guarantee | Implementation |
|-----------|----------------|
| **No Execution Logic** | UI has no execution endpoints to call |
| **Kill Switch Response Display** | UI displays blocking reason when `KILL_SWITCH_ENABLED` |
| **No Bypass Attempt** | UI does not retry or work around kill switch |
| **Graceful Degradation** | UI remains functional when kill switch is active |

**Key Principle:** Passing readiness validation does NOT trigger execution. Outbound delivery requires separate gated operations that are NOT exposed via the M60 API.

### 8.4 Throughput Validation (Server-Enforced)

Throughput limits are validated server-side. UI may display throughput configuration via `GET /api/v1/campaigns/:id/throughput` but cannot modify or bypass limits.

#### Throughput Block Reasons (UI Must Display)

| Block Reason Code | Meaning |
|-------------------|---------|
| `DAILY_LIMIT_EXCEEDED` | Daily send limit has been reached |
| `HOURLY_LIMIT_EXCEEDED` | Hourly send limit has been reached |
| `MAILBOX_LIMIT_EXCEEDED` | Per-mailbox limit has been reached |
| `CONFIG_INACTIVE` | Throughput configuration is inactive |
| `NO_CONFIG_FOUND` | No throughput configuration exists |

**UI Behavior:**
- Render throughput configuration as returned by API
- Display throughput block reasons verbatim
- Do NOT calculate throughput limits locally
- Do NOT implement client-side rate limiting logic

### 8.5 Safety Violation Response

If UI receives safety-related error responses, it MUST:

| Response Code | UI Behavior |
|---------------|-------------|
| `MISSING_HUMAN_APPROVAL` | Display message, disable action, show approval status |
| `KILL_SWITCH_ENABLED` | Display message, indicate system-wide block |
| `PERSISTENCE_ERRORS` | Display message, indicate data issue |
| `INSUFFICIENT_CREDITS` | Display message, indicate credit issue |
| Any throughput block | Display message, show limit reached |

UI MUST NOT:
- Retry blocked requests automatically
- Offer "try again" for safety-blocked actions
- Cache or ignore safety responses
- Implement client-side workarounds

---

## 9. Observability Boundaries

### 9.1 Observability Principle

> **UI may observe Sales Engine metrics via M60 read endpoints. UI may NOT modify, annotate, or influence observability data.**

### 9.2 Allowed Observability Access

| Endpoint | Purpose | Constraints |
|----------|---------|-------------|
| `GET /api/v1/campaigns/:id/metrics` | View latest metrics snapshot | Read-only |
| `GET /api/v1/campaigns/:id/metrics/history` | View historical metrics | Read-only |
| `GET /api/v1/campaigns/:id/runs` | View run summaries | Read-only, immutable ledger |
| `GET /api/v1/campaigns/:id/runs/latest` | View most recent run | Read-only |
| `GET /api/v1/campaigns/:id/throughput` | View throughput configuration | Read-only |

#### Run Summary Schema (Read-Only)

Run summaries are an **immutable ledger** (one row per run, never updated):

| Field | Description |
|-------|-------------|
| `runStartedAt` | Timestamp when run started |
| `runEndedAt` | Timestamp when run ended |
| `runOutcome` | Outcome status |
| `leadsAttempted` | Number of leads attempted |
| `leadsSent` | Number of leads successfully sent |
| `leadsBlocked` | Number of leads blocked |
| `throughputLimitHit` | Whether throughput limit was hit |

### 9.3 Forbidden Observability Access

| Access | Reason |
|--------|--------|
| Direct metrics database access | Violates API-only access |
| Log injection | UI cannot write to logs |
| Metric annotation | UI cannot modify metrics |
| Alert triggering | UI cannot raise alerts |
| Dashboard modification | UI cannot change dashboard definitions |
| Run modification | Runs are immutable; no PATCH/DELETE exists |

### 9.4 Observability Response Handling

UI renders observability data without modification or derivation:

- Display metrics values as returned
- Display run summaries as returned
- Display throughput configuration as returned
- Do NOT calculate derived metrics
- Do NOT compute trend analysis
- Do NOT infer status from other fields

---

## 10. Change Control & Governance

### 10.1 Contract Change Process

This contract is **governance-controlled**. Changes require:

| Step | Requirement | Approver |
|------|-------------|----------|
| 1. Change Request | Written proposal with rationale | Requestor |
| 2. Impact Assessment | Analysis of affected systems | Architecture Team |
| 3. Security Review | Security implications evaluated | Security Team |
| 4. Architecture Review | Structural integrity verified | Architecture Team |
| 5. Approval | Explicit written approval | Platform Owner + Security Lead |
| 6. Documentation | Contract updated and versioned | Architecture Team |
| 7. Communication | Stakeholders notified | Platform Owner |

### 10.2 Versioning

| Version | Date | Change | Approver |
|---------|------|--------|----------|
| 1.0 | 2024-12-30 | Initial contract (M67-01) | — |
| 1.1 | 2024-12-30 | Revised to align with M60 UI-Facing Contract Extract (2024-12-30) | Pending |

### 10.3 Enforcement Review

This contract is subject to periodic enforcement review:

| Review Type | Frequency | Scope |
|-------------|-----------|-------|
| Code Review Audit | Weekly | Sample PR review for compliance |
| Static Analysis Audit | Per Release | Automated pattern detection |
| Security Audit | Quarterly | Full security boundary verification |
| Architecture Review | Per Milestone | Structural compliance verification |

### 10.4 Violation Handling

| Violation Severity | Response |
|--------------------|----------|
| **Critical** (direct DB access, secret exposure, execution logic) | Immediate rollback, security incident |
| **High** (approval logic in UI, legacy endpoint access) | Block merge, mandatory remediation |
| **Medium** (environment branching, auth logic) | Block merge, required fix |
| **Low** (response transformation, caching) | Flag for fix, may merge with ticket |

### 10.5 Exception Process

Exceptions to this contract require:

1. Written exception request with business justification
2. Security review of proposed exception
3. Architecture review of proposed exception
4. Time-bound approval (exceptions expire)
5. Documented mitigation for exception risks
6. Explicit approval from Platform Owner AND Security Lead

Exceptions are **discouraged** and should be rare.

---

## 11. Appendix: Ambiguities / Open Questions

### 11.1 Notes from M60 Extract

| ID | Note | Status |
|----|------|--------|
| N-001 | Auth/Roles: No explicit auth middleware visible in M60 API registration; assumed handled at platform layer | Acknowledged |
| N-002 | Kill Switch Persistence: Kill switch state storage location not visible in extraction; assumed platform-level configuration | Acknowledged |
| N-003 | Rate Limiting: `getRateLimiterStats()` exposed via `/api/system/rate-limiter` but not in versioned API namespace | Not in M60 scope |

### 11.2 Integration Clarifications

| ID | Clarification | Resolution |
|----|---------------|------------|
| IC-001 | Legacy endpoints blocked | Platform Shell MUST block `/api/campaigns/*` (non-versioned); only `/api/v1/campaigns/*` permitted |
| IC-002 | Governance metadata required | UI MUST use `canEdit`, `canSubmit`, `canApprove`, `isRunnable` from campaign detail response |
| IC-003 | No execute endpoints | UI MUST NOT display execute/run/trigger actions; no such endpoints exist |

### 11.3 M60 Source References

| Purpose | Source Path |
|---------|-------------|
| M60 Campaign Management API | `server/api/campaignManagementApi.ts` |
| Outbound Readiness Evaluator | `pipeline/outbound/outboundReadinessEvaluator.ts` |
| Throughput Validator | `server/services/throughputValidator.ts` |
| Campaign Run Orchestrator | `pipeline/campaigns/campaignRunOrchestrator.ts` |
| Shared SDK Entities | `shared-sdk/contracts/entities/` |
| Schema Definitions | `shared/schema.ts` |
| API Tests (Contract Verification) | `server/__tests__/campaignManagementApi.test.ts` |

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | M67-01-ARCH-CONTRACT |
| **Version** | 1.1 |
| **Status** | Pending Approval |
| **Classification** | Governance Controlled |
| **Owner** | Platform Architecture Team |
| **Last Updated** | 2024-12-30 |
| **Alignment Source** | M60 UI-Facing Contract Extract (2024-12-30) |

### Approval Signatures

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Platform Owner | _______________ | _______ | _______ |
| Security Lead | _______________ | _______ | _______ |
| Architecture Lead | _______________ | _______ | _______ |
| Sales Engine Owner | _______________ | _______ | _______ |

---

## Appendix: Glossary

| Term | Definition |
|------|------------|
| **M60** | Sales Engine API Contract — defines allowed UI-facing endpoints |
| **M65** | Approval Gate Contract — defines human approval and readiness requirements |
| **M66** | Execution Safety Contract — defines kill switch and execution boundaries |
| **M67** | Sales Engine UI milestone series |
| **Kill Switch** | Server-side mechanism to halt all outbound operations immediately |
| **Readiness Validation** | Server-side check of all conditions before outbound is possible |
| **Throughput Validation** | Server-side enforcement of send rate limits |
| **Platform Shell** | The UI container and API mediation layer |
| **ODS** | Operational Data Store — backend database |
| **Edge Function** | Supabase serverless function |
| **Bootstrap** | Initial application load providing identity and permissions |
| **Governance Metadata** | API-provided flags (`canEdit`, `canSubmit`, `canApprove`, `isRunnable`) |

---

**END OF CONTRACT**

*This contract is governance-controlled. Changes require formal review and approval.*
