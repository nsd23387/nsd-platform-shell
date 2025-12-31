# NSD Environment Matrix

> **Status:** Governance Controlled  
> **Classification:** Internal — Confidential  
> **Last Updated:** 2025-12-20  
> **Owner:** Platform Security Team

---

## Purpose

This document defines the **environmental boundaries and permissions matrix** for the NSD Unified Business Platform. It establishes:

1. **Environmental Isolation:** Clear boundaries between development, staging, and production
2. **Blast-Radius Containment:** Limiting the impact of security incidents to specific environments
3. **Secret Scope Permissions:** Which secret scopes are permitted in each environment
4. **Integration Controls:** Which external services may be accessed from each environment
5. **Data Sensitivity Rules:** What types of data are permitted in each environment

### Hard Gate

This document is a **hard governance gate** for Milestone 2. Environment provisioning, secret injection, and infrastructure creation are blocked until this matrix is approved.

---

## Environment Definitions

### Development (`dev`)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Local and shared development, feature testing |
| **Data Classification** | Synthetic only — no real customer data |
| **Network Isolation** | Isolated from production networks |
| **Access Control** | Development team members |
| **Persistence** | Ephemeral — may be reset without notice |
| **External Integrations** | Sandbox/test accounts only |

### Staging (`staging`)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Pre-production validation, integration testing, QA |
| **Data Classification** | Synthetic or anonymized — no identifiable customer data |
| **Network Isolation** | Separate from production, may access test external services |
| **Access Control** | Development team, QA team, authorized reviewers |
| **Persistence** | Semi-persistent — reset on release cycles |
| **External Integrations** | Test/sandbox accounts for approved integrations |

### Production (`prod`)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Live customer-facing systems |
| **Data Classification** | Real customer data — full data protection applies |
| **Network Isolation** | Production network with strict ingress/egress controls |
| **Access Control** | Operations team, on-call engineers, audited access |
| **Persistence** | Persistent — governed by backup and retention policies |
| **External Integrations** | Live accounts for approved integrations only |

---

## Secret Scope Permissions by Environment

| Secret Scope | dev | staging | prod | Notes |
|--------------|-----|---------|------|-------|
| `platform-shell` | ✅ Permitted | ✅ Permitted | ✅ Permitted | Auth and session secrets required in all environments |
| `ods` | ✅ Permitted | ✅ Permitted | ✅ Permitted | ODS access required in all environments |
| `analytics` | ✅ Permitted | ✅ Permitted | ✅ Permitted | Analytics collection in all environments |
| `integration` | ⚠️ Sandbox Only | ⚠️ Sandbox Only | ✅ Live Permitted | External integrations use sandbox in non-prod |

### Scope Rules

1. **Cross-Environment Access Forbidden:** A secret provisioned for one environment may never be used in another
2. **Scope Isolation:** Secrets from one scope may not be used by systems in another scope without explicit approval
3. **Sandbox Enforcement:** Integration secrets in dev/staging must point to sandbox or test accounts

---

## External Integration Permissions

| Integration | dev | staging | prod | Owner | Notes |
|-------------|-----|---------|------|-------|-------|
| Stripe | Sandbox | Sandbox | Live | Integration Team | Payment processing |
| Trello | Sandbox | Sandbox | Live | Integration Team | Project board sync |
| Slack | Test Workspace | Test Workspace | Live Workspace | Integration Team | Notifications |
| Activity Spine | Dev Instance | Staging Instance | Prod Instance | Analytics Team | Internal service |

### Integration Rules

1. **No Live Credentials in Non-Prod:** Live/production credentials for external services are forbidden in dev and staging
2. **Sandbox Account Required:** External integrations must provide sandbox or test accounts for non-production use
3. **Webhook Isolation:** Webhook endpoints must be environment-specific; no shared webhook receivers across environments

---

## Data Sensitivity Rules

