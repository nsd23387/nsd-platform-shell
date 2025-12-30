# Sales Engine UI Architecture Contract

> **Version:** 1.0  
> **Status:** Pending Approval (M67-01)  
> **Classification:** Architecture Contract — Governance Controlled  
> **Milestone:** M67-01 — Sales Engine UI Architecture Contract  
> **Date:** 2024  
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
| **M14 — OMS UX Specification** | Order lifecycle boundaries |
| **M28-01 — Custom Quote UX** | Quote creation and configuration |
| **M60 — Sales Engine API Contract** | Allowed API surface (UI-facing extract) |
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
| **Enforce Endpoint Allowlist** | Block requests to non-M60 endpoints | Allowlist enforcement |
| **Prevent Secret Leakage** | Never expose service role keys to client | Secret audit |
| **Log API Interactions** | Record all UI → API calls for audit | Log verification |
| **Handle Auth Failures** | Return standardized 401/403 responses | Error handling audit |
| **Enforce Rate Limits** | Apply rate limiting to prevent abuse | Rate limit verification |

### 3.2 nsd-sales-engine Responsibilities

The Sales Engine is the **sole authority** for business logic, approval, and execution.

| Responsibility | Implementation | Verification |
|----------------|----------------|--------------|
| **Expose M60 API Surface** | Provide documented read/write/execute endpoints | API contract audit |
| **Enforce M65 Approval Gates** | Require human approval for gated actions | Gate verification |
| **Enforce M66 Execution Safety** | Implement kill switch and execution boundaries | Safety verification |
| **Validate All Inputs** | Never trust UI-provided data without validation | Input validation audit |
| **Enforce Authorization** | Verify permissions for every request | Auth enforcement audit |
| **Return Canonical State** | Provide authoritative state to UI | State consistency audit |
| **Audit All Mutations** | Log all write/execute actions with actor attribution | Audit log verification |
| **Enforce Environment Isolation** | Respect environment boundaries in all operations | Isolation verification |

### 3.3 UI Responsibilities

The UI is a **stateless rendering layer** with no business authority.

| Responsibility | Implementation | Verification |
|----------------|----------------|--------------|
| **Render Returned State** | Display state exactly as returned by API | UI audit |
| **Collect User Input** | Capture and forward user input to API | Input handling audit |
| **Display Confirmations** | Show success/error messages from API responses | Confirmation audit |
| **Display Warnings** | Surface warnings from API (e.g., gate requirements) | Warning audit |
| **No State Computation** | Never calculate, derive, or infer business state | Code review |
| **No Auth Logic** | Never parse, validate, or interpret tokens | Code review |
| **No Environment Logic** | Never branch on environment or select environment | Code review |
| **No Approval Logic** | Never implement approval workflows | Code review |
| **No Execution Logic** | Never implement execution logic | Code review |

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
     │                         │                             │ 9. Check Kill Switch (M66)
     │                         │                             │ 10. Execute Logic
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
| **Endpoint Format** | UI calls relative endpoints only (e.g., `/api/sales-engine/quotes`) | Code review rejection |
| **No Absolute URLs** | UI never constructs URLs to external services | Code review rejection |
| **No Query String Auth** | Auth tokens never appear in query strings | Security rejection |
| **No Body Auth** | Auth tokens never appear in request bodies | Security rejection |
| **Content-Type** | Always `application/json` for POST/PUT/PATCH | API validation |
| **No Custom Headers** | UI does not add custom headers (Shell adds required headers) | Code review rejection |

### 4.3 Response Handling Rules

| Rule | Requirement | Violation Response |
|------|-------------|-------------------|
| **Render As-Is** | UI displays returned data without transformation (except formatting) | Code review rejection |
| **No State Derivation** | UI does not compute additional state from responses | Code review rejection |
| **Error Display** | UI displays error messages from API verbatim | UX audit |
| **Warning Display** | UI surfaces all warnings from API responses | UX audit |
| **No Retry Logic** | UI does not implement automatic retry (user-initiated only) | Code review rejection |
| **No Caching** | UI does not cache Sales Engine responses | Code review rejection |

### 4.4 Interaction Boundaries

| Interaction | Allowed | Forbidden |
|-------------|---------|-----------|
| **Read quote list** | ✅ | — |
| **Read quote detail** | ✅ | — |
| **Create draft quote** | ✅ (if M60 allows) | — |
| **Update draft configuration** | ✅ (if M60 allows) | — |
| **Submit for approval** | ✅ (API handles gate) | UI implements approval logic |
| **Execute approved quote** | ✅ (API handles execution) | UI implements execution logic |
| **Override approval** | — | ❌ Forbidden |
| **Bypass kill switch** | — | ❌ Forbidden |
| **Direct DB query** | — | ❌ Forbidden |
| **Direct service call** | — | ❌ Forbidden |

