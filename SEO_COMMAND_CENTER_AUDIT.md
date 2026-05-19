# SEO Command Center — Audit & Redesign Proposal

**Prepared for:** Leadership review
**Date:** May 15, 2026
**Author:** Engineering
**Scope:** `app/dashboard/seo/*` — 14 routes, 1 shared layout, 1 dynamic detail route, ~3,400 LoC.
**Status:** Draft — awaiting decision on consolidation plan before any further code changes.

---

## 1 · Executive Summary

The SEO Command Center has accreted **14 sub-routes** over six months of incremental shipping. Most pages were built before the recent SEO Overview redesign and before the Ahrefs decommissioning. The result is a surface area that is:

- **Functionally redundant** — the new Overview already presents the priority queue, competitor SoV, data freshness, and an action-detail flow. Three sub-pages now duplicate what the Overview shows in summary form, but with inconsistent data and labels.
- **Wired inconsistently** — 12 different data-fetch patterns across 14 pages. Three different "Loading…" UX states. Two pages still reference `analytics.raw_ahrefs_*` tables despite Ahrefs being formally decommissioned. None of the sub-pages carry a governance lock comment.
- **Misaligned with the new IA** — a recently-claimed nav rename (commit `4997bdc`) did not take effect; the live layout still ships the pre-redesign labels. Two functional pages (Internal Links, Schema Markup) are invisible in the sub-nav.

**Recommendation:** Collapse 12 visible sub-routes into **5 consolidated hubs** with internal tab structures, drop 2 dead/legacy routes, retire 1 Ahrefs-dependent page, and standardize data-fetch / governance / RBAC patterns across every page. Estimated effort: **2 sprints** for full graduation; can be staged to ship value in sprint 1.

---

## 2 · Current State Snapshot

### 2.1 Live sub-navigation (as deployed today)

```
OVERVIEW       SEO Overview              ← redesigned, faithful to mockup
ANALYSIS       Page Performance
               SERP Features
               Competitive Intel         ← duplicates Overview's Competitor section
OPTIMIZATION   SEO Actions               ← duplicates Overview's "Do this next"
               Execution Log
               Content Pipeline
               Backlinks                 ← Ahrefs-dependent, contradicts Overview footer
RESULTS        Revenue Attribution
               Content Scores
               Outcomes
               Signals
```

12 items in the nav. Two functional routes are **hidden** from the nav: `/internal-links` and `/schema`. Two legacy routes (`/opportunities`, `/clusters`) silent-redirect to `/actions`.

### 2.2 The newly-redesigned Overview already provides

- Organic-clicks timeline (30 / 60 / 90 / custom)
- Half-over-half delta + velocity-stall callout
- Data Freshness sidecar (GSC, GA4, Google Ads, cluster engine) + Resync Ads link
- "Do this next" — top-5 priority queue with approve action and a Details link
- Action-detail page at `/opportunities/[id]` (Why / Before / After / Outcomes & Measurement Plan / Evidence / Risk)
- Competitor Intelligence — SoV leaderboard table + Top competitor gaps sidecar

This is now the **canonical entry point**. Every sub-page must justify its existence relative to the Overview.

---

## 3 · Wiring Audit — 14 Routes

