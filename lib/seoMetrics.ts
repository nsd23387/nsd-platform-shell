// =============================================================================
// lib/seoMetrics.ts — Canonical GSC metric surface (read-only)
// Governance lock: READ-ONLY. Parameterized queries only, no writes.
//
// Single source of truth for "organic clicks / impressions / average position
// over the last N days" so the Command Center hero, the Momentum card, and the
// Results page all report the SAME number. Every window is anchored to the
// latest available metric_date (NOT CURRENT_DATE) so Search Console's ~3-day
// ingest lag never silently truncates the window and produces a smaller number
// on whichever surface happens to span the lag days.
//
// Backing table: analytics.metrics_search_console_daily (the curated GSC daily
// rollup — site totals). Do not point these helpers at raw_search_console: that
// is page-grain and host-filtered, a different grain that will not reconcile.
// =============================================================================

import type { Pool } from 'pg';

const TABLE = 'analytics.metrics_search_console_daily';

export interface OrganicWindow {
  clicks: number;
  impressions: number;
  /** Impression-weighted average position (lower is better), null if no data. */
  avgPosition: number | null;
  days: number;
}

/** Latest metric_date present in the GSC daily rollup, or null if empty. */
export async function getMaxMetricDate(pool: Pool): Promise<string | null> {
  const { rows } = await pool.query<{ max_date: string | null }>(
    `SELECT MAX(date)::text AS max_date FROM ${TABLE}`,
  );
  return rows[0]?.max_date ?? null;
}

/**
 * Aggregate clicks, impressions and impression-weighted average position over a
 * window of `windowDays` days ending `offsetDays` days before the latest
 * metric_date.
 *   offsetDays = 0          -> the most recent window (e.g. last 30 days)
 *   offsetDays = windowDays -> the prior equal-length window (period-over-period)
 * The window is half-open on the older edge: (anchor - windowDays - offset,
 * anchor - offset], so adjacent windows never double-count a boundary day.
 */
export async function organicWindow(
  pool: Pool,
  windowDays: number,
  offsetDays = 0,
): Promise<OrganicWindow> {
  const { rows } = await pool.query<{
    clicks: string | null;
    impressions: string | null;
    position: string | null;
  }>(
    `WITH anchor AS (SELECT MAX(date) AS d FROM ${TABLE})
     SELECT
       SUM(clicks)::bigint      AS clicks,
       SUM(impressions)::bigint AS impressions,
       ROUND(
         SUM(impressions * avg_position)::numeric / NULLIF(SUM(impressions), 0),
         2
       ) AS position
     FROM ${TABLE}, anchor
     WHERE date >  anchor.d - ($1::int + $2::int)
       AND date <= anchor.d - $2::int`,
    [windowDays, offsetDays],
  );
  const r = rows[0];
  return {
    clicks: r?.clicks ? parseInt(r.clicks, 10) : 0,
    impressions: r?.impressions ? parseInt(r.impressions, 10) : 0,
    avgPosition: r?.position != null ? parseFloat(r.position) : null,
    days: windowDays,
  };
}

/** Convenience: organic clicks over the most recent `windowDays` days. */
export async function organicClicks(pool: Pool, windowDays: number): Promise<number> {
  return (await organicWindow(pool, windowDays)).clicks;
}

/** Convenience: organic impressions over the most recent `windowDays` days. */
export async function organicImpressions(pool: Pool, windowDays: number): Promise<number> {
  return (await organicWindow(pool, windowDays)).impressions;
}

/** Convenience: impression-weighted average position over `windowDays` days. */
export async function avgPosition(pool: Pool, windowDays: number): Promise<number | null> {
  return (await organicWindow(pool, windowDays)).avgPosition;
}
