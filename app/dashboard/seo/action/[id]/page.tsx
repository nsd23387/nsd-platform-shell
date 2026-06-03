'use client';

// =============================================================================
// SEO Command Center — Screen 2 (Action Card / recommendation detail)
// Governance lock: read-first. The ONLY writes are approve/reject of THIS
// engine candidate, routed through approveEngineCandidate / rejectEngineCandidate
// -> /api/proxy/seo/recommendations. Approve creates a DRAFT only; nothing
// executes from this screen.
//
// Data truthfulness: the WHY bullets, before/after state, and baselines are all
// live reads (candidate.evidence jsonb + the target page's GSC dossier). We do
// NOT fabricate predicted lift, predicted CTR, or 14/30-day target numbers —
// targets are framed as "measured post-deploy" because there is no modelled
// projection for ANY of these candidate types in the source data. The card is
// rendered from the candidate's real mutation_type (title/meta/h1/schema/
// internal_link/redirect) — never a hardcoded action type.
// =============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DashboardGuard } from '../../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../../components/dashboard';
import { useThemeColors } from '../../../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../../../design/tokens/typography';
import { space, radius } from '../../../../../design/tokens/spacing';
import {
  getSeoCandidate, getSeoPageDossier,
  approveEngineCandidate, rejectEngineCandidate,
} from '../../../../../lib/seoApi';
import type { SeoCandidateDetail, PageDossier } from '../../../../../lib/seoApi';
import {
  PALETTE, monoStack, Tc, Pill, fmtInt, fmtPos, pathOf, mutationDisplay,
  GateTransitionNote, KeywordTargetsSection, RoutedQueriesSection,
  LaneRoutedActions, MeasurementPlan,
} from '../../_shared';

function Card({ children, style, tc }: { children: React.ReactNode; style?: React.CSSProperties; tc: Tc }) {
  return (
    <div style={{ background: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.md, padding: space['5'], ...style }}>
      {children}
    </div>
  );
}

function Label({ children, tc }: { children: React.ReactNode; tc: Tc }) {
  return (
    <div style={{ fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold, color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: space['2'] }}>
      {children}
    </div>
  );
}

