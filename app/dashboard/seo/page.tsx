'use client';

import React, { useEffect, useState } from 'react';
import { DashboardGuard } from '../../../hooks/useRBAC';
import { AccessDenied } from '../../../components/dashboard';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import { getSeoNorthStar } from '../../../lib/seoApi';
import type { SeoNorthStar, SeoPipelineCounts } from '../../../lib/seoApi';
import { PALETTE, monoStack, type Tc } from './_shared';
import { PipelineTile } from './components/PipelineTile';

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function DeltaBadge({ value, tc }: { value: number; tc: Tc }) {
  const positive = value >= 0;
  const color = positive ? PALETTE.good : PALETTE.bad;
  const bg = positive ? PALETTE.goodSoft : PALETTE.badSoft;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 7px',
        borderRadius: 999,
        fontSize: '11px',
        fontWeight: fontWeight.semibold,
        background: bg,
        color,
        fontFamily: fontFamily.body,
        marginLeft: space['2'],
      }}
    >
      {fmtPct(value)}
    </span>
  );
}

function NorthStarCard({ ns, tc }: { ns: SeoNorthStar; tc: Tc }) {
  const freshDate = new Date(ns.data_freshness_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });

  return (
    <div
      style={{
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.lg,
        padding: space['6'],
        background: tc.background.surface,
        marginBottom: space['6'],
      }}
    >
      <div
        style={{
          fontFamily: fontFamily.body,
          fontSize: '11px',
          fontWeight: fontWeight.semibold,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.07em',
          color: tc.text.muted,
          marginBottom: space['4'],
        }}
      >
        North Star · {freshDate}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: space['4'],
        }}
      >
        {/* Clicks 28d */}
        <div>
          <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginBottom: '2px' }}>
            Clicks 28d
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: space['1'] }}>
            <span style={{ fontFamily: monoStack, fontSize: '28px', fontWeight: fontWeight.semibold, color: tc.text.primary }}>
              {ns.total_clicks_28d.toLocaleString('en-US')}
            </span>
            <DeltaBadge value={ns.clicks_delta_pct} tc={tc} />
          </div>
        </div>

        {/* % Page 1 */}
        <div>
          <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginBottom: '2px' }}>
            % Page 1
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: space['1'] }}>
            <span style={{ fontFamily: monoStack, fontSize: '28px', fontWeight: fontWeight.semibold, color: tc.text.primary }}>
              {ns.pct_page_one.toFixed(1)}%
            </span>
            <DeltaBadge value={ns.pct_page_one_delta} tc={tc} />
          </div>
        </div>

        {/* Improving / Declining */}
        <div>
          <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginBottom: '2px' }}>
            Improving pages
          </div>
          <span style={{ fontFamily: monoStack, fontSize: '28px', fontWeight: fontWeight.semibold, color: PALETTE.good }}>
            {ns.improving_pages.toLocaleString('en-US')}
          </span>
        </div>

        <div>
          <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginBottom: '2px' }}>
            Declining pages
          </div>
          <span style={{ fontFamily: monoStack, fontSize: '28px', fontWeight: fontWeight.semibold, color: PALETTE.bad }}>
            {ns.declining_pages.toLocaleString('en-US')}
          </span>
        </div>
      </div>
    </div>
  );
}

function NorthStarSkeleton({ tc }: { tc: Tc }) {
  return (
    <div
      aria-label="Loading North Star metrics"
      style={{
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.lg,
        padding: space['6'],
        background: tc.background.surface,
        marginBottom: space['6'],
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: space['4'] }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse" style={{ background: tc.background.muted, borderRadius: radius.md, height: '64px' }} />
        ))}
      </div>
    </div>
  );
}

function CommandCenterContent() {
  const tc = useThemeColors();
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
      if (alive) setError('North Star data unavailable — retrying failed. Check API status.');
    }, 10_000);

    Promise.allSettled([getSeoNorthStar()]).then(([result]) => {
      if (!alive) return;
      clearTimeout(timeout);
      if (result.status === 'fulfilled') {
        setNs(result.value.north_star);
        setPipeline(result.value.pipeline);
      } else {
        setError(result.reason instanceof Error ? result.reason.message : 'Failed to load');
      }
      setLoading(false);
    });

    return () => { alive = false; clearTimeout(timeout); };
  }, [tick]);

  const freshLabel = ns
    ? new Date(ns.data_freshness_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    : null;

  return (
    <div style={{ maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ marginBottom: space['6'] }}>
        <h1
          style={{
            fontFamily: fontFamily.display,
            fontSize: '24px',
            fontWeight: fontWeight.semibold,
            color: tc.text.primary,
            margin: 0,
          }}
        >
          SEO Command Center
        </h1>
        {freshLabel && (
          <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginTop: '4px' }}>
            Data as of {freshLabel}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: space['4'],
            borderRadius: radius.md,
            background: PALETTE.badSoft,
            color: PALETTE.bad,
            fontFamily: fontFamily.body,
            fontSize: '13px',
            marginBottom: space['6'],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => { setError(null); setLoading(true); setTick((t) => t + 1); }}
            style={{ marginLeft: space['4'], padding: `${space['1']} ${space['3']}`, borderRadius: radius.sm, border: `1px solid ${PALETTE.bad}`, background: 'transparent', color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '12px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* North Star */}
      {loading ? (
        <NorthStarSkeleton tc={tc} />
      ) : ns ? (
        <NorthStarCard ns={ns} tc={tc} />
      ) : null}

      {/* Pipeline */}
      <div
        style={{
          fontFamily: fontFamily.body,
          fontSize: '11px',
          fontWeight: fontWeight.semibold,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.07em',
          color: tc.text.muted,
          marginBottom: space['3'],
        }}
      >
        Pipeline
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: space['4'] }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ flex: 1, background: tc.background.muted, borderRadius: radius.lg, height: '112px' }}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: space['4'], flexWrap: 'wrap' }}>
          <PipelineTile
            label="Review"
            count={pipeline?.review ?? 0}
            subtitle="pages awaiting decision"
            href="/dashboard/seo/recommendations"
          />
          <PipelineTile
            label="In Evaluation"
            count={pipeline?.evaluation ?? 0}
            subtitle="pages being measured"
            href="/dashboard/seo/evaluation"
          />
          <PipelineTile
            label="Resolved"
            count={pipeline?.resolved ?? 0}
            subtitle="pages with verdicts"
            href="/dashboard/seo/results"
          />
        </div>
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
