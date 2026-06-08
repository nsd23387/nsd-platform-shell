// =============================================================================
// GET /api/proxy/seo/page?url=... — Level-2 page dossier (governed)
// Governance lock: READ-ONLY. Parameterized queries only. Cross-table joins
// are matched on a NORMALIZED url (protocol + leading www. stripped, trailing
// slash removed) because inventory uses www., while execution candidates and
// GSC query/page metrics mix www. and apex hosts. Surfaces three lanes:
//   Lane 1 (engine) — analytics.v_seo_dashboard_queue guarded queue.
//                     Approve/reject routes back through the existing
//                     /api/proxy/seo/recommendations write path.
//   Lane 2/3 (manual Rank Math + off-page) — derived client-side from the
//     inventory row; no DB writes originate here.
// Demand table = analytics.metrics_search_console_query_page_daily aggregated
// per query, enriched with DataForSEO keyword value + discard signals from
// analytics.external_query_intelligence.
// =============================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { parseSeoWindow } from '../_window';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

function isConfigured(): boolean {
  return Boolean(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL);
}

// Mirror of the SQL normalization, applied in JS where convenient.
function normUrl(u: string): string {
  return u
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/+$/, '');
}

const DISCARD_PATTERNS = /\b(repair|repairs|fix|fixing|replacement|parts|part|how to make|diy|wholesale price|jobs|salary|hiring)\b/i;

function hasNonAscii(s: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[^\u0000-\u007f]/.test(s);
}

