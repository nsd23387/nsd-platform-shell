'use client';

import React, { useEffect, useState } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import type { CompetitorGapSummary } from '../../../../lib/seoApi';

interface BacklinkOpportunity {
  referring_domain: string;
  domain_rank: number | null;
  backlinks_count: number | null;
  spam_score: number | null;
  gap_competitor: string | null;
  opportunity_type: string | null;
  status: string;
  discovered_at: string;
}

type ActiveTab = 'keyword-gap' | 'backlink-gap';

function CompetitiveContent() {
  const tc = useThemeColors();
  const [activeTab, setActiveTab] = useState<ActiveTab>('keyword-gap');
  const [keywordGaps, setKeywordGaps] = useState<CompetitorGapSummary[]>([]);
  const [backlinkGaps, setBacklinkGaps] = useState<BacklinkOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/proxy/seo/competitor-gaps').then(r => r.json() as Promise<{ data?: CompetitorGapSummary[] }>),
      fetch('/api/proxy/seo/backlinks').then(r => r.json() as Promise<{ data?: { opportunities: BacklinkOpportunity[] } }>),
    ])
      .then(([gapData, backlinkData]) => {
        if (!cancelled) {
          setKeywordGaps(gapData.data ?? []);
          setBacklinkGaps((backlinkData.data?.opportunities ?? []).filter(o => o.opportunity_type === 'gap'));
          setLoading(false);
        }
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

  const tabStyle = (t: ActiveTab): React.CSSProperties => ({
    padding: `${space['2']} ${space['4']}`,
    borderBottom: activeTab === t ? `2px solid #8b5cf6` : '2px solid transparent',
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: activeTab === t ? fontWeight.semibold : fontWeight.normal,
    color: activeTab === t ? tc.text.primary : tc.text.muted,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottomWidth: '2px',
    borderBottomStyle: 'solid',
    borderBottomColor: activeTab === t ? '#8b5cf6' : 'transparent',
    cursor: 'pointer',
  });

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['2'] }}>
          SEO Intelligence / Analysis
        </p>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }}>
          Competitive Intelligence
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted }}>
          Keyword and backlink gaps across the Phase 8 competitor set.
        </p>
      </div>

      {/* DataForSEO notice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: radius.md, padding: `${space['2']} ${space['3']}`, marginBottom: space['5'] }}>
        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: '#1e40af', fontWeight: fontWeight.medium }}>
          Powered by DataForSEO — updated nightly.
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${tc.border.default}`, marginBottom: space['5'] }}>
        <button style={tabStyle('keyword-gap')} onClick={() => setActiveTab('keyword-gap')}>Keyword Gap</button>
        <button style={tabStyle('backlink-gap')} onClick={() => setActiveTab('backlink-gap')}>Backlink Gap</button>
      </div>

      {loading && <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>Loading...</div>}
      {error && <div style={{ padding: space['4'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, color: tc.text.primary, fontFamily: fontFamily.body }}>Failed to load: {error}</div>}

      {!loading && !error && activeTab === 'keyword-gap' && (
        keywordGaps.length === 0 ? (
          <div style={{ padding: space['8'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, textAlign: 'center' }}>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.secondary, marginBottom: space['2'] }}>No keyword gaps yet</p>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>Competitor gap analysis runs nightly via DataForSEO.</p>
          </div>
        ) : (
          <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                  {['Keyword', 'Competitor', 'Their Position', 'Our Position', 'Opp. Score', 'Difficulty', 'Volume', 'Status'].map(h => (
                    <th key={h} style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keywordGaps.map((gap, i) => {
                  const g = gap as CompetitorGapSummary & { competitor_ranking_position?: number | null; our_ranking_position?: number | null; keyword_difficulty?: number | null; search_volume?: number | null };
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${tc.border.subtle}` }}>
                      <td style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{gap.keyword}</td>
                      <td style={tdStyle}>{gap.competitor_url?.replace('https://', '').replace('http://', '') ?? '—'}</td>
                      <td style={tdStyle}>{g.competitor_ranking_position ?? '—'}</td>
                      <td style={tdStyle}>{g.our_ranking_position != null ? g.our_ranking_position : <span style={{ color: tc.text.muted }}>Not ranking</span>}</td>
                      <td style={tdStyle}>{gap.opportunity_score != null ? Number(gap.opportunity_score).toFixed(1) : '—'}</td>
                      <td style={tdStyle}>{g.keyword_difficulty ?? '—'}</td>
                      <td style={tdStyle}>{g.search_volume != null ? Number(g.search_volume).toLocaleString() : '—'}</td>
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-block', padding: `2px 8px`, borderRadius: '9999px', fontSize: '12px', fontWeight: 500, backgroundColor: '#f5f5f5', color: '#737373' }}>
                          {gap.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {!loading && !error && activeTab === 'backlink-gap' && (
        backlinkGaps.length === 0 ? (
          <div style={{ padding: space['8'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, textAlign: 'center' }}>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.secondary, marginBottom: space['2'] }}>No backlink gaps yet</p>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>Backlink gap analysis runs Mondays at 07:00 UTC.</p>
          </div>
        ) : (
          <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                  {['Referring Domain', 'Domain Rank', 'Backlinks', 'Links to Competitor', 'Status', 'Discovered'].map(h => (
                    <th key={h} style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {backlinkGaps.map((opp, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${tc.border.subtle}` }}>
                    <td style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{opp.referring_domain}</td>
                    <td style={tdStyle}>{opp.domain_rank ?? '—'}</td>
                    <td style={tdStyle}>{opp.backlinks_count != null ? opp.backlinks_count.toLocaleString() : '—'}</td>
                    <td style={tdStyle}>{opp.gap_competitor ?? '—'}</td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-block', padding: `2px 8px`, borderRadius: '9999px', fontSize: '12px', fontWeight: 500, backgroundColor: '#f5f5f5', color: '#737373' }}>
                        {opp.status}
                      </span>
                    </td>
                    <td style={tdStyle}>{new Date(opp.discovered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

export default function CompetitivePage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <CompetitiveContent />
    </DashboardGuard>
  );
}
