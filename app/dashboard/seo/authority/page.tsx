'use client';

// =============================================================================
// SEO Authority — Lane 3 read-only queue
// Governance lock: this page reads analytics.v_seo_offpage_authority_queue via
// /api/proxy/seo/authority. It never reads contact tables and exposes no approve,
// enrich, outreach, reply, or execution actions.
// =============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../../design/tokens/typography';
import { radius, space } from '../../../../design/tokens/spacing';
import { getSeoAuthorityOpportunities } from '../../../../lib/seoApi';
import type { SeoAuthorityOpportunity } from '../../../../lib/seoApi';
import { PALETTE, Pill, fmtInt, pathOf } from '../_shared';

function score(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toFixed(value >= 10 ? 0 : 1);
}

function label(value: string | null | undefined): string {
  if (!value) return '—';
  return value.replace(/_/g, ' ');
}

function confidenceTone(value: string | null | undefined): 'good' | 'warn' | 'neutral' {
  if (value === 'high') return 'good';
  if (value === 'medium') return 'warn';
  return 'neutral';
}

function AuthorityContent() {
  const tc = useThemeColors();
  const [rows, setRows] = useState<SeoAuthorityOpportunity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    getSeoAuthorityOpportunities()
      .then((data) => { if (alive) setRows(data); })
      .catch((err) => {
        if (!alive) return;
        setRows([]);
        setError(err instanceof Error ? err.message : 'Failed to load authority queue');
      });
    return () => { alive = false; };
  }, []);

  const summary = useMemo(() => {
    const data = rows ?? [];
    return {
      total: data.length,
      accepted: data.filter((r) => r.gate_status === 'accepted').length,
      high: data.filter((r) => r.confidence_tier === 'high').length,
      contacted: data.reduce((sum, r) => sum + (r.contact_count > 0 ? 1 : 0), 0),
    };
  }, [rows]);

  if (rows === null) {
    return (
      <main style={{ padding: space['6'], fontFamily: fontFamily.body, color: tc.text.primary }}>
        Loading authority opportunities…
      </main>
    );
  }

  return (
    <main style={{ padding: space['6'], fontFamily: fontFamily.body, color: tc.text.primary }}>
      <section style={{ marginBottom: space['6'] }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: space['4'], flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, color: tc.text.muted, fontSize: '12px', textTransform: 'uppercase', letterSpacing: 0 }}>
              Lane 3
            </p>
            <h1 style={{ margin: `${space['1']} 0 0`, fontSize: '28px', lineHeight: 1.15, fontWeight: fontWeight.semibold }}>
              Authority
            </h1>
          </div>
          <div style={{ color: tc.text.muted, fontSize: '13px', maxWidth: 520 }}>
            Read-only view of scored, gated off-page opportunities. Outreach, enrichment, and replies are intentionally not wired here.
          </div>
        </div>
      </section>

      {error && (
        <div style={{ marginBottom: space['4'], padding: space['4'], borderRadius: radius.md, border: `1px solid ${tc.border.default}`, color: PALETTE.bad }}>
          {error}
        </div>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: space['3'], marginBottom: space['5'] }}>
        {[
          ['Opportunities', fmtInt(summary.total)],
          ['Gate accepted', fmtInt(summary.accepted)],
          ['High confidence', fmtInt(summary.high)],
          ['With contacts', fmtInt(summary.contacted)],
        ].map(([k, v]) => (
          <div key={k} style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, padding: space['4'], background: tc.background.surface }}>
            <div style={{ color: tc.text.muted, fontSize: '12px' }}>{k}</div>
            <div style={{ marginTop: space['1'], fontSize: '24px', fontWeight: fontWeight.semibold }}>{v}</div>
          </div>
        ))}
      </section>

      <section style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, background: tc.background.surface, overflow: 'hidden' }}>
        <div style={{ padding: space['4'], borderBottom: `1px solid ${tc.border.subtle}` }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: fontWeight.semibold }}>Scored authority queue</h2>
          <p style={{ margin: `${space['1']} 0 0`, color: tc.text.muted, fontSize: '13px' }}>
            Sourced from the PII-safe queue view. Prospect contact data stays out of the dashboard read path.
          </p>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: space['6'], color: tc.text.muted, textAlign: 'center' }}>
            No authority opportunities are currently queued.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: tc.text.muted, background: tc.background.muted }}>
                  <th style={{ padding: '10px 12px' }}>Opportunity</th>
                  <th style={{ padding: '10px 12px' }}>Prospect</th>
                  <th style={{ padding: '10px 12px' }}>Target</th>
                  <th style={{ padding: '10px 12px' }}>Anchor</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Score</th>
                  <th style={{ padding: '10px 12px' }}>Confidence</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${tc.border.subtle}` }}>
                    <td style={{ padding: '12px', minWidth: 180 }}>
                      <div style={{ fontWeight: fontWeight.medium }}>{label(r.opportunity_type)}</div>
                      <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Pill tone="violet" tc={tc}>{label(r.discovered_via)}</Pill>
                        {r.segment && <Pill tone={r.segment === 'b2b' ? 'good' : 'neutral'} tc={tc}>{r.segment}</Pill>}
                      </div>
                    </td>
                    <td style={{ padding: '12px', minWidth: 190 }}>
                      <div style={{ fontWeight: fontWeight.medium }}>{r.prospect_domain}</div>
                      <div style={{ marginTop: 4, color: tc.text.muted }}>DR {score(r.prospect_domain_rating)}</div>
                    </td>
                    <td style={{ padding: '12px', minWidth: 220, wordBreak: 'break-word' }}>
                      {pathOf(r.our_target_url)}
                    </td>
                    <td style={{ padding: '12px', minWidth: 160, color: r.proposed_anchor ? tc.text.primary : tc.text.muted }}>
                      {r.proposed_anchor ?? '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: fontWeight.semibold }}>
                      {score(r.opportunity_score)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Pill tone={confidenceTone(r.confidence_tier)} tc={tc}>{label(r.confidence_tier)}</Pill>
                    </td>
                    <td style={{ padding: '12px', minWidth: 130 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Pill tone={r.gate_status === 'accepted' ? 'good' : 'warn'} tc={tc}>{label(r.gate_status)}</Pill>
                        <Pill tone="neutral" tc={tc}>{label(r.status)}</Pill>
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Link
                        href={`/dashboard/seo/performance?url=${encodeURIComponent(r.our_target_url)}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: PALETTE.violet, textDecoration: 'none', fontWeight: fontWeight.medium }}
                      >
                        Earn authority for this page <ExternalLink size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default function AuthorityPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied message="You do not have permission to view SEO authority." />}>
      <AuthorityContent />
    </DashboardGuard>
  );
}
