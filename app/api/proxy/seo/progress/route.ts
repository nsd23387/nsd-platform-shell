/**
 * GET /api/proxy/seo/progress
 *
 * Returns the data backing two dashboard widgets:
 *   1. Today's Brief — actions taken yesterday, decisions needed today
 *   2. Progress Scoreboard — weekly + monthly trends in organic traffic
 *
 * All data sourced from current engine tables and the canonical dashboard queue.
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
 *     pages_measuring: number,
 *     execution_outcomes: { succeeded, failed, measuring, total_attempts, failure_rate_pct }
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
import { organicWindow } from '../../../../../lib/seoMetrics';

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

// Organic traffic windows now come from the canonical lib/seoMetrics helper
// (analytics.metrics_search_console_daily, anchored to the latest metric_date,
// impression-weighted position) so this Results surface reports the SAME 7d/30d
// clicks number as the Command Center hero and Momentum card. The previous
// raw_search_console + CURRENT_DATE path was a different grain and anchor and
// produced a smaller, inconsistent number.
function gscShape(w: { clicks: number; impressions: number; avgPosition: number | null }) {
  return { clicks: w.clicks, impressions: w.impressions, position: w.avgPosition };
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
    const yesterdayApplied = await p.query<{ count: string; target_url: string | null }>(
      `SELECT COUNT(*) AS count, target_url FROM (
         SELECT target_url FROM analytics.seo_execution_log WHERE executed_at >= NOW() - INTERVAL '24 hours'
         UNION ALL
         SELECT target_page_url AS target_url
         FROM analytics.seo_execution_candidate
         WHERE COALESCE(published_at, execution_timestamp) >= NOW() - INTERVAL '24 hours'
           AND execution_status IN ('published', 'draft_applied')
       ) combined
       GROUP BY target_url`,
    ).catch(() => ({ rows: [] as Array<{ count: string; target_url: string | null }> }));

    const yesterdayApprovals = await p.query<{ approved: string; rejected: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE approval_status = 'approved')::text AS approved,
         COUNT(*) FILTER (WHERE approval_status = 'rejected')::text AS rejected
       FROM analytics.seo_execution_candidate
       WHERE reviewed_at >= NOW() - INTERVAL '24 hours'`,
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

    const awaitingApproval = await p.query<{ count: string; urgent: string }>(
      `SELECT
         decisions::text AS count,
         needs_review::text AS urgent
       FROM analytics.v_seo_dashboard_summary`,
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
    // Canonical windows anchored to the latest metric_date (see lib/seoMetrics).
    // Last 7 days vs prior 7 days; last 30 days vs prior 30 days.
    const week = gscShape(await organicWindow(p, 7, 0));
    const weekPrior = gscShape(await organicWindow(p, 7, 7));

    const month = gscShape(await organicWindow(p, 30, 0));
    const monthPrior = gscShape(await organicWindow(p, 30, 30));

    // Pages optimized: union old + new pipelines
    const pagesOptimizedWeek = await p.query<{ count: string }>(
      `SELECT COUNT(DISTINCT target_url)::text AS count FROM (
         SELECT target_url FROM analytics.seo_execution_log WHERE executed_at >= NOW() - INTERVAL '7 days'
         UNION ALL
         SELECT target_page_url AS target_url
         FROM analytics.seo_execution_candidate
         WHERE COALESCE(published_at, execution_timestamp) >= NOW() - INTERVAL '7 days'
           AND execution_status IN ('published', 'draft_applied')
       ) u`,
    ).catch(() => ({ rows: [{ count: '0' }] }));

    const pagesOptimizedMonth = await p.query<{ count: string }>(
      `SELECT COUNT(DISTINCT target_url)::text AS count FROM (
         SELECT target_url FROM analytics.seo_execution_log WHERE executed_at >= NOW() - INTERVAL '30 days'
         UNION ALL
         SELECT target_page_url AS target_url
         FROM analytics.seo_execution_candidate
         WHERE COALESCE(published_at, execution_timestamp) >= NOW() - INTERVAL '30 days'
           AND execution_status IN ('published', 'draft_applied')
       ) u`,
    ).catch(() => ({ rows: [{ count: '0' }] }));

    // Execution outcomes for the Results surface. Keep the split honest:
    // succeeded/failed are executor terminal states. "Measuring" is only an
    // explicit published-outcome row still awaiting verdict, not every success
    // missing an outcome row.
    const executionOutcomesWeek = await p.query<{
      succeeded: string;
      failed: string;
      measuring: string;
      total_attempts: string;
    }>(
      `WITH attempts AS (
         SELECT
           c.candidate_id,
           c.execution_status,
           o.decided_at
         FROM analytics.seo_execution_candidate c
         LEFT JOIN analytics.seo_published_outcome o ON o.candidate_id = c.candidate_id
         WHERE COALESCE(c.published_at, c.execution_timestamp) >= NOW() - INTERVAL '7 days'
           AND c.execution_status IN ('published', 'draft_applied', 'failed', 'rolled_back')
       )
       SELECT
         COUNT(*) FILTER (WHERE execution_status IN ('published', 'draft_applied'))::text AS succeeded,
         COUNT(*) FILTER (WHERE execution_status IN ('failed', 'rolled_back'))::text AS failed,
         COUNT(*) FILTER (
           WHERE execution_status IN ('published', 'draft_applied')
             AND candidate_id IN (SELECT candidate_id FROM analytics.seo_published_outcome)
             AND decided_at IS NULL
         )::text AS measuring,
         COUNT(*) FILTER (WHERE execution_status IN ('published', 'draft_applied', 'failed', 'rolled_back'))::text AS total_attempts
       FROM attempts`,
    ).catch(() => ({ rows: [{ succeeded: '0', failed: '0', measuring: '0', total_attempts: '0' }] }));

    // Win rate: from legacy learning_outcomes plus current candidate outcomes.
    const winRate = await p.query<{ positive: string; total: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE label = 'positive')::text AS positive,
         COUNT(*)::text AS total
       FROM (
         SELECT outcome_label AS label FROM analytics.seo_learning_outcomes WHERE measurement_date >= CURRENT_DATE - INTERVAL '90 days' AND outcome_label IN ('positive', 'negative', 'neutral')
         UNION ALL
         SELECT CASE
           WHEN verdict = 'improved' THEN 'positive'
           WHEN verdict IN ('regressed', 'regressed_advisory') THEN 'negative'
           WHEN verdict IN ('flat', 'inconclusive', 'live_confirmed', 'drift') THEN 'neutral'
           ELSE NULL
         END AS label
         FROM analytics.seo_published_outcome
         WHERE decided_at >= CURRENT_DATE - INTERVAL '90 days'
       ) u`,
    ).catch(() => ({ rows: [{ positive: '0', total: '0' }] }));

    const winTotal = parseInt(winRate.rows[0]?.total || '0', 10);
    const winPositive = parseInt(winRate.rows[0]?.positive || '0', 10);
    const winRatePct = winTotal > 0 ? Math.round((winPositive / winTotal) * 1000) / 10 : null;
    const outcomeRow = executionOutcomesWeek.rows[0] ?? { succeeded: '0', failed: '0', measuring: '0', total_attempts: '0' };
    const outcomeSucceeded = parseInt(outcomeRow.succeeded || '0', 10);
    const outcomeFailed = parseInt(outcomeRow.failed || '0', 10);
    const outcomeMeasuring = parseInt(outcomeRow.measuring || '0', 10);
    const outcomeTotal = parseInt(outcomeRow.total_attempts || '0', 10);
    const failureRatePct = outcomeTotal > 0 ? Math.round((outcomeFailed / outcomeTotal) * 1000) / 10 : null;

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
        pages_measuring: outcomeMeasuring,
        execution_outcomes: {
          succeeded: outcomeSucceeded,
          failed: outcomeFailed,
          measuring: outcomeMeasuring,
          total_attempts: outcomeTotal,
          failure_rate_pct: failureRatePct,
        },
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
