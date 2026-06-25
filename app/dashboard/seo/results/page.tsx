'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Inbox } from 'lucide-react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { getSeoResults } from '../../../../lib/seoApi';
import type { SeoResultRow } from '../../../../lib/seoApi';
import {
  DeltaGlyph,
  EmptyState,
  SeoCard,
  SortHeader,
  middleTruncatePath,
  pageTitleFromUrl,
  type SortDirection,
} from '../_shared';

type SortKey = 'rank' | 'click' | 'verdict';
const PAGE_SIZE = 50;

function numericValue(row: SeoResultRow, key: SortKey): number {
  if (key === 'rank') return row.rank_delta ?? Number.NEGATIVE_INFINITY;
  if (key === 'click') return row.click_delta_pct ?? Number.NEGATIVE_INFINITY;
  return new Date(row.verdict_at).getTime();
}

function ResultsTable({
  title,
  rows,
  extra,
}: {
  title: string;
  rows: SeoResultRow[];
  extra?: (row: SeoResultRow) => React.ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('verdict');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => `${row.canonical_url} ${pageTitleFromUrl(row.canonical_url)}`.toLowerCase().includes(term));
  }, [query, rows]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      return (numericValue(a, sortKey) - numericValue(b, sortKey)) * dir;
    });
  }, [filtered, sortDir, sortKey]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(next: SortKey) {
    setPage(1);
    if (next === sortKey) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(next);
      setSortDir('desc');
    }
  }

  useEffect(() => {
    setPage(1);
  }, [query]);

  return (
    <section style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontSize: 17, margin: 0 }}>{title}</h2>
          <span className="seo-chip seo-mono">{rows.length.toLocaleString('en-US')}</span>
        </div>
        {rows.length > 0 && (
          <input
            className="seo-filter"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by page or slug..."
            aria-label={`Filter ${title}`}
          />
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<Inbox size={18} />} title={`No ${title.toLowerCase()} yet`} body="Verdicts will appear here after packages complete the evaluation window." />
      ) : (
        <>
          <div className="seo-mono seo-muted" style={{ fontSize: 13, marginBottom: 10 }}>— = awaiting first verdict (day 30)</div>
          <div className="seo-table-wrap">
            <table className="seo-table">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Ver</th>
                  <SortHeader id="rank" label="Rank Δ" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" title="Δ = positions gained; ↑ is better." />
                  <SortHeader id="click" label="Click Δ" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                  <SortHeader id="verdict" label="Verdict date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  {extra && <th />}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const verdictDate = new Date(row.verdict_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  });
                  return (
                    <tr key={row.enhancement_id}>
                      <td style={{ minWidth: 280 }}>
                        <div className="seo-table-page-title">{pageTitleFromUrl(row.canonical_url)}</div>
                        <div className="seo-mono seo-muted seo-table-page-slug" title={row.canonical_url}>
                          {middleTruncatePath(row.canonical_url)}
                        </div>
                      </td>
                      <td><span className="seo-chip seo-mono">v{row.version}</span></td>
                      <td style={{ textAlign: 'right' }}><DeltaGlyph value={row.rank_delta} /></td>
                      <td style={{ textAlign: 'right' }}><DeltaGlyph value={row.click_delta_pct} unit="%" /></td>
                      <td className="seo-mono seo-muted" style={{ fontSize: 13 }}>{verdictDate}</td>
                      {extra && <td style={{ textAlign: 'right' }}>{extra(row)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center', marginTop: 14 }}>
              <button type="button" className="seo-button seo-button-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
              <span className="seo-mono seo-muted" style={{ fontSize: 13 }}>Page {page} / {pageCount}</span>
              <button type="button" className="seo-button seo-button-secondary" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount}>Next</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ResultsContent() {
  const [rows, setRows] = useState<SeoResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getSeoResults()
      .then((data) => { if (alive) { setRows(data); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e instanceof Error ? e.message : 'Failed to load'); setLoading(false); } });
    return () => { alive = false; };
  }, [tick]);

  const winners = rows.filter((r) => r.verdict === 'winner');
  const retired = rows.filter((r) => r.verdict === 'retired');
  const inconclusive = rows.filter((r) => r.verdict === 'inconclusive');

  return (
    <div className="seo-page">
      <div style={{ marginBottom: 24 }}>
        <h1 className="seo-page-title">Results</h1>
        <p className="seo-page-subtitle">Final verdicts from the SEO evaluation clock.</p>
      </div>

      {error && (
        <SeoCard style={{ marginBottom: 18, borderColor: 'var(--red)', color: 'var(--red)', fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
            <span>{error}</span>
            <button type="button" onClick={() => { setError(null); setLoading(true); setTick((t) => t + 1); }} className="seo-button seo-button-danger">Retry</button>
          </div>
        </SeoCard>
      )}

      {loading ? (
        <div>{[0, 1, 2, 3, 4].map((i) => <div key={i} className="animate-pulse seo-card" style={{ height: 50, marginBottom: 8, background: 'var(--surface-2)' }} />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<CheckCircle2 size={18} />} title="No verdicts yet" body="Results will populate after the first packages reach day 30 and receive a verdict." />
      ) : (
        <>
          <ResultsTable
            title="Winners"
            rows={winners}
            extra={(row) => (
              <Link href={`/dashboard/seo/review?suggest=${encodeURIComponent(row.canonical_url)}`} style={{ color: 'var(--violet)', fontSize: 12, whiteSpace: 'nowrap' }}>
                Double down →
              </Link>
            )}
          />
          <ResultsTable title="Retired" rows={retired} extra={() => <span className="seo-muted" style={{ fontSize: 12 }}>See repackage</span>} />
          <ResultsTable title="Inconclusive" rows={inconclusive} />
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
