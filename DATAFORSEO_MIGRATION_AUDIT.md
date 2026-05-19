# DataForSEO Migration Audit

**Prepared for:** Leadership review
**Date:** May 15, 2026
**Author:** Engineering
**Scope:** All references to DataForSEO, all remaining Ahrefs references, and the contract between this repo (`nsd-platform-shell`) and the sister sync repo (`nsd-integrations`).
**Companion to:** `SEO_COMMAND_CENTER_AUDIT.md`

---

## 1 · Executive Summary

DataForSEO (DFS) was approved as the Ahrefs replacement, but **the migration is only partially complete and the data contract has drifted**.

- **The DFS sync itself does not live in this repo.** It runs out of `nsd-integrations`. This shell repo (`nsd-platform-shell`) is purely a consumer — it reads whatever ends up in `analytics.*` tables. Any wiring claim in this repo is downstream of the sister repo's actual sync state.
- **Only one production proxy route has been migrated end-to-end** — `/api/proxy/seo/competitor-gaps`, which now reads `analytics.seo_competitor_gap` (DFS-populated). It explicitly returns `NULL` for `search_volume` and `keyword_difficulty`, the two metrics Ahrefs gave us that DFS does not yet provide on this table.
- **Two heavily-used proxy routes are still hard-wired to `analytics.raw_ahrefs_*` tables** — `/api/proxy/seo/intelligence` (consumed by `/competitive`, `/internal-links`, and the Overview-adjacent metrics) and `/api/activity-spine/marketing/ahrefs` (consumed by the Marketing dashboard).
- **One UI page is the only place "DataForSEO" appears verbatim** — `/dashboard/seo/competitive`. The surrounding service code never names DFS by string; it speaks only of the "cluster engine".
- **No DataForSEO env vars exist in this repo.** Auth and rate-limiting controls all live in `nsd-integrations`, which makes spend visibility a sister-repo question, not a shell-repo one.

**Bottom line:** the migration looks more complete on the surface than it is. We have one good consumer route, one degraded UI page, and two routes still serving Ahrefs data. The handful of `// post-Ahrefs` comments scattered through the code can give a false sense of done-ness.

---

## 2 · Repo Boundary — Who Owns What

```
┌─────────────────────────────────────┐         ┌─────────────────────────────────────┐
│ nsd-integrations  (sister repo)     │         │ nsd-platform-shell (THIS repo)      │
│                                     │         │                                     │
│  • DataForSEO API client            │  writes │  • /api/proxy/seo/* (read proxies)  │
│  • Sync jobs (e.g. competitorGapJob)│ ──────► │  • /dashboard/seo/* (UI)            │
│  • Env: DATAFORSEO_LOGIN/PASSWORD   │         │  • lib/seoApi.ts (typed fetchers)   │
│  • Cost / rate-limit logic          │         │                                     │
│  • Writes to analytics.*            │   reads │  Env: SUPABASE_DATABASE_URL only    │
│                                     │ ◄────── │                                     │
└─────────────────────────────────────┘         └─────────────────────────────────────┘
                                  ▲
                                  │
                       analytics.* (Supabase)
                          THE CONTRACT
```

**Implication for this audit:** every "wiring status" below describes only what this repo can see. Whether a DFS sync job is actually populating a table requires a separate audit of `nsd-integrations`. Where the explorer or a comment claims a table is "DFS-backed", that claim is taken at face value here and flagged for verification.

---

## 3 · Inventory — Every DataForSEO Reference in This Repo

### 3.1 Literal "DataForSEO" mentions

| Location | Type | Purpose |
|---|---|---|
| `app/dashboard/seo/competitive/page.tsx` | UI copy | Single mention in user-facing text — describes the source of competitor data |
| `SEO_COMMAND_CENTER_AUDIT.md` | Doc | The earlier audit (this companion) |

That's it. **Zero DFS references in API routes, services, lib code, env templates, configs, or migrations** in this repo. All actual DFS plumbing lives in the sister repo.

### 3.2 Indirect references (the "cluster engine" euphemism)

