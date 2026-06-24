'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { getSeoResults } from '../../../../lib/seoApi';
import type { SeoResultRow } from '../../../../lib/seoApi';
import { PALETTE, monoStack, type Tc } from '../_shared';
import { LifecycleBadge } from '../components/LifecycleBadge';

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.replace(/^https?:\/\/[^/]+/, '') || url;
  }
}

function fmtDelta(n: number | undefined, unit = ''): string {
  if (n == null) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}${unit}`;
}

function ResultsSection({
  title,
  verdict,
  rows,
  tc,
  extra,
}: {
  title: string;
  verdict: 'winner' | 'retired' | 'inconclusive';
  rows: SeoResultRow[];
  tc: Tc;
  extra?: (row: SeoResultRow) => React.ReactNode;
}) {
  const thStyle: React.CSSProperties = {
    padding: '8px 12px', textAlign: 'left', fontFamily: fontFamily.body,
    fontSize: '11px', fontWeight: fontWeight.semibold, color: tc.text.muted,
    textTransform: 'uppercase' as const, letterSpacing: '0.05em',
  };
  const tdStyle: React.CSSProperties = {
    padding: '10px 12px', fontFamily: fontFamily.body, fontSize: '13px',
    color: tc.text.secondary, verticalAlign: 'middle',
  };

  return (
    <div style={{ marginBottom: space['8'] }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], marginBottom: space['3'] }}>
        <h2
          style={{
            fontFamily: fontFamily.body, fontSize: '14px', fontWeight: fontWeight.semibold,
            color: tc.text.primary, margin: 0,
          }}
        >
          {title}
        </h2>
        <span
          style={{
            display: 'inline-block', padding: '1px 8px', borderRadius: 999,
            fontSize: '11px', fontWeight: fontWeight.medium,
            background: tc.background.muted, color: tc.text.muted,
            fontFamily: fontFamily.body,
          }}
        >
          {rows.length}
        </span>
      </div>

      {rows.length === 0 ? (
        <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, fontStyle: 'italic' }}>
          None yet.
        </div>
      ) : (
        <div style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: tc.background.muted }}>
                <th style={thStyle}>Page</th>
                <th style={thStyle}>Ver</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Rank Δ</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Click Δ%</th>
                <th style={thStyle}>Verdict date</th>
                {extra && <th style={thStyle} />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const rankColor = row.rank_delta == null ? tc.text.muted
                  : row.rank_delta < 0 ? PALETTE.good
                  : row.rank_delta > 0 ? PALETTE.bad
                  : tc.text.secondary;
                const verdictDate = new Date(row.verdict_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                });

                return (
                  <tr key={row.enhancement_id} style={{ borderTop: i > 0 ? `1px solid ${tc.border.subtle}` : undefined }}>
                    <td style={{ ...tdStyle, maxWidth: '280px' }}>
                      <span
                        style={{
                          fontFamily: monoStack, fontSize: '12px', color: tc.text.primary,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          display: 'block',
                        }}
                        title={row.canonical_url}
                      >
                        {pathOf(row.canonical_url)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: monoStack, fontSize: '11px', color: tc.text.muted }}>v{row.version}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: monoStack, color: rankColor }}>
                      {fmtDelta(row.rank_delta)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: monoStack, color: tc.text.secondary }}>
                      {fmtDelta(row.click_delta_pct, '%')}
                    </td>
                    <td style={{ ...tdStyle, fontSize: '12px', color: tc.text.muted }}>
                      {verdictDate}
                    </td>
                    {extra && (
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {extra(row)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ResultsContent() {
  const tc = useThemeColors();
  const [rows, setRows] = useState<SeoResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    getSeoResults()
      .then((data) => { if (alive) { setRows(data); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e instanceof Error ? e.message : 'Failed to load'); setLoading(false); } });
    return () => { alive = false; };
  }, [tick]);

  const winners = rows.filter((r) => r.verdict === 'winner');
  const retired = rows.filter((r) => r.verdict === 'retired');
  const inconclusive = rows.filter((r) => r.verdict === 'inconclusive');

  return (
    <div style={{ maxWidth: '960px' }}>
      <div style={{ marginBottom: space['6'] }}>
        <h1
          style={{
            fontFamily: fontFamily.display, fontSize: '24px',
            fontWeight: fontWeight.semibold, color: tc.text.primary, margin: 0,
          }}
        >
          Results
        </h1>
      </div>

      {error && (
        <div style={{ padding: space['4'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px', marginBottom: space['4'], display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => { setError(null); setLoading(true); setTick((t) => t + 1); }} style={{ marginLeft: space['4'], padding: `${space['1']} ${space['3']}`, borderRadius: radius.sm, border: `1px solid ${PALETTE.bad}`, background: 'transparent', color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '12px', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ background: tc.background.muted, borderRadius: radius.md, height: '48px', marginBottom: space['2'] }}
            />
          ))}
        </div>
      ) : (
        <>
          <ResultsSection
            title="Winners"
            verdict="winner"
            rows={winners}
            tc={tc}
            extra={(row) => (
              <Link
                href={`/dashboard/seo/review?suggest=${encodeURIComponent(row.canonical_url)}`}
                style={{ fontSize: '12px', color: PALETTE.violet, textDecoration: 'none', fontFamily: fontFamily.body, whiteSpace: 'nowrap' }}
              >
                Double down →
              </Link>
            )}
          />
          <ResultsSection
            title="Retired"
            verdict="retired"
            rows={retired}
            tc={tc}
            extra={(_row) => (
              <span style={{ fontSize: '12px', color: tc.text.muted, fontFamily: fontFamily.body }}>
                See repackage
              </span>
            )}
          />
          <ResultsSection
            title="Inconclusive"
            verdict="inconclusive"
            rows={inconclusive}
            tc={tc}
          />
        </>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <DashboardGuard
      dashboard="seo"
      fallback={<AccessDenied message="You do not have permission to view this page." />}
    >
      <ResultsContent />
    </DashboardGuard>
  );
}
