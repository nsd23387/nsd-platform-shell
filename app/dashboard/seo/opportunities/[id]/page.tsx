'use client';

// =============================================================================
// SEO Recommendation Detail — graduated from app/seo-mockups/action-detail.
// Governance lock: read-first. Only existing approve/reject endpoints write.
// Loads the recommendation by id from the engine; degrades gracefully when
// before/after metrics aren't available (Ahrefs decommissioned).
// =============================================================================

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardGuard } from '../../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../../components/dashboard';
import { useThemeColors } from '../../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../../design/tokens/typography';
import { space, radius } from '../../../../../design/tokens/spacing';
import { violet } from '../../../../../design/tokens/colors';
import {
  getRecommendations, approveRecommendation, rejectRecommendation,
} from '../../../../../lib/seoApi';
import type { SeoRecommendation } from '../../../../../lib/seoApi';

const PALETTE = {
  violet: violet[500],
  violetSoft: '#ede9fe',
  good: '#065f46', goodSoft: '#d1fae5',
  bad: '#991b1b', badSoft: '#fee2e2',
  warn: '#92400e', warnSoft: '#fef3c7',
  info: '#1e40af', infoSoft: '#dbeafe',
};
const monoStack = '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace';

type Tone = 'good' | 'bad' | 'warn' | 'info' | 'violet' | 'neutral';

function Pill({ children, tone, tc }: { children: React.ReactNode; tone: Tone; tc: ReturnType<typeof useThemeColors> }) {
  const map: Record<Tone, { bg: string; fg: string }> = {
    good: { bg: PALETTE.goodSoft, fg: PALETTE.good },
    bad: { bg: PALETTE.badSoft, fg: PALETTE.bad },
    warn: { bg: PALETTE.warnSoft, fg: PALETTE.warn },
    info: { bg: PALETTE.infoSoft, fg: PALETTE.info },
    violet: { bg: PALETTE.violetSoft, fg: PALETTE.violet },
    neutral: { bg: tc.background.muted, fg: tc.text.muted },
  };
  const s = map[tone];
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 999,
      fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold,
      background: s.bg, color: s.fg,
    }}>{children}</span>
  );
}

function Label({ children, tc }: { children: React.ReactNode; tc: ReturnType<typeof useThemeColors> }) {
  return (
    <div style={{
      fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold,
      color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: space['2'],
    }}>{children}</div>
  );
}

function mapIntent(rec: SeoRecommendation): { label: string; tone: Tone } {
  const t = (rec.opportunity_type || '').toLowerCase();
  if (t.includes('ctr') || t.includes('title') || t.includes('meta')) return { label: 'improve_ctr', tone: 'violet' };
  if (t.includes('strengthen') || t.includes('expand') || t.includes('content')) return { label: 'strengthen_page', tone: 'info' };
  if (t.includes('link')) return { label: 'add_internal_links', tone: 'good' };
  if (t.includes('create') || t.includes('new')) return { label: 'create_page', tone: 'warn' };
  return { label: t || 'optimize', tone: 'neutral' };
}

