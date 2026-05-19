'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

// Matches the nsd-integrations producer contract for
// GET /api/v1/competitive/pages/changes (after the proxy wraps it in the
// {success,data} envelope).
interface PageChange {
  id: string;
  competitor_name: string;
  competitor_domain: string;
  page_url: string;
  page_type: string;
  buyer_segment: string;
  change_type: 'new' | 'changed' | string;
  page_title: string;
  status_code: number | null;
  crawl_depth: number | null;
  crawled_at: string;
}

interface ChangesResponse {
  success: boolean;
  data: { changes: PageChange[]; total: number; limit: number; offset: number } | null;
  error?: string;
  configured?: boolean;
}

interface ChangeFeedProps {
  disabled?: boolean;
}

const PAGE_SIZE = 50;

// Page-type palette covers the producer's documented enum:
// "product" | "category" | "blog" | "homepage" | "pricing" | "other".
const PAGE_TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  pricing: { bg: '#fee2e2', text: '#991b1b' },
  product: { bg: '#dbeafe', text: '#1e40af' },
  category: { bg: '#f3e8ff', text: '#6b21a8' },
  blog: { bg: '#f5f5f5', text: '#525252' },
  homepage: { bg: '#d1fae5', text: '#065f46' },
  other: { bg: '#f1f5f9', text: '#475569' },
};

const CHANGE_TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  new: { bg: '#d1fae5', text: '#065f46' },
  changed: { bg: '#fef3c7', text: '#92400e' },
};

const PAGE_TYPE_OPTIONS = ['product', 'category', 'pricing', 'blog', 'homepage', 'other'];
const CHANGE_TYPE_OPTIONS: Array<'new' | 'changed'> = ['new', 'changed'];