---

## 5. Allowed API Surface (M60-Only)

### 5.1 API Surface Principle

> **The UI may ONLY call endpoints explicitly documented in the M60 UI-Facing Contract Extract.**

Endpoints not listed in M60 are **forbidden** regardless of their existence in the Sales Engine.

### 5.2 Read APIs

Read APIs return current state. UI renders returned data without modification.

| Endpoint Pattern | Purpose | UI Behavior |
|------------------|---------|-------------|
| `GET /api/sales-engine/quotes` | List quotes | Render list as returned |
| `GET /api/sales-engine/quotes/:id` | Quote detail | Render detail as returned |
| `GET /api/sales-engine/quotes/:id/status` | Quote lifecycle status | Render status as returned |
| `GET /api/sales-engine/quotes/:id/history` | Quote audit history | Render history as returned |
| `GET /api/sales-engine/config/options` | Available configuration options | Populate UI selectors |

#### Read API Guarantees

| Guarantee | Description |
|-----------|-------------|
| **Idempotent** | Multiple identical requests return consistent results |
| **Side-Effect Free** | Read requests never mutate state |
| **Environment-Scoped** | Results are scoped to injected environment |
| **Permission-Filtered** | Results filtered by user permissions |

### 5.3 Write APIs (DRAFT/Config Only)

Write APIs mutate draft state only. UI collects input and submits; API validates and persists.

| Endpoint Pattern | Purpose | UI Behavior | Constraints |
|------------------|---------|-------------|-------------|
| `POST /api/sales-engine/quotes` | Create draft quote | Submit form data | Draft state only |
| `PATCH /api/sales-engine/quotes/:id` | Update draft quote | Submit changes | Draft state only |
| `POST /api/sales-engine/quotes/:id/items` | Add line item | Submit item data | Draft state only |
| `PATCH /api/sales-engine/quotes/:id/items/:itemId` | Update line item | Submit changes | Draft state only |
| `DELETE /api/sales-engine/quotes/:id/items/:itemId` | Remove line item | Confirm and submit | Draft state only |

#### Write API Constraints

| Constraint | Description | Enforcement |
|------------|-------------|-------------|
| **Draft Only** | Write APIs only modify quotes in DRAFT state | Server-side validation |
| **No State Transition** | Write APIs do not change lifecycle state | Server-side enforcement |
| **Validation Required** | All inputs validated server-side | API contract |
| **Audit Logged** | All writes logged with actor attribution | Server-side logging |

### 5.4 Execute APIs

Execute APIs trigger state transitions and business actions. These are protected by M65/M66 safety gates.

| Endpoint Pattern | Purpose | UI Behavior | Safety Gates |
|------------------|---------|-------------|--------------|
| `POST /api/sales-engine/quotes/:id/submit` | Submit for approval | Show confirmation, submit | M65 gate check |
| `POST /api/sales-engine/quotes/:id/approve` | Approve quote (if authorized) | Show confirmation, submit | M65 approval required |
| `POST /api/sales-engine/quotes/:id/execute` | Execute approved quote | Show confirmation, submit | M66 kill switch check |
| `POST /api/sales-engine/quotes/:id/cancel` | Cancel quote | Show confirmation, submit | Audit logged |

#### Execute API Safety Model

| Safety Layer | Description | UI Visibility |
|--------------|-------------|---------------|
| **M65 Approval Gate** | Certain actions require human approval | API returns `approval_required: true` |
| **M66 Kill Switch** | Execution can be halted system-wide | API returns `execution_disabled: true` |
| **M66 Per-Quote Block** | Individual quotes can be execution-blocked | API returns `quote_blocked: true` |
| **Actor Attribution** | All executions logged with user identity | Transparent to UI |

#### Execute API Response Model

The API returns explicit gate status. UI MUST render this status.

```json
{
  "success": false,
  "error": {
    "code": "APPROVAL_REQUIRED",
    "message": "This action requires approval from a Sales Manager.",
    "approval_required": true,
    "approver_roles": ["sales_manager", "sales_director"]
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "EXECUTION_DISABLED",
    "message": "Quote execution is temporarily disabled.",
    "execution_disabled": true,
    "kill_switch_active": true
  }
}
```

