/**
 * Attribution Intelligence — response row types.
 *
 * Mirrors the shapes returned by:
 *   GET /api/activity-spine/marketing/attribution
 *   GET /api/activity-spine/seo/attribution
 *
 * Source schemas (Supabase, owned by ODS):
 *   metrics.source_to_paid_funnel
 *   metrics.channel_revenue_daily
 *   marketing.google_ads_quote_performance
 *   marketing.google_ads_quote_attribution_quality
 *   seo.page_quote_performance
 *   seo.cluster_quote_performance
 *
 * Platform Shell does not own attribution logic; these types describe what
 * ODS provides and what the route hands back unchanged (with light cents→USD
 * formatting).
 */

export type JoinConfidenceTier =
  | 'exact_campaign_adgroup_id'
  | 'exact_campaign_id'
  | 'name_match'
  | 'source_group_only'
  | 'unavailable'
  | 'ads_only';

/**
 * Human-readable description per tier. Surfaced as tooltip + legend.
 * source_group_only is explicitly labeled approximate so downstream readers
 * don't read a grey badge as canonical.
 */
export const JOIN_CONFIDENCE_DESCRIPTIONS: Record<JoinConfidenceTier, string> = {
  exact_campaign_adgroup_id:
    'Exact campaign + ad group attribution using Google Ads IDs.',
  exact_campaign_id:
    'Exact campaign attribution using Google Ads campaign ID.',
  name_match:
    'Campaign name match. Lower confidence because names can change.',
  source_group_only:
    'Approximate channel-level attribution. Google Ads source is known, but campaign was not matched.',
  ads_only:
    'Ad spend row with no matching QMS quote facts.',
  unavailable:
    'Attribution not available.',
};

export interface SourceFunnelRow {
  source_group: string;
  submitted_quotes: number;
  paid_quotes: number;
  paid_conversion_rate: number | null;
  paid_revenue_cents: number;
  paid_revenue_usd: number;
  test_quotes: number;
  quotes_with_origin_page: number;
  /**
   * Average paid order value in USD.
   * NOTE: Currently derived in the activity-spine route from
   * paid_revenue_cents / paid_quotes. Approximate until ODS exposes this
   * directly on metrics.source_to_paid_funnel.
   */
  avg_paid_value_usd_approx: number;
}

export interface ChannelRevenueRow {
  date: string;
  source_group: string;
  submitted_quotes: number;
  paid_quotes: number;
  paid_conversion_rate: number | null;
  paid_revenue_cents: number;
  paid_revenue_usd: number;
  test_quotes: number;
  quotes_with_origin_page: number;
}

export interface GoogleAdsPerformanceRow {
  report_date: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  google_campaign_id: string | null;
  google_campaign_name: string | null;
  ad_clicks: number;
  ad_impressions: number;
  ad_ctr_pct: number | null;
  ad_cost_usd: number;
  submitted_quotes: number;
  paid_quotes: number;
  paid_conversion_rate: number | null;
  paid_revenue_cents: number;
  paid_revenue_usd: number;
  estimated_roas_qms: number | null;
  cost_per_quote_usd: number | null;
  cost_per_paid_quote_usd: number | null;
  quotes_with_gclid: number;
  quotes_with_gbraid: number;
  quotes_with_wbraid: number;
  qms_join_path: string | null;
  join_confidence: JoinConfidenceTier;
}

export interface AttributionQualityRow {
  join_confidence: JoinConfidenceTier;
  date_count: number;
  row_count: number;
  total_submitted_quotes: number;
  total_paid_quotes: number;
  total_revenue_cents: number;
  total_revenue_usd: number;
  total_spend_usd: number;
  pct_of_quotes: number | null;
  pct_of_spend: number | null;
}

export interface SeoPagePerformanceRow {
  canonical_page_url: string;
  raw_page_url: string | null;
  page_title: string | null;
  page_type: string | null;
  topic_cluster: string | null;
  search_console_clicks: number;
  search_console_impressions: number;
  avg_position: number | null;
  submitted_quotes: number;
  paid_quotes: number;
  paid_revenue_cents: number;
  paid_revenue_usd: number;
}

export interface SeoClusterPerformanceRow {
  topic_cluster: string | null;
  mapped_pages: number;
  search_console_clicks: number;
  search_console_impressions: number;
  avg_position: number | null;
  submitted_quotes: number;
  paid_quotes: number;
  paid_revenue_cents: number;
  paid_revenue_usd: number;
  top_revenue_page: string | null;
  top_quote_page: string | null;
}

export interface AttributionResponse<T> {
  data: T[];
  meta: { view: string };
}
