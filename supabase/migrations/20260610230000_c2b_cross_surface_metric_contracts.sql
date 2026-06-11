-- ============================================================================
-- Migration: 20260610230000_c2b_cross_surface_metric_contracts.sql
-- C2b cross-surface Marketing / SEO Command Center metric contracts
-- ============================================================================
--
-- Reporting-layer only. No queue writes, dispatch writes, learning writes,
-- paid mutations, or direct is_active writes.
-- ============================================================================

INSERT INTO analytics.seo_dashboard_metric_contract (
  metric_key,
  panel,
  label,
  authoritative_sql,
  served_sql,
  grain,
  window_kind,
  freshness_source,
  source_label,
  window_label,
  tolerance_abs,
  tolerance_pct,
  display_order,
  notes
) VALUES
  (
    'cross_surface_organic_clicks_7d',
    'cross_surface_marketing',
    'Organic clicks',
    $$WITH b AS (
        SELECT max(date)::date AS end_date
        FROM analytics.metrics_search_console_daily
      )
      SELECT COALESCE(sum(d.clicks), 0)::numeric
      FROM analytics.metrics_search_console_daily d
      CROSS JOIN b
      WHERE d.date BETWEEN b.end_date - 6 AND b.end_date$$,
    $$WITH b AS (
        SELECT max(date)::date AS end_date
        FROM analytics.metrics_search_console_daily
      )
      SELECT COALESCE(sum(d.clicks), 0)::numeric
      FROM analytics.metrics_search_console_daily d
      CROSS JOIN b
      WHERE d.date BETWEEN b.end_date - 6 AND b.end_date$$,
    'site-level GSC',
    'windowed',
    'google_search_console',
    'SEO Command Center GSC window',
    'last 7 available GSC days',
    0,
    0,
    210,
    'C2b: Marketing and SEO Command Center organic clicks must share the clamped GSC window.'
  ),
  (
    'cross_surface_organic_clicks_30d',
    'cross_surface_marketing',
    'Organic clicks',
    $$WITH b AS (
        SELECT max(date)::date AS end_date
        FROM analytics.metrics_search_console_daily
      )
      SELECT COALESCE(sum(d.clicks), 0)::numeric
      FROM analytics.metrics_search_console_daily d
      CROSS JOIN b
      WHERE d.date BETWEEN b.end_date - 29 AND b.end_date$$,
    $$WITH b AS (
        SELECT max(date)::date AS end_date
        FROM analytics.metrics_search_console_daily
      )
      SELECT COALESCE(sum(d.clicks), 0)::numeric
      FROM analytics.metrics_search_console_daily d
      CROSS JOIN b
      WHERE d.date BETWEEN b.end_date - 29 AND b.end_date$$,
    'site-level GSC',
    'windowed',
    'google_search_console',
    'SEO Command Center GSC window',
    'last 30 available GSC days',
    0,
    0,
    220,
    'C2b: Marketing and SEO Command Center organic clicks must share the clamped GSC window.'
  ),
  (
    'cross_surface_organic_impressions_7d',
    'cross_surface_marketing',
    'Organic impressions',
    $$WITH b AS (
        SELECT max(date)::date AS end_date
        FROM analytics.metrics_search_console_daily
      )
      SELECT COALESCE(sum(d.impressions), 0)::numeric
      FROM analytics.metrics_search_console_daily d
      CROSS JOIN b
      WHERE d.date BETWEEN b.end_date - 6 AND b.end_date$$,
    $$WITH b AS (
        SELECT max(date)::date AS end_date
        FROM analytics.metrics_search_console_daily
      )
      SELECT COALESCE(sum(d.impressions), 0)::numeric
      FROM analytics.metrics_search_console_daily d
      CROSS JOIN b
      WHERE d.date BETWEEN b.end_date - 6 AND b.end_date$$,
    'site-level GSC',
    'windowed',
    'google_search_console',
    'SEO Command Center GSC window',
    'last 7 available GSC days',
    0,
    0,
    230,
    'C2b: Marketing and SEO Command Center organic impressions must share the clamped GSC window.'
  ),
  (
    'cross_surface_organic_impressions_30d',
    'cross_surface_marketing',
    'Organic impressions',
    $$WITH b AS (
        SELECT max(date)::date AS end_date
        FROM analytics.metrics_search_console_daily
      )
      SELECT COALESCE(sum(d.impressions), 0)::numeric
      FROM analytics.metrics_search_console_daily d
      CROSS JOIN b
      WHERE d.date BETWEEN b.end_date - 29 AND b.end_date$$,
    $$WITH b AS (
        SELECT max(date)::date AS end_date
        FROM analytics.metrics_search_console_daily
      )
      SELECT COALESCE(sum(d.impressions), 0)::numeric
      FROM analytics.metrics_search_console_daily d
      CROSS JOIN b
      WHERE d.date BETWEEN b.end_date - 29 AND b.end_date$$,
    'site-level GSC',
    'windowed',
    'google_search_console',
    'SEO Command Center GSC window',
    'last 30 available GSC days',
    0,
    0,
    240,
    'C2b: Marketing and SEO Command Center organic impressions must share the clamped GSC window.'
  ),
  (
    'cross_surface_avg_position_7d',
    'cross_surface_marketing',
    'Average position',
    $$WITH b AS (
        SELECT max(date)::date AS end_date
        FROM analytics.metrics_search_console_daily
      )
      SELECT COALESCE(
        sum(d.avg_position::numeric * d.impressions::numeric) / NULLIF(sum(d.impressions), 0),
        0
      )::numeric
      FROM analytics.metrics_search_console_daily d
      CROSS JOIN b
      WHERE d.date BETWEEN b.end_date - 6 AND b.end_date$$,
    $$WITH b AS (
        SELECT max(date)::date AS end_date
        FROM analytics.metrics_search_console_daily
      )
      SELECT COALESCE(
        sum(d.avg_position::numeric * d.impressions::numeric) / NULLIF(sum(d.impressions), 0),
        0
      )::numeric
      FROM analytics.metrics_search_console_daily d
      CROSS JOIN b
      WHERE d.date BETWEEN b.end_date - 6 AND b.end_date$$,
    'site-level GSC',
    'windowed',
    'google_search_console',
    'SEO Command Center GSC window',
    'last 7 available GSC days',
    0.1,
    0,
    250,
    'C2b: Marketing and SEO Command Center average position must share the clamped GSC window.'
  ),
  (
    'cross_surface_avg_position_30d',
    'cross_surface_marketing',
    'Average position',
    $$WITH b AS (
        SELECT max(date)::date AS end_date
        FROM analytics.metrics_search_console_daily
      )
      SELECT COALESCE(
        sum(d.avg_position::numeric * d.impressions::numeric) / NULLIF(sum(d.impressions), 0),
        0
      )::numeric
      FROM analytics.metrics_search_console_daily d
      CROSS JOIN b
      WHERE d.date BETWEEN b.end_date - 29 AND b.end_date$$,
    $$WITH b AS (
        SELECT max(date)::date AS end_date
        FROM analytics.metrics_search_console_daily
      )
      SELECT COALESCE(
        sum(d.avg_position::numeric * d.impressions::numeric) / NULLIF(sum(d.impressions), 0),
        0
      )::numeric
      FROM analytics.metrics_search_console_daily d
      CROSS JOIN b
      WHERE d.date BETWEEN b.end_date - 29 AND b.end_date$$,
    'site-level GSC',
    'windowed',
    'google_search_console',
    'SEO Command Center GSC window',
    'last 30 available GSC days',
    0.1,
    0,
    260,
    'C2b: Marketing and SEO Command Center average position must share the clamped GSC window.'
  ),
  (
    'cross_surface_quotes_30d',
    'cross_surface_marketing',
    'Quotes',
    $$SELECT COUNT(*)::numeric
      FROM marketing.quote_dashboard_deals
      WHERE created_at >= CURRENT_DATE - 29
        AND created_at < CURRENT_DATE + INTERVAL '1 day'$$,
    $$SELECT COUNT(*)::numeric
      FROM marketing.quote_dashboard_deals
      WHERE created_at >= CURRENT_DATE - 29
        AND created_at < CURRENT_DATE + INTERVAL '1 day'$$,
    'quote',
    'windowed',
    'quote_dashboard_deals',
    'Canonical quote dashboard deals',
    'last 30 calendar days',
    0,
    0,
    270,
    'C2b: shared quote counts come from the Phase 3 canonical quote projection.'
  ),
  (
    'cross_surface_paid_spend_30d',
    'cross_surface_marketing',
    'Paid spend',
    $$SELECT COALESCE(SUM(cost), 0)::numeric
      FROM analytics.metrics_google_ads_campaign_daily
      WHERE metric_date BETWEEN CURRENT_DATE - 29 AND CURRENT_DATE$$,
    $$SELECT COALESCE(SUM(cost), 0)::numeric
      FROM analytics.metrics_google_ads_campaign_daily
      WHERE metric_date BETWEEN CURRENT_DATE - 29 AND CURRENT_DATE$$,
    'Google Ads campaign day',
    'windowed',
    'metrics_google_ads_campaign_daily',
    'Clean Google Ads campaign daily metrics',
    'last 30 calendar days',
    0.01,
    0,
    280,
    'C2b: shared paid spend must use cleaned campaign daily grain, not raw Ads exports.'
  ),
  (
    'cross_surface_paid_conversions_30d',
    'cross_surface_marketing',
    'Paid conversions',
    $$SELECT COALESCE(SUM(conversions), 0)::numeric
      FROM analytics.metrics_google_ads_campaign_daily
      WHERE metric_date BETWEEN CURRENT_DATE - 29 AND CURRENT_DATE$$,
    $$SELECT COALESCE(SUM(conversions), 0)::numeric
      FROM analytics.metrics_google_ads_campaign_daily
      WHERE metric_date BETWEEN CURRENT_DATE - 29 AND CURRENT_DATE$$,
    'Google Ads campaign day',
    'windowed',
    'metrics_google_ads_campaign_daily',
    'Clean Google Ads campaign daily metrics',
    'last 30 calendar days',
    0.001,
    0,
    290,
    'C2b: shared paid conversions must use cleaned campaign daily grain.'
  ),
  (
    'cross_surface_paid_roas_30d',
    'cross_surface_marketing',
    'Paid ROAS',
    $$WITH ads AS (
        SELECT COALESCE(SUM(cost), 0)::numeric AS spend
        FROM analytics.metrics_google_ads_campaign_daily
        WHERE metric_date BETWEEN CURRENT_DATE - 29 AND CURRENT_DATE
      ),
      quote_perf AS (
        SELECT COALESCE(SUM(paid_revenue_usd), 0)::numeric AS revenue
        FROM marketing.google_ads_quote_performance
        WHERE report_date BETWEEN CURRENT_DATE - 29 AND CURRENT_DATE
      )
      SELECT CASE WHEN ads.spend > 0 THEN quote_perf.revenue / ads.spend ELSE 0 END
      FROM ads, quote_perf$$,
    $$WITH ads AS (
        SELECT COALESCE(SUM(cost), 0)::numeric AS spend
        FROM analytics.metrics_google_ads_campaign_daily
        WHERE metric_date BETWEEN CURRENT_DATE - 29 AND CURRENT_DATE
      ),
      quote_perf AS (
        SELECT COALESCE(SUM(paid_revenue_usd), 0)::numeric AS revenue
        FROM marketing.google_ads_quote_performance
        WHERE report_date BETWEEN CURRENT_DATE - 29 AND CURRENT_DATE
      )
      SELECT CASE WHEN ads.spend > 0 THEN quote_perf.revenue / ads.spend ELSE 0 END
      FROM ads, quote_perf$$,
    'Google Ads campaign day + quote attribution day',
    'windowed',
    'metrics_google_ads_campaign_daily + google_ads_quote_performance',
    'Clean Google Ads spend plus quote-attributed revenue',
    'last 30 calendar days',
    0.001,
    0,
    300,
    'C2b: shared paid ROAS is quote-attributed revenue divided by cleaned campaign spend.'
  )
ON CONFLICT (metric_key) DO UPDATE SET
  panel = EXCLUDED.panel,
  label = EXCLUDED.label,
  authoritative_sql = EXCLUDED.authoritative_sql,
  served_sql = EXCLUDED.served_sql,
  grain = EXCLUDED.grain,
  window_kind = EXCLUDED.window_kind,
  freshness_source = EXCLUDED.freshness_source,
  source_label = EXCLUDED.source_label,
  window_label = EXCLUDED.window_label,
  tolerance_abs = EXCLUDED.tolerance_abs,
  tolerance_pct = EXCLUDED.tolerance_pct,
  enabled = true,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes,
  updated_at = now();
