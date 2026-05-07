'use client';

import React, { useEffect, useState } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface AttributionRow {
  page_url: string;
  keyword: string | null;
  pre_period_revenue: number | null;
  post_period_revenue: number | null;
  revenue_delta: number | null;
  confidence: string;
  attribution_date: string;
  recommendation_id: string | null;
}

interface AttributionData {
  rows: AttributionRow[];
  earliest_execution: string | null;
}

function confidenceBadge(confidence: string) {
  const styles: Record<string, { bg: string; text: string }> = {
    high: { bg: '#d1fae5', text: '#065f46' },
    medium: { bg: '#fffbeb', text: '#92400e' },
    low: { bg: '#f5f5f5', text: '#737373' },
  };
  const s = styles[confidence] || { bg: '#f5f5f5', text: '#737373' };
  return (
    <span style={{ display: 'inline-block', padding: `2px 8px`, borderRadius: '9999px', fontSize: '12px', fontWeight: 500, backgroundColor: s.bg, color: s.text }}>
      {confidence}
    </span>
  );
}

function fmt(value: number | null, prefix = '$'): string {
  if (value == null) return '—';
  return `${prefix}${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function AttributionContent() {
  const tc = useThemeColors();
  const [data, setData] = useState<AttributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/proxy/seo/attribution')
      .then(r => r.json())
      .then((res: { data?: AttributionData }) => {
        if (!cancelled) { setData(res.data ?? null); setLoading(false); }
      })
      .catch((err: Error) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const tdStyle: React.CSSProperties = {
    padding: `${space['3']} ${space['4']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.secondary,
  };

  const rows = data?.rows ?? [];
  const highConfidenceRows = rows.filter(r => r.confidence === 'high' && r.revenue_delta != null);
  const totalHighRevenue = highConfidenceRows.reduce((sum, r) => sum + (r.revenue_delta ?? 0), 0);
  const highCount = rows.filter(r => r.confidence === 'high').length;
  const medCount = rows.filter(r => r.confidence === 'medium').length;
  const lowCount = rows.filter(r => r.confidence === 'low').length;

  const emptyDate = data?.earliest_execution
    ? new Date(new Date(data.earliest_execution).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['2'] }}>
          SEO Intelligence / Results
        </p>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }}>
          Revenue Attribution
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted }}>
          Revenue impact attributed to executed SEO changes — 30-day pre/post comparison.
        </p>
      </div>

      {loading && <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>Loading...</div>}
      {error && <div style={{ padding: space['4'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, color: tc.text.primary, fontFamily: fontFamily.body }}>Failed to load: {error}</div>}

      {!loading && !error && (
        <>
          {/* Summary bar */}
          <div style={{ display: 'flex', gap: space['4'], marginBottom: space['6'], flexWrap: 'wrap' }}>
            <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, padding: `${space['4']} ${space['5']}`, minWidth: '180px' }}>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['1'] }}>High-Confidence Revenue Delta</p>
              <p style={{ fontFamily: fontFamily.display, fontSize: fontSize['3xl'], fontWeight: fontWeight.semibold, color: totalHighRevenue >= 0 ? '#065f46' : '#991b1b' }}>
                {totalHighRevenue >= 0 ? '+' : ''}{fmt(totalHighRevenue)}
              </p>
            </div>
            <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, padding: `${space['4']} ${space['5']}`, minWidth: '140px' }}>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['1'] }}>Attributions</p>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.secondary, marginTop: space['1'] }}>
                <span style={{ color: '#065f46', fontWeight: fontWeight.medium }}>{highCount} high</span>{' / '}
                <span style={{ color: '#92400e', fontWeight: fontWeight.medium }}>{medCount} medium</span>{' / '}
                <span style={{ color: tc.text.muted }}>{lowCount} low</span>
              </p>
            </div>
          </div>

          {rows.length === 0 ? (
            <div style={{ padding: space['8'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, textAlign: 'center' }}>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.secondary, marginBottom: space['2'] }}>No attribution data yet</p>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
                Attribution data populates 30 days after first execution.
                {emptyDate && ` Check back after ${emptyDate}.`}
              </p>
            </div>
          ) : (
            <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                    {['Page URL', 'Keyword', 'Pre-30d Revenue', 'Post-30d Revenue', 'Delta', 'Confidence', 'Attribution Date'].map(h => (
                      <th key={h} style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${tc.border.subtle}` }}>
                      <td style={{ ...tdStyle, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: fontWeight.medium, color: tc.text.primary }} title={row.page_url}>
                        {row.page_url.replace('https://neonsignsdepot.com', '')}
                      </td>
                      <td style={tdStyle}>{row.keyword ?? '—'}</td>
                      <td style={tdStyle}>{fmt(row.pre_period_revenue)}</td>
                      <td style={tdStyle}>{fmt(row.post_period_revenue)}</td>
                      <td style={tdStyle}>
                        {row.revenue_delta != null ? (
                          <span style={{ color: row.revenue_delta >= 0 ? '#065f46' : '#991b1b', fontWeight: fontWeight.medium }}>
                            {row.revenue_delta >= 0 ? '+' : ''}{fmt(row.revenue_delta)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={tdStyle}>{confidenceBadge(row.confidence)}</td>
                      <td style={tdStyle}>{new Date(row.attribution_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AttributionPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <AttributionContent />
    </DashboardGuard>
  );
}