function ActionDetailContent() {
  const tc = useThemeColors();
  const router = useRouter();
  const params = useParams();
  const id = decodeURIComponent(Array.isArray(params.id) ? params.id[0] : (params.id ?? ''));

  const [candidate, setCandidate] = useState<SeoCandidateDetail | null>(null);
  const [dossier, setDossier] = useState<PageDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'approve' | 'reject'>(null);
  const [done, setDone] = useState<null | 'approved' | 'rejected'>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!id) { setError('Missing recommendation id'); setLoading(false); return; }
    setLoading(true); setError(null);
    getSeoCandidate(id)
      .then(async (c) => {
        if (!alive) return;
        setCandidate(c);
        if (c.target_page_url) {
          try {
            const d = await getSeoPageDossier(c.target_page_url);
            if (alive) setDossier(d);
          } catch { /* dossier is best-effort context; card still renders */ }
        }
      })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load recommendation'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  const evidence = candidate?.evidence ?? null;
  const sourceNode = evidence?.source ?? null;
  const targetNode = evidence?.target ?? null;
  const signals = evidence?.signals ?? null;
  const score = candidate?.opportunity_score != null ? Math.round(candidate.opportunity_score * 100) : null;

  // Real GSC baseline for the page being edited (the source page).
  // Position AND impressions are both the TOP-QUERY figures from the SAME
  // source — the engine dossier's demand[0] (analytics.seo_page_dossier.demand,
  // ordered impressions DESC) — so they agree with the detection row and the
  // keyword-targets section (homepage: "neon signs", position 45.6, 4,849 imp).
  // We deliberately do NOT mix the raw GSC-metrics demand lane (which yields an
  // impression-weighted page-ish position) for the position field, nor
  // gsc_best_position (all-time min, overstates rank) or gsc_impressions
  // (page-level total across every query). The GSC-metrics lane and
  // page-inventory fields remain only as last-resort fallbacks when the engine
  // has not produced a dossier record for the page.
  const baseline = useMemo(() => {
    const p = dossier?.page;
    const engineTop = dossier?.dossier?.demand?.[0] ?? null;
    const gscTop = dossier?.demand?.[0] ?? null;
    return {
      impressions: engineTop?.impressions ?? gscTop?.impressions ?? p?.gsc_impressions ?? null,
      position: engineTop?.position ?? gscTop?.avg_position ?? null,
      topQuery: engineTop?.query ?? gscTop?.query ?? p?.gsc_top_query ?? null,
    };
  }, [dossier]);

  const md = mutationDisplay(candidate?.mutation_type, candidate?.primary_remedy);
  const isInternalLink = (candidate?.mutation_type ?? '').toLowerCase().includes('internal_link');

  async function act(kind: 'approve' | 'reject') {
    if (!candidate || busy) return;
    setBusy(kind); setActionErr(null);
    try {
      if (kind === 'approve') {
        await approveEngineCandidate({
          candidate_id: candidate.candidate_id,
          opportunity_id: candidate.opportunity_id ?? undefined,
          proposed_value: candidate.proposed_value ?? undefined,
          target_page_url: candidate.target_page_url ?? undefined,
        });
        setDone('approved');
      } else {
        await rejectEngineCandidate({
          candidate_id: candidate.candidate_id,
          opportunity_id: candidate.opportunity_id ?? undefined,
        });
        setDone('rejected');
      }
      setTimeout(() => router.push('/dashboard/seo'), 1200);
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  const crumb = { fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted } as const;
  const linkStyle = { color: PALETTE.violet, textDecoration: 'none' } as const;

  return (
    <div style={{ padding: space['6'], maxWidth: 1100, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ ...crumb, marginBottom: space['4'] }}>
        <Link href="/dashboard/seo" style={linkStyle} data-testid="link-back-command-center">SEO Command Center</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>Recommendation {id.slice(0, 8)}…</span>
      </div>

      {loading && <div style={{ padding: space['6'], color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>Loading recommendation…</div>}
      {error && <div style={{ padding: space['4'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>{error}</div>}

      {candidate && !loading && (
        <>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space['5'], gap: space['4'], flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: space['2'], alignItems: 'center', marginBottom: space['2'], flexWrap: 'wrap' }}>
                <Pill tone="violet" tc={tc}>{md.tag}</Pill>
                {candidate.confidence_tier && <Pill tone="info" tc={tc}>confidence: {candidate.confidence_tier}</Pill>}
                {score != null && <Pill tone="neutral" tc={tc}>score {score}</Pill>}
                {candidate.gate_status && <Pill tone="good" tc={tc}>gate: {candidate.gate_status}</Pill>}
              </div>
              <h1 style={{ fontFamily: fontFamily.display, fontSize: '24px', fontWeight: fontWeight.semibold, color: tc.text.primary, margin: 0 }}>
                {md.verb(candidate.proposed_value)}
              </h1>
              <div style={{ fontFamily: monoStack, fontSize: '13px', color: tc.text.muted, marginTop: '4px', wordBreak: 'break-all' }}>
                {candidate.target_page_url ? pathOf(candidate.target_page_url) : '—'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap' }}>
              <button
                onClick={() => act('reject')}
                disabled={busy !== null || done !== null}
                data-testid="button-reject"
                style={{ padding: '8px 14px', background: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.sm, fontFamily: fontFamily.body, fontSize: '13px', color: PALETTE.bad, cursor: (busy || done) ? 'default' : 'pointer', opacity: (busy || done) ? 0.6 : 1 }}
              >
                {busy === 'reject' ? 'Rejecting…' : 'Reject'}
              </button>
              <button
                onClick={() => act('approve')}
                disabled={busy !== null || done !== null}
                data-testid="button-approve-queue"
                style={{ padding: '8px 18px', background: PALETTE.violet, color: '#fff', border: 'none', borderRadius: radius.sm, fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, cursor: (busy || done) ? 'default' : 'pointer', opacity: (busy || done) ? 0.6 : 1 }}
              >
                {busy === 'approve' ? 'Queuing…' : 'Approve & queue (draft)'}
              </button>
            </div>
          </div>

          {done && (
            <div style={{ marginBottom: space['4'], padding: space['3'], borderRadius: radius.sm, background: done === 'approved' ? PALETTE.goodSoft : PALETTE.badSoft, color: done === 'approved' ? PALETTE.good : PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="text-done">
              {done === 'approved' ? 'Queued as DRAFT. Returning to Command Center…' : 'Rejected. Returning to Command Center…'}
            </div>
          )}
          {actionErr && (
            <div style={{ marginBottom: space['4'], padding: space['3'], borderRadius: radius.sm, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>{actionErr}</div>
          )}

          {/* WHY */}
          <Card tc={tc} style={{ marginBottom: space['4'] }}>
            <Label tc={tc}>Why we&apos;re recommending this</Label>
            <ul style={{ margin: 0, paddingLeft: 20, fontFamily: fontFamily.body, fontSize: '14px', lineHeight: 1.7, color: tc.text.primary }}>
              {evidence?.why && <li data-testid="text-why">{evidence.why}</li>}
              {candidate.evidence_summary && candidate.evidence_summary !== evidence?.why && <li>{candidate.evidence_summary}</li>}
              {isInternalLink && sourceNode?.entity && targetNode?.entity && (
                <li>
                  Source page <strong>{sourceNode.entity}</strong>{sourceNode.intent ? ` (${sourceNode.intent})` : ''} is topically related to <strong>{targetNode.entity}</strong>{targetNode.intent ? ` (${targetNode.intent})` : ''} — an internal link passes relevance &amp; equity between them.
                </li>
              )}
              {signals?.embedding_cosine != null && (
                <li>
                  Semantic similarity (embedding cosine) is <strong>{Number(signals.embedding_cosine).toFixed(2)}</strong>
                  {signals.hierarchy_proximity != null && <> · hierarchy proximity <strong>{String(signals.hierarchy_proximity)}</strong></>}
                  {Array.isArray(signals.shared_attributes) && signals.shared_attributes.length > 0 && <> · shared attributes: {signals.shared_attributes.join(', ')}</>}
                </li>
              )}
              {!evidence?.why && !candidate.evidence_summary && !sourceNode?.entity && (
                <li style={{ color: tc.text.muted }}>No structured rationale recorded for this candidate beyond the gate decision.</li>
              )}
            </ul>
          </Card>

          {/* BEFORE / AFTER */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space['4'], marginBottom: space['4'] }}>
            <Card tc={tc}>
              <Label tc={tc}>Before</Label>
              <div style={{ padding: space['3'], background: PALETTE.badSoft, border: `1px solid ${PALETTE.bad}30`, borderRadius: radius.sm, marginBottom: space['3'] }}>
                <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: PALETTE.bad, marginBottom: '4px', fontWeight: fontWeight.semibold }}>Current state</div>
                <div style={{ fontFamily: fontFamily.body, fontSize: '14px', color: tc.text.primary }}>
                  {isInternalLink
                    ? <>No internal link from this page to {targetNode?.entity ? <strong>{targetNode.entity}</strong> : 'the related page'}.</>
                    : candidate.current_value_snapshot
                      ? <>Current value: <strong>{candidate.current_value_snapshot}</strong></>
                      : <>Current {md.tag.toLowerCase()} on this page — see the live page for the existing value.</>}
                </div>
              </div>
              <table style={{ width: '100%', fontFamily: fontFamily.body, fontSize: '13px' }}>
                <tbody>
                  <tr><td style={{ padding: '4px 0', color: tc.text.muted }}>Top query</td><td style={{ textAlign: 'right', color: tc.text.primary }}>{baseline.topQuery || '—'}</td></tr>
                  <tr><td style={{ padding: '4px 0', color: tc.text.muted }}>Top-query position</td><td style={{ textAlign: 'right', fontFamily: monoStack }}>{fmtPos(baseline.position)}</td></tr>
                  <tr><td style={{ padding: '4px 0', color: tc.text.muted }}>Top-query impressions</td><td style={{ textAlign: 'right', fontFamily: monoStack }}>{fmtInt(baseline.impressions)}</td></tr>
                </tbody>
              </table>
              <div style={{ marginTop: space['2'], fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted }}>Live GSC baseline for this page.</div>
            </Card>
            <Card tc={tc}>
              <Label tc={tc}>After (proposed)</Label>
              <div style={{ padding: space['3'], background: PALETTE.goodSoft, border: `1px solid ${PALETTE.good}30`, borderRadius: radius.sm, marginBottom: space['3'] }}>
                <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: PALETTE.good, marginBottom: '4px', fontWeight: fontWeight.semibold }}>Proposed change</div>
                <div style={{ fontFamily: fontFamily.body, fontSize: '14px', color: tc.text.primary }}>
                  {isInternalLink
                    ? <>Insert a contextual internal link to {candidate.proposed_value ? <strong>{candidate.proposed_value}</strong> : 'the related page'}{targetNode?.url ? <> (<span style={{ fontFamily: monoStack, fontSize: '12px' }}>{pathOf(targetNode.url)}</span>)</> : ''}.</>
                    : candidate.proposed_value
                      ? <>{md.verb()} → <strong>{candidate.proposed_value}</strong></>
                      : <>{md.verb()}.</>}
                </div>
              </div>
              <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.secondary, lineHeight: 1.6 }}>
                No modelled click/position projection is generated for this change in the source data. Outcomes are measured against the live baseline after deploy (see measurement plan below).
              </div>
            </Card>
          </div>

          {/* DOSSIER-BOUND CONTEXT — identical engine reasoning to Screen 1 */}
          {dossier && (
            <Card tc={tc} style={{ marginBottom: space['4'] }}>
              <Label tc={tc}>Engine page dossier</Label>
              <GateTransitionNote transitions={dossier.transitions} tc={tc} />
              <KeywordTargetsSection meta={dossier.dossier} tc={tc} />
              <RoutedQueriesSection meta={dossier.dossier} tc={tc} />
              <LaneRoutedActions dossier={dossier} tc={tc} onDone={() => router.refresh()} readOnly />
            </Card>
          )}

          {/* MEASUREMENT PLAN — honest, GSC-anchored (shared with Screen 1) */}
          {dossier && (
            <Card tc={tc} style={{ marginBottom: space['4'] }}>
              <MeasurementPlan dossier={dossier} tc={tc} />
              <div style={{ display: 'flex', gap: space['4'], marginTop: space['3'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, flexWrap: 'wrap' }}>
                <span>🔁 {isInternalLink ? 'Internal-link changes are fully reversible in <1 min.' : 'This change is draft-only until executed downstream and is reversible.'}</span>
                <span>ℹ️ Clicks baseline sums the page&apos;s top GSC queries (demand table), not every long-tail query.</span>
              </div>
            </Card>
          )}

          {/* EVIDENCE + RISK */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: space['4'] }}>
            <Card tc={tc}>
              <Label tc={tc}>Supporting evidence</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: space['2'], fontFamily: fontFamily.body, fontSize: '13px' }}>
                {candidate.target_page_url && (
                  <a href={candidate.target_page_url} target="_blank" rel="noopener noreferrer" style={linkStyle} data-testid="link-source-live">→ Open source page live ↗</a>
                )}
                {targetNode?.url && (
                  <a href={targetNode.url} target="_blank" rel="noopener noreferrer" style={linkStyle} data-testid="link-target-live">→ Open link-target page live ↗</a>
                )}
                {candidate.opportunity_id && (
                  <span style={{ color: tc.text.muted }}>→ Opportunity id <span style={{ fontFamily: monoStack }}>{candidate.opportunity_id}</span></span>
                )}
                {dossier && (
                  <span style={{ color: tc.text.muted }}>→ {dossier.demand.length} GSC queries on the source page · {dossier.candidates.length} engine candidate(s)</span>
                )}
                {!candidate.target_page_url && !targetNode?.url && (
                  <span style={{ color: tc.text.muted }}>No external evidence links recorded.</span>
                )}
              </div>
            </Card>
            <Card tc={tc}>
              <Label tc={tc}>Risk &amp; assumptions</Label>
              <ul style={{ margin: 0, paddingLeft: 18, fontFamily: fontFamily.body, fontSize: '12px', lineHeight: 1.6, color: tc.text.primary }}>
                {isInternalLink ? (
                  <>
                    <li>Relevance is scored from embeddings + shared attributes, not editorial review — sanity-check the anchor context.</li>
                    <li>Internal-link insertion is metadata/navigation only — no risk to existing page content.</li>
                  </>
                ) : (
                  <li>This change modifies on-page {md.tag.toLowerCase()} — review the proposed value against the live page before approving.</li>
                )}
                <li>Fully reversible; approving creates a DRAFT that still requires execution downstream.</li>
                {candidate.gate_reasons.length > 0 && (
                  <li>Gate notes: {candidate.gate_reasons.join('; ')}</li>
                )}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default function ActionDetailPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied message="You do not have permission to view this recommendation." />}>
      <ActionDetailContent />
    </DashboardGuard>
  );
}