function Badge({ label, styles }: { label: string; styles: { bg: string; text: string } }) {
  return (
    <span style={{ display: 'inline-block', padding: `2px 8px`, borderRadius: radius.full, fontSize: '11px', fontWeight: 500, backgroundColor: styles.bg, color: styles.text, fontFamily: fontFamily.body, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffMs = Date.now() - then;
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

export function ChangeFeed({ disabled }: ChangeFeedProps) {
  const tc = useThemeColors();
  const [rows, setRows] = useState<PageChange[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [competitorOptions, setCompetitorOptions] = useState<string[]>([]);
  // Tracks the in-flight fetch so a rapid filter change can abort the
  // previous request, preventing a stale response from landing after a
  // newer one and overwriting the table.
  const inFlightRef = useRef<AbortController | null>(null);

  // Filters
  const [changeTypeFilter, setChangeTypeFilter] = useState<'' | 'new' | 'changed'>('');
  const [competitorFilter, setCompetitorFilter] = useState<string>('');
  const [pageTypeFilter, setPageTypeFilter] = useState<string>('');

  const load = useCallback(async (append: boolean, nextOffset: number) => {
    if (disabled) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(nextOffset));
    if (changeTypeFilter) params.set('change_type', changeTypeFilter);
    if (competitorFilter) params.set('competitor', competitorFilter);
    if (pageTypeFilter) params.set('page_type', pageTypeFilter);

    // Abort any prior in-flight request so its late response can't overwrite
    // a newer one. Distinguishes user-driven aborts from timeout-driven ones
    // via the controller identity check below.
    if (inFlightRef.current) inFlightRef.current.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`/api/competitive/changes?${params.toString()}`, { signal: controller.signal, cache: 'no-store' });
      const body = (await res.json().catch(() => ({}))) as ChangesResponse;
      // If we were superseded mid-flight, drop this response on the floor.
      if (inFlightRef.current !== controller) return;
      if (!res.ok || !body.success || !body.data) {
        setError(body.error || `HTTP ${res.status}`);
        if (!append) setRows([]);
        setLoading(false);
        return;
      }
      const incoming = body.data.changes;
      setTotal(body.data.total);
      setRows((prev) => (append ? [...prev, ...incoming] : incoming));
      // Build competitor option list from first page only
      if (!append) {
        const uniq = Array.from(new Set(incoming.map((r) => r.competitor_domain))).sort();
        setCompetitorOptions(uniq);
      }
    } catch (err: unknown) {
      // If superseded, swallow silently — a newer request owns the UI now.
      if (inFlightRef.current !== controller) return;
      const isAbort = err instanceof Error && err.name === 'AbortError';
      setError(isAbort ? 'Request timed out after 8s' : err instanceof Error ? err.message : 'Unknown error');
      if (!append) setRows([]);
    } finally {
      clearTimeout(timeoutId);
      if (inFlightRef.current === controller) {
        inFlightRef.current = null;
        setLoading(false);
      }
    }
  }, [changeTypeFilter, competitorFilter, pageTypeFilter, disabled]);

  // Reset + reload when filters change
  useEffect(() => {
    setOffset(0);
    load(false, 0);
  }, [changeTypeFilter, competitorFilter, pageTypeFilter, load]);

  const handleLoadMore = () => {
    const next = offset + PAGE_SIZE;
    setOffset(next);
    load(true, next);
  };

  const cellStyle: React.CSSProperties = { padding: `${space['3']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, verticalAlign: 'middle' };
  const headerStyle: React.CSSProperties = { ...cellStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' as const };

  const selectStyle: React.CSSProperties = {
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.primary,
    backgroundColor: tc.background.surface,
    border: `1px solid ${tc.border.default}`,
    borderRadius: radius.md,
    cursor: 'pointer',
  };

  const hasMore = rows.length < total;

  return (
    <div data-testid="change-feed">
      <div style={{ display: 'flex', gap: space['3'], marginBottom: space['4'], flexWrap: 'wrap' }}>
        <select
          value={changeTypeFilter}
          onChange={(e) => setChangeTypeFilter(e.target.value as '' | 'new' | 'changed')}
          style={selectStyle}
          data-testid="select-change-type"
          disabled={disabled}
        >
          <option value="">All change types</option>
          {CHANGE_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={competitorFilter}
          onChange={(e) => setCompetitorFilter(e.target.value)}
          style={selectStyle}
          data-testid="select-competitor"
          disabled={disabled || competitorOptions.length === 0}
        >
          <option value="">All competitors</option>
          {competitorOptions.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          value={pageTypeFilter}
          onChange={(e) => setPageTypeFilter(e.target.value)}
          style={selectStyle}
          data-testid="select-page-type"
          disabled={disabled}
        >
          <option value="">All page types</option>
          {PAGE_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', alignSelf: 'center', fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }} data-testid="text-result-count">
          {disabled ? '—' : `${rows.length.toLocaleString()} of ${total.toLocaleString()}`}
        </div>
      </div>

      <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
              <th style={headerStyle}>Competitor</th>
              <th style={headerStyle}>URL</th>
              <th style={headerStyle}>Type</th>
              <th style={headerStyle}>Change</th>
              <th style={headerStyle}>Segment</th>
              <th style={headerStyle}>Crawled</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pathOnly = r.page_url.replace(/^https?:\/\/[^/]+/, '') || '/';
              const pageTypeKey = PAGE_TYPE_STYLES[r.page_type] ? r.page_type : 'other';
              const changeTypeKey = CHANGE_TYPE_STYLES[r.change_type] ? r.change_type : 'changed';
              return (
                <tr key={r.id} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-change-${r.id}`}>
                  <td style={cellStyle}>
                    <div style={{ fontWeight: fontWeight.medium, color: tc.text.primary }}>{r.competitor_name}</div>
                    <div style={{ fontSize: '11px', color: tc.text.muted }}>{r.competitor_domain}</div>
                  </td>
                  <td style={{ ...cellStyle, maxWidth: '320px' }}>
                    <a href={r.page_url} target="_blank" rel="noopener noreferrer" title={r.page_url} style={{ color: tc.text.primary, textDecoration: 'underline' }}>
                      {truncate(pathOnly, 48)}
                    </a>
                  </td>
                  <td style={cellStyle}><Badge label={r.page_type} styles={PAGE_TYPE_STYLES[pageTypeKey]} /></td>
                  <td style={cellStyle}><Badge label={r.change_type} styles={CHANGE_TYPE_STYLES[changeTypeKey]} /></td>
                  <td style={cellStyle}>{r.buyer_segment || '—'}</td>
                  <td style={cellStyle}>{formatRelative(r.crawled_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && rows.length === 0 && !error && (
          <div style={{ padding: space['8'], textAlign: 'center', fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }} data-testid="change-feed-empty">
            {disabled ? 'Competitive API is not configured.' : 'No page changes detected with the current filters.'}
          </div>
        )}
        {loading && (
          <div style={{ padding: space['6'], textAlign: 'center', fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }} data-testid="change-feed-loading">
            Loading…
          </div>
        )}
        {error && (
          <div style={{ padding: space['4'], fontFamily: fontFamily.body, fontSize: fontSize.sm, color: '#991b1b', backgroundColor: '#fee2e2', borderTop: `1px solid ${tc.border.default}` }} data-testid="change-feed-error">
            Failed to load: {error}
          </div>
        )}
      </div>

      {hasMore && !loading && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: space['4'] }}>
          <button
            onClick={handleLoadMore}
            style={{
              padding: `${space['2']} ${space['5']}`,
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              color: tc.text.primary,
              backgroundColor: tc.background.surface,
              border: `1px solid ${tc.border.default}`,
              borderRadius: radius.md,
              cursor: 'pointer',
            }}
            data-testid="button-load-more"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
