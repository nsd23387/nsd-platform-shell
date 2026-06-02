// =============================================================================
// GET /api/proxy/seo/page?url=... — Level-2 page dossier (governed)
// Governance lock: READ-ONLY. Parameterized queries only. Cross-table joins
// are matched on a NORMALIZED url (protocol + leading www. stripped, trailing
// slash removed) because inventory uses www., while execution candidates and
// GSC query/page metrics mix www. and apex hosts. Surfaces three lanes:
//   Lane 1 (engine) — analytics.seo_execution_candidate, gate_status='accepted'
//                     only. Approve/reject routes back through the existing
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

  try {
    const invQ = pool.query(
      `SELECT url, content_type, status_class, gsc_impressions, gsc_top_query,
              gsc_best_position::numeric AS gsc_best_position, has_rankmath_redirect,
              rankmath_redirect_target, http_status, canonical_url, indexable, noindex,
              in_404_monitor
       FROM analytics.seo_page_inventory
       WHERE rtrim(regexp_replace(lower(url), '^https?://(www\\.)?', ''), '/') = $1
       ORDER BY (status_class = 'canonical_live') DESC
       LIMIT 1`,
      [norm],
    );

    const demandQ = pool.query(
      `WITH agg AS (
         SELECT
           m.query,
           lower(trim(m.query)) AS norm_query,
           SUM(m.impressions)::bigint AS impressions,
           SUM(m.clicks)::bigint AS clicks,
           CASE WHEN SUM(m.impressions) > 0
                THEN SUM(m.avg_position * m.impressions) / SUM(m.impressions)
                ELSE AVG(m.avg_position) END AS avg_position
         FROM analytics.metrics_search_console_query_page_daily m
         WHERE rtrim(regexp_replace(lower(m.page_url), '^https?://(www\\.)?', ''), '/') = $1
         GROUP BY m.query
       )
       SELECT
         agg.query, agg.impressions, agg.clicks, agg.avg_position::numeric AS avg_position,
         COALESCE(eqi.search_volume, eqi.ahrefs_search_volume) AS kw_volume,
         COALESCE(eqi.keyword_difficulty, eqi.ahrefs_keyword_difficulty)::numeric AS kw_difficulty,
         COALESCE(eqi.cpc, eqi.ahrefs_cpc)::numeric AS kw_cpc,
         COALESCE(eqi.is_competitor_only, false) AS is_competitor_only
       FROM agg
       LEFT JOIN analytics.external_query_intelligence eqi
         ON eqi.normalized_query = agg.norm_query
       ORDER BY agg.impressions DESC
       LIMIT 12`,
      [norm],
    );

    const candQ = pool.query(
      `SELECT candidate_id, opportunity_id, mutation_type, primary_remedy,
              proposed_value, current_value_snapshot, evidence_summary, gate_reasons,
              opportunity_score::numeric AS opportunity_score, opportunity_urgency,
              confidence_tier, source_confidence, approval_status, execution_status,
              target_page_url
       FROM analytics.seo_execution_candidate
       WHERE rtrim(regexp_replace(lower(target_page_url), '^https?://(www\\.)?', ''), '/') = $1
         AND gate_status = 'accepted'
       ORDER BY opportunity_score DESC NULLS LAST`,
      [norm],
    );

    const [invR, demandR, candR] = await Promise.all([invQ, demandQ, candQ]);

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
        is_discard: discard,
        discard_reason,
      };
    });

    const candidates = candR.rows.map((r) => ({
      candidate_id: r.candidate_id,
      opportunity_id: r.opportunity_id,
      mutation_type: r.mutation_type,
      primary_remedy: r.primary_remedy,
      proposed_value: r.proposed_value,
      current_value_snapshot: r.current_value_snapshot,
      evidence_summary: r.evidence_summary,
      gate_reasons: Array.isArray(r.gate_reasons) ? r.gate_reasons : [],
      opportunity_score: r.opportunity_score != null ? Number(r.opportunity_score) : null,
      opportunity_urgency: r.opportunity_urgency,
      confidence_tier: r.confidence_tier,
      source_confidence: r.source_confidence,
      approval_status: r.approval_status,
      execution_status: r.execution_status,
      target_page_url: r.target_page_url,
    }));

    return NextResponse.json({ data: { page, demand, candidates } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/page] GET error:', msg);
    return NextResponse.json({ error: 'Failed to load page dossier' }, { status: 500 });
  }
}
