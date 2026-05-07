'use client';

import React, { useEffect, useState } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface ContentScoreRow {
  page_url: string;
  content_type: string;
  score_before: number | null;
  score_after: number | null;
  score_delta: number | null;
  accepted: boolean;
  generated_at: string;
}

type FilterTab = 'all' | 'accepted' | 'rejected';

function ContentScoresContent() {
  const tc = useThemeColors();
  const [rows, setRows] = useState<ContentScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/proxy/seo/content-scores')
      .then(r => r.json())
      .then((data: { data?: ContentScoreRow[] }) => {
        if (!cancelled) { setRows(data.data ?? []); setLoading(false); }
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

  const total = rows.length;
  const accepted = rows.filter(r => r.accepted).length;
  const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
  const acceptedRows = rows.filter(r => r.accepted && r.score_delta != null);
  const avgDelta = acceptedRows.length > 0
    ? Math.round(acceptedRows.reduce((s, r) => s + (r.score_delta ?? 0), 0) / acceptedRows.length * 10) / 10
    : null;

  const filtered = rows.filter(r => {
    if (filter === 'accepted') return r.accepted;
    if (filter === 'rejected') return !r.accepted;
    return true;
  });

  const tabStyle = (t: FilterTab): React.CSSProperties => ({
    padding: `${space['1']} ${space['3']}`,
    borderRadius: radius.md,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: filter === t ? fontWeight.semibold : fontWeight.normal,
    color: filter === t ? tc.text.primary : tc.text.muted,
    backgroundColor: filter === t ? tc.background.muted : 'transparent',
    border: 'none',
    cursor: 'pointer',
  });

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['2'] }}>
          SEO Intelligence / Results
        </p>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }}>
          Content Score Impact
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted }}>
          Rank Math score changes from AI-generated product descriptions and FAQ schema.
        </p>
      </div>

      {loading && <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>Loading...</div>}
      {error && <div style={{ padding: space['4'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, color: tc.text.primary, fontFamily: fontFamily.body }}>Failed to load: {error}</div>}

      {!loading && !error && (
        <>
          {/* Summary bar */}
          <div style={{ display: 'flex', gap: space['4'], marginBottom: space['5'], flexWrap: 'wrap' }}>
            <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, padding: `${space['4']} ${space['5']}`, minWidth: '140px' }}>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['1'] }}>Total Generated</p>
              <p style={{ fontFamily: fontFamily.display, fontSize: fontSize['3xl'], fontWeight: fontWeight.semibold, color: tc.text.primary }}>{total}</p>
            </div>
            <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, padding: `${space['4']} ${space['5']}`, minWidth: '140px' }}>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['1'] }}>Acceptance Rate</p>
              <p style={{ fontFamily: fontFamily.display, fontSize: fontSize['3xl'], fontWeight: fontWeight.semibold, color: tc.text.primary }}>{acceptanceRate}%</p>
            </div>
            <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, padding: `${space['4']} ${space['5']}`, minWidth: '140px' }}>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['1'] }}>Avg Score Delta (accepted)</p>
              <p style={{ fontFamily: fontFamily.display, fontSize: fontSize['3xl'], fontWeight: fontWeight.semibold, color: avgDelta != null && avgDelta >= 0 ? '#065f46' : tc.text.primary }}>
                {avgDelta != null ? `+${avgDelta}` : '—'}
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: space['1'], marginBottom: space['4'] }}>
            {(['all', 'accepted', 'rejected'] as FilterTab[]).map(t => (
              <button key={t} style={tabStyle(t)} onClick={() => setFilter(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: space['8'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, textAlign: 'center' }}>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.secondary, marginBottom: space['2'] }}>No content score data yet</p>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>Product descriptions run daily at 02:30 UTC. FAQ schema runs Saturdays at 02:00 UTC.</p>
            </div>
          ) : (
            <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                    {['Page URL', 'Type', 'Score Before', 'Score After', 'Delta', 'Accepted', 'Date'].map(h => (
                      <th key={h} style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${tc.border.subtle}` }}>
                      <td style={{ ...tdStyle, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: fontWeight.medium, color: tc.text.primary }} title={row.page_url}>
                        {row.page_url.replace('https://neonsignsdepot.com', '')}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-block', padding: `2px 8px`, borderRadius: '9999px', fontSize: '12px', fontWeight: 500, backgroundColor: row.content_type === 'product_description' ? '#e0e7ff' : '#f3e8ff', color: row.content_type === 'product_description' ? '#3730a3' : '#6b21a8' }}>
                          {row.content_type?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={tdStyle}>{row.score_before ?? '—'}</td>
                      <td style={tdStyle}>{row.score_after ?? '—'}</td>
                      <td style={tdStyle}>
                        {row.score_delta != null ? (
                          <span style={{ color: row.score_delta >= 0 ? '#065f46' : '#991b1b', fontWeight: fontWeight.medium }}>
                            {row.score_delta >= 0 ? '+' : ''}{row.score_delta}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-block', padding: `2px 8px`, borderRadius: '9999px', fontSize: '12px', fontWeight: 500, backgroundColor: row.accepted ? '#d1fae5' : '#fee2e2', color: row.accepted ? '#065f46' : '#991b1b' }}>
                          {row.accepted ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td style={tdStyle}>{new Date(row.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
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

export default function ContentScoresPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <ContentScoresContent />
    </DashboardGuard>
  );
}
