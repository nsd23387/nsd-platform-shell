'use client';

// =============================================================================
// SEO Command Center — Performance (governed page portfolio)
// Governance lock: read-only. No write paths on this surface. Only canonical_live
// pages are surfaced as targets; lost pages sit in the restore queue; pending
// pages carry a verify flag; excluded pages are never shown.
// =============================================================================

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { getSeoPortfolio } from '../../../../lib/seoApi';
import type { PortfolioPage, PortfolioBucket } from '../../../../lib/seoApi';
import {
  PALETTE, monoStack, Pill, toneStyle, BUCKETS, bucketTone, PAGE_SIZE,
  fmtInt, PageCard, PageDossierDrawer,
} from '../_shared';

function isBucket(v: string | null): v is PortfolioBucket {
  return v === 'win' || v === 'strategic' || v === 'fix' || v === 'lost';
}

function PerformanceContent() {
  const tc = useThemeColors();
  const searchParams = useSearchParams();
  const bucketParam = searchParams.get('bucket');

  const [pages, setPages] = useState<PortfolioPage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeBucket, setActiveBucket] = useState<PortfolioBucket | 'all'>(isBucket(bucketParam) ? bucketParam : 'all');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [visible, setVisible] = useState<Record<PortfolioBucket, number>>({
    win: PAGE_SIZE, strategic: PAGE_SIZE, fix: PAGE_SIZE, lost: PAGE_SIZE,
  });

  useEffect(() => { if (isBucket(bucketParam)) setActiveBucket(bucketParam); }, [bucketParam]);

  useEffect(() => {
    setVisible({ win: PAGE_SIZE, strategic: PAGE_SIZE, fix: PAGE_SIZE, lost: PAGE_SIZE });
  }, [search, activeBucket]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    getSeoPortfolio()
      .then((d) => { if (alive) setPages(d); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load portfolio'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const counts = useMemo(() => {
    const c: Record<PortfolioBucket, number> = { win: 0, strategic: 0, fix: 0, lost: 0 };
    (pages ?? []).forEach((p) => { c[p.bucket] += 1; });
    return c;
  }, [pages]);

  const lostImpressions = useMemo(
    () => (pages ?? []).reduce((sum, p) => (p.bucket === 'lost' ? sum + (p.gsc_impressions ?? 0) : sum), 0),
    [pages],
  );

  const filtered = useMemo(() => {
    let rows = pages ?? [];
    if (activeBucket !== 'all') rows = rows.filter((p) => p.bucket === activeBucket);
    const term = search.trim().toLowerCase();
    if (term) {
      rows = rows.filter((p) =>
        p.url.toLowerCase().includes(term) ||
        (p.gsc_top_query || '').toLowerCase().includes(term),
      );
    }
    return rows;
  }, [pages, activeBucket, search]);

  const grouped = useMemo(() => {
    const g: Record<PortfolioBucket, PortfolioPage[]> = { win: [], strategic: [], fix: [], lost: [] };
    filtered.forEach((p) => { g[p.bucket].push(p); });
    return g;
  }, [filtered]);

  return (
    <div style={{ padding: space['6'], maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: space['5'] }}>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: '24px', fontWeight: fontWeight.semibold, color: tc.text.primary, margin: 0 }}>Performance</h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, marginTop: '4px' }}>
          Governed page portfolio. Pages are bucketed on their top-query average position. Click any page to open its dossier.
        </p>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: space['3'], marginBottom: space['5'] }}>
        {BUCKETS.map((b) => (
          <button
            key={b.key}
            data-testid={`kpi-${b.key}`}
            onClick={() => setActiveBucket(activeBucket === b.key ? 'all' : b.key)}
            style={{
              textAlign: 'left', cursor: 'pointer',
              border: `1px solid ${activeBucket === b.key ? toneStyle(b.tone, tc).fg : tc.border.default}`,
              borderRadius: radius.md, padding: space['4'], background: tc.background.surface,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>{b.label}</span>
              <Pill tone={b.tone} tc={tc}>{b.key}</Pill>
            </div>
            <div style={{ fontFamily: monoStack, fontSize: '26px', color: tc.text.primary, marginTop: '4px' }}>{counts[b.key]}</div>
            <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginTop: '2px' }}>{b.blurb}</div>
          </button>
        ))}
        <div data-testid="kpi-lost-impressions" style={{ textAlign: 'left', border: `1px solid ${tc.border.default}`, borderRadius: radius.md, padding: space['4'], background: tc.background.surface }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>Lost impressions</span>
            <Pill tone="bad" tc={tc}>demand</Pill>
          </div>
          <div style={{ fontFamily: monoStack, fontSize: '26px', color: tc.text.primary, marginTop: '4px' }}>{fmtInt(lostImpressions)}</div>
          <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginTop: '2px' }}>Search impressions tied to lost pages — demand going unserved</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: space['3'], alignItems: 'center', marginBottom: space['4'], flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by URL or query…"
          data-testid="input-search"
          style={{ flex: '1 1 260px', padding: '8px 12px', borderRadius: radius.sm, border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.primary, fontFamily: fontFamily.body, fontSize: '13px' }}
        />
        {activeBucket !== 'all' && (
          <button onClick={() => setActiveBucket('all')} data-testid="button-clear-filter" style={{ padding: '8px 12px', borderRadius: radius.sm, cursor: 'pointer', border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '12px' }}>
            Clear bucket filter ({activeBucket})
          </button>
        )}
        <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>{filtered.length} pages</span>
      </div>

      {loading && <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>Loading portfolio…</div>}
      {error && <div style={{ padding: space['4'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>{error}</div>}

      {!loading && !error && BUCKETS.map((b) => {
        const rows = grouped[b.key];
        if (rows.length === 0) return null;
        const shown = Math.min(visible[b.key], rows.length);
        return (
          <div key={b.key} style={{ marginBottom: space['6'] }}>
            <div style={{ display: 'flex', gap: space['2'], alignItems: 'center', marginBottom: space['3'] }}>
              <Pill tone={bucketTone(b.key)} tc={tc}>{b.label}</Pill>
              <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>{rows.length} · {b.blurb}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: space['3'] }}>
              {rows.slice(0, shown).map((p) => (
                <PageCard key={p.url} p={p} tc={tc} onOpen={setSelectedUrl} />
              ))}
            </div>
            {shown < rows.length && (
              <div style={{ display: 'flex', gap: space['3'], alignItems: 'center', marginTop: space['3'] }}>
                <button data-testid={`button-show-more-${b.key}`} onClick={() => setVisible((v) => ({ ...v, [b.key]: v[b.key] + PAGE_SIZE }))} style={{ padding: '8px 14px', borderRadius: radius.sm, cursor: 'pointer', border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.primary, fontFamily: fontFamily.body, fontSize: '12px', fontWeight: fontWeight.medium }}>
                  Show {Math.min(PAGE_SIZE, rows.length - shown)} more
                </button>
                <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>Showing {shown} of {rows.length} — narrow with the filter above</span>
              </div>
            )}
          </div>
        );
      })}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>No pages match the current filters.</div>
      )}

      {selectedUrl && <PageDossierDrawer url={selectedUrl} tc={tc} onClose={() => setSelectedUrl(null)} />}
    </div>
  );
}

export default function PerformancePage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied message="You do not have permission to view SEO performance." />}>
      <Suspense fallback={null}>
        <PerformanceContent />
      </Suspense>
    </DashboardGuard>
  );
}
