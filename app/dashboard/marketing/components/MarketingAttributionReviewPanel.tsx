'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardSection, EmptyStateCard, SkeletonCard, DashboardCard } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { indigo } from '../../../../design/tokens/colors';
import { getAttributionReviewSnapshot } from '../../../../lib/sdk';
import type {
  AttributionReviewSnapshot,
  AttributionPrecisionStatus,
  AttributionWarningSeverity,
  AttributionReviewItemGroup,
} from '../../../../types/attribution';

const ATTRIBUTION_DETAIL_HREF = '/dashboard/marketing/attribution';

const PRECISION_LABELS: Record<AttributionPrecisionStatus, { label: string; color: string; description: string }> = {
  good: {
    label: 'Good',
    color: '#16a34a',
    description: '90%+ of Google Ads quotes attributed at exact campaign / ad-group ID precision.',
  },
  transitioning: {
    label: 'Transitioning',
    color: '#f59e0b',
    description: 'Some Google Ads quotes are still resolving at lower precision after UTM template rollout.',
  },
  weak: {
    label: 'Weak',
    color: '#ef4444',
    description: 'Most Google Ads quotes lack exact campaign attribution. Confirm UTM template / final URL suffix is delivering campaign IDs.',
  },
  no_data: {
    label: 'No data',
    color: '#9ca3af',
    description: 'No Google Ads-attributed quotes in this window.',
  },
};

const REVIEW_GROUP_LABELS: Record<AttributionReviewItemGroup, string> = {
  paid_ads: 'Paid Ads',
  seo: 'SEO',
  attribution_quality: 'Attribution Quality',
  data_pipeline: 'Data Pipeline',
};

const SEVERITY_COLORS: Record<AttributionWarningSeverity, string> = {
  info: '#0ea5e9',
  warning: '#f59e0b',
  critical: '#ef4444',
};

