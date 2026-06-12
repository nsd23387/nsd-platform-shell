'use client';

// =============================================================================
// SEO Command Center — Competitors (governed competitive feed)
// Governance lock: read-only. The competitive feed is sourced through the
// governed producer contract; no writes occur on this surface.
// =============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { getSeoCompetitorGapFeed } from '../../../../lib/seoApi';
import type { SeoCompetitorGap, SeoCompetitorGapMeta } from '../../../../lib/seoApi';
import { fmtDataForSeoDifficulty, fmtDataForSeoVolume } from '../../../../lib/dataforseoFormat';
import { PALETTE, monoStack, Pill, fmtInt, COMPETITOR_GAP_SCORE_TOOLTIP } from '../_shared';
import { Term } from '../../../../design/components/Term';

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function CompetitorsContent() {
  const tc = useThemeColors();
  const [gaps, setGaps] = useState<SeoCompetitorGap[] | null>(null);
  const [meta, setMeta] = useState<SeoCompetitorGapMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    getSeoCompetitorGapFeed()
      .then((feed) => { if (alive) { setGaps(feed.data); setMeta(feed.meta); } })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load competitor gaps'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const typeOptions = useMemo(
    () => Array.from(new Set((gaps ?? []).map((g) => g.gap_type).filter(Boolean))).sort(),
    [gaps],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (gaps ?? [])
      .filter((g) => typeFilter === 'all' || g.gap_type === typeFilter)
      .filter((g) => term === '' || (g.keyword || '').toLowerCase().includes(term) || hostOf(g.competitor_url).toLowerCase().includes(term))
      .sort((a, b) => (b.opportunity_score ?? -Infinity) - (a.opportunity_score ?? -Infinity));
  }, [gaps, typeFilter, search]);

  const competitors = useMemo(() => Array.from(new Set((gaps ?? []).map((g) => hostOf(g.competitor_url)))), [gaps]);
  const governedCount = meta?.governed_competitors_count ?? competitors.length;
  const rawCount = meta?.raw_competitors_count ?? competitors.length;
  const configuredCount = meta?.configured_competitors_count ?? rawCount;

  const th: React.CSSProperties = { padding: '10px 12px', fontSize: '11px', fontWeight: fontWeight.semibold, color: tc.text.muted, textTransform: 'uppercase', textAlign: 'left' };
  const thR: React.CSSProperties = { ...th, textAlign: 'right' };

  return (
    <div style={{ padding: space['6'], maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: space['5'] }}>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: '24px', fontWeight: fontWeight.semibold, color: tc.text.primary, margin: 0 }}>Competitors</h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, marginTop: '4px' }}>
          Keyword and content gaps where competitors rank and you don&apos;t — from the governed competitive feed. Read-only.
        </p>
        <p style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginTop: '4px' }} data-testid="text-competitor-scope">
          Scope: {fmtInt(governedCount)} governed / {fmtInt(rawCount)} raw / {fmtInt(configuredCount)} configured competitors. Neon competitors only; generic-sign printers, marketplaces, branded, and ultra-short queries are excluded from the governed view.
        </p>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: space['3'], marginBottom: space['5'] }}>
        {[
          { label: 'Total gaps', value: loading ? '—' : fmtInt(gaps?.length ?? 0) },
          { label: 'Governed competitors', value: loading ? '—' : fmtInt(governedCount) },
          { label: 'Keyword gaps', value: loading ? '—' : fmtInt((gaps ?? []).filter((g) => g.gap_type === 'keyword').length) },
          { label: 'Content gaps', value: loading ? '—' : fmtInt((gaps ?? []).filter((g) => g.gap_type === 'content').length) },
        ].map((t) => (
          <div key={t.label} style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, padding: space['4'], background: tc.background.surface }}>
            <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>{t.label}</div>
            <div style={{ fontFamily: monoStack, fontSize: '26px', color: tc.text.primary, marginTop: '4px' }}>{t.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: space['3'], alignItems: 'center', marginBottom: space['4'], flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by keyword or competitor…"
          data-testid="input-search"
          style={{ flex: '1 1 260px', padding: '8px 12px', borderRadius: radius.sm, border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.primary, fontFamily: fontFamily.body, fontSize: '13px' }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          data-testid="select-gap-type"
          style={{ padding: '8px 12px', borderRadius: radius.sm, border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.primary, fontFamily: fontFamily.body, fontSize: '13px' }}
        >
          <option value="all">All gap types</option>
          {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>{rows.length} gaps</span>
      </div>

      {loading && <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>Loading competitor gaps…</div>}
      {error && <div style={{ padding: space['4'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>{error}</div>}
      {!loading && !error && rows.length === 0 && (
        <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="empty-gaps">No competitor gaps match the current filters.</div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, overflow: 'hidden', background: tc.background.surface }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fontFamily.body, fontSize: '13px' }}>
            <thead>
              <tr style={{ background: tc.background.muted }}>
                <th style={th}>Keyword / gap</th>
                <th style={th}>Competitor</th>
                <th style={thR}><Term k="pos">Their pos</Term></th>
                <th style={thR}><Term k="pos">Your pos</Term></th>
                <th style={thR}><Term k="vol">Volume</Term></th>
                <th style={thR}><Term k="kd">Difficulty</Term></th>
                <th style={thR}><Term def={COMPETITOR_GAP_SCORE_TOOLTIP}>Score</Term></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.id} style={{ borderTop: `1px solid ${tc.border.subtle}` }} data-testid={`row-gap-${g.id}`}>
                  <td style={{ padding: '10px 12px', color: tc.text.primary, fontWeight: fontWeight.medium }}>
                    {g.keyword || g.cluster_keyword || '—'}
                    <span style={{ marginLeft: 8 }}><Pill tone={g.gap_type === 'content' ? 'info' : 'violet'} tc={tc}>{g.gap_type}</Pill></span>
                    {g.content_gap_notes && <div style={{ fontSize: '11px', color: tc.text.muted, marginTop: 2 }}>{g.content_gap_notes}</div>}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: monoStack, fontSize: '12px', color: PALETTE.bad }}>
                    {g.competitor_page_url
                      ? <a href={g.competitor_page_url} target="_blank" rel="noopener noreferrer" style={{ color: PALETTE.bad, textDecoration: 'none' }}>{hostOf(g.competitor_url)} ↗</a>
                      : hostOf(g.competitor_url)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: monoStack, color: tc.text.secondary }}>{g.competitor_ranking_position ?? '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: monoStack, color: tc.text.muted }}>{g.our_ranking_position ?? 'unranked'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: monoStack, color: tc.text.secondary }}>{fmtDataForSeoVolume(g.search_volume)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: monoStack, color: tc.text.muted }}>{fmtDataForSeoDifficulty(g.keyword_difficulty)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: monoStack, color: tc.text.primary }}>{g.opportunity_score == null ? '—' : g.opportunity_score.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CompetitorsPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied message="You do not have permission to view competitor intelligence." />}>
      <CompetitorsContent />
    </DashboardGuard>
  );
}
