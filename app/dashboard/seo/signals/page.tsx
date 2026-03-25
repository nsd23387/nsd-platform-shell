'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { getSignals, updateSignalStatus, generateBriefFromGap } from '../../../../lib/seoApi';
import type { DecaySignalRow, CannibalizationRow, TopicalGapRow } from '../../../../lib/seoApi';

type Tab = 'decay' | 'cannibalization' | 'topical-gaps';

function Badge({ label, colors }: { label: string; colors: { bg: string; text: string } }) {
  return (
    <span style={{ display: 'inline-block', padding: `${space['0.5']} ${space['2']}`, borderRadius: radius.full, fontSize: fontSize.sm, fontWeight: fontWeight.medium, backgroundColor: colors.bg, color: colors.text, fontFamily: fontFamily.body, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

const CONFIDENCE_STYLES: Record<string, { bg: string; text: string }> = {
  high: { bg: '#d1fae5', text: '#065f46' },
  medium: { bg: '#fef3c7', text: '#92400e' },
  low: { bg: '#fee2e2', text: '#991b1b' },
};

const GAP_TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  missing_cluster: { bg: '#fee2e2', text: '#991b1b' },
  thin_coverage: { bg: '#fef3c7', text: '#92400e' },
  no_internal_links: { bg: '#e0e7ff', text: '#3730a3' },
};

function SignalsContent() {
  const tc = useThemeColors();
  const [activeTab, setActiveTab] = useState<Tab>('decay');
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getSignals(activeTab)
      .then(rows => { setData(rows); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  const handleDismiss = async (signalType: string, id: string) => {
    try { await updateSignalStatus(signalType, id, 'dismissed'); load(); } catch (err) { console.error('Dismiss failed:', err); }
  };

  const handleCreateBrief = async (topic: string) => {
    try { await generateBriefFromGap(topic); } catch (err) { console.error('Create brief failed:', err); }
  };

  const tdStyle: React.CSSProperties = { padding: `${space['3']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary };

  const tabStyle = (tab: Tab) => ({
    padding: `${space['2']} ${space['4']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: activeTab === tab ? fontWeight.semibold : fontWeight.normal,
    color: activeTab === tab ? tc.text.primary : tc.text.muted,
    backgroundColor: activeTab === tab ? tc.background.surface : 'transparent',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
    cursor: 'pointer' as const,
  });

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['2'] }}>SEO Intelligence / Results</p>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }} data-testid="text-signals-title">SEO Signals</h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted }}>Decay detection, keyword cannibalization, and topical authority gaps.</p>
      </div>

      <div style={{ display: 'flex', gap: space['1'], marginBottom: space['4'], borderBottom: `1px solid ${tc.border.default}` }}>
        <button style={tabStyle('decay')} onClick={() => setActiveTab('decay')}>Decay</button>
        <button style={tabStyle('cannibalization')} onClick={() => setActiveTab('cannibalization')}>Cannibalization</button>
        <button style={tabStyle('topical-gaps')} onClick={() => setActiveTab('topical-gaps')}>Topical Gaps</button>
      </div>

      {loading && <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>Loading signals...</div>}
      {error && <div style={{ padding: space['4'], color: '#991b1b', fontFamily: fontFamily.body }}>{error}</div>}

      {!loading && !error && data.length === 0 && (
        <div style={{ padding: space['8'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, textAlign: 'center' }}>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.secondary }}>No {activeTab.replace('-', ' ')} signals detected yet</p>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginTop: space['1'] }}>Detection runs nightly. Check back after the next pipeline cycle.</p>
        </div>
      )}

      {!loading && !error && data.length > 0 && activeTab === 'decay' && (
        <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
              {['Page', 'Keyword', 'Pos 30d Ago', 'Pos Now', 'Delta', 'Traffic Δ%', 'Decay Score', 'Actions'].map(h => <th key={h} style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(data as DecaySignalRow[]).map(row => (
                <tr key={row.id} style={{ borderBottom: `1px solid ${tc.border.subtle}` }}>
                  <td style={{ ...tdStyle, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.page_path?.replace('https://neonsignsdepot.com', '') || '—'}</td>
                  <td style={tdStyle}>{row.keyword}</td>
                  <td style={tdStyle}>{row.position_30d_ago != null ? Number(row.position_30d_ago).toFixed(1) : '—'}</td>
                  <td style={tdStyle}>{row.position_now != null ? Number(row.position_now).toFixed(1) : '—'}</td>
                  <td style={tdStyle}><span style={{ color: (row.position_delta ?? 0) > 0 ? '#991b1b' : '#065f46', fontWeight: fontWeight.medium }}>{row.position_delta != null ? `+${Number(row.position_delta).toFixed(1)}` : '—'}</span></td>
                  <td style={tdStyle}><span style={{ color: (row.traffic_delta_pct ?? 0) < 0 ? '#991b1b' : '#065f46' }}>{row.traffic_delta_pct != null ? `${Number(row.traffic_delta_pct).toFixed(1)}%` : '—'}</span></td>
                  <td style={tdStyle}>{row.decay_score != null ? Number(row.decay_score).toFixed(2) : '—'}</td>
                  <td style={tdStyle}>{row.status === 'new' && <button onClick={() => handleDismiss('decay', row.id)} style={{ padding: `${space['0.5']} ${space['2']}`, fontFamily: fontFamily.body, fontSize: '11px', color: '#525252', backgroundColor: '#f5f5f5', border: 'none', borderRadius: radius.md, cursor: 'pointer' }}>Dismiss</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && data.length > 0 && activeTab === 'cannibalization' && (
        <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
              {['Keyword', 'Page A', 'Page B', 'Overlap', 'Canonical', 'Confidence', 'Actions'].map(h => <th key={h} style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(data as CannibalizationRow[]).map(row => (
                <tr key={row.id} style={{ borderBottom: `1px solid ${tc.border.subtle}` }}>
                  <td style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{row.keyword}</td>
                  <td style={{ ...tdStyle, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.page_path_a?.replace('https://neonsignsdepot.com', '')}</td>
                  <td style={{ ...tdStyle, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.page_path_b?.replace('https://neonsignsdepot.com', '')}</td>
                  <td style={tdStyle}>{row.overlap_score != null ? Number(row.overlap_score).toFixed(2) : '—'}</td>
                  <td style={{ ...tdStyle, fontWeight: fontWeight.medium, color: '#3730a3' }}>{row.suggested_canonical?.replace('https://neonsignsdepot.com', '') || '—'}</td>
                  <td style={tdStyle}>{row.canonical_confidence && <Badge label={row.canonical_confidence} colors={CONFIDENCE_STYLES[row.canonical_confidence] || CONFIDENCE_STYLES.low} />}</td>
                  <td style={tdStyle}>{row.status === 'new' && <button onClick={() => handleDismiss('cannibalization', row.id)} style={{ padding: `${space['0.5']} ${space['2']}`, fontFamily: fontFamily.body, fontSize: '11px', color: '#525252', backgroundColor: '#f5f5f5', border: 'none', borderRadius: radius.md, cursor: 'pointer' }}>Dismiss</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && data.length > 0 && activeTab === 'topical-gaps' && (
        <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
              {['Topic', 'Subtopic', 'Gap Type', 'Score', 'Actions'].map(h => <th key={h} style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(data as TopicalGapRow[]).map(row => (
                <tr key={row.id} style={{ borderBottom: `1px solid ${tc.border.subtle}` }}>
                  <td style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{row.topic}</td>
                  <td style={tdStyle}>{row.subtopic || '—'}</td>
                  <td style={tdStyle}><Badge label={row.gap_type.replace(/_/g, ' ')} colors={GAP_TYPE_STYLES[row.gap_type] || GAP_TYPE_STYLES.thin_coverage} /></td>
                  <td style={tdStyle}>{row.opportunity_score != null ? Number(row.opportunity_score).toFixed(2) : '—'}</td>
                  <td style={tdStyle}>
                    {row.status === 'new' && (
                      <div style={{ display: 'flex', gap: space['1'] }}>
                        <button onClick={() => handleCreateBrief(row.topic)} style={{ padding: `${space['0.5']} ${space['2']}`, fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.medium, color: '#065f46', backgroundColor: '#d1fae5', border: 'none', borderRadius: radius.md, cursor: 'pointer' }}>Create Brief</button>
                        <button onClick={() => handleDismiss('topical-gaps', row.id)} style={{ padding: `${space['0.5']} ${space['2']}`, fontFamily: fontFamily.body, fontSize: '11px', color: '#525252', backgroundColor: '#f5f5f5', border: 'none', borderRadius: radius.md, cursor: 'pointer' }}>Dismiss</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SignalsPage() {
  return <DashboardGuard dashboard="seo" fallback={<AccessDenied />}><SignalsContent /></DashboardGuard>;
}