| # | Route | LoC | Data source (lib + table) | Post-Ahrefs | RBAC | Gov-lock | Mutations | Empty/error UX | Verdict |
|---|-------|----:|---------------------------|:----------:|:----:|:--------:|-----------|----------------|---------|
| 0 | **/dashboard/seo** (Overview) | 808 | `getSeoOverviewKpis`, `getGscPipelineHealth`, `getRecommendations`, `getSeoCompetitorGaps`, `getSeoTimeseries` | ✅ | ✅ `seo` | ✅ | `approveRecommendation` | ✅ graceful | **KEEP — canonical** |
| 1 | /pages | 238 | `getPagePerformance` → `seo_page_query_performance_live` (GSC) | ✅ | ✅ `seo` | ❌ | none | inline | KEEP — drill-down |
| 2 | /serp-features | 133 | `/api/proxy/seo/serp-features` → `seo_serp_features` | ✅ | ✅ `seo` | ❌ | none | alert | KEEP — specialized |
| 3 | /competitive | 189 | `getCompetitiveKeywordGap` → `raw_ahrefs_keyword_gap` | ⚠️ **still queries `raw_ahrefs_*`** | ✅ `seo` | ❌ | none | alert | **MERGE into Competitor hub; rewire** |
| 4 | /actions | 375 | `getSeoActions` → `seo_action` | ✅ | ✅ `seo` | ❌ | `approveSeoAction`, `rejectSeoAction` | full-page spinner | **MERGE — full inbox of Overview's "Do this next"** |
| 5 | /execution-log | 180 | `/api/proxy/seo/execution-log` → `seo_action` | ✅ (migrated 2026-05-12) | ✅ `seo` | ❌ | none | inline | KEEP — audit trail |
| 6 | /content | 330 | `getPageBriefs`, `getCompetitorGaps` → `seo_page_brief` | ⚠️ UI text references Ahrefs | ✅ `seo` | ❌ | `updateBriefStatus`, `generateBriefFromGap` | inline | KEEP — workflow tool, scrub Ahrefs copy |
| 7 | /backlinks | 208 | `/api/proxy/seo/backlinks` → DataForSEO/Ahrefs legacy | ❌ Ahrefs-dependent | ✅ `seo` | ❌ | none | unknown | **RETIRE** |
| 8 | /attribution | 171 | `/api/proxy/seo/attribution` → `seo_revenue_attribution` | ✅ | ✅ `seo` | ❌ | none | inline | KEEP |
| 9 | /content-scores | 178 | `/api/proxy/seo/content-scores` → `seo_content_score_log` | ✅ | ✅ `seo` | ❌ | none | inline | KEEP |
| 10 | /outcomes | 189 | `getOutcomes` → `seo_action` | ✅ | ✅ `seo` | ❌ | none | "No outcomes yet" | KEEP |
| 11 | /signals | 176 | `getSignals` → `seo_decay_signal`, `seo_cannibalization_signal`, `seo_topical_authority_gap` | ✅ | ✅ `seo` | ❌ | `updateSignalStatus`, `generateBriefFromGap` | alert | KEEP — early warning |
| 12 | /internal-links | 98 | `getInternalLinkRecs` → `internal_link_recommendations` | ✅ | ✅ `seo` | ❌ | none | inline | KEEP — but **invisible in nav today** |
| 13 | /schema | 121 | `getSchemaMarkup` → `seo_schema_markup` | ✅ | ✅ `seo` | ❌ | `updateSchemaMarkupStatus`, `applySchemaMarkup` | empty state | KEEP — but **invisible in nav today** |
| 14 | /opportunities | 7 | redirect → `/actions` | n/a | n/a | n/a | n/a | n/a | DROP after consolidation |
| 15 | /clusters | 7 | redirect → `/actions` | n/a | n/a | n/a | n/a | n/a | DROP after consolidation |
| 16 | /opportunities/[id] | 280 | `getRecommendations` (filter) | ✅ | ✅ `seo` | ✅ | `approveRecommendation`, `rejectRecommendation` | graceful | **KEEP — canonical detail** |

**Layout shell** (`layout.tsx`, 407 LoC) — responsive collapse at 1024px, mobile sub-nav at 768px, persists state in `localStorage`. Real-time pipeline-health dot derived from `kpis.last_pipeline_run_at`. **No issues with the shell itself.**

---

## 4 · Findings & Risks

### Finding 0 — Pending nav rename did not deploy
The previous checkpoint (commit `4997bdc`) documented a rename of "SEO Actions" → "All Recommendations", "Competitive Intel" → "Competitor Deep Dive", dropping "Backlinks", and adding "Internal Links" + "Schema Markup". **The live `layout.tsx` still ships the original labels.** Either the commit captured a different file or the edits never landed. Either way, what's documented and what's deployed are out of sync. Resolving this is a precondition for the redesign below.

### Finding 1 — Functional duplication (highest user-facing risk)
| Source of truth (Overview) | Duplicate sub-page | User impact |
|---|---|---|
| "Do this next" priority queue | `/actions` (full inbox) | Two queues, inconsistent labels, two different UX patterns |
| Competitor Intelligence (SoV leaderboard) | `/competitive` (gap detail) | Same domain in two places with different metrics |
| Action detail at `/opportunities/[id]` | `/actions` row expansion | Two ways to inspect a recommendation |