export async function GET(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const rawUrl = req.nextUrl.searchParams.get('url');
  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }
  const norm = normUrl(rawUrl);
  const window = parseSeoWindow(req);

  try {
    const invQ = pool.query(
      `SELECT
              p.url, p.content_type, p.status_class, p.gsc_impressions, p.gsc_top_query,
              p.gsc_best_position::numeric AS gsc_best_position, p.has_rankmath_redirect,
              p.rankmath_redirect_target, p.http_status,
              i.canonical_url, i.indexable, i.noindex, i.in_404_monitor,
              p.gsc_window_start, p.gsc_window_end, p.gsc_available_start, p.gsc_available_end
       FROM analytics.seo_command_center_portfolio($2::int, $3::date, $4::date) p
       JOIN analytics.seo_page_inventory i
         ON rtrim(regexp_replace(lower(i.url), '^https?://(www\\.)?', ''), '/') =
            rtrim(regexp_replace(lower(p.url), '^https?://(www\\.)?', ''), '/')
       WHERE rtrim(regexp_replace(lower(p.url), '^https?://(www\\.)?', ''), '/') = $1
       ORDER BY (p.status_class = 'canonical_live') DESC
       LIMIT 1`,
      [norm, window.days, window.start, window.end],
    );

    const demandQ = pool.query(
      `SELECT *
       FROM analytics.seo_command_center_page_demand($1::text, $2::int, $3::date, $4::date)
       LIMIT 12`,
      [rawUrl, window.days, window.start, window.end],
    );

    const candQ = pool.query(
      `SELECT candidate_id, opportunity_id, mutation_type, mutation_label, primary_remedy,
              proposed_value, current_value_snapshot, evidence_summary, why, gate_reasons,
              opportunity_score::numeric AS opportunity_score, opportunity_urgency,
              confidence_tier, source_confidence, gate_status, approval_status, execution_status,
              target_page_url, page_url_canonical, page_is_live, page_status_class,
              regate_review_flag, needs_evidence, qa_status, outcome_verdict
       FROM analytics.v_seo_dashboard_queue
       WHERE page_url_canonical = $1
       ORDER BY opportunity_score DESC NULLS LAST`,
      [norm],
    );

    // Engine per-page reasoning record. Matched on norm_url (the dossier stores
    // the already-normalized url) with a regexp fallback on page_url for safety.
    const dossierQ = pool.query(
      `SELECT intent, priority, status_class, content_type, generated_at,
              state, demand, keyword_targets, routed_queries, ranked_actions
       FROM analytics.seo_page_dossier
       WHERE norm_url = $1
          OR rtrim(regexp_replace(lower(page_url), '^https?://(www\\.)?', ''), '/') = $1
       ORDER BY generated_at DESC NULLS LAST
       LIMIT 1`,
      [norm],
    );

    // Gate-decision trail for THIS page's candidates. seo_gate_transition has no
    // page column, so we join through seo_execution_candidate on candidate_id.
    const transQ = pool.query(
      `SELECT t.candidate_id, t.from_status, t.to_status, t.reason, t.gated_at
       FROM analytics.seo_gate_transition t
       JOIN analytics.seo_execution_candidate c ON c.candidate_id = t.candidate_id
       WHERE rtrim(regexp_replace(lower(c.target_page_url), '^https?://(www\\.)?', ''), '/') = $1
       ORDER BY t.gated_at DESC
       LIMIT 20`,
      [norm],
    );

    const [invR, demandR, candR, dossierR, transR] = await Promise.all([
      invQ, demandQ, candQ, dossierQ, transQ,
    ]);

    if (invR.rows.length === 0) {
      return NextResponse.json({ error: 'Page not found in inventory' }, { status: 404 });
    }

    const inv = invR.rows[0];
    const page = {
      url: inv.url,
      content_type: inv.content_type,
      status_class: inv.status_class,
      gsc_impressions: inv.gsc_impressions != null ? Number(inv.gsc_impressions) : null,
      gsc_top_query: inv.gsc_top_query,
      gsc_best_position: inv.gsc_best_position != null ? Number(inv.gsc_best_position) : null,
      has_rankmath_redirect: inv.has_rankmath_redirect,
      rankmath_redirect_target: inv.rankmath_redirect_target,
      http_status: inv.http_status != null ? Number(inv.http_status) : null,
      canonical_url: inv.canonical_url,
      indexable: inv.indexable,
      noindex: inv.noindex,
      in_404_monitor: inv.in_404_monitor,
      needs_verify: inv.status_class === 'pending_verification',
      gsc_window_start: inv.gsc_window_start ?? null,
      gsc_window_end: inv.gsc_window_end ?? null,
      gsc_available_start: inv.gsc_available_start ?? null,
      gsc_available_end: inv.gsc_available_end ?? null,
    };

    const demand = demandR.rows.map((r) => {
      const q: string = r.query ?? '';
      const competitorOnly = Boolean(r.is_competitor_only);
      const foreign = hasNonAscii(q);
      const repairish = DISCARD_PATTERNS.test(q);
      const discard = competitorOnly || foreign || repairish;
      let discard_reason: string | null = null;
      if (competitorOnly) discard_reason = 'competitor-only demand';
      else if (foreign) discard_reason = 'foreign-language query';
      else if (repairish) discard_reason = 'repair / off-intent query';
      return {
        query: q,
        impressions: r.impressions != null ? Number(r.impressions) : 0,
        clicks: r.clicks != null ? Number(r.clicks) : 0,
        avg_position: r.avg_position != null ? Number(r.avg_position) : null,
        kw_volume: r.kw_volume != null ? Number(r.kw_volume) : null,
        kw_difficulty: r.kw_difficulty != null ? Number(r.kw_difficulty) : null,
        kw_cpc: r.kw_cpc != null ? Number(r.kw_cpc) : null,
        reference_metrics_source: r.reference_metrics_source ?? null,
        reference_metrics_observed_at: r.reference_metrics_observed_at ?? null,
        is_discard: discard,
        discard_reason,
      };
    });

    const candidates = candR.rows.map((r) => ({
      candidate_id: r.candidate_id,
      opportunity_id: r.opportunity_id,
      mutation_type: r.mutation_type,
      mutation_label: r.mutation_label,
      primary_remedy: r.primary_remedy,
      proposed_value: r.proposed_value,
      current_value_snapshot: r.current_value_snapshot,
      evidence_summary: r.evidence_summary,
      why: r.why,
      gate_reasons: Array.isArray(r.gate_reasons) ? r.gate_reasons : [],
      opportunity_score: r.opportunity_score != null ? Number(r.opportunity_score) : null,
      opportunity_urgency: r.opportunity_urgency,
      confidence_tier: r.confidence_tier,
      source_confidence: r.source_confidence,
      gate_status: r.gate_status,
      approval_status: r.approval_status,
      execution_status: r.execution_status,
      target_page_url: r.target_page_url,
      page_url_canonical: r.page_url_canonical,
      page_is_live: r.page_is_live === true,
      page_status_class: r.page_status_class,
      regate_review_flag: r.regate_review_flag === true,
      needs_evidence: r.needs_evidence === true,
      qa_status: r.qa_status,
      outcome_verdict: r.outcome_verdict,
    }));

    const num = (v: unknown): number | null =>
      v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v);
    const mapKwTarget = (k: Record<string, unknown> | null | undefined) => {
      if (!k || typeof k !== 'object') return null;
      const ev = (k.evidence ?? {}) as Record<string, unknown>;
      return {
        keyword: (k.keyword as string) ?? null,
        position: num(k.position),
        volume: num(k.volume),
        kd: num(k.kd),
        cpc: num(k.cpc),
        confidence: num(k.confidence),
        target_score: num(k.target_score),
        on_intent: typeof ev.on_intent === 'boolean' ? ev.on_intent : null,
        impressions: num(ev.impressions),
      };
    };

    let dossier: unknown = null;
    if (dossierR.rows.length > 0) {
      const d = dossierR.rows[0];
      const kt = (d.keyword_targets ?? {}) as Record<string, unknown>;
      const secondaryRaw = Array.isArray(kt.secondary) ? kt.secondary : [];
      const routedRaw = Array.isArray(d.routed_queries) ? d.routed_queries : [];
      const rankedRaw = Array.isArray(d.ranked_actions) ? d.ranked_actions : [];
      dossier = {
        intent: d.intent ?? null,
        priority: d.priority ?? null,
        status_class: d.status_class ?? null,
        content_type: d.content_type ?? null,
        generated_at: d.generated_at ?? null,
        state: d.state ?? null,
        // Engine demand ranking (analytics.seo_page_dossier.demand), ordered
        // impressions DESC. demand[0] is the page's highest-demand query and is
        // the canonical top-query baseline (position + impressions) the
        // detection rows and keyword-targets section read from — surfaced here
        // so the Action card's BEFORE block can source both fields from it
        // consistently instead of mixing in the raw GSC-metrics lane.
        demand: Array.isArray(d.demand)
          ? (d.demand as Record<string, unknown>[]).map((row) => ({
              query: (row.query as string) ?? '',
              position: num(row.position),
              impressions: num(row.impressions),
            }))
          : [],
        keyword_targets: {
          primary: mapKwTarget(kt.primary as Record<string, unknown>),
          secondary: secondaryRaw.map((s: Record<string, unknown>) => mapKwTarget(s)).filter(Boolean),
        },
        routed_queries: routedRaw.map((q: Record<string, unknown>) => ({
          query: (q.query as string) ?? '',
          decision: (q.decision as string) ?? null,
          reason: (q.reason as string) ?? null,
          target_page: (q.target_page as string) ?? null,
        })),
        ranked_actions: rankedRaw.map((a: Record<string, unknown>) => ({
          lane: num(a.lane),
          executor: (a.executor as string) ?? null,
          action: (a.action as string) ?? null,
          change: (a.change as string) ?? null,
          speed: (a.speed as string) ?? null,
          status: (a.status as string) ?? null,
          score: num(a.score),
          impact: num(a.impact),
        })),
      };
    }

    const transitions = transR.rows.map((t) => ({
      candidate_id: t.candidate_id,
      from_status: t.from_status ?? null,
      to_status: t.to_status ?? null,
      reason: Array.isArray(t.reason) ? t.reason : [],
      gated_at: t.gated_at ?? null,
    }));

    return NextResponse.json({ data: { page, demand, candidates, dossier, transitions } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/page] GET error:', msg);
    return NextResponse.json({ error: 'Failed to load page dossier' }, { status: 500 });
  }
}