UI MUST display these messages verbatim. UI MUST NOT attempt to work around these responses.

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
| `if (quote.status === 'approved')` with execution logic | Approval logic in UI | Code review |
| SLA calculation functions | Business logic in UI | Code review |
| Pricing calculation functions | Business logic in UI | Code review |
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

### 6.2 Conditional Prohibitions

These patterns are forbidden in specific contexts.

| Pattern | Context | Allowed Alternative |
|---------|---------|---------------------|
| `localStorage.setItem('quote_*')` | Persisting business state | Use API for state persistence |
| `sessionStorage.setItem('quote_*')` | Persisting business state | Use API for state persistence |
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

### Logic Boundaries
- [ ] No approval workflow logic
- [ ] No execution logic
- [ ] No state machine implementation
- [ ] No SLA/pricing calculations
- [ ] No permission inference

### Environment & Auth
- [ ] No environment selection UI
- [ ] No environment-conditional business logic
- [ ] No JWT parsing or decoding
- [ ] No token management logic

### API Interaction
- [ ] Only documented M60 endpoints called
- [ ] Relative endpoint URLs only
- [ ] No custom auth headers
- [ ] Responses rendered without transformation

### Safety Boundaries
- [ ] M65 gate responses displayed verbatim
- [ ] M66 kill switch responses displayed verbatim
- [ ] No workarounds for blocked actions
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
│ • Implement execution logic                                         │
│ • Bypass API responses                                              │
│ • Access backend directly                                           │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 2: PLATFORM SHELL ENFORCES                                    │
│ • Endpoint allowlist (M60 only)                                     │
│ • Auth injection (no token leakage)                                 │
│ • Environment injection (no selection)                              │
│ • Request logging (audit trail)                                     │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 3: SALES ENGINE ENFORCES                                      │
│ • M65 approval gates (server-side)                                  │
│ • M66 kill switch (server-side)                                     │
│ • Permission validation (server-side)                               │
│ • Input validation (server-side)                                    │
│ • Audit logging (server-side)                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 M65 Approval Gate Preservation

The M65 Approval Gate Contract defines actions requiring human approval. UI preserves these gates by:

| Guarantee | Implementation |
|-----------|----------------|
| **No Approval UI** | UI does not implement approval workflows |
| **Gate Response Display** | UI displays "approval required" messages from API |
| **No Bypass Attempt** | UI does not retry or work around approval requirements |
| **Approver Visibility** | UI displays required approver roles from API response |
| **Status Polling** | UI may poll for approval status (read-only) |

#### Approval Flow (UI Perspective)

```
1. User clicks "Submit for Approval"
2. UI calls POST /api/sales-engine/quotes/:id/submit
3. API returns { approval_required: true, message: "..." }
4. UI displays message and approval status
5. UI does NOT implement approval logic
6. User with approval authority uses separate approval surface
7. UI polls for status update (optional)
8. Once approved, UI displays updated status
```

### 8.3 M66 Kill Switch Preservation

The M66 Execution Safety Contract defines execution boundaries. UI preserves these by:

| Guarantee | Implementation |
|-----------|----------------|
| **No Execution Logic** | UI does not implement execution workflows |
| **Kill Switch Response Display** | UI displays "execution disabled" messages from API |
| **No Bypass Attempt** | UI does not retry or work around kill switch |
| **Graceful Degradation** | UI remains functional when execution is disabled |
| **No Execution State** | UI does not track execution progress locally |

#### Kill Switch Response Handling

When kill switch is active, API returns:

```json
{
  "success": false,
  "error": {
    "code": "EXECUTION_DISABLED",
    "message": "Quote execution is temporarily disabled. Please contact your administrator.",
    "kill_switch_active": true,
    "disabled_reason": "System maintenance in progress"
  }
}
```

UI MUST:
- Display the `message` field verbatim
- Display the `disabled_reason` if provided
- Disable execution-related UI affordances
- NOT attempt workarounds or retries

### 8.4 Safety Violation Response

If UI detects safety-related error responses, it MUST:

| Response Code | UI Behavior |
|---------------|-------------|
| `APPROVAL_REQUIRED` | Display message, disable action, show approval status |
| `EXECUTION_DISABLED` | Display message, disable execution UI |
| `QUOTE_BLOCKED` | Display message, show block reason |
| `PERMISSION_DENIED` | Display message, disable action |
| `KILL_SWITCH_ACTIVE` | Display message, disable all executions |

UI MUST NOT:
- Retry blocked requests automatically
- Offer "try again" for safety-blocked actions
- Cache or ignore safety responses
- Implement client-side workarounds

