# NSD Secrets Registry (Names Only)

> **Status:** Governance Controlled  
> **Classification:** Internal — Confidential  
> **Last Updated:** 2025-12-20  
> **Owner:** Platform Security Team

---

## Purpose

This document defines the **canonical universe of secrets** for the NSD Unified Business Platform. It serves as the authoritative registry of all secret names that may exist across the platform.

### Why Secrets Are Named Before They Exist

1. **Governance Gate:** No secret may be created, provisioned, or injected into any environment unless it is first declared in this registry
2. **Audit Trail:** All secrets must be traceable to an approved entry in this document
3. **Blast-Radius Containment:** Scoping secrets by name prevents unauthorized cross-system access
4. **Change Control:** Modifications to the secret namespace require review and approval

### Hard Gate

This document is a **hard governance gate** for Milestone 2. Infrastructure provisioning, environment variable injection, and deployment automation are blocked until this registry is approved.

---

## Non-Negotiable Rules

1. **No Values:** This document contains **secret names only**. Values are never stored in source control.
2. **No Injection Without Declaration:** A secret that does not appear in this registry may not be injected into any environment.
3. **Review Required:** Any addition, removal, or modification to this registry requires security review and approval.
4. **No Placeholders:** This registry contains only real, approved secret names — no examples, samples, or test placeholders.
5. **Scope Enforcement:** Secrets must be scoped to their declared systems. Cross-scope access requires explicit approval.

---

## Secrets Registry

| Secret Name | Scope | Environments | Owner | Used By | Rotation Policy | Notes |
|-------------|-------|--------------|-------|---------|-----------------|-------|
| `NSD_AUTH_SIGNING_KEY` | platform-shell | dev, staging, prod | Auth Team | Authentication service, JWT signing | 90 days | Primary signing key for authentication tokens |
| `NSD_AUTH_SIGNING_KEY_PREVIOUS` | platform-shell | dev, staging, prod | Auth Team | Authentication service | On rotation | Previous key retained for token validation during rotation |
| `NSD_SESSION_ENCRYPTION_KEY` | platform-shell | dev, staging, prod | Auth Team | Session management | 90 days | Symmetric key for session data encryption |
| `NSD_ODS_SERVICE_ROLE_KEY` | ods | dev, staging, prod | ODS Team | ODS API, service-to-service auth | 180 days | Service role credential for ODS database access |
| `NSD_ODS_ANON_KEY` | ods | dev, staging, prod | ODS Team | Public API endpoints | 365 days | Anonymous/public access key for ODS |
| `NSD_WEBHOOK_SIGNING_SECRET` | integration | dev, staging, prod | Integration Team | Webhook receivers | 180 days | HMAC signing secret for inbound webhook verification |
| `NSD_STRIPE_WEBHOOK_SECRET` | integration | staging, prod | Integration Team | Stripe webhook handler | Per Stripe rotation | Stripe-specific webhook endpoint secret |
| `NSD_STRIPE_API_KEY` | integration | staging, prod | Integration Team | Payment processing | 365 days | Stripe API access (restricted key) |
| `NSD_TRELLO_API_KEY` | integration | staging, prod | Integration Team | Trello board sync | 365 days | Trello integration API key |
| `NSD_TRELLO_API_TOKEN` | integration | staging, prod | Integration Team | Trello board sync | 365 days | Trello integration token |
| `NSD_SLACK_WEBHOOK_URL` | integration | staging, prod | Integration Team | Slack notifications | On channel change | Slack incoming webhook URL |
| `NSD_SLACK_BOT_TOKEN` | integration | staging, prod | Integration Team | Slack bot interactions | 365 days | Slack bot OAuth token |
| `NSD_ACTIVITY_SPINE_API_KEY` | analytics | dev, staging, prod | Analytics Team | Activity Spine SDK | 180 days | API key for Activity Spine service access |
| `NSD_ANALYTICS_WRITE_KEY` | analytics | staging, prod | Analytics Team | Analytics event ingestion | 365 days | Write key for analytics pipeline |

---

## Non-Secret Identifiers

The following identifiers are **not secrets** but are tracked here for completeness. They may be committed to source control or embedded in client-side code.

| Identifier Name | Scope | Environments | Classification | Notes |
|-----------------|-------|--------------|----------------|-------|
| `NSD_ANALYTICS_PUBLIC_ID` | analytics | dev, staging, prod | Public | Client-side analytics identifier (non-sensitive) |
| `NSD_ENVIRONMENT_NAME` | platform-shell | dev, staging, prod | Public | Environment identifier (dev/staging/prod) |
| `NSD_API_VERSION` | ods | dev, staging, prod | Public | API version string |
| `NSD_BUILD_ID` | platform-shell | dev, staging, prod | Public | Build/deployment identifier |

---

## Scope Definitions

| Scope | Description | Systems |
|-------|-------------|---------|
| `platform-shell` | NSD Command Center frontend | Platform Shell UI, authentication flows |
| `ods` | Operational Data Store | ODS API, database access, service roles |
| `analytics` | Activity Spine and analytics | Activity Spine, metrics collection, dashboards |
| `integration` | External service integrations | Stripe, Trello, Slack, webhooks |

---

## Change Control

### Adding a New Secret

1. Submit a request to add the secret name to this registry
2. Specify: name, scope, environments, owner, rotation policy
3. Security review required before approval
4. Once approved, the secret may be provisioned in the declared environments
5. Provisioning must use approved deployment systems only

### Removing a Secret

1. Verify the secret is no longer in use across all environments
2. Submit a deprecation request with justification
3. Security review required
4. Secret is marked deprecated for one rotation cycle before removal
5. Remove from all environments before removing from this registry

### Modifying a Secret

1. Changes to scope, environments, or rotation policy require review
2. Name changes are treated as deprecation + addition
3. Owner changes must be documented with handoff confirmation

---

## Enforcement

- **Automated Checks:** CI/CD pipelines will validate that injected secrets are declared in this registry
- **Deployment Blocks:** Secrets not in this registry will cause deployment failures
- **Audit Logging:** All secret access is logged and correlated with this registry
- **Violation Response:** Undeclared secrets discovered in any environment will trigger immediate security review

---

## Approval

This document must be approved before:

- Any secret provisioning system is configured
- Any environment variables are injected
- Any deployment automation references secrets
- Supabase or other infrastructure is provisioned

**Approval Status:** Pending Review

---

*This document is governance-controlled. Changes require security team review.*
