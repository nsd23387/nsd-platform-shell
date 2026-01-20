# SEO Intelligence Governance Rules

**Last Updated:** January 18, 2026  
**Scope:** NSD Platform Shell (applies to any domain including SEO Intelligence)

---

## Core Principle

> **The UI must not compute metrics.**
> 
> All metrics must be sourced from canonical analytics views in the ODS layer.
> This ensures consistency, auditability, and prevents metric drift.

---

## Governance Rules

### Rule 1: No Metric Computation

The following operations are **PROHIBITED** in UI code:

| Operation | Example | Why Prohibited |
|-----------|---------|----------------|
| Aggregation | `array.reduce((sum, x) => sum + x.value, 0)` | Creates local metric definition |
| Rate calculation | `completed / total * 100` | Derives metric without canonical definition |
| Time-window rollups | `filterByDate(items, 'last30days')` | Defines reporting period locally |
| Percentage computation | `(a / b) * 100` where a, b are counts | Creates derived metric |
| Count derivation | `items.filter(...).length` for metric display | Aggregates raw data |

### Rule 2: Allowed Transformations

The following operations are **ALLOWED** (display-only):

| Operation | Example | Why Allowed |
|-----------|---------|-------------|
| Visual percentage | `width = item.value / total * 100` (for bar width) | UI layout, not metric |
| Sorting | `items.sort((a, b) => b.value - a.value)` | Presentation order |
| Filtering for display | `items.filter(x => x.visible)` | UI visibility |
| Formatting | `value.toLocaleString()` | Number formatting |
| Summing for display | `items.reduce(...) as footer total` | Display total of pre-computed values |

### Rule 3: Upstream Metric Implementation

When a new metric is needed:

1. **DO NOT** implement it in the UI
2. **DO** document it in `docs/seo/METRICS_AUDIT.md`
3. **DO** create a ticket for `nsd-ods-api` implementation
4. **DO** use placeholder text: `"Awaiting upstream metric"`

### Rule 4: Governance Comments

All files performing data transformations must include governance comments:

```typescript
/**
 * GOVERNANCE NOTE:
 * This component performs display-only transformations.
 * [Specific explanation of what transformation occurs]
 * 
 * This is an ALLOWED/PROHIBITED transformation per governance audit.
 * See: docs/seo/METRICS_AUDIT.md
 */
```

---

## Canonical Metric Sources

All metrics must come from these upstream sources:

| Domain | Source System | View Pattern |
|--------|---------------|--------------|
| Execution | nsd-ods-api | `analytics.metrics_campaign_execution_*` |
| Yield | nsd-ods-api | `analytics.metrics_campaign_yield_*` |
| Throughput | nsd-ods-api | `analytics.metrics_throughput_*` |
| Safety | nsd-ods-api | `analytics.metrics_campaign_safety_*` |
| SLA | nsd-ods-api | `analytics.metrics_sla_*` |

---

## Hard Stop Conditions

**Immediately escalate** if you encounter:

1. SQL queries in UI code
2. GROUP BY logic anywhere in frontend
3. Time bucketing (daily/weekly/monthly) in UI
4. Metric math in components
5. Rate or percentage calculations from raw counts

---

## Enforcement

1. **Code Review**: All PRs must be checked for governance violations
2. **Automated Audit**: Run periodic scans for red-flag patterns
3. **Documentation**: All violations must be logged in `METRICS_AUDIT.md`
4. **Remediation**: Violations must be fixed before merge

---

## Contact

For governance questions, refer to:
- `docs/seo/METRICS_AUDIT.md` - Audit findings and transferred metrics
- `docs/UI_GOVERNANCE.md` - General UI governance rules
- `docs/SALES_ENGINE_UI_ARCHITECTURE_CONTRACT.md` - Architecture contract