function RecommendationDetailContent() {
  const tc = useThemeColors();
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  const [rec, setRec] = useState<SeoRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await getRecommendations();
        if (cancelled) return;
        const found = all.find((r) => r.id === id) ?? null;
        setRec(found);
        if (!found) setError('Recommendation not found.');
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function handleApprove() {
    if (!rec) return;
    setBusy('approve');
    try {
      await approveRecommendation(rec.id);
      setRec({ ...rec, status: 'approved' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve failed.');
    } finally { setBusy(null); }
  }
  async function handleReject() {
    if (!rec) return;
    setBusy('reject');
    try {
      await rejectRecommendation(rec.id);
      setRec({ ...rec, status: 'rejected' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject failed.');
    } finally { setBusy(null); }
  }

  if (loading) {
    return <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>Loading recommendation…</div>;
  }
  if (!rec) {
    return (
      <div style={{ padding: space['6'], fontFamily: fontFamily.body, color: tc.text.primary }}>
        <a href="/dashboard/seo" style={{ color: PALETTE.violet, fontSize: '12px' }}>← Back to SEO Command Center</a>
        <div style={{ marginTop: space['4'] }}>{error ?? 'Recommendation not found.'}</div>
      </div>
    );
  }

  const intent = mapIntent(rec);
  const url = rec.target_url || rec.recommended_url || '—';
  const title = rec.recommended_title || rec.recommended_action || rec.cluster_topic || rec.primary_keyword || 'Recommendation';
  const why = rec.recommended_meta_description
    || (rec.cluster_topic ? `Cluster "${rec.cluster_topic}" — primary keyword "${rec.primary_keyword}".` : 'Engine-generated opportunity.');
  const card: React.CSSProperties = {
    backgroundColor: tc.background.surface,
    border: `1px solid ${tc.border.default}`,
    borderRadius: radius.lg,
    padding: space['5'],
  };

  return (
    <div style={{ padding: space['6'], maxWidth: 1100, margin: '0 auto', fontFamily: fontFamily.body, color: tc.text.primary }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: '12px', color: tc.text.muted, marginBottom: space['4'] }}>
        <a href="/dashboard/seo" style={{ color: PALETTE.violet, textDecoration: 'none' }}>SEO Command Center</a>
        <span style={{ margin: '0 6px' }}>/</span>
        <a href="/dashboard/seo/opportunities" style={{ color: PALETTE.violet, textDecoration: 'none' }}>Do this next</a>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>Recommendation</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space['6'], gap: space['4'], flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', gap: space['2'], alignItems: 'center', marginBottom: space['2'], flexWrap: 'wrap' }}>
            <Pill tone={intent.tone} tc={tc}>{intent.label}</Pill>
            <Pill tone="neutral" tc={tc}>Phase 1 · Quick win</Pill>
            <Pill tone={rec.status === 'approved' ? 'good' : rec.status === 'rejected' ? 'bad' : 'info'} tc={tc}>
              Status: {rec.status.replace('_', ' ')}
            </Pill>
          </div>
          <h1 data-testid="text-rec-title"
            style={{ fontFamily: fontFamily.display, fontSize: '24px', fontWeight: fontWeight.semibold, margin: 0 }}>
            {title}
          </h1>
          <div style={{ fontSize: '13px', color: tc.text.muted, marginTop: '4px', fontFamily: monoStack, wordBreak: 'break-all' }}>{url}</div>
        </div>
        <div style={{ display: 'flex', gap: space['2'] }}>
          <button data-testid="button-reject" onClick={handleReject}
            disabled={busy != null || rec.status !== 'pending_review'}
            style={{ padding: '8px 14px', background: tc.background.surface, border: `1px solid ${tc.border.strong}`, borderRadius: radius.md, fontSize: '13px', color: tc.text.muted, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy === 'reject' ? 'Rejecting…' : 'Reject'}
          </button>
          <button data-testid="button-approve" onClick={handleApprove}
            disabled={busy != null || rec.status !== 'pending_review'}
            style={{ padding: '8px 18px', background: PALETTE.violet, color: '#ffffff', border: 'none', borderRadius: radius.md, fontSize: '13px', fontWeight: fontWeight.medium, cursor: 'pointer', opacity: busy || rec.status !== 'pending_review' ? 0.6 : 1 }}>
            {busy === 'approve' ? 'Approving…' : rec.status === 'approved' ? 'Approved' : 'Approve & queue'}
          </button>
        </div>
      </div>

      {/* WHY */}
      <div style={{ ...card, marginBottom: space['4'] }}>
        <Label tc={tc}>Why we&rsquo;re recommending this</Label>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: fontSize.sm, lineHeight: lineHeight.relaxed }}>
          <li>{why}</li>
          <li>Cluster: <strong>{rec.cluster_topic || '—'}</strong> · Primary keyword: <strong>{rec.primary_keyword || '—'}</strong></li>
          {rec.estimated_impact && <li>Estimated lift: <strong style={{ color: PALETTE.good }}>{rec.estimated_impact}</strong></li>}
        </ul>
      </div>

      {/* BEFORE / AFTER */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space['4'], marginBottom: space['4'] }}>
        <div style={card}>
          <Label tc={tc}>Before</Label>
          <div style={{ padding: space['3'], background: PALETTE.badSoft, border: `1px solid ${PALETTE.bad}30`, borderRadius: radius.md, marginBottom: space['3'] }}>
            <div style={{ fontSize: '12px', color: PALETTE.bad, marginBottom: '4px', fontWeight: fontWeight.semibold }}>Current</div>
            <div style={{ fontSize: fontSize.sm, fontFamily: monoStack, wordBreak: 'break-word' }}>{rec.target_url || rec.recommended_url || '—'}</div>
          </div>
          <div style={{ fontSize: '12px', color: tc.text.muted, lineHeight: lineHeight.relaxed }}>
            Baseline metrics (position / impressions / CTR) require GSC enrichment for this URL. Use Page Performance to drill in.
          </div>
        </div>
        <div style={card}>
          <Label tc={tc}>After (proposed)</Label>
          <div style={{ padding: space['3'], background: PALETTE.goodSoft, border: `1px solid ${PALETTE.good}30`, borderRadius: radius.md, marginBottom: space['3'] }}>
            <div style={{ fontSize: '12px', color: PALETTE.good, marginBottom: '4px', fontWeight: fontWeight.semibold }}>Proposed</div>
            <div style={{ fontSize: fontSize.sm, fontFamily: monoStack, wordBreak: 'break-word' }}>
              {rec.recommended_title || rec.recommended_action || '—'}
            </div>
          </div>
          {rec.recommended_meta_description && (
            <div style={{ fontSize: '12px', color: tc.text.muted, lineHeight: lineHeight.relaxed }}>
              {rec.recommended_meta_description}
            </div>
          )}
        </div>
      </div>

      {/* OUTCOMES & MEASUREMENT PLAN */}
      <div style={{ ...card, marginBottom: space['4'] }}>
        <Label tc={tc}>Expected outcomes &amp; measurement plan</Label>
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${tc.border.subtle}`, textAlign: 'left' }}>
              {['KPI', 'Baseline (28d)', '14-day target', '30-day target', 'Success threshold'].map((h, i) => (
                <th key={h} style={{
                  padding: '8px 0', fontSize: '11px', fontWeight: fontWeight.semibold,
                  color: tc.text.muted, textTransform: 'uppercase', textAlign: i === 0 ? 'left' : 'right',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Clicks / week', '—', '—', '—', '≥ 20 (statistical)'],
              ['CTR', '—', '—', '—', '≥ 1.5%'],
              ['Avg position', '—', '—', '—', 'No regression > 0.5'],
              ['Conversions', '—', '—', '—', '≥ 1'],
            ].map((r) => (
              <tr key={r[0]} style={{ borderBottom: `1px solid ${tc.border.subtle}` }}>
                <td style={{ padding: '10px 0' }}>{r[0]}</td>
                {r.slice(1).map((v, i) => (
                  <td key={i} style={{ padding: '10px 0', textAlign: 'right', color: tc.text.muted, fontFamily: monoStack }}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: space['3'], fontSize: '12px', color: tc.text.muted, lineHeight: lineHeight.relaxed }}>
          Targets populate automatically once the engine emits per-recommendation forecasts. Measurement window: day 14 → day 42 after deploy.
        </div>
      </div>

      {/* EVIDENCE + RISK */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: space['4'] }}>
        <div style={card}>
          <Label tc={tc}>Supporting evidence</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: space['2'], fontSize: '13px' }}>
            <a href={`/dashboard/seo/pages?url=${encodeURIComponent(url)}`} style={{ color: PALETTE.violet, textDecoration: 'none' }}>→ View page performance for this URL</a>
            <a href={`/dashboard/seo/clusters`} style={{ color: PALETTE.violet, textDecoration: 'none' }}>→ Cluster: {rec.cluster_topic || '—'}</a>
            <a href={`/dashboard/seo/internal-links`} style={{ color: PALETTE.violet, textDecoration: 'none' }}>→ Internal linking graph</a>
            <a href={`/dashboard/seo/competitive`} style={{ color: PALETTE.violet, textDecoration: 'none' }}>→ Competitor SERP snapshot</a>
          </div>
        </div>
        <div style={card}>
          <Label tc={tc}>Risk &amp; assumptions</Label>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '12px', lineHeight: lineHeight.relaxed, color: tc.text.primary }}>
            <li>Recommendation generated by the cluster engine based on your tracked clusters.</li>
            <li>Approval queues the action — execution stays read-only until the engine processes it.</li>
            <li>Reject or modify before approving if the recommendation does not match brand voice.</li>
          </ul>
        </div>
      </div>

      <div style={{ marginTop: space['6'] }}>
        <button onClick={() => router.push('/dashboard/seo')}
          style={{ padding: '8px 14px', background: tc.background.surface, border: `1px solid ${tc.border.strong}`, borderRadius: radius.md, fontSize: '13px', color: tc.text.primary, cursor: 'pointer' }}>
          ← Back to SEO Command Center
        </button>
      </div>
    </div>
  );
}

export default function RecommendationDetailPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied message="You do not have permission to view SEO recommendations." />}>
      <RecommendationDetailContent />
    </DashboardGuard>
  );
}
