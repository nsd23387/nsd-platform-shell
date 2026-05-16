'use client';

// =============================================================================
// GOVERNANCE LOCK — read-only surface
// Reads:  /api/competitive/summary, /weekly-insight, /changes
//         (all proxied to nsd-ods-api; service token stays server-side)
// Writes: none. Competitive crawls are written by nsd-integrations.
// Do not add new write paths or new data sources without an audit + approval.
// =============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import { SummaryCards, type CompetitiveSummary } from './components/SummaryCards';
import { WeeklyInsightPanel, type WeeklyInsight } from './components/WeeklyInsightPanel';
import { ChangeFeed } from './components/ChangeFeed';

interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error?: string;
  configured?: boolean;
}

// 8s timeout mirrors the Overview/seoApi pattern so no upstream stall can
// freeze the page. Returns the parsed envelope or throws.
async function fetchCompetitive<T>(path: string, signal?: AbortSignal): Promise<ApiEnvelope<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  try {
    const res = await fetch(path, { signal: controller.signal, cache: 'no-store' });
    const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
    if (res.status === 503) {
      return { success: false, data: null, error: body.error, configured: false };
    }
    if (!res.ok) {
      return { success: false, data: null, error: body.error || `HTTP ${res.status}` };
    }
    return body;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, data: null, error: 'Request timed out after 8s' };
    }
    return { success: false, data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  } finally {
    clearTimeout(timeoutId);
  }
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diffMs = Date.now() - then;
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function CompetitivePage() {
  const tc = useThemeColors();
  const [summary, setSummary] = useState<CompetitiveSummary | null>(null);
  const [insight, setInsight] = useState<WeeklyInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<{ summary?: string; insight?: string }>({});
  const [notConfigured, setNotConfigured] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrors({});
    const [summaryRes, insightRes] = await Promise.allSettled([
      fetchCompetitive<CompetitiveSummary>('/api/competitive/summary'),
      fetchCompetitive<WeeklyInsight>('/api/competitive/weekly-insight'),
    ]);

    const newErrors: typeof errors = {};
    let unconfigured = false;

    if (summaryRes.status === 'fulfilled') {
      if (summaryRes.value.configured === false) unconfigured = true;
      if (summaryRes.value.success) setSummary(summaryRes.value.data);
      else newErrors.summary = summaryRes.value.error;
    } else {
      newErrors.summary = String(summaryRes.reason);
    }

    if (insightRes.status === 'fulfilled') {
      if (insightRes.value.configured === false) unconfigured = true;
      // Insight can have data: null when no insight has been generated yet.
      if (insightRes.value.success) setInsight(insightRes.value.data);
      else newErrors.insight = insightRes.value.error;
    } else {
      newErrors.insight = String(insightRes.reason);
    }

    setNotConfigured(unconfigured);
    setErrors(newErrors);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div data-testid="page-competitive">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: space['4'], marginBottom: space['6'] }}>
        <div>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['2'] }}>
            Marketing Intelligence
          </p>
          <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }} data-testid="text-competitive-title">
            Competitive Intelligence
          </h1>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted }}>
            Weekly crawl of competitor pages with change detection.
          </p>
        </div>
        <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }} data-testid="text-last-crawl">
          Last crawl: <span style={{ fontWeight: fontWeight.medium, color: tc.text.secondary }}>{formatRelative(summary?.last_crawl_date)}</span>
        </div>
      </div>

      {notConfigured && (
        <div style={{ padding: space['4'], backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: radius.lg, marginBottom: space['6'], fontFamily: fontFamily.body, fontSize: fontSize.sm, color: '#92400e' }} data-testid="banner-not-configured">
          <strong>ODS API not configured.</strong> Set <code>NSD_ODS_API_BASE_URL</code> and <code>NSD_ODS_API_SERVICE_TOKEN</code> to enable competitive intelligence.
        </div>
      )}

      <div style={{ marginBottom: space['8'] }}>
        <SummaryCards data={summary} loading={loading} error={errors.summary} />
      </div>

      <div style={{ marginBottom: space['8'] }}>
        <WeeklyInsightPanel data={insight} loading={loading} error={errors.insight} />
      </div>

      <div>
        <h2 style={{ fontFamily: fontFamily.display, fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['4'] }} data-testid="text-recent-changes-heading">
          Recent Changes
        </h2>
        <ChangeFeed disabled={notConfigured} />
      </div>
    </div>
  );
}
