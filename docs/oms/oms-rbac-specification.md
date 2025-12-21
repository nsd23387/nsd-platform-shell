# OMS RBAC Specification (M8-02)

> **Version:** 1.0  
> **Status:** Authoritative  
> **Milestone:** 8  
> **Last Updated:** 2024-12-20

---

## Governance Statement

This document defines the **RBAC (Role-Based Access Control)** scoping for OMS views within the NSD Platform Shell.

- **Uses ONLY existing roles** — no new roles are created
- **Read-only access only** — RBAC controls visibility, not mutation authority
- **No implicit authority** — viewing does not imply action rights
- **Changes require review** by platform governance stakeholders

---

## 1. Overview

### 1.1 Purpose

Define which roles can view which OMS views and what fields are visible to each role. RBAC ensures users see only the operational data relevant to their function.

### 1.2 Fundamental Principle

> **RBAC in OMS controls VISIBILITY, not AUTHORITY.**
>
> Even roles with full OMS visibility cannot perform mutations through the OMS UI.
> The OMS UI is READ-ONLY for all roles.

### 1.3 Existing Roles

| Role | Description |
|------|-------------|
| **Executive** | C-level, leadership, strategic oversight |
| **Operations** | Day-to-day operational management |
| **Sales** | Customer-facing, quote and order origination |
| **Production** | Manufacturing, fulfillment, quality control |
| **Support** | Customer support, issue resolution |

---

## 2. Role → View → Visibility Matrix

### 2.1 View Access Matrix

| View | Executive | Operations | Sales | Production | Support |
|------|:---------:|:----------:|:-----:|:----------:|:-------:|
| Quotes Overview | ✓ | ✓ | ✓ | — | ✓ |
| Orders Overview | ✓ | ✓ | ✓ | ✓ | ✓ |
| Production Status | ✓ | ✓ | — | ✓ | — |
| Exceptions | ✓ | ✓ | — | — | ✓ |

**Legend:**
- ✓ = Full view access (READ-ONLY)
- — = View not accessible

### 2.2 Detailed Field Visibility

#### 2.2.1 Quotes Overview

| Field | Executive | Operations | Sales | Support |
|-------|:---------:|:----------:|:-----:|:-------:|
| Quote ID | ✓ | ✓ | ✓ | ✓ |
| Customer Name | ✓ | ✓ | ✓ | ✓ |
| Quote Amount | ✓ | ✓ | ✓ | — |
| Margin/Profit | ✓ | — | — | — |
| Current State | ✓ | ✓ | ✓ | ✓ |
| Created Date | ✓ | ✓ | ✓ | ✓ |
| Sales Rep | ✓ | ✓ | ✓ | — |
| Last Activity | ✓ | ✓ | ✓ | ✓ |
| Internal Notes | — | ✓ | ✓ | — |

**Hidden from all roles:**
- Cost breakdown details
- Supplier information
- Negotiation history

#### 2.2.2 Orders Overview

| Field | Executive | Operations | Sales | Production | Support |
|-------|:---------:|:----------:|:-----:|:----------:|:-------:|
| Order ID | ✓ | ✓ | ✓ | ✓ | ✓ |
| Customer Name | ✓ | ✓ | ✓ | ✓ | ✓ |
| Order Amount | ✓ | ✓ | ✓ | — | — |
| Current State | ✓ | ✓ | ✓ | ✓ | ✓ |
| Production Stage | ✓ | ✓ | — | ✓ | — |
| Assigned Owner | ✓ | ✓ | — | ✓ | — |
| Ship Date | ✓ | ✓ | ✓ | ✓ | ✓ |
| Delivery Status | ✓ | ✓ | ✓ | — | ✓ |
| SLA Status | ✓ | ✓ | — | ✓ | — |
| Last Activity | ✓ | ✓ | ✓ | ✓ | ✓ |

**Hidden from all roles:**
- Cost/margin data
- Supplier assignments
- Production scheduling details

