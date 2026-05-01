/**
 * GET /api/proxy/seo/progress
 *
 * Returns the data backing two dashboard widgets:
 *   1. Today's Brief — actions taken yesterday, decisions needed today
 *   2. Progress Scoreboard — weekly + monthly trends in organic traffic
 *
 * All data sourced from existing tables — no schema changes required.
 *
 * Response shape:
 * {
 *   today: {
 *     actions_yesterday: { applied: number, approved: number, rejected: number, pages: string[] },
 *     needs_attention: { decay_count, cannibalization_count, awaiting_approval, urgent_pages: string[] },
 *     pipeline_health: { last_run, jobs: { name, last_run, status }[] }
 *   },
 *   week: {
 *     organic_clicks: { current, prior, delta_pct },
 *     organic_impressions: { current, prior, delta_pct },
 *     avg_position: { current, prior, delta },
 *     pages_optimized: number,
 *     pages_measuring: number
 *   },
 *   month: {
 *     organic_clicks: { current, prior, delta_pct },
 *     organic_impressions: { current, prior, delta_pct },
 *     avg_position: { current, prior, delta },
 *     pages_optimized: number,
 *     win_rate_pct: number | null
 *   }
 * }
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool && databaseUrl) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  if (!pool) throw new Error('No database URL configured');
  return pool;
}

// Aggregate GSC metrics over a window. Returns null if no data.
async function gscWindow(p: Pool, daysAgoStart: number, daysAgoEnd: number) {
  const { rows } = await p.query<{
    clicks: string | null;
    impressions: string | null;
    position: string | null;
  }>(
    `SELECT
       SUM((payload->>'clicks')::int) AS clicks,
       SUM((payload->>'impressions')::int) AS impressions,
       AVG((payload->>'position')::numeric) AS position
     FROM analytics.raw_search_console
     WHERE (payload->>'date')::date >= CURRENT_DATE - $1::interval
       AND (payload->>'date')::date <  CURRENT_DATE - $2::interval
       AND payload->>'page' ILIKE '%neonsignsdepot.com%'`,
    [`${daysAgoStart} days`, `${daysAgoEnd} days`],
  );
  const r = rows[0];
  if (!r) return { clicks: 0, impressions: 0, position: null as number | null };
  return {
    clicks: r.clicks ? parseInt(r.clicks, 10) : 0,
    impressions: r.impressions ? parseInt(r.impressions, 10) : 0,
    position: r.position != null ? parseFloat(r.position) : null,
  };
}

function deltaPct(current: number, prior: number): number {
  if (prior === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

function deltaAbs(current: number | null, prior: number | null): number | null {
  if (current == null || prior == null) return null;
  return Math.round((current - prior) * 10) / 10;
}

export async function GET() {
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const p = getPool();

    // ── TODAY: actions taken in last 24h ─────────────────────────────────────
    // Query both old pipeline (seo_execution_log) and new pipeline (seo_action)
    const yesterdayApplied = await p.query<{ count: string; target_url: string | null }>(
      `SELECT COUNT(*) AS count, target_url FROM (
         SELECT target_url FROM analytics.seo_execution_log WHERE executed_at >= NOW() - INTERVAL '24 hours'
         UNION ALL
         SELECT target_url FROM analytics.seo_action WHERE executed_at >= NOW() - INTERVAL '24 hours' AND status IN ('published', 'measuring')
       ) combined
       GROUP BY target_url`,
    ).catch(() => ({ rows: [] as Array<{ count: string; target_url: string | null }> }));

    const yesterdayApprovals = await p.query<{ approved: string; rejected: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'approved' OR status = 'published')::text AS approved,
         COUNT(*) FILTER (WHERE status = 'rejected')::text AS rejected
       FROM (
         SELECT approval_status AS status, reviewed_at FROM analytics.seo_execution_candidate WHERE reviewed_at >= NOW() - INTERVAL '24 hours'
         UNION ALL
         SELECT status, human_decided_at AS reviewed_at FROM analytics.seo_action WHERE (human_decided_at >= NOW() - INTERVAL '24 hours' OR agent_reviewed_at >= NOW() - INTERVAL '24 hours')
       ) combined`,
    ).catch(() => ({ rows: [{ approved: '0', rejected: '0' }] }));

    // ── TODAY: needs attention ──────────────────────────────────────────────
    const decayNew = await p.query<{ count: string; top_page: string | null }>(
      `SELECT COUNT(*)::text AS count, MAX(page_path) AS top_page
       FROM analytics.seo_decay_signal
       WHERE status = 'new' AND decay_score >= 0.50`,
    ).catch(() => ({ rows: [{ count: '0', top_page: null }] }));

    const cannibalizationNew = await p.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM analytics.seo_cannibalization_signal
       WHERE status = 'new' AND canonical_confidence = 'high'`,
    ).catch(() => ({ rows: [{ count: '0' }] }));

    // Count from both old pipeline and new seo_action table
    const awaitingApproval = await p.query<{ count: string; urgent: string }>(
      `SELECT
         (COALESCE(old.cnt, 0) + COALESCE(new.cnt, 0))::text AS count,
         COALESCE(new.cnt, 0)::text AS urgent
       FROM
         (SELECT COUNT(*) AS cnt FROM analytics.seo_execution_candidate WHERE execution_status = 'proposed' AND approval_status = 'pending') old,
         (SELECT COUNT(*) AS cnt FROM analytics.seo_action WHERE status IN ('proposed', 'reviewed')) new`,
    ).catch(() => ({ rows: [{ count: '0', urgent: '0' }] }));

    // Pipeline health: when did each major job last run?
    const lastClusterRun = await p.query<{ run_at: string | null }>(
      `SELECT MAX(run_at) AS run_at FROM analytics.seo_cluster_generation_runs`,
    ).catch(() => ({ rows: [{ run_at: null }] }));

    const lastDecayDetection = await p.query<{ detected_at: string | null }>(
      `SELECT MAX(detected_at) AS detected_at FROM analytics.seo_decay_signal`,
    ).catch(() => ({ rows: [{ detected_at: null }] }));

    const lastExecutionApplied = await p.query<{ executed_at: string | null }>(
      `SELECT MAX(executed_at) AS executed_at FROM analytics.seo_execution_log`,
    ).catch(() => ({ rows: [{ executed_at: null }] }));

    const lastGscIngest = await p.query<{ max_date: string | null }>(
      `SELECT MAX((payload->>'date')::date)::text AS max_date FROM analytics.raw_search_console`,
    ).catch(() => ({ rows: [{ max_date: null }] }));

    // ── WEEK & MONTH: organic traffic trends ─────────────────────────────────
    // Compare last 7 days (1-7) vs prior 7 days (8-14)
    const week = await gscWindow(p, 7, 0);
    const weekPrior = await gscWindow(p, 14, 7);

    // Last 30 days vs prior 30 days
    const month = await gscWindow(p, 30, 0);
    const monthPrior = await gscWindow(p, 60, 30);

    // Pages optimized: union old + new pipelines
    const pagesOptimizedWeek = await p.query<{ count: string }>(
      `SELECT COUNT(DISTINCT target_url)::text AS count FROM (
         SELECT target_url FROM analytics.seo_execution_log WHERE executed_at >= NOW() - INTERVAL '7 days'
         UNION ALL
         SELECT target_url FROM analytics.seo_action WHERE executed_at >= NOW() - INTERVAL '7 days' AND status IN ('published', 'measuring')
       ) u`,
    ).catch(() => ({ rows: [{ count: '0' }] }));

    const pagesOptimizedMonth = await p.query<{ count: string }>(
      `SELECT COUNT(DISTINCT target_url)::text AS count FROM (
         SELECT target_url FROM analytics.seo_execution_log WHERE executed_at >= NOW() - INTERVAL '30 days'
         UNION ALL
         SELECT target_url FROM analytics.seo_action WHERE executed_at >= NOW() - INTERVAL '30 days' AND status IN ('published', 'measuring')
       ) u`,
    ).catch(() => ({ rows: [{ count: '0' }] }));

    const pagesMeasuring = await p.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM (
         SELECT 1 FROM analytics.seo_execution_log WHERE measured_at_14d IS NULL AND executed_at >= NOW() - INTERVAL '14 days'
         UNION ALL
         SELECT 1 FROM analytics.seo_action WHERE measured_at_14d IS NULL AND executed_at >= NOW() - INTERVAL '14 days' AND status IN ('published', 'measuring')
       ) u`,
    ).catch(() => ({ rows: [{ count: '0' }] }));

    // Win rate: from both old learning_outcomes AND new seo_action
    const winRate = await p.query<{ positive: string; total: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE label = 'positive')::text AS positive,
         COUNT(*)::text AS total
       FROM (
         SELECT outcome_label AS label FROM analytics.seo_learning_outcomes WHERE measurement_date >= CURRENT_DATE - INTERVAL '90 days' AND outcome_label IN ('positive', 'negative', 'neutral')
         UNION ALL
         SELECT outcome_label AS label FROM analytics.seo_action WHERE measured_at_14d IS NOT NULL AND outcome_label IN ('positive', 'negative', 'neutral')
       ) u`,
    ).catch(() => ({ rows: [{ positive: '0', total: '0' }] }));

    const winTotal = parseInt(winRate.rows[0]?.total || '0', 10);
    const winPositive = parseInt(winRate.rows[0]?.positive || '0', 10);
    const winRatePct = winTotal > 0 ? Math.round((winPositive / winTotal) * 1000) / 10 : null;

    return NextResponse.json({
      today: {
        actions_yesterday: {
          applied: yesterdayApplied.rows.length,
          approved: parseInt(yesterdayApprovals.rows[0]?.approved || '0', 10),
          rejected: parseInt(yesterdayApprovals.rows[0]?.rejected || '0', 10),
          pages: yesterdayApplied.rows.map(r => r.target_url).filter(Boolean) as string[],
        },
        needs_attention: {
          decay_count: parseInt(decayNew.rows[0]?.count || '0', 10),
          cannibalization_count: parseInt(cannibalizationNew.rows[0]?.count || '0', 10),
          awaiting_approval: parseInt(awaitingApproval.rows[0]?.count || '0', 10),
          urgent_pages: parseInt(awaitingApproval.rows[0]?.urgent || '0', 10),
          top_decay_page: decayNew.rows[0]?.top_page || null,
        },
        pipeline_health: {
          last_cluster_run: lastClusterRun.rows[0]?.run_at || null,
          last_decay_detection: lastDecayDetection.rows[0]?.detected_at || null,
          last_execution: lastExecutionApplied.rows[0]?.executed_at || null,
          last_gsc_date: lastGscIngest.rows[0]?.max_date || null,
        },
      },
      week: {
        organic_clicks: { current: week.clicks, prior: weekPrior.clicks, delta_pct: deltaPct(week.clicks, weekPrior.clicks) },
        organic_impressions: { current: week.impressions, prior: weekPrior.impressions, delta_pct: deltaPct(week.impressions, weekPrior.impressions) },
        avg_position: { current: week.position, prior: weekPrior.position, delta: deltaAbs(week.position, weekPrior.position) },
        pages_optimized: parseInt(pagesOptimizedWeek.rows[0]?.count || '0', 10),
        pages_measuring: parseInt(pagesMeasuring.rows[0]?.count || '0', 10),
      },
      month: {
        organic_clicks: { current: month.clicks, prior: monthPrior.clicks, delta_pct: deltaPct(month.clicks, monthPrior.clicks) },
        organic_impressions: { current: month.impressions, prior: monthPrior.impressions, delta_pct: deltaPct(month.impressions, monthPrior.impressions) },
        avg_position: { current: month.position, prior: monthPrior.position, delta: deltaAbs(month.position, monthPrior.position) },
        pages_optimized: parseInt(pagesOptimizedMonth.rows[0]?.count || '0', 10),
        win_rate_pct: winRatePct,
        win_sample_size: winTotal,
      },
    });
  } catch (err: any) {
    console.error('[seo/progress] Error:', err.message);
    return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 });
  }
}
