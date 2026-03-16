'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { violet, indigo, magenta } from '../../../../design/tokens/colors';
import {
  getCompetitiveKeywordGap, getCompetitiveBacklinks, getCompetitiveTopPages, getCompetitorsList,
} from '../../../../lib/seoApi';
import type { AhrefsKeywordGap, AhrefsBacklinkGap, AhrefsTopPage } from '../../../../lib/seoApi';

type Tab = 'keyword-gap' | 'backlink-gap' | 'top-pages';

function KDIndicator({ kd }: { kd: number }) {
  const tc = useThemeColors();
  let color: string = violet[500];
  let label = 'Easy';
  if (kd >= 70) { color = magenta[500]; label = 'Hard'; }
  else if (kd >= 40) { color = indigo[500]; label = 'Medium'; }
  return (
    <span style={{
      display: 'inline-block', padding: `${space['0.5']} ${space['2']}`,
      borderRadius: radius.full, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
      backgroundColor: `${color}15`, color,
    }}>
      {kd} {label}
    </span>
  );
}

function CompetitiveIntelContent() {
  const tc = useThemeColors();
  const [tab, setTab] = useState<Tab>('keyword-gap');
  const [competitor, setCompetitor] = useState('');
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [kwData, setKwData] = useState<AhrefsKeywordGap[]>([]);
  const [blData, setBlData] = useState<AhrefsBacklinkGap[]>([]);
  const [tpData, setTpData] = useState<AhrefsTopPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCompetitorsList().then(setCompetitors).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        const [kw, bl, tp] = await Promise.all([
          getCompetitiveKeywordGap(competitor || undefined),
          getCompetitiveBacklinks(competitor || undefined),
          getCompetitiveTopPages(competitor || undefined),
        ]);
        if (!cancelled) { setKwData(kw); setBlData(bl); setTpData(tp); setLoading(false); }
      } catch (err: unknown) {
        if (!cancelled) { setError(err instanceof Error ? err.message : 'Unknown error'); setLoading(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [competitor]);

  const cellStyle = { padding: `${space['3']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary };
  const headerStyle = { padding: `${space['3']} ${space['4']}`, textAlign: 'left' as const, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.muted };

  const tabButtonStyle = (active: boolean) => ({
    padding: `${space['2']} ${space['4']}`,
    fontFamily: fontFamily.body, fontSize: fontSize.sm,
    backgroundColor: active ? tc.text.primary : tc.background.surface,
    color: active ? tc.background.surface : tc.text.muted,
    border: `1px solid ${tc.border.default}`, borderRadius: radius.md,
    cursor: 'pointer' as const, textTransform: 'capitalize' as const,
  });

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }} data-testid="text-competitive-intel-title">
          Competitive Intelligence
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted, lineHeight: lineHeight.normal }}>
          Ahrefs data: keyword gaps, backlink gaps, and top competitor pages.
        </p>
      </div>

      <div style={{ display: 'flex', gap: space['3'], alignItems: 'center', marginBottom: space['4'], flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: space['2'] }}>
          {(['keyword-gap', 'backlink-gap', 'top-pages'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={tabButtonStyle(tab === t)} data-testid={`button-tab-${t}`}>
              {t === 'keyword-gap' ? 'Keyword Gap' : t === 'backlink-gap' ? 'Backlink Gap' : 'Top Pages'}
            </button>
          ))}
        </div>
        <select
          value={competitor}
          onChange={(e) => setCompetitor(e.target.value)}
          style={{
            padding: `${space['2']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm,
            color: tc.text.primary, backgroundColor: tc.background.surface,
            border: `1px solid ${tc.border.default}`, borderRadius: radius.md, outline: 'none',
          }}
          data-testid="select-competitor"
        >
          <option value="">All Competitors</option>
          {competitors.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading && <div style={{ padding: space['8'], color: tc.text.muted, fontFamily: fontFamily.body }}>Loading competitive data...</div>}
      {error && <div style={{ padding: space['8'], color: tc.semantic.danger.dark, fontFamily: fontFamily.body }}>Error: {error}</div>}

      {!loading && !error && tab === 'keyword-gap' && (
        <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                {['Keyword', 'Competitor', 'Volume', 'KD', 'CPC', 'Best Position', 'Traffic'].map(h => (
                  <th key={h} style={headerStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kwData.slice(0, 100).map((r, i) => (
                <tr key={`${r.keyword}-${r.competitor_domain}-${i}`} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-kw-gap-${i}`}>
                  <td style={{ ...cellStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{r.keyword}</td>
                  <td style={cellStyle}>{r.competitor_domain}</td>
                  <td style={cellStyle}>{Number(r.volume || 0).toLocaleString()}</td>
                  <td style={cellStyle}><KDIndicator kd={Number(r.keyword_difficulty || 0)} /></td>
                  <td style={cellStyle}>${Number(r.cpc || 0).toFixed(2)}</td>
                  <td style={cellStyle}>{r.best_position || '--'}</td>
                  <td style={cellStyle}>{Number(r.sum_traffic || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {kwData.length === 0 && <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>No keyword gap data available.</div>}
        </div>
      )}

      {!loading && !error && tab === 'backlink-gap' && (
        <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                {['Referring Domain', 'Competitor', 'DR', 'Traffic', 'Dofollow Links', 'Links to Target'].map(h => (
                  <th key={h} style={headerStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {blData.map((r, i) => (
                <tr key={`${r.domain}-${r.competitor_domain}-${i}`} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-bl-gap-${i}`}>
                  <td style={{ ...cellStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{r.domain}</td>
                  <td style={cellStyle}>{r.competitor_domain}</td>
                  <td style={cellStyle}>
                    <span style={{
                      display: 'inline-block', padding: `${space['0.5']} ${space['2']}`,
                      borderRadius: radius.full, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
                      backgroundColor: r.domain_rating >= 60 ? `${violet[500]}15` : 'transparent',
                      color: r.domain_rating >= 60 ? violet[600] : tc.text.secondary,
                    }}>
                      {r.domain_rating}
                    </span>
                  </td>
                  <td style={cellStyle}>{Number(r.traffic_domain || 0).toLocaleString()}</td>
                  <td style={cellStyle}>{Number(r.dofollow_links || 0).toLocaleString()}</td>
                  <td style={cellStyle}>{r.links_to_target}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {blData.length === 0 && <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>No backlink gap data available.</div>}
        </div>
      )}

      {!loading && !error && tab === 'top-pages' && (
        <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                {['URL', 'Competitor', 'Traffic', 'Keywords', 'Top Keyword', 'Position', 'Ref. Domains'].map(h => (
                  <th key={h} style={headerStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tpData.slice(0, 100).map((r, i) => (
                <tr key={`${r.url}-${i}`} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-top-page-${i}`}>
                  <td style={{ ...cellStyle, fontWeight: fontWeight.medium, color: tc.text.primary, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.url}>{r.url}</td>
                  <td style={cellStyle}>{r.competitor_domain}</td>
                  <td style={cellStyle}>{Number(r.sum_traffic || 0).toLocaleString()}</td>
                  <td style={cellStyle}>{Number(r.keywords || 0).toLocaleString()}</td>
                  <td style={{ ...cellStyle, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.top_keyword}>{r.top_keyword}</td>
                  <td style={cellStyle}>{r.top_keyword_best_position || '--'}</td>
                  <td style={cellStyle}>{Number(r.referring_domains || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tpData.length === 0 && <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>No top pages data available.</div>}
        </div>
      )}
    </div>
  );
}

export default function CompetitiveIntelPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <CompetitiveIntelContent />
    </DashboardGuard>
  );
}