#### 2.2.3 Production Status

| Field | Executive | Operations | Production |
|-------|:---------:|:----------:|:----------:|
| Order ID | ✓ | ✓ | ✓ |
| Production Stage | ✓ | ✓ | ✓ |
| Mockup Status | ✓ | ✓ | ✓ |
| Assigned Owner | ✓ | ✓ | ✓ |
| Time in Stage | ✓ | ✓ | ✓ |
| SLA Status | ✓ | ✓ | ✓ |
| Quality Notes | — | ✓ | ✓ |
| Revision Count | ✓ | ✓ | ✓ |
| Equipment Assignment | — | ✓ | ✓ |

**Hidden from all roles:**
- Worker performance metrics
- Equipment utilization details
- Cost per unit

#### 2.2.4 Exceptions & Stalled Items

| Field | Executive | Operations | Support |
|-------|:---------:|:----------:|:-------:|
| Entity ID | ✓ | ✓ | ✓ |
| Entity Type | ✓ | ✓ | ✓ |
| Exception Reason | ✓ | ✓ | ✓ |
| Time Stalled | ✓ | ✓ | ✓ |
| Last Activity | ✓ | ✓ | ✓ |
| Assigned Owner | ✓ | ✓ | — |
| Escalation Status | ✓ | ✓ | — |
| Customer Contact | — | — | ✓ |
| Resolution Notes | — | ✓ | ✓ |

**Hidden from all roles:**
- Financial impact calculations
- Root cause analysis (internal)
- Vendor fault attribution

---

## 3. Security Notes

### 3.1 Why Read-Only Access is Enforced

| Reason | Explanation |
|--------|-------------|
| **Separation of Concerns** | OMS UI is for observation; mutations happen in authoritative systems |
| **Audit Trail Integrity** | All changes must go through proper channels with full event emission |
| **Error Prevention** | Prevents accidental modifications from observation interfaces |
| **Compliance** | Read-only access satisfies principle of least privilege |
| **Single Source of Truth** | `nsd-ods-api` remains the only authority for state changes |

### 3.2 How RBAC Prevents Implicit Authority

| Control | Implementation |
|---------|----------------|
| **No Action Buttons** | OMS views do not render mutation controls |
| **No API Write Endpoints** | OMS UI has no routes to mutation endpoints |
| **Field-Level Filtering** | Sensitive fields are filtered before rendering |
| **View-Level Gating** | Unauthorized views return access denied |
| **Audit Logging** | All view access is logged for compliance |

### 3.3 What RBAC Does NOT Do in OMS

| Misconception | Reality |
|---------------|---------|
| "More access = can edit" | ❌ All access is read-only |
| "Admin can modify" | ❌ No role can modify via OMS |
| "Hidden = doesn't exist" | ❌ Hidden data still exists, just not displayed |
| "Viewing = owning" | ❌ Visibility does not imply responsibility |

---

## 4. Permission Mapping

### 4.1 Permission Strings

| Permission | Description |
|------------|-------------|
| `oms:view` | Can access OMS section |
| `oms:quotes:view` | Can view Quotes Overview |
| `oms:orders:view` | Can view Orders Overview |
| `oms:production:view` | Can view Production Status |
| `oms:exceptions:view` | Can view Exceptions |

### 4.2 Role → Permission Mapping

| Role | Permissions |
|------|-------------|
| **Executive** | `oms:view`, `oms:quotes:view`, `oms:orders:view`, `oms:production:view`, `oms:exceptions:view` |
| **Operations** | `oms:view`, `oms:quotes:view`, `oms:orders:view`, `oms:production:view`, `oms:exceptions:view` |
| **Sales** | `oms:view`, `oms:quotes:view`, `oms:orders:view` |
| **Production** | `oms:view`, `oms:orders:view`, `oms:production:view` |
| **Support** | `oms:view`, `oms:quotes:view`, `oms:orders:view`, `oms:exceptions:view` |

