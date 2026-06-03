---
name: SEO /actions silent candidate fallback
description: Why any "shipped/approved" consumer of /api/proxy/seo/actions must hard-filter by status allowlist.
---

The `/api/proxy/seo/actions` GET route silently falls back to **awaiting-approval execution candidates** (from `analytics.seo_execution_candidate`, hardcoded `status='awaiting_approval'`) whenever `analytics.seo_action` has zero rows. The fallback ignores the requested `?status=` filter.

**Why:** Any UI that consumes this endpoint to show "recently approved / shipped" work will display *pending, never-approved* candidates as if they were shipped the moment the real `seo_action` table is empty — which is the current steady state. That silently breaks the project's core data-truthfulness governance (showing pending as done).

**How to apply:** When reading shipped/approved actions, hard-filter results client-side to an explicit shipped-lifecycle allowlist (`approved, executing, published, measuring, rolled_back`). Never trust the route's `?status=` param to exclude the fallback. If the filtered list is empty, render the honest empty state rather than the raw rows.
