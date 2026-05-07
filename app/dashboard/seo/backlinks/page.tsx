'use client';

import React, { useEffect, useState } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { markBacklinkContacted } from '../../../../lib/seoApi';

interface BacklinkSummary {
  target_domain: string;
  domain_rank: number | null;
  referring_domains: number | null;
  backlinks: number | null;
  fetched_at: string;
}

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

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function statusBadge(status: string) {
  const styles: Record<string, { bg: string; text: string }> = {
    new: { bg: '#fffbeb', text: '#92400e' },
    contacted: { bg: '#dbeafe', text: '#1e40af' },
    won: { bg: '#d1fae5', text: '#065f46' },
    ignored: { bg: '#f5f5f5', text: '#737373' },
  };
  const s = styles[status] || { bg: '#f5f5f5', text: '#737373' };
  return (
    <span style={{
      display: 'inline-block',
      padding: `2px 8px`,
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: 500,
      backgroundColor: s.bg,
      color: s.text,
    }}>
      {status}
    </span>
  );
}

function BacklinksContent() {
  const tc = useThemeColors();
  const [summary, setSummary] = useState<BacklinkSummary[]>([]);
  const [opportunities, setOpportunities] = useState<BacklinkOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/proxy/seo/backlinks')
      .then(r => r.json())
      .then((data: { data?: { summary: BacklinkSummary[]; opportunities: BacklinkOpportunity[] } }) => {
        if (!cancelled) {
          setSummary(data.data?.summary ?? []);
          setOpportunities(data.data?.opportunities ?? []);
          setLoading(false);
        }
      })
      .catch((err: Error) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const markContacted = async (domain: string) => {
    setMarking(domain);
    try {
      await markBacklinkContacted(domain);
      setOpportunities(prev => prev.map(o => o.referring_domain === domain ? { ...o, status: 'contacted' } : o));
    } finally {
      setMarking(null);
    }
  };

  const latest = summary[0];
  const tdStyle: React.CSSProperties = {
    padding: `${space['3']} ${space['4']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.secondary,
  };

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['2'] }}>
          SEO Intelligence / Analysis
        </p>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }}>
          Backlink Intelligence
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted }}>
          Domain authority trends and link-building opportunities from competitor gap analysis.
        </p>
      </div>

      {loading && <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>Loading...</div>}
      {error && <div style={{ padding: space['4'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, color: tc.text.primary, fontFamily: fontFamily.body }}>Failed to load: {error}</div>}

      {!loading && !error && (
        <>
          {/* Header summary bar */}
          <div style={{ display: 'flex', gap: space['4'], marginBottom: space['6'], flexWrap: 'wrap' }}>
            <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, padding: `${space['4']} ${space['5']}`, minWidth: '160px' }}>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['1'] }}>NSD Domain Rank</p>
              <p style={{ fontFamily: fontFamily.display, fontSize: fontSize['3xl'], fontWeight: fontWeight.semibold, color: tc.text.primary }}>
                {latest?.domain_rank != null ? latest.domain_rank : '—'}
              </p>
              {latest && <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.placeholder }}>{timeAgo(latest.fetched_at)}</p>}
            </div>
            <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, padding: `${space['4']} ${space['5']}`, minWidth: '160px' }}>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['1'] }}>Referring Domains</p>
              <p style={{ fontFamily: fontFamily.display, fontSize: fontSize['3xl'], fontWeight: fontWeight.semibold, color: tc.text.primary }}>
                {latest?.referring_domains != null ? latest.referring_domains.toLocaleString() : '—'}
              </p>
            </div>
            <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, padding: `${space['4']} ${space['5']}`, minWidth: '160px' }}>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['1'] }}>Open Opportunities</p>
              <p style={{ fontFamily: fontFamily.display, fontSize: fontSize['3xl'], fontWeight: fontWeight.semibold, color: tc.text.primary }}>
                {opportunities.filter(o => o.status === 'new').length}
              </p>
            </div>
          </div>

          {/* Opportunities table */}
          {opportunities.length === 0 ? (
            <div style={{ padding: space['8'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, textAlign: 'center' }}>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.secondary, marginBottom: space['2'] }}>No opportunities yet</p>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>Backlink gap analysis runs Mondays at 07:00 UTC.</p>
            </div>
          ) : (
            <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                    {['Referring Domain', 'Domain Rank', 'Backlinks', 'Links to Competitor', 'Status', 'Discovered', 'Action'].map(h => (
                      <th key={h} style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((opp, i) => (
                    <tr key={`${opp.referring_domain}-${i}`} style={{ borderBottom: `1px solid ${tc.border.subtle}` }}>
                      <td style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{opp.referring_domain}</td>
                      <td style={tdStyle}>{opp.domain_rank ?? '—'}</td>
                      <td style={tdStyle}>{opp.backlinks_count != null ? opp.backlinks_count.toLocaleString() : '—'}</td>
                      <td style={tdStyle}>{opp.gap_competitor ?? '—'}</td>
                      <td style={tdStyle}>{statusBadge(opp.status)}</td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{timeAgo(opp.discovered_at)}</td>
                      <td style={tdStyle}>
                        {opp.status === 'new' && (
                          <button
                            disabled={marking === opp.referring_domain}
                            onClick={() => markContacted(opp.referring_domain)}
                            style={{
                              padding: `${space['1']} ${space['3']}`,
                              borderRadius: radius.md,
                              border: `1px solid ${tc.border.default}`,
                              backgroundColor: tc.background.muted,
                              fontFamily: fontFamily.body,
                              fontSize: fontSize.sm,
                              color: tc.text.secondary,
                              cursor: 'pointer',
                              opacity: marking === opp.referring_domain ? 0.5 : 1,
                            }}
                          >
                            Mark contacted
                          </button>
                        )}
                      </td>
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

export default function BacklinksPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <BacklinksContent />
    </DashboardGuard>
  );
}
