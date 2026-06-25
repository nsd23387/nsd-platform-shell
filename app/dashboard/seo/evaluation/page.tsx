'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { getSeoEvaluation } from '../../../../lib/seoApi';
import type { SeoEvaluationRow } from '../../../../lib/seoApi';
import {
  DeltaGlyph,
  EmptyState,
  SeoCard,
  SortHeader,
  middleTruncatePath,
  pageTitleFromUrl,
  type SortDirection,
} from '../_shared';

type SortKey = 'progress' | 'rank' | 'click' | 'day';
const PAGE_SIZE = 50;

function daysElapsed(startAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(startAt).getTime()) / 86_400_000));
}

function numericValue(row: SeoEvaluationRow, key: SortKey): number {
  const elapsed = daysElapsed(row.evaluation_start_at);
  if (key === 'day') return elapsed;
  if (key === 'progress') return elapsed / Math.max(1, row.first_verdict_days);
  if (key === 'rank') return row.rank_delta ?? Number.NEGATIVE_INFINITY;
  return row.click_delta_pct ?? Number.NEGATIVE_INFINITY;
}

function EvaluationTable({ rows }: { rows: SeoEvaluationRow[] }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('day');
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

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="•"
        title="No pages in evaluation"
        body="Pages appear here after their first approval. Packages in evaluation are measured on the 30-day clock before the first verdict."
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 14 }}>
        <input
          className="seo-filter"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by page or slug..."
          aria-label="Filter pages in evaluation"
        />
        <div className="seo-mono seo-muted" style={{ fontSize: 12 }}>
          {sorted.length.toLocaleString('en-US')} rows · — = awaiting first verdict (day 30)
        </div>
      </div>
      <div className="seo-table-wrap">
        <table className="seo-table">
          <thead>
            <tr>
              <th>Page</th>
              <th>Ver</th>
              <SortHeader id="progress" label="Progress" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHeader id="day" label="Day-of-30" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHeader id="rank" label="Rank Δ" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" title="Δ = positions gained; ↑ is better." />
              <SortHeader id="click" label="Click Δ" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const elapsed = daysElapsed(row.evaluation_start_at);
              const clampedDay = Math.min(30, elapsed);
              const progress = Math.min(1, Math.max(0, elapsed / Math.max(1, row.first_verdict_days)));
              return (
                <tr key={row.enhancement_id}>
                  <td style={{ minWidth: 280 }}>
                    <div style={{ color: 'var(--fg)', fontWeight: 700 }}>{pageTitleFromUrl(row.canonical_url)}</div>
                    <div className="seo-mono seo-muted" style={{ fontSize: 11, marginTop: 3 }} title={row.canonical_url}>
                      {middleTruncatePath(row.canonical_url)}
                    </div>
                  </td>
                  <td><span className="seo-chip seo-mono">v{row.version}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="seo-progress-track" aria-hidden="true">
                        <div className="seo-progress-fill" style={{ width: `${progress * 100}%` }} />
                      </div>
                      <span className="seo-mono seo-muted" style={{ fontSize: 11 }}>Day {clampedDay} / 30</span>
                    </div>
                  </td>
                  <td className="seo-mono">{elapsed}</td>
                  <td style={{ textAlign: 'right' }}>
                    <DeltaGlyph value={row.rank_delta} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <DeltaGlyph value={row.click_delta_pct} unit="%" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center', marginTop: 14 }}>
          <button type="button" className="seo-filter" style={{ width: 'auto' }} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
          <span className="seo-mono seo-muted" style={{ fontSize: 12 }}>Page {page} / {pageCount}</span>
          <button type="button" className="seo-filter" style={{ width: 'auto' }} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount}>Next</button>
        </div>
      )}
    </div>
  );
}

function EvaluationContent() {
  const [rows, setRows] = useState<SeoEvaluationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getSeoEvaluation()
      .then((data) => { if (alive) { setRows(data); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e instanceof Error ? e.message : 'Failed to load'); setLoading(false); } });
    return () => { alive = false; };
  }, [tick]);

  return (
    <div className="seo-page" aria-live="polite">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, margin: 0 }}>In Evaluation</h1>
        <p className="seo-muted" style={{ fontSize: 13, marginTop: 5 }}>Pages being measured. Read-only decisions happen at Review.</p>
      </div>

      {error && (
        <SeoCard style={{ marginBottom: 18, borderColor: 'var(--red)', color: 'var(--red)', fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
            <span>{error}</span>
            <button type="button" onClick={() => { setError(null); setLoading(true); setTick((t) => t + 1); }} className="seo-filter" style={{ color: 'var(--red)', width: 'auto' }}>Retry</button>
          </div>
        </SeoCard>
      )}

      {loading ? (
        <div>
          {[0, 1, 2, 3].map((i) => <div key={i} className="animate-pulse seo-card" style={{ height: 50, marginBottom: 8, background: 'var(--surface-2)' }} />)}
        </div>
      ) : (
        <EvaluationTable rows={rows} />
      )}
    </div>
  );
}

export default function EvaluationPage() {
  return (
    <DashboardGuard
      dashboard="seo"
      fallback={<AccessDenied message="You do not have permission to view this page." />}
    >
      <EvaluationContent />
    </DashboardGuard>
  );
}