### Finding 2 — Stale Ahrefs dependencies in two pages
- `/competitive` queries `analytics.raw_ahrefs_keyword_gap` directly. The Overview's footer states "Ahrefs is decommissioned." **Truth-in-data violation.**
- `/backlinks` is fundamentally Ahrefs-shaped (referring domains, anchor distribution). With Ahrefs gone, this page either shows stale data or empty state.
- `/content` page UI text references "Ahrefs keyword data" in its gap-detection copy.

### Finding 3 — Discoverability gap
`/internal-links` and `/schema` are **functional, post-Ahrefs, mutation-capable pages** that are missing from the sidebar. The only entry point is the "Supporting evidence" links on the action-detail page — and only if you arrive via a recommendation. Both are referenced from internal links inside the codebase, so removing them would break those references.

### Finding 4 — Inconsistent error & loading patterns
Three different patterns across 14 pages:
- Inline "Loading…" text → `/pages`, `/execution-log`, `/attribution`, `/content-scores`, `/internal-links`
- Full-page spinner → `/actions`, Overview
- Empty-state with prose → `/outcomes`, `/schema`
- Plain `alert()` on error → `/serp-features`, `/competitive`, `/signals`

If the Postgres pool stalls, half the pages will sit on "Loading…" indefinitely — no retry, no timeout, no fallback. **The Overview is the only page that uses `Promise.allSettled` + per-request timeouts.** That pattern needs to propagate.

### Finding 5 — Governance lock absence
The Overview and the new action-detail page carry explicit governance-lock comments at the top ("read-first; only existing approve/reject endpoints write"). **None of the sub-pages do.** Five sub-pages have mutation endpoints (`/actions`, `/content`, `/signals`, `/schema`, `/opportunities/[id]`). All five should declare their write surface explicitly per house style.

### Finding 6 — Zombie types in `lib/seoApi.ts`
`AhrefsKeywordGap`, `AhrefsBacklinkGap`, `AhrefsTopPage` are still exported and consumed by `/competitive` and `/backlinks`. Removing the Ahrefs-dependent pages also requires retiring these types and the underlying proxy routes, or they will be tempting wiring targets in future work.

---

## 5 · Proposed Redesign — 12 → 5 Hubs

### 5.1 New information architecture

