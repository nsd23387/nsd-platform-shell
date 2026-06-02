---
name: SEO analytics schema cross-table joins
description: Non-obvious data-truth quirks when joining the Supabase analytics.* SEO tables (inventory, candidates, GSC metrics, query intelligence)
---

# Cross-table URL host mismatch (must normalize)

The `analytics.*` SEO tables do NOT agree on URL host, so any cross-table join on
URL will silently drop rows unless normalized:
- `seo_page_inventory.url` — always `https://www.neonsignsdepot.com/...`
- `seo_execution_candidate.target_page_url` — MIX of apex (`neonsignsdepot.com`)
  and `www.`
- `metrics_search_console_query_page_daily.page_url` — mostly apex, some `www.`,
  plus a few `quote.` subdomain rows
- `seo_gate_suppressed.target_url` — apex

**Rule:** normalize to a host-stripped key before matching:
`rtrim(regexp_replace(lower(url), '^https?://(www\.)?', ''), '/')`
(strip protocol + leading `www.`, strip trailing slash). Apply to BOTH sides of
every join. The same regex is mirrored in JS (`/^https?:\/\/(www\.)?/`).

**Why:** inventory is www-canonical but the engine/GSC ingest mixes hosts; a naive
equality join loses the majority of candidate/demand rows.

# Keyword value source

`external_query_intelligence` holds DataForSEO keyword value. Prefer the generic
columns `search_volume`/`keyword_difficulty`/`cpc` and fall back to the
`ahrefs_*` columns (`COALESCE`). Join on
`normalized_query = lower(trim(<gsc_top_query>))`. `is_competitor_only` is the
discard signal for competitor-brand demand.

# seo_page_inventory bucketing (governed Review surface)

`status_class` ∈ {canonical_live (~1638), pending_verification (44), lost (17),
excluded (8)}. Governed Review buckets:
- `lost` → status_class='lost' (restore/redirect queue only)
- `pending_verification` → ALWAYS Strategic + needs_verify flag, NEVER a confident
  Win/Fix target (governance rule — they have no trustworthy position yet)
- `fix` → canonical_live whose normalized path collides with another inventory URL
  (trailing-slash / canonicalization dup; detect via GROUP BY norm_path HAVING
  COUNT(DISTINCT url) > 1)
- `win` → canonical_live & gsc_best_position BETWEEN 1 AND 30
- `strategic` → canonical_live & pos > 30 or NULL
- `excluded` → never surfaced

# seo_execution_candidate gating

Gate-accepted, actionable candidates = `gate_status='accepted'` (these are all
`approval_status='pending'`, `execution_status='proposed'`). Approve/reject via the
existing `/api/proxy/seo/recommendations` write path with `target:'engine'` +
`candidate_id` (lib: `approveEngineCandidate`/`rejectEngineCandidate`).
`gate_status='suppressed'` rows are the audit trail; standalone full suppression
log lives in `seo_gate_suppressed` (~1375 rows).