| Data Type | dev | staging | prod |
|-----------|-----|---------|------|
| Real Customer PII | ❌ Forbidden | ❌ Forbidden | ✅ Permitted |
| Real Payment Data | ❌ Forbidden | ❌ Forbidden | ✅ Permitted |
| Real Order Data | ❌ Forbidden | ⚠️ Anonymized Only | ✅ Permitted |
| Synthetic Test Data | ✅ Permitted | ✅ Permitted | ❌ Forbidden |
| Anonymized Data | ✅ Permitted | ✅ Permitted | ⚠️ By Exception |
| System Logs | ✅ Permitted | ✅ Permitted | ✅ Permitted |
| Performance Metrics | ✅ Permitted | ✅ Permitted | ✅ Permitted |

### Data Rules

1. **Synthetic Data Required:** Development and staging must use synthetic or anonymized data only
2. **No Production Data Export:** Real customer data may not be exported from production to other environments
3. **Anonymization Standard:** Anonymized data must be irreversibly transformed; no re-identification possible

---

## Deployment and Access Control

| Control | dev | staging | prod |
|---------|-----|---------|------|
| Self-Service Deploy | ✅ Permitted | ⚠️ With Approval | ❌ Forbidden |
| Automated Deploy (CI/CD) | ✅ Permitted | ✅ Permitted | ✅ Required |
| Manual Deploy | ✅ Permitted | ⚠️ With Approval | ❌ Forbidden |
| Direct Database Access | ✅ Permitted | ⚠️ Read-Only | ❌ Forbidden |
| Shell/SSH Access | ✅ Permitted | ⚠️ Audited | ⚠️ Emergency Only |
| Log Access | ✅ Permitted | ✅ Permitted | ✅ Audited |
| Secret Rotation | Manual | Manual | Automated Required |

### Deployment Rules

1. **Production Requires CI/CD:** All production deployments must go through approved CI/CD pipelines
2. **No Manual Production Changes:** Direct changes to production infrastructure are forbidden except for documented emergencies
3. **Audit Trail Required:** All access to staging and production must be logged and auditable

---

## Enforcement Rules

### UI Enforcement

1. **UI May Not Branch on Secrets:** The frontend application must not contain conditional logic based on secret values
2. **Environment Detection:** Environment-specific behavior must use non-secret identifiers (e.g., `NSD_ENVIRONMENT_NAME`)
3. **No Secret Exposure:** Secrets must never be exposed to client-side code or browser developer tools

### Secret Injection Enforcement

1. **Approved Systems Only:** Secrets may only be injected by approved deployment systems
2. **No Manual Injection:** Copy-pasting secrets into configuration is forbidden
3. **Rotation Automation:** Production secrets must be rotated via automated systems

### Violation Response

1. **Immediate Block:** Violations of this matrix block milestone progression
2. **Security Review:** Any violation triggers mandatory security review
3. **Remediation Required:** Violating deployments must be rolled back until remediation is complete
4. **Incident Documentation:** All violations must be documented in the security incident log

---

## Cross-Environment Boundaries

| Action | Permitted? | Notes |
|--------|------------|-------|
| Copy secrets from prod to staging | ❌ Forbidden | Staging must use separate credentials |
| Copy data from prod to dev | ❌ Forbidden | Use synthetic data generators |
| Share webhook endpoints across environments | ❌ Forbidden | Each environment has dedicated endpoints |
| Use prod API keys in staging | ❌ Forbidden | Use sandbox/test keys |
| Access prod database from dev | ❌ Forbidden | Complete network isolation required |
| Deploy staging build to prod | ❌ Forbidden | Prod builds must be built for prod |

---

## Approval

This document must be approved before:

- Any environment is provisioned
- Any infrastructure is created (including Supabase)
- Any secrets are generated or injected
- Any deployment pipelines are configured

### Approval Blocks

The following are explicitly blocked until this matrix is approved:

- Supabase project creation
- API key generation
- Environment variable configuration
- CI/CD secret injection
- External integration configuration

**Approval Status:** Pending Review

---

*This document is governance-controlled. Changes require security team review.*