```
┌─────────────────────────────────────────────────────────────┐
│ SEO Command Center                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1.  Overview                  ← /dashboard/seo             │
│      Canonical landing page. (already redesigned)           │
│                                                             │
│  2.  Recommendations           ← /dashboard/seo/recs        │
│      Tabs: Inbox · Internal Links · Schema · Briefs         │
│      (consolidates /actions + /internal-links + /schema +   │
│       the brief-generation half of /content)                │
│                                                             │
│  3.  Performance               ← /dashboard/seo/performance │
│      Tabs: Pages · SERP Features · Signals                  │
│      (consolidates /pages + /serp-features + /signals)      │
│                                                             │
│  4.  Competitors               ← /dashboard/seo/competitors │
│      Single deep-dive view. SoV leaderboard mirrors         │
│      Overview, then drills into per-competitor cluster      │
│      gaps with cluster-engine data only.                    │
│      (replaces /competitive; retires /backlinks)            │
│                                                             │
│  5.  Results                   ← /dashboard/seo/results     │
│      Tabs: Outcomes · Execution Log · Revenue Attribution · │
│            Content Scores                                   │
│      (consolidates /outcomes + /execution-log +             │
│       /attribution + /content-scores)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Net:** 12 visible nav items + 2 hidden routes → **5 nav items**. No page is deleted in spirit — the work consolidates them under tab structures within hubs, so existing functionality and URLs can be preserved via redirects.

### 5.2 Why this consolidation

| Hub | What it answers for the user | Why these belong together |
|---|---|---|
| **Overview** | "What's the state of organic right now and what should I do today?" | Already designed |
| **Recommendations** | "What does the engine want me to approve?" | All four sub-views are actionable approve-queues with the same lifecycle |
| **Performance** | "Where am I winning and where am I losing?" | All three are diagnostic GSC/cluster-engine views with no mutation surface |
| **Competitors** | "How do I stack up vs the rest of the SERP?" | Single coherent topic; collapsing two duplicate surfaces |
| **Results** | "Did the work I approved actually move the needle?" | All four are post-execution measurement views |

### 5.3 Cross-cutting standards (apply during graduation)

- **Data fetching** — every hub uses `Promise.allSettled` + per-request 8s timeout, mirroring the Overview pattern. No more indefinite "Loading…".
- **Error UX** — single shared `<HubErrorState />` and `<HubEmptyState />` components. Retire ad-hoc `alert()` calls.
- **Governance lock comments** — every page top-of-file declares its read/write surface; mutation handlers carry the comment block as well.
- **Test IDs** — every interactive element gets `data-testid` per house convention (`button-approve-{id}`, `row-{type}-{id}`).
- **Ahrefs scrub** — remove `AhrefsKeywordGap`, `AhrefsBacklinkGap`, `AhrefsTopPage` from `lib/seoApi.ts`; remove `/api/proxy/seo/backlinks`; rewrite `/competitive` UI copy.

---

## 6 · Migration Plan

### Sprint 1 — Truth-up & retire (ships immediately)
- [ ] **Land the deferred nav rename** (Finding 0). Drop "Backlinks", rename "SEO Actions" → "All Recommendations" and "Competitive Intel" → "Competitor Deep Dive", surface "Internal Links" and "Schema Markup" in the sub-nav. This is the smallest change that resolves the loudest user-facing contradictions.
- [ ] **Retire `/backlinks`** route + its proxy + the Ahrefs types it consumes. Add a 410-style page or redirect to `/competitive`.
- [ ] **Rewire `/competitive`** to query `seo_competitor_gap` (cluster engine) instead of `raw_ahrefs_keyword_gap`. Scrub Ahrefs UI copy on `/content`.
- [ ] **Add `Promise.allSettled` + 8s timeouts** to all sub-pages so no page can stall on a single hung upstream.
- [ ] **Add governance-lock comments** to all five mutation-capable pages.

### Sprint 2 — Consolidate (the redesign)
- [ ] Build `/recs` hub with internal tabs (Inbox, Internal Links, Schema, Briefs). Move logic from existing routes; keep old URLs as redirects.
- [ ] Build `/performance` hub (Pages, SERP Features, Signals).
- [ ] Build `/competitors` hub (consumes the rewired `/competitive` data, deep-dive view).
- [ ] Build `/results` hub (Outcomes, Execution Log, Revenue Attribution, Content Scores).
- [ ] Replace 12-item sub-nav with 5-item nav.
- [ ] Standardize empty/error states via shared components.
- [ ] Retire `/opportunities` and `/clusters` redirects (no longer needed once the Overview links straight to `/recs`).

### Acceptance criteria
- Sub-nav items reduced from 12 → 5.
- Zero references to `Ahrefs` types, tables, or proxy routes outside `/lib/seoApi.ts` deprecation comments.
- Every mutation-capable page declares its write surface in a governance-lock comment.
- No page can show "Loading…" longer than 8 seconds without a fallback or empty state.
- All previously-functional URLs either resolve directly or redirect to a tab inside a hub.

---

## 7 · Decision Required

Before engineering proceeds, leadership confirmation is needed on:

1. **Approve the 12 → 5 consolidation IA?** (Section 5.1)
2. **Approve retiring `/backlinks`** outright (vs leaving a soft-gated page)? (Sprint 1)
3. **Approve breaking change on URLs** (e.g., `/dashboard/seo/actions` → `/dashboard/seo/recs?tab=inbox`) **with redirects**, or do existing URLs need to remain deep-link stable?
4. **Sequencing** — ship Sprint 1 (truth-up) immediately and Sprint 2 (consolidation) after, or hold both for a single bigger release?

Once these four are answered, engineering will produce a per-task breakdown with PR boundaries for execution.

---

*This audit reflects code state as of commit `af6ad71`. All wiring claims were verified against `app/dashboard/seo/*`, `lib/seoApi.ts`, and `app/api/proxy/seo/*` source.*