---

## 9. Observability Boundaries

### 9.1 Observability Principle

> **UI may observe Sales Engine metrics. UI may NOT modify, annotate, or influence observability data.**

### 9.2 Allowed Observability Access

| Access | Purpose | Constraints |
|--------|---------|-------------|
| Quote status display | Show current lifecycle state | Read-only |
| Quote history display | Show audit trail | Read-only, append-only view |
| SLA status display | Show compliance indicators | Read-only, API-provided values |
| Error display | Show API error messages | Read-only, verbatim display |

### 9.3 Forbidden Observability Access

| Access | Reason |
|--------|--------|
| Direct metrics database access | Violates API-only access |
| Log injection | UI cannot write to logs |
| Metric annotation | UI cannot modify metrics |
| Alert triggering | UI cannot raise alerts |
| Dashboard modification | UI cannot change dashboard definitions |

### 9.4 Observability Response Handling

API may return observability metadata. UI renders this without modification:

```json
{
  "quote": { ... },
  "observability": {
    "sla_status": "on_track",
    "last_activity": "2024-01-15T10:30:00Z",
    "activity_count": 12
  }
}
```

UI displays these values. UI does NOT:
- Calculate SLA status
- Compute activity counts
- Derive time-based metrics
- Infer status from other fields

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
| 1.0 | 2024 | Initial contract (M67-01) | Pending |

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
| **Critical** (direct DB access, secret exposure) | Immediate rollback, security incident |
| **High** (approval/execution logic in UI) | Block merge, mandatory remediation |
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

The following items require clarification before or during implementation:

### 11.1 Open Questions from M60 Extract

| ID | Question | Status | Resolution Owner |
|----|----------|--------|------------------|
| OQ-001 | Are bulk operations (multi-quote actions) in scope for M60? | Open | Sales Engine Team |
| OQ-002 | What is the polling interval for approval status? | Open | Platform Team |
| OQ-003 | Are quote attachments/files in scope for M60? | Open | Sales Engine Team |
| OQ-004 | What quote configuration options are exposed via API? | Open | Sales Engine Team |
| OQ-005 | Is quote cloning/duplication an M60 operation? | Open | Sales Engine Team |

### 11.2 Integration Ambiguities

| ID | Ambiguity | Impact | Mitigation |
|----|-----------|--------|------------|
| IA-001 | Exact M60 endpoint paths not finalized | UI cannot implement until resolved | Block on M60 finalization |
| IA-002 | Error response schema not standardized | UI error handling may be inconsistent | Define error schema in M60 |
| IA-003 | Pagination model not specified | Large quote lists may have UX issues | Define pagination in M60 |
| IA-004 | Real-time updates not addressed | UI may show stale data | Document refresh model |

### 11.3 Safety Boundary Clarifications Needed

| ID | Clarification Needed | Status |
|----|----------------------|--------|
| SB-001 | Exact M65 gate trigger conditions | Pending M65 finalization |
| SB-002 | M66 kill switch activation criteria | Pending M66 finalization |
| SB-003 | Per-environment kill switch behavior | Pending M66 finalization |
| SB-004 | Approval timeout/expiration handling | Pending M65 finalization |

### 11.4 Resolution Process

Open questions and ambiguities will be resolved as follows:

1. **M67-02 Planning** — Review open questions, prioritize resolution
2. **M60 Finalization** — Resolve API surface questions
3. **M65/M66 Finalization** — Resolve safety gate questions
4. **Contract Amendment** — Update this contract with resolutions
5. **Implementation Start** — M67-02+ may begin after resolutions

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | M67-01-ARCH-CONTRACT |
| **Version** | 1.0 |
| **Status** | Pending Approval |
| **Classification** | Governance Controlled |
| **Owner** | Platform Architecture Team |
| **Last Updated** | 2024 |

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
| **M65** | Approval Gate Contract — defines human approval requirements |
| **M66** | Execution Safety Contract — defines kill switch and execution boundaries |
| **M67** | Sales Engine UI milestone series |
| **Kill Switch** | Server-side mechanism to halt all executions immediately |
| **Approval Gate** | Server-side requirement for human approval before action proceeds |
| **Platform Shell** | The UI container and API mediation layer |
| **ODS** | Operational Data Store — backend database |
| **Edge Function** | Supabase serverless function |
| **Bootstrap** | Initial application load providing identity and permissions |

---

**END OF CONTRACT**

*This contract is governance-controlled. Changes require formal review and approval.*
