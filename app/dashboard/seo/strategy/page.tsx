'use client';

// =============================================================================
// SEO Command Center — Strategy (read-only Strategist backlog)
// Governance lock: read-only surface for analytics.v_seo_portfolio_recommendation_ranked.
// This page never approves, rejects, drafts, publishes, or mutates execution
// candidates. CONSOLIDATE / RETIRE are planning recommendations only.
// =============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../../design/tokens/typography';
import { radius, space } from '../../../../design/tokens/spacing';
import { getSeoStrategyRecommendations } from '../../../../lib/seoApi';
import type { SeoStrategyRecommendation } from '../../../../lib/seoApi';
import { PALETTE, Pill, fmtInt, fmtScore, pathOf, type ToneKey } from '../_shared';

function label(value: string | null | undefined): string {
  if (!value) return '—';
  return value.replace(/_/g, ' ');
}

function recTone(type: string): ToneKey {
  switch (type) {
    case 'CREATE': return 'good';
    case 'PIVOT': return 'info';
    case 'CONSOLIDATE': return 'warn';
    case 'RETIRE': return 'bad';
    case 'PRIORITIZE': return 'violet';
    default: return 'neutral';
  }
}

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const scaled = value <= 1 ? value * 100 : value;
  return `${scaled.toFixed(scaled >= 10 ? 0 : 1)}%`;
}

function summarizeValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const shown = value.slice(0, 4).map(summarizeValue).filter((v) => v !== '—');
    return shown.length > 0 ? `${shown.join(', ')}${value.length > 4 ? ` +${value.length - 4} more` : ''}` : `${value.length} items`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const simple = entries
      .filter(([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
      .slice(0, 4)
      .map(([k, v]) => `${label(k)}: ${String(v)}`);
    return simple.length > 0 ? simple.join(' · ') : `${entries.length} fields`;
  }
  return '—';
}

function StructuredTrace({
  title,
  data,
  preferredKeys,
}: {
  title: string;
  data: Record<string, unknown>;
  preferredKeys: string[];
}) {
  const tc = useThemeColors();
  const entries = useMemo(() => {
    const seen = new Set<string>();
    const ordered = [
      ...preferredKeys.filter((key) => Object.prototype.hasOwnProperty.call(data, key)),
      ...Object.keys(data).filter((key) => !preferredKeys.includes(key)).slice(0, 4),
    ].filter((key) => {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return ordered.map((key) => [key, data[key]] as const).filter(([, value]) => value != null);
  }, [data, preferredKeys]);

  if (entries.length === 0) return null;

  return (
    <div style={{ marginTop: space['3'] }}>
      <div style={{ color: tc.text.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: 0, marginBottom: space['1'] }}>
        {title}
      </div>
      <div style={{ display: 'grid', gap: space['1'] }}>
        {entries.slice(0, 5).map(([key, value]) => (
          <div key={key} style={{ fontSize: '12px', lineHeight: 1.45, color: tc.text.secondary }}>
            <span style={{ fontWeight: fontWeight.medium, color: tc.text.primary }}>{label(key)}:</span>{' '}
            {summarizeValue(value)}
          </div>
        ))}
      </div>
    </div>
  );
}

function StrategyCard({ rec }: { rec: SeoStrategyRecommendation }) {
  const tc = useThemeColors();
  const type = rec.rec_type || 'STRATEGY';
  const planningOnly = type === 'CONSOLIDATE' || type === 'RETIRE';
  const targetPath = rec.target_url ? pathOf(rec.target_url) : null;
  const destinationLabel = targetPath ?? rec.proposed_slug ?? null;

  return (
    <article
      data-testid={`strategy-card-${rec.recommendation_id}`}
      style={{
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.md,
        background: tc.background.surface,
        padding: space['4'],
        display: 'grid',
        gap: space['3'],
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: space['3'], flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], flexWrap: 'wrap' }}>
          <Pill tone={recTone(type)} tc={tc}>{type}</Pill>
          {planningOnly && <Pill tone="neutral" tc={tc}>planning only</Pill>}
          {rec.depends_on_rework && <Pill tone="warn" tc={tc}>depends on rework</Pill>}
          <Pill tone="neutral" tc={tc}>{label(rec.status)}</Pill>
        </div>
        <div style={{ color: tc.text.muted, fontSize: '12px' }}>
          Rank {rec.portfolio_rank ?? '—'}
        </div>
      </div>

      <div>
        <div style={{ color: tc.text.muted, fontSize: '12px', marginBottom: space['1'] }}>Target page</div>
        {rec.target_url && destinationLabel ? (
          <Link
            href={`/dashboard/seo/performance?url=${encodeURIComponent(rec.target_url)}`}
            style={{ color: PALETTE.violet, fontWeight: fontWeight.medium, textDecoration: 'none', wordBreak: 'break-word' }}
          >
            {destinationLabel}
          </Link>
        ) : destinationLabel ? (
          <span style={{ color: tc.text.primary, fontWeight: fontWeight.medium, wordBreak: 'break-word' }}>
            {destinationLabel}
          </span>
        ) : (
          <span style={{ color: tc.text.muted }}>New page / no current target</span>
        )}
        {rec.target_url && rec.proposed_slug && (
          <div style={{ marginTop: 4, color: tc.text.secondary, fontSize: '12px' }}>
            Proposed slug: <span style={{ fontWeight: fontWeight.medium }}>{rec.proposed_slug}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: space['3'] }}>
        <div>
          <div style={{ color: tc.text.muted, fontSize: '12px' }}>Intent</div>
          <div style={{ marginTop: 3, color: tc.text.primary, fontWeight: fontWeight.medium }}>{rec.intent ?? '—'}</div>
        </div>
        <div>
          <div style={{ color: tc.text.muted, fontSize: '12px' }}>Entity</div>
          <div style={{ marginTop: 3, color: tc.text.primary, fontWeight: fontWeight.medium }}>{rec.entity ?? '—'}</div>
        </div>
      </div>

      <div style={{ border: `1px solid ${tc.border.subtle}`, borderRadius: radius.md, padding: space['3'], background: tc.background.muted }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: space['3'], alignItems: 'start' }}>
          <div>
            <div style={{ color: tc.text.muted, fontSize: '12px', marginBottom: space['1'] }}>Rationale</div>
            <p style={{ margin: 0, color: tc.text.primary, lineHeight: 1.55, fontSize: '14px' }}>
              {rec.rationale}
            </p>
          </div>
          <div style={{ textAlign: 'right', minWidth: 94 }}>
            <div style={{ color: tc.text.muted, fontSize: '12px' }}>Confidence</div>
            <div style={{ marginTop: 2, fontSize: '24px', fontWeight: fontWeight.semibold, color: tc.text.primary }}>
              {formatPercent(rec.confidence)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: space['3'] }}>
        <div>
          <div style={{ color: tc.text.muted, fontSize: '12px' }}>Conversion priority</div>
          <div style={{ marginTop: 3, fontSize: '18px', fontWeight: fontWeight.semibold }}>{fmtScore(rec.conversion_priority)}</div>
        </div>
        <div>
          <div style={{ color: tc.text.muted, fontSize: '12px' }}>Actionability</div>
          <div style={{ marginTop: 3, color: planningOnly ? PALETTE.warn : tc.text.secondary, fontWeight: fontWeight.medium }}>
            {planningOnly ? 'Strategic planning recommendation, not an approvable mutation' : 'Read-only strategy recommendation'}
          </div>
        </div>
      </div>

      <StructuredTrace
        title="Evidence"
        data={rec.evidence ?? {}}
        preferredKeys={['observation', 'leading_indicator', 'failure_check', 'demand_signal', 'conversion_weight']}
      />
      <StructuredTrace
        title="Driven by"
        data={rec.source_signals ?? {}}
        preferredKeys={['signal_type', 'normalized_keyword', 'query', 'source', 'source_signal_ids', 'page_url']}
      />
    </article>
  );
}

