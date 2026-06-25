'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardGuard } from '../../../hooks/useRBAC';
import { AccessDenied } from '../../../components/dashboard';
import { getSeoNorthStar } from '../../../lib/seoApi';
import type { SeoNorthStar, SeoPipelineCounts } from '../../../lib/seoApi';
import { EmptyState, SeoCard } from './_shared';
import { PipelineTile } from './components/PipelineTile';

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${sign}${Math.abs(n).toFixed(1)}%`;
}

function DeltaBadge({ value }: { value: number }) {
  const improved = value > 0;
  const worsened = value < 0;
  return (
    <span
      className={`seo-chip seo-mono ${improved ? 'seo-delta-up' : worsened ? 'seo-delta-down' : 'seo-muted'}`}
      style={{ background: improved ? 'var(--green-soft)' : worsened ? 'var(--red-soft)' : 'var(--surface-2)' }}
    >
      {improved ? '↑' : worsened ? '↓' : '—'} {fmtPct(value)}
    </span>
  );
}

function flatSeries(value: number, points = 9): number[] {
  return Array.from({ length: points }, () => value);
}

function trendSeries(value: number, direction: 'up' | 'down', points = 9): number[] {
  const start = direction === 'up' ? value * 0.65 : value * 1.18;
  const end = direction === 'up' ? value : Math.max(0, value * 0.82);
  return Array.from({ length: points }, (_, i) => {
    const t = i / Math.max(1, points - 1);
    return start + (end - start) * t;
  });
}

function NorthStarSparkline({
  data,
  color,
}: {
  metric: string;
  data: number[];
  color: 'violet' | 'muted' | 'green' | 'red';
}) {
  const stroke = color === 'violet' ? 'var(--violet)' : color === 'green' ? 'var(--green)' : color === 'red' ? 'var(--red)' : 'var(--fg-muted)';
  const points = useMemo(() => {
    const values = data.length > 1 ? data : flatSeries(data[0] ?? 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return values.map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * 120;
      const y = 26 - ((v - min) / span) * 22;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [data]);
  const area = `0,30 ${points} 120,30`;

  return (
    <svg viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true" style={{ width: '100%', height: 30, display: 'block' }}>
      <polygon points={area} fill={stroke} fillOpacity="0.10" />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NorthStarCard({ ns }: { ns: SeoNorthStar }) {
  const freshDate = new Date(ns.data_freshness_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
  const metrics = [
    {
      label: 'Clicks 28d',
      value: ns.total_clicks_28d.toLocaleString('en-US'),
      delta: ns.clicks_delta_pct,
      context: `Prev ${ns.clicks_prev28d.toLocaleString('en-US')} clicks`,
      spark: flatSeries(ns.total_clicks_28d),
      color: 'violet' as const,
    },
    {
      label: '% Page 1',
      value: `${ns.pct_page_one.toFixed(1)}%`,
      delta: ns.pct_page_one_delta,
      context: `${ns.ranked_top10.toLocaleString('en-US')} top-10 pages`,
      spark: flatSeries(ns.pct_page_one),
      color: 'muted' as const,
    },
    {
      label: 'Improving pages',
      value: ns.improving_pages.toLocaleString('en-US'),
      delta: 0,
      context: `${ns.flat.toLocaleString('en-US')} flat pages`,
      spark: trendSeries(ns.improving_pages, 'up'),
      color: 'green' as const,
    },
    {
      label: 'Declining pages',
      value: ns.declining_pages.toLocaleString('en-US'),
      delta: 0,
      context: `${ns.pages_with_traffic.toLocaleString('en-US')} pages with traffic`,
      spark: trendSeries(ns.declining_pages, 'down'),
      color: 'red' as const,
    },
  ];

  return (
    <SeoCard style={{ marginBottom: 24 }}>
      <div className="seo-kicker" style={{ marginBottom: 18 }}>North Star · {freshDate}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 0 }}>
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            style={{
              padding: index === 0 ? '0 22px 0 0' : '0 22px',
              borderLeft: index === 0 ? 'none' : '1px solid var(--border)',
              minWidth: 0,
            }}
          >
            <div className="seo-muted" style={{ fontSize: 13, marginBottom: 6 }}>{metric.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span className="seo-mono" style={{ fontSize: 30, fontWeight: 700, color: 'var(--fg)' }}>{metric.value}</span>
              <DeltaBadge value={metric.delta} />
            </div>
            <div style={{ marginTop: 10 }}>
              <NorthStarSparkline metric={metric.label} data={metric.spark} color={metric.color} />
            </div>
            <div className="seo-mono seo-muted" style={{ marginTop: 8, fontSize: 12 }}>{metric.context}</div>
          </div>
        ))}
      </div>
    </SeoCard>
  );
}

function NorthStarSkeleton() {
  return (
    <SeoCard style={{ marginBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse" style={{ background: 'var(--surface-2)', borderRadius: 10, height: 104 }} />
        ))}
      </div>
    </SeoCard>
  );
}

function CommandCenterContent() {
  const [ns, setNs] = useState<SeoNorthStar | null>(null);
  const [pipeline, setPipeline] = useState<SeoPipelineCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    const timeout = setTimeout(() => {
      if (alive) setError('North Star data unavailable. Check API status.');
    }, 10_000);

    getSeoNorthStar().then((result) => {
      if (!alive) return;
      clearTimeout(timeout);
      setNs(result.north_star);
      setPipeline(result.pipeline);
      setLoading(false);
    }).catch((err) => {
      if (!alive) return;
      clearTimeout(timeout);
      setError(err instanceof Error ? err.message : 'Failed to load');
      setLoading(false);
    });

    return () => { alive = false; clearTimeout(timeout); };
  }, [tick]);

  const freshLabel = ns
    ? new Date(ns.data_freshness_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    : null;

  return (
    <div className="seo-page">
      <div style={{ marginBottom: 24 }}>
        <h1 className="seo-page-title">SEO Command Center</h1>
        {freshLabel && <div className="seo-page-subtitle">Data as of {freshLabel}</div>}
      </div>

      {error && (
        <SeoCard style={{ marginBottom: 20, borderColor: 'var(--red)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', color: 'var(--red)', fontSize: 13 }}>
            <span>{error}</span>
            <button type="button" onClick={() => { setError(null); setLoading(true); setTick((t) => t + 1); }} className="seo-button seo-button-danger" style={{ flex: '0 0 auto' }}>
              Retry
            </button>
          </div>
        </SeoCard>
      )}

      {loading ? <NorthStarSkeleton /> : ns ? <NorthStarCard ns={ns} /> : null}

      <div className="seo-kicker" style={{ marginBottom: 12 }}>Pipeline</div>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
          {[0, 1, 2].map((i) => <div key={i} className="animate-pulse seo-card" style={{ height: 118, background: 'var(--surface-2)' }} />)}
        </div>
      ) : pipeline ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
          <PipelineTile label="Review" count={pipeline.review ?? 0} subtitle="pages awaiting decision" href="/dashboard/seo/recommendations" active />
          <PipelineTile label="In Evaluation" count={pipeline.evaluation ?? 0} subtitle="pages being measured" href="/dashboard/seo/evaluation" />
          <PipelineTile label="Resolved" count={pipeline.resolved ?? 0} subtitle="pages with verdicts" href="/dashboard/seo/results" />
        </div>
      ) : (
        <EmptyState icon="!" title="Pipeline unavailable" body="The North Star API responded without pipeline counts." />
      )}
    </div>
  );
}

export default function SeoCommandCenter() {
  return (
    <DashboardGuard
      dashboard="seo"
      fallback={<AccessDenied message="You do not have permission to view the SEO Command Center." />}
    >
      <CommandCenterContent />
    </DashboardGuard>
  );
}