The codebase consistently calls the post-Ahrefs source the "cluster engine" rather than DataForSEO. These references all describe DFS-fed data without naming it:

| Location | Purpose |
|---|---|
| `app/api/proxy/seo/competitor-gaps/route.ts` | `// Phase 8 competitor set — matches competitorGapJob.ts in nsd-integrations` |
| `lib/seoApi.ts` | `// Competitor Gaps (post-Ahrefs — sourced from analytics.seo_competitor_gap, produced by the ODS cluster engine, not Ahrefs).` |
| `app/dashboard/seo/page.tsx` | "Source: cluster engine (analytics.seo_competitor_gap), refreshed daily." |
| Various `// post-Ahrefs` comments | 12+ throughout the SEO surface |

**Risk:** the renaming makes it harder to tell what's genuinely on DFS vs what's stuck on Ahrefs. A new engineer searching for "dataforseo" finds almost nothing.

### 3.3 Auth / config

- **`DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, or any `DFS_*` variable: 0 references** in this repo.
- The `available_secrets` list for this Replit project (per current environment): `GITHUB_TOKEN`, `SESSION_SECRET`, `SUPABASE_DATABASE_URL`. **No DFS secret.** Confirms this repo never calls DFS directly.

### 3.4 Cost / rate-limit controls

- **None in this repo.** The shell only reads from `analytics.*`; no API spend is incurred here.
- Whether `nsd-integrations` enforces a budget is out of scope for this audit and should be answered separately.

### 3.5 Test coverage

- **Zero tests** for any DFS-fed proxy route. `services/__tests__/ga4Sync.test.ts` is the only sync-related test in this repo and it covers GA4, not DFS.
- No test asserts the shape of `analytics.seo_competitor_gap` rows nor the null-degradation contract.

---

## 4 · Remaining Ahrefs Footprint in This Repo

### 4.1 Routes / files still querying `raw_ahrefs_*` tables

| File | Tables touched | Lines | Severity |
|---|---|---:|:--:|
| `app/api/proxy/seo/intelligence/route.ts` | `raw_ahrefs_keyword_gap`, `raw_ahrefs_backlink_gap`, `raw_ahrefs_top_pages` | 22, 55, 95, 287, 333, 375, 438, 478-499, 719, 784-797, 822, 862-864 | **HIGH** |
| `app/api/activity-spine/marketing/ahrefs/route.ts` | activity-spine payloads with `target_domain` / `competitor_domain` (Ahrefs-shaped) | full file | MEDIUM (Marketing surface) |
| `lib/seoApi.ts` | exports `AhrefsKeywordGap`, `AhrefsBacklinkGap`, `AhrefsTopPage` types and `getCompetitiveKeywordGap`, `getCompetitiveBacklinks`, `getCompetitiveTopPages` fetchers | 313-321 | MEDIUM (zombie types) |
| `app/dashboard/seo/competitive/page.tsx` | consumer of the Ahrefs fetchers above | full file | HIGH (visible to users) |

### 4.2 Routes that look Ahrefs but are actually on internal tables

| File | Source | Note |
|---|---|---|
| `app/api/proxy/seo/backlinks/route.ts` | `analytics.seo_backlink_summary`, `analytics.seo_backlink_opportunities` | Reads internal tables, NOT raw_ahrefs. The page only "feels" Ahrefs because of the legacy schema shape. Whether those tables are still populated post-Ahrefs is a sister-repo question. |

### 4.3 Hard-nulled "Ahrefs" columns served from DFS routes

`/api/proxy/seo/intelligence/route.ts` returns rows shaped for Ahrefs but with the values null:

```sql
NULL::int     AS ahrefs_search_volume,
NULL::int     AS ahrefs_keyword_difficulty,
NULL::numeric AS ahrefs_cpc,
false         AS ahrefs_data_stale,
```

**This is a backwards-compatibility shim, not a migration.** Consumers that branch on `ahrefs_search_volume == null` think the page is a clean Ahrefs reader returning empty data. Consumers that don't null-check render `null` straight to the UI. Both behaviours have been observed.

`/api/proxy/seo/competitor-gaps/route.ts` does the same:

```sql
COALESCE(g.opportunity_score, null) AS opportunity_score,
NULL::int AS keyword_difficulty,
NULL::int AS search_volume,
```

This is the most honest of the two — the SQL comment explicitly states "those came from Ahrefs" — but the contract is still null-degraded.

---

## 5 · Migration Status — Per Surface

| # | Surface | Reads from | DFS migration | Ahrefs vestige | Verdict |
|---|---|---|:---:|:---:|---|
| 1 | `/dashboard/seo` Overview — Competitor Intelligence | `seo_competitor_gap` via `getSeoCompetitorGaps` | ✅ READS DFS TABLE | columns `keyword_difficulty`, `search_volume` hard-null in proxy | **Functionally migrated, data-poor** |
| 2 | `/dashboard/seo/competitive` | `getCompetitiveKeywordGap` → `raw_ahrefs_keyword_gap` (via `/intelligence`) | ❌ NOT MIGRATED | Reads Ahrefs table directly | **Highest-risk page** — only place that names DFS in UI yet still reads Ahrefs in code |
| 3 | `/dashboard/seo/backlinks` | `seo_backlink_summary`, `seo_backlink_opportunities` (internal) | ⚠️ UNCLEAR | Internal tables of unknown population status | Verify in sister repo whether DFS backfills these; otherwise STALE |
| 4 | `/dashboard/seo/serp-features` | `seo_serp_features` via `/api/proxy/seo/serp-features` | ✅ READS DFS TABLE | none | **Migrated** — but row-count health unknown (explorer flagged 0 rows) |
| 5 | `/dashboard/seo/internal-links` | `getInternalLinkRecs` → `/api/proxy/seo/intelligence?view=internal-links` | ⚠️ TRANSITIVE | `intelligence` route is Ahrefs-heavy; this view may or may not touch raw_ahrefs | Verify the view branch in `intelligence/route.ts` |
| 6 | `/dashboard/seo/pages` | `seo_page_query_performance_live` (GSC) | n/a | n/a | Not an Ahrefs surface; out of scope |
| 7 | `/dashboard/seo/actions`, `/execution-log`, `/outcomes`, `/signals`, `/schema`, `/content`, `/attribution`, `/content-scores` | various `seo_*` internal tables | n/a | none | Out of scope (not Ahrefs surfaces) |
| 8 | Marketing dashboard — Ahrefs activity spine | `/api/activity-spine/marketing/ahrefs` | ❌ NOT MIGRATED | Whole route reads Ahrefs-shaped payloads | Outside SEO scope but on the same migration question |

---

## 6 · Findings

### Finding A — DFS migration is one route deep
Of the four Ahrefs-coded surfaces in this repo, only `seo_competitor_gap` has a real DFS-backed table being read. The other three (`/competitive` via intelligence, `/backlinks`, marketing/ahrefs) still resolve to Ahrefs tables or to internal tables of unverified population status. **Calling the migration "post-Ahrefs" in code comments overstates the actual progress.**

### Finding B — `keyword_difficulty` and `search_volume` are missing from DFS-backed reads
Both columns are hard-nulled in `/competitor-gaps` and `/intelligence`. These are user-facing metrics that shaped how recommendations were prioritized in the Ahrefs era. Either:
- The sister-repo DFS sync needs to populate them (DFS does provide them via Keyword Data API), or
- The product needs to formally retire them and the UI needs to stop reserving columns for them.

The current "show null" approach is the worst of both worlds.

### Finding C — The "cluster engine" euphemism hides the actual stack
A new engineer auditing this codebase for DFS finds **two** literal mentions, both in user-facing copy. The technical layer hides behind "cluster engine". This makes ownership, debugging, and capacity planning harder than it needs to be. Recommend renaming comments and lib doc to call DFS by name where DFS is the source.

### Finding D — `intelligence` route is the architectural problem
`/api/proxy/seo/intelligence/route.ts` is a 900+ line megaroute that handles many `view=` branches. Several branches still read `raw_ahrefs_*`. Because it's the single proxy behind `getCompetitiveKeywordGap`, `getCompetitiveBacklinks`, `getCompetitiveTopPages`, AND `getInternalLinkRecs`, retiring Ahrefs requires either rewriting this route in place or breaking those four lib functions out into purpose-built routes. **This is the single biggest blocker to closing the migration.**

### Finding E — Zero tests assert the data contract
No test file asserts the shape of `seo_competitor_gap` rows, the null contract on `keyword_difficulty` / `search_volume`, or the population health of `seo_serp_features`. If `nsd-integrations` ships a sync change that drops a column or changes a type, this repo will only find out by user-reported bug.

### Finding F — Cross-repo dependency is undocumented
The only mention of `nsd-integrations` in this codebase is a single comment in `competitor-gaps/route.ts`. There is no architecture doc, no contract spec, no CI gate that catches drift between the two repos. The `analytics.*` schema is the de facto API and nobody owns it explicitly.

---

## 7 · Recommended Actions (DFS-specific)

These slot into the broader two-sprint plan from `SEO_COMMAND_CENTER_AUDIT.md`. Listed in priority order.

### Immediate (before any further consolidation work)
1. **Audit `nsd-integrations`** to confirm which `analytics.*` tables it actually populates and at what cadence. Without this, every "migrated" claim in this repo is unverified.
2. **Decide the fate of `keyword_difficulty` and `search_volume`** — populate from DFS or formally retire from the UI. Stop hard-nulling.
3. **Add row-count + freshness monitors** for `seo_competitor_gap`, `seo_serp_features`, `seo_backlink_opportunities`. Even a simple admin page showing the latest `MAX(created_at)` per table would close the visibility gap.

### Sprint 1 (paired with the broader truth-up sprint)
4. **Retire `/dashboard/seo/competitive`'s reliance on `getCompetitiveKeywordGap`.** Rewrite it to read `seo_competitor_gap` directly (mirroring the Overview's `getSeoCompetitorGaps`). This removes the largest user-visible Ahrefs read.
5. **Decide `/dashboard/seo/backlinks`'s fate** alongside the broader page-retirement decision in the companion audit. If `seo_backlink_summary` is no longer being populated, retire the page; if DFS does populate it via nsd-integrations, document the contract.
6. **Carve up `/api/proxy/seo/intelligence/route.ts`.** Each `view=` branch should become its own route. Once split, the Ahrefs-touching branches can be retired or rewritten one at a time.

### Sprint 2 (paired with the consolidation sprint)
7. **Delete zombie types** `AhrefsKeywordGap`, `AhrefsBacklinkGap`, `AhrefsTopPage` from `lib/seoApi.ts`. Replace with `CompetitorGap`, `BacklinkOpportunity`, etc. — names that don't promise Ahrefs.
8. **Add a single `/api/admin/data-source-health` endpoint** that surfaces `MAX(created_at)`, row counts, and source name (DFS / GSC / GA4 / cluster engine) for every table the SEO surface consumes. Render it on the Overview's Data Freshness sidecar.
9. **Add contract tests** — for each DFS-fed table, a test that asserts the columns the UI requires are present and the right type. Catches sister-repo drift in CI.
10. **Add an architecture doc** under `docs/` describing the `nsd-integrations` ↔ `nsd-platform-shell` boundary and naming the `analytics.*` schema as the contract. (Per user preference, doc edits go through the user — flag rather than write.)

---

## 8 · Open Questions for Leadership

1. **Is `nsd-integrations` actively syncing DFS today** for `seo_competitor_gap` and `seo_serp_features`? If yes, at what cadence and at what cost?
2. **Are `keyword_difficulty` and `search_volume` strategically required**, or can the SEO surface formally drop them?
3. **Who owns the `analytics.*` schema** as a cross-repo contract? Today, neither repo claims it.
4. **Do we have a DFS spend budget** in `nsd-integrations`, and is it instrumented? (Out of scope here, in scope for that repo.)

---

*This audit reflects code state as of commit `af6ad71`. All wiring claims about THIS repo were verified via grep against `app/api/`, `app/dashboard/seo/`, and `lib/seoApi.ts`. Claims about `nsd-integrations` are inferred from references in this repo and require sister-repo verification.*