function fmtUsdCents(cents: number): string {
  const usd = (cents ?? 0) / 100;
  return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtUsd(usd: number): string {
  return `$${(usd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return `${Number(v).toFixed(1)}%`;
}

function fmtNumber(v: number): string {
  return (v ?? 0).toLocaleString('en-US');
}

interface KpiTileProps {
  label: string;
  value: string;
  hint?: string;
}

function KpiTile({ label, value, hint }: KpiTileProps) {
  const tc = useThemeColors();
  return (
    <div
      style={{
        backgroundColor: tc.background.muted,
        border: `1px solid ${tc.border.subtle}`,
        borderRadius: radius.lg,
        padding: space['3'],
        minWidth: 140,
        flex: '1 1 140px',
      }}
    >
      <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted, marginBottom: space['0.5'] }}>
        {label}
      </div>
      <div style={{ fontFamily: fontFamily.display, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: tc.text.primary }}>
        {value}
      </div>
      {hint ? (
        <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.placeholder, marginTop: space['0.5'] }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function PrecisionBadge({ status }: { status: AttributionPrecisionStatus }) {
  const meta = PRECISION_LABELS[status];
  return (
    <span
      title={meta.description}
      style={{
        display: 'inline-block',
        padding: `${space['0.5']} ${space['2']}`,
        backgroundColor: `${meta.color}20`,
        color: meta.color,
        border: `1px solid ${meta.color}40`,
        borderRadius: radius.sm,
        fontFamily: fontFamily.body,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.medium,
        whiteSpace: 'nowrap',
      }}
      data-testid={`badge-precision-${status}`}
    >
      Attribution: {meta.label}
    </span>
  );
}

function WarningChip({ severity, message }: { severity: AttributionWarningSeverity; message: string }) {
  const color = SEVERITY_COLORS[severity];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: space['2'],
        padding: `${space['1.5']} ${space['3']}`,
        backgroundColor: `${color}15`,
        color,
        border: `1px solid ${color}40`,
        borderRadius: radius.md,
        fontFamily: fontFamily.body,
        fontSize: fontSize.sm,
      }}
    >
      <span style={{ fontWeight: fontWeight.semibold, textTransform: 'uppercase', fontSize: fontSize.xs }}>
        {severity}
      </span>
      <span>{message}</span>
    </div>
  );
}

function dayLabel(window_start: string, window_end: string): string {
  if (!window_start || !window_end) return 'last 7 days';
  return `${window_start} → ${window_end}`;
}

function topReviewItemsByGroup(items: AttributionReviewSnapshot['human_review_items']) {
  // Pick at most 5 deterministic items, balanced across groups in order.
  const order: AttributionReviewItemGroup[] = ['paid_ads', 'seo', 'attribution_quality', 'data_pipeline'];
  const result: typeof items = [];
  const seenGroups = new Set<string>();
  for (const g of order) {
    const it = items.find(x => x.group === g);
    if (it) {
      result.push(it);
      seenGroups.add(g);
    }
    if (result.length >= 5) break;
  }
  // Fill remaining slots with the next-highest items, regardless of group.
  for (const it of items) {
    if (result.length >= 5) break;
    if (!result.includes(it)) result.push(it);
  }
  return result;
}

export function MarketingAttributionReviewPanel() {
  const tc = useThemeColors();
  const [snapshot, setSnapshot] = useState<AttributionReviewSnapshot | null>(null);
  const [meta, setMeta] = useState<{ window_start: string; window_end: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAttributionReviewSnapshot()
      .then(res => {
        if (cancelled) return;
        setSnapshot(res.data ?? null);
        setMeta({ window_start: res.meta.window_start, window_end: res.meta.window_end });
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const headerRight = (
    <Link
      href={ATTRIBUTION_DETAIL_HREF}
      style={{
        fontFamily: fontFamily.body,
        fontSize: fontSize.sm,
        color: indigo[600],
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
      data-testid="link-attribution-intelligence"
    >
      Open Attribution Intelligence →
    </Link>
  );

  if (loading) {
    return (
      <DashboardSection title="Attribution Review" description="Weekly attribution operating snapshot from ODS attribution views.">
        <SkeletonCard height={240} />
      </DashboardSection>
    );
  }

  if (error) {
    return <DashboardCard title="Attribution Review error" error={error} />;
  }

  if (!snapshot) {
    return (
      <DashboardSection title="Attribution Review" description="Weekly attribution operating snapshot from ODS attribution views.">
        <EmptyStateCard message="No attribution snapshot available for this window." />
      </DashboardSection>
    );
  }

  const { source_summary, google_ads_summary, seo_summary, data_quality_warnings, human_review_items } = snapshot;
  const window_start = meta?.window_start ?? '';
  const window_end = meta?.window_end ?? '';
  const reviewItems = topReviewItemsByGroup(human_review_items);

  return (
    <DashboardSection
      title="Attribution Review"
      description="Weekly attribution operating snapshot from ODS attribution views."
    >
      <div
        data-testid="panel-attribution-review"
        style={{
          backgroundColor: tc.background.surface,
          border: `1px solid ${tc.border.default}`,
          borderRadius: radius.xl,
          padding: space['6'],
          display: 'flex',
          flexDirection: 'column',
          gap: space['5'],
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: space['3'] }}>
          <div>
            <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
              Window: <strong style={{ color: tc.text.primary }}>{dayLabel(window_start, window_end)}</strong>
            </div>
            <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.placeholder, marginTop: space['0.5'] }}>
              All metrics computed in ODS · Google Ads precision may be transitioning after UTM template rollout
            </div>
          </div>
          {headerRight}
        </div>

        {/* KPI row */}
        <div style={{ display: 'flex', gap: space['3'], flexWrap: 'wrap' }} data-testid="row-attribution-kpis">
          <KpiTile label="Submitted" value={fmtNumber(source_summary.total_submitted_quotes)} />
          <KpiTile label="Paid" value={fmtNumber(source_summary.total_paid_quotes)} />
          <KpiTile label="Conv %" value={fmtPct(source_summary.paid_conversion_rate)} />
          <KpiTile label="Paid Revenue" value={fmtUsdCents(source_summary.paid_revenue_cents)} />
          <KpiTile
            label="Top source by revenue"
            value={source_summary.top_source_group_by_revenue ?? '—'}
          />
          <div
            style={{
              backgroundColor: tc.background.muted,
              border: `1px solid ${tc.border.subtle}`,
              borderRadius: radius.lg,
              padding: space['3'],
              minWidth: 220,
              flex: '1 1 220px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted, marginBottom: space['1'] }}>
              Google Ads attribution
            </div>
            <PrecisionBadge status={google_ads_summary.attribution_precision_status} />
          </div>
        </div>

        {/* Mini-summaries */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: space['4'] }}>
          {/* Google Ads */}
          <div
            data-testid="card-google-ads-mini"
            style={{
              backgroundColor: tc.background.muted,
              border: `1px solid ${tc.border.subtle}`,
              borderRadius: radius.lg,
              padding: space['4'],
            }}
          >
            <div style={{ fontFamily: fontFamily.display, fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['3'] }}>
              Google Ads
            </div>
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: space['1.5'], fontFamily: fontFamily.body, fontSize: fontSize.sm, margin: 0 }}>
              <dt style={{ color: tc.text.muted }}>Spend</dt>
              <dd style={{ margin: 0, color: tc.text.primary }}>{fmtUsd(google_ads_summary.google_ads_spend_usd)}</dd>
              <dt style={{ color: tc.text.muted }}>Paid revenue</dt>
              <dd style={{ margin: 0, color: tc.text.primary }}>{fmtUsdCents(google_ads_summary.google_ads_paid_revenue_cents)}</dd>
              <dt style={{ color: tc.text.muted }}>Estimated ROAS</dt>
              <dd style={{ margin: 0, color: tc.text.primary }}>
                {google_ads_summary.google_ads_estimated_roas != null
                  ? `${google_ads_summary.google_ads_estimated_roas.toFixed(2)}x`
                  : '—'}
              </dd>
              <dt style={{ color: tc.text.muted }}>Cost / quote</dt>
              <dd style={{ margin: 0, color: tc.text.primary }}>
                {google_ads_summary.cost_per_quote_usd != null ? fmtUsd(google_ads_summary.cost_per_quote_usd) : '—'}
              </dd>
              <dt style={{ color: tc.text.muted }}>Cost / paid quote</dt>
              <dd style={{ margin: 0, color: tc.text.primary }}>
                {google_ads_summary.cost_per_paid_quote_usd != null ? fmtUsd(google_ads_summary.cost_per_paid_quote_usd) : '—'}
              </dd>
              <dt style={{ color: tc.text.muted }} title="Quotes attributed at exact campaign or ad-group ID precision.">
                % exact campaign / ad-group
              </dt>
              <dd style={{ margin: 0, color: tc.text.primary }}>{fmtPct(google_ads_summary.pct_exact_campaign_id_or_better)}</dd>
              <dt style={{ color: tc.text.muted }} title="Quotes attributed only at the source-group level — approximate channel-level attribution.">
                % source_group_only (approx)
              </dt>
              <dd style={{ margin: 0, color: tc.text.primary }}>{fmtPct(google_ads_summary.pct_source_group_only)}</dd>
            </dl>
          </div>

          {/* SEO */}
          <div
            data-testid="card-seo-mini"
            style={{
              backgroundColor: tc.background.muted,
              border: `1px solid ${tc.border.subtle}`,
              borderRadius: radius.lg,
              padding: space['4'],
            }}
          >
            <div style={{ fontFamily: fontFamily.display, fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['3'] }}>
              SEO
            </div>
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: space['1.5'], fontFamily: fontFamily.body, fontSize: fontSize.sm, margin: 0 }}>
              <dt style={{ color: tc.text.muted }}>Pages with quotes</dt>
              <dd style={{ margin: 0, color: tc.text.primary }}>{fmtNumber(seo_summary.seo_pages_with_quotes)}</dd>
              <dt style={{ color: tc.text.muted }}>SEO paid revenue</dt>
              <dd style={{ margin: 0, color: tc.text.primary }}>{fmtUsdCents(seo_summary.seo_paid_revenue_cents)}</dd>
              <dt style={{ color: tc.text.muted }}>Top origin page by revenue</dt>
              <dd style={{ margin: 0, color: tc.text.primary, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {seo_summary.top_origin_page_by_revenue?.page_title
                  ?? seo_summary.top_origin_page_by_revenue?.canonical_page_url
                  ?? '—'}
              </dd>
              <dt style={{ color: tc.text.muted }}>Pages: clicks, no quotes</dt>
              <dd style={{ margin: 0, color: tc.text.primary }}>{fmtNumber(seo_summary.pages_with_clicks_no_quotes.length)}</dd>
              <dt style={{ color: tc.text.muted }}>Pages: quotes, no paid</dt>
              <dd style={{ margin: 0, color: tc.text.primary }}>{fmtNumber(seo_summary.pages_with_quotes_no_paid.length)}</dd>
            </dl>
          </div>
        </div>

        {/* Warnings */}
        {data_quality_warnings.length > 0 && (
          <div data-testid="row-warnings">
            <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.primary, marginBottom: space['2'] }}>
              Data quality warnings
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: space['2'] }}>
              {data_quality_warnings.map(w => (
                <WarningChip key={w.id} severity={w.severity} message={w.message} />
              ))}
            </div>
          </div>
        )}

        {/* Review items */}
        {reviewItems.length > 0 && (
          <div data-testid="row-review-items">
            <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.primary, marginBottom: space['2'] }}>
              Items to Check
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: space['2'] }}>
              {reviewItems.map(item => {
                const color = SEVERITY_COLORS[item.severity];
                return (
                  <li
                    key={item.id}
                    style={{
                      borderLeft: `3px solid ${color}`,
                      paddingLeft: space['3'],
                      paddingTop: space['1'],
                      paddingBottom: space['1'],
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontFamily: fontFamily.body,
                          fontSize: fontSize.xs,
                          fontWeight: fontWeight.semibold,
                          color,
                          textTransform: 'uppercase',
                        }}
                      >
                        {REVIEW_GROUP_LABELS[item.group] ?? item.group}
                      </span>
                      <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary }}>
                        {item.title}
                      </span>
                    </div>
                    {item.detail ? (
                      <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted, marginTop: space['0.5'] }}>
                        {item.detail}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </DashboardSection>
  );
}