### 4.3 Bootstrap Integration

Permissions are delivered via the `/api/v1/me` bootstrap endpoint:

```json
{
  "permissions": [
    "oms:view",
    "oms:quotes:view",
    "oms:orders:view"
  ]
}
```

The Platform Shell reads these permissions and conditionally renders views.

---

## 5. Implementation Guidelines

### 5.1 View-Level Access Control

```
┌─────────────────────────────────────────────────────────────┐
│                      OMS Navigation                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  IF hasPermission('oms:view') THEN                         │
│    Show OMS section in navigation                          │
│                                                             │
│    IF hasPermission('oms:quotes:view') THEN                │
│      Show "Quotes Overview" link                           │
│                                                             │
│    IF hasPermission('oms:orders:view') THEN                │
│      Show "Orders Overview" link                           │
│                                                             │
│    IF hasPermission('oms:production:view') THEN            │
│      Show "Production Status" link                         │
│                                                             │
│    IF hasPermission('oms:exceptions:view') THEN            │
│      Show "Exceptions" link                                │
│                                                             │
│  ELSE                                                       │
│    Hide OMS section entirely                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Field-Level Access Control

```
┌─────────────────────────────────────────────────────────────┐
│                    Field Rendering                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FOR each field in view:                                   │
│    IF field.visibleTo.includes(currentRole) THEN           │
│      Render field value                                    │
│    ELSE                                                     │
│      Do not render field (not even as hidden)              │
│                                                             │
│  Note: Hidden fields are omitted, not masked               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Denied Access Handling

When a user attempts to access a view they don't have permission for:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                          🔒                                 │
│                                                             │
│                   Access Denied                             │
│                                                             │
│     You do not have permission to view this OMS section.   │
│                                                             │
│     Your current role: [Role Name]                         │
│     Required permission: [Permission Name]                 │
│                                                             │
│     Contact your administrator for access.                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Compliance Checklist

### 6.1 RBAC Verification

| Check | Status |
|-------|--------|
| All views have permission requirements | ✓ |
| All fields have visibility rules | ✓ |
| No mutation paths exist | ✓ |
| Permissions come from bootstrap | ✓ |
| Denied access is explicit | ✓ |

### 6.2 Read-Only Verification

| Check | Status |
|-------|--------|
| No create buttons in UI | ✓ |
| No edit buttons in UI | ✓ |
| No delete buttons in UI | ✓ |
| No workflow triggers in UI | ✓ |
| No form submissions possible | ✓ |

---

## 7. References

- **[OMS UI Design Specification](./oms-ui-design-specification.md)**: View designs and wireframes
- **[Bootstrap Types](../../types/bootstrap.ts)**: Permission structure
- **[useRBAC Hook](../../hooks/useRBAC.tsx)**: RBAC implementation

---

## Appendix: Quick Reference

### Role Access Summary

| Role | Quotes | Orders | Production | Exceptions |
|------|:------:|:------:|:----------:|:----------:|
| Executive | ✓ Full | ✓ Full | ✓ Full | ✓ Full |
| Operations | ✓ Full | ✓ Full | ✓ Full | ✓ Full |
| Sales | ✓ Full | ✓ Limited | — | — |
| Production | — | ✓ Limited | ✓ Full | — |
| Support | ✓ Limited | ✓ Limited | — | ✓ Limited |

### Key Principles

1. **All access is READ-ONLY**
2. **Visibility ≠ Authority**
3. **RBAC controls what you see, not what you can do**
4. **Mutations happen in source systems, not OMS UI**
5. **Hidden data is omitted, not masked**

---

## Confirmation

**OMS UI remains NON-AUTHORITATIVE.**

- OMS UI cannot create, update, or delete any data
- OMS UI cannot trigger any workflows
- OMS UI cannot define business rules or KPIs
- All canonical meaning is defined in `nsd-ods-api`
- RBAC controls visibility only