function StrategyContent() {
  const tc = useThemeColors();
  const [rows, setRows] = useState<SeoStrategyRecommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    getSeoStrategyRecommendations()
      .then((data) => {
        if (!alive) return;
        setRows([...data].sort((a, b) => (a.portfolio_rank ?? Number.MAX_SAFE_INTEGER) - (b.portfolio_rank ?? Number.MAX_SAFE_INTEGER)));
      })
      .catch((err) => {
        if (!alive) return;
        setRows([]);
        setError(err instanceof Error ? err.message : 'Failed to load strategy recommendations');
      });
    return () => { alive = false; };
  }, []);

  const summary = useMemo(() => {
    const data = rows ?? [];
    const byType = data.reduce<Record<string, number>>((acc, rec) => {
      const key = rec.rec_type || 'UNKNOWN';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return {
      total: data.length,
      create: byType.CREATE ?? 0,
      consolidate: byType.CONSOLIDATE ?? 0,
      retire: byType.RETIRE ?? 0,
      blocked: data.filter((rec) => rec.depends_on_rework).length,
    };
  }, [rows]);

  if (rows === null) {
    return (
      <main style={{ padding: space['6'], fontFamily: fontFamily.body, color: tc.text.primary }}>
        Loading strategy recommendations…
      </main>
    );
  }

  return (
    <main style={{ padding: space['6'], fontFamily: fontFamily.body, color: tc.text.primary }}>
      <section style={{ marginBottom: space['6'] }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: space['4'], flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, color: tc.text.muted, fontSize: '12px', textTransform: 'uppercase', letterSpacing: 0 }}>
              Strategy
            </p>
            <h1 style={{ margin: `${space['1']} 0 0`, fontSize: '28px', lineHeight: 1.15, fontWeight: fontWeight.semibold }}>
              Demand Strategist
            </h1>
          </div>
          <div style={{ color: tc.text.muted, fontSize: '13px', maxWidth: 560, lineHeight: 1.5 }}>
            Read-only portfolio recommendations from the Strategist layer. These are planning moves, not execution candidates.
          </div>
        </div>
      </section>

      {error && (
        <div style={{ marginBottom: space['4'], padding: space['4'], borderRadius: radius.md, border: `1px solid ${tc.border.default}`, color: PALETTE.bad }}>
          {error}
        </div>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: space['3'], marginBottom: space['5'] }}>
        {[
          ['Open strategy recs', fmtInt(summary.total)],
          ['Create', fmtInt(summary.create)],
          ['Consolidate', fmtInt(summary.consolidate)],
          ['Retire', fmtInt(summary.retire)],
          ['Depends on rework', fmtInt(summary.blocked)],
        ].map(([k, v]) => (
          <div key={k} style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, padding: space['4'], background: tc.background.surface }}>
            <div style={{ color: tc.text.muted, fontSize: '12px' }}>{k}</div>
            <div style={{ marginTop: space['1'], fontSize: '24px', fontWeight: fontWeight.semibold }}>{v}</div>
          </div>
        ))}
      </section>

      <section style={{ display: 'grid', gap: space['3'] }}>
        {rows.length === 0 ? (
          <div style={{ padding: space['6'], border: `1px solid ${tc.border.default}`, borderRadius: radius.md, background: tc.background.surface, color: tc.text.muted, textAlign: 'center' }}>
            No Strategy recommendations are currently open.
          </div>
        ) : (
          rows.map((rec) => <StrategyCard key={rec.recommendation_id} rec={rec} />)
        )}
      </section>
    </main>
  );
}

export default function StrategyPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied message="You do not have permission to view SEO strategy." />}>
      <StrategyContent />
    </DashboardGuard>
  );
}
