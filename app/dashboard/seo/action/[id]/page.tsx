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
  LaneRoutedActions, MeasurementPlan, proposalReview, isSchemaMutation,
} from '../../_shared';

function Card({ children, style, tc, 'data-testid': testId }: { children: React.ReactNode; style?: React.CSSProperties; tc: Tc; 'data-testid'?: string }) {
  return (
    <div data-testid={testId} style={{ background: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.md, padding: space['5'], ...style }}>
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

// -----------------------------------------------------------------------------
// Contextual diff helpers (Part B). These render the EXACT words that change so
// a reviewer can judge a real edit from a box-checking one. Pure presentation —
// no data is fabricated; when a current value / source sentence has not been
// captured by the engine yet, the caller shows an honest "not yet captured"
// state instead of these.
// -----------------------------------------------------------------------------
type DiffToken = { t: string; changed: boolean };

// Word-level LCS diff (keeps whitespace tokens so spacing is preserved). Inputs
// are short title/meta/h1 strings, so O(m*n) is fine.
function wordDiff(before: string, after: string): { beforeTokens: DiffToken[]; afterTokens: DiffToken[] } {
  const a = before.split(/(\s+)/);
  const b = after.split(/(\s+)/);
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const beforeTokens: DiffToken[] = [];
  const afterTokens: DiffToken[] = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { beforeTokens.push({ t: a[i], changed: false }); afterTokens.push({ t: b[j], changed: false }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { beforeTokens.push({ t: a[i], changed: true }); i++; }
    else { afterTokens.push({ t: b[j], changed: true }); j++; }
  }
  while (i < m) { beforeTokens.push({ t: a[i], changed: true }); i++; }
  while (j < n) { afterTokens.push({ t: b[j], changed: true }); j++; }
  return { beforeTokens, afterTokens };
}

function DiffTokens({ tokens, tone, tc }: { tokens: DiffToken[]; tone: 'removed' | 'added'; tc: Tc }) {
  const color = tone === 'removed' ? PALETTE.bad : PALETTE.good;
  const bg = tone === 'removed' ? `${PALETTE.bad}22` : `${PALETTE.good}22`;
  return (
    <span style={{ fontFamily: fontFamily.body, fontSize: '14px', color: tc.text.primary, lineHeight: 1.6 }}>
      {tokens.map((tok, k) =>
        tok.changed
          ? <mark key={k} style={{ background: bg, color, borderRadius: '3px', padding: '0 2px', textDecoration: tone === 'removed' ? 'line-through' : 'none', fontWeight: fontWeight.semibold }}>{tok.t}</mark>
          : <span key={k}>{tok.t}</span>,
      )}
    </span>
  );
}

// Split a source sentence around the candidate anchor phrase (case-insensitive,
// first occurrence). Returns [pre, match, post] or null when the phrase is not
// literally present (a 'new_sentence' proposal, or stale data).
function splitAroundAnchor(sentence: string, anchor: string): [string, string, string] | null {
  if (!sentence || !anchor) return null;
  const idx = sentence.toLowerCase().indexOf(anchor.toLowerCase());
  if (idx < 0) return null;
  return [sentence.slice(0, idx), sentence.slice(idx, idx + anchor.length), sentence.slice(idx + anchor.length)];
}

// The live page state captured in the engine dossier (analytics.seo_page_dossier
// .state.title/.meta/.h1) is stored as raw scraped HTML — it carries HTML
// entities (&amp;) and, where the source page double-encoded UTF-8 as CP1252,
// mojibake (â€" for —, â€™ for ’). We decode those purely cosmetic encoding
// artifacts so the BEFORE value reads as the characters the page actually shows.
// This only repairs encoding; it never changes the words. It is idempotent, so
// applying it to the already-clean proposed value leaves it untouched and the
// before/after word-diff stays fair.
function decodeText(s: string | null | undefined): string | null {
  if (s == null) return null;
  let t = String(s);
  const mojibake: Array<[RegExp, string]> = [
    [/\u00e2\u20ac\u201d/g, '\u2014'], // â€" -> —
    [/\u00e2\u20ac\u201c/g, '\u2013'], // â€“ -> –
    [/\u00e2\u20ac\u2122/g, '\u2019'], // â€™ -> ’
    [/\u00e2\u20ac\u02dc/g, '\u2018'], // â€˜ -> ‘
    [/\u00e2\u20ac\u0153/g, '\u201c'], // â€œ -> “
    [/\u00e2\u20ac\u009d/g, '\u201d'], // â€ -> ”
    [/\u00e2\u20ac\u00a6/g, '\u2026'], // â€¦ -> …
    [/\u00c2\u00a0/g, '\u00a0'],       // Â  -> nbsp
  ];
  for (const [re, ch] of mojibake) t = t.replace(re, ch);
  const entities: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&#39;': "'", '&#039;': "'", '&apos;': "'", '&nbsp;': '\u00a0',
    '&ndash;': '\u2013', '&mdash;': '\u2014', '&hellip;': '\u2026',
    '&rsquo;': '\u2019', '&lsquo;': '\u2018', '&ldquo;': '\u201c', '&rdquo;': '\u201d',
  };
  t = t.replace(/&[a-zA-Z#0-9]+;/g, (m) => entities[m] ?? entities[m.toLowerCase()] ?? m);
  return t;
}

function fmtPct(n: number | null | undefined): string | null {
  if (n == null || Number.isNaN(Number(n))) return null;
  const v = Number(n);
  const pct = v <= 1 ? v * 100 : v;
  return `${Math.round(pct)}%`;
}

// Friendly, honest mapping of the engine's anchor/relevance gate outcome.
function gateResultLabel(g: string | null | undefined): { text: string; tone: 'good' | 'info' | 'bad' } | null {
  if (!g) return null;
  const k = g.toLowerCase();
  if (k.includes('anchor_found') || k === 'found') return { text: 'Anchor found in existing copy', tone: 'good' };
  if (k.includes('new_sentence')) return { text: 'New sentence drafted', tone: 'info' };
  if (k.includes('not_found') || k.includes('missing')) return { text: 'No natural anchor found — scrutinize', tone: 'bad' };
  return { text: g, tone: 'info' };
}

// -----------------------------------------------------------------------------
// Execution lifecycle (Part C). Display-only. This screen creates a DRAFT
// approval and nothing else; the stages below are the engine/executor's real
// states (analytics.seo_execution_candidate.execution_status). Rollback is
// surfaced as status, never wired as a write from this read-only shell.
// -----------------------------------------------------------------------------
const LIFECYCLE_STAGES: { key: string; label: string; desc: string }[] = [
  { key: 'proposed', label: 'Proposed', desc: 'Engine generated this and the gate accepted it. Awaiting your review.' },
  { key: 'approved', label: 'Approved · draft queued', desc: 'You approve here — recorded as a DRAFT only. Nothing publishes from this screen.' },
  { key: 'draft_applied', label: 'Draft applied in WordPress', desc: 'The engine writes the change as a WordPress / Rank Math draft. Still not live.' },
  { key: 'published', label: 'Published', desc: 'A person reviews and publishes the draft in WordPress, then it is measured against the live GSC baseline.' },
];

function stageIndexOf(status: string | null | undefined): number {
  switch ((status || 'proposed').toLowerCase()) {
    case 'proposed': return 0;
    case 'approved': return 1;
    case 'draft_applied': return 2;
    case 'published': return 3;
    case 'rolled_back': return 3;
    default: return 0;
  }
}

function fmtTs(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function ApprovalLifecycle({ candidate, tc }: { candidate: SeoCandidateDetail; tc: Tc }) {
  const status = candidate.execution_status;
  const current = stageIndexOf(status);
  const rolledBack = (status || '').toLowerCase() === 'rolled_back';
  const failed = (status || '').toLowerCase() === 'failed';
  const stamps: Record<number, string | null> = {
    1: fmtTs(candidate.approval_timestamp),
    3: fmtTs(candidate.execution_timestamp),
  };
  return (
    <Card tc={tc} style={{ marginBottom: space['4'] }} data-testid="panel-approval-lifecycle">
      <Label tc={tc}>What happens after you approve</Label>
      <p style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.secondary, lineHeight: 1.6, margin: `0 0 ${space['4']} 0` }} data-testid="text-approval-explainer">
        <strong>Approve &amp; queue (draft)</strong> records your approval only — this screen creates a <strong>DRAFT</strong> and never publishes. Downstream the engine writes the change as a WordPress / Rank&nbsp;Math <strong>draft</strong>, a person reviews and <strong>publishes it in WordPress</strong>, and outcomes are then measured against the live GSC baseline. Rollback stays available if it regresses.
      </p>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: space['2'] }}>
        {LIFECYCLE_STAGES.map((stage, idx) => {
          const reached = idx <= current && !failed;
          const isCurrent = idx === current && !rolledBack && !failed;
          const dot = isCurrent ? PALETTE.violet : reached ? PALETTE.good : tc.border.default;
          return (
            <li key={stage.key} style={{ display: 'flex', gap: space['3'], alignItems: 'flex-start' }} data-testid={`stage-${stage.key}`}>
              <span style={{ marginTop: '3px', flexShrink: 0, width: 14, height: 14, borderRadius: '50%', background: reached ? dot : 'transparent', border: `2px solid ${dot}` }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: fontFamily.body, fontSize: '13px', fontWeight: isCurrent ? fontWeight.semibold : fontWeight.medium, color: isCurrent ? tc.text.primary : reached ? tc.text.primary : tc.text.muted }}>
                  {stage.label}
                  {isCurrent && <span style={{ marginLeft: space['2'], fontSize: '11px', color: PALETTE.violet, fontWeight: fontWeight.semibold }}>● current</span>}
                  {stamps[idx] && <span style={{ marginLeft: space['2'], fontSize: '11px', color: tc.text.muted, fontFamily: monoStack }}>{stamps[idx]}</span>}
                </div>
                <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, lineHeight: 1.5 }}>{stage.desc}</div>
              </div>
            </li>
          );
        })}
      </ol>
      {(rolledBack || failed) && (
        <div style={{ marginTop: space['3'], padding: space['2'], borderRadius: radius.sm, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '12px' }} data-testid="text-lifecycle-terminal">
          {rolledBack ? 'This change was published and then rolled back.' : 'The executor reported a failure applying this change.'}
        </div>
      )}
      {candidate.rollback_available && !rolledBack && (
        <div style={{ marginTop: space['3'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }} data-testid="text-rollback-status">
          🔁 Rollback available{candidate.rollback_status ? ` (${candidate.rollback_status})` : ''} — performed downstream through governance, not from this read-only screen.
        </div>
      )}
    </Card>
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
    setLoading(true); setError(null); setDossier(null); setCandidate(null);
    getSeoCandidate(id)
      .then((c) => {
        if (!alive) return;
        setCandidate(c);
        // The dossier is best-effort baseline context, so we load it on its own
        // track instead of awaiting it here. That way the card renders as soon as
        // the candidate resolves and the BEFORE baseline fills in when (or if) the
        // dossier arrives — it never blocks the whole card on a slow/absent dossier.
        if (c.target_page_url) {
          getSeoPageDossier(c.target_page_url)
            .then((d) => { if (alive) setDossier(d); })
            .catch(() => { /* card still renders without dossier */ });
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
  const score = candidate?.opportunity_score != null ? candidate.opportunity_score.toFixed(1) : null;
  const schemaApprovalPaused = isSchemaMutation(candidate?.mutation_type);

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

  // Part B context. For text mutations we diff the real current value against the
  // proposed value. The BEFORE value resolves in two tiers, both real data:
  //  1) current_value_snapshot — the exact value frozen when the candidate was
  //     generated (preferred; it's what the proposal was diffed against), or
  //  2) the LIVE page state the engine scraped into the dossier
  //     (analytics.seo_page_dossier.state.title/.meta/.h1) — the current value on
  //     the live page right now.
  // For internal links we read the captured anchor context instead. Everything
  // still degrades honestly when neither snapshot nor live state exists.
  const snapshot = candidate?.current_value_snapshot ?? null;
  const proposed = candidate?.proposed_value ?? null;
  const liveBefore = useMemo(() => {
    const state = dossier?.dossier?.state ?? null;
    if (!state) return null;
    const key = (candidate?.mutation_type ?? '').toLowerCase();
    if (key.includes('meta')) return state.meta ?? null;
    if (key.includes('title')) return state.title ?? null;
    if (key.includes('h1')) return state.h1 ?? null;
    return null;
  }, [dossier, candidate?.mutation_type]);
  // Decode encoding artifacts so the surfaced value reads as the live page shows
  // it; idempotent, so the diff against the already-clean proposed stays fair.
  const beforeValue = useMemo(() => decodeText(snapshot ?? liveBefore), [snapshot, liveBefore]);
  const beforeIsLive = snapshot == null && liveBefore != null;
  const diff = useMemo(
    () => (!isInternalLink && beforeValue && proposed ? wordDiff(beforeValue, decodeText(proposed) ?? proposed) : null),
    [isInternalLink, beforeValue, proposed],
  );
  const anchor = evidence?.anchor_context ?? null;
  const anchorSentence = anchor?.source_sentence ?? null;
  const anchorPhrase = anchor?.anchor_phrase ?? null;
  const anchorTargetUrl = anchor && 'target_url' in anchor ? (anchor as { target_url?: string }).target_url : targetNode?.url ?? null;
  const isNewSentence = (anchor?.placement_type ?? '').toLowerCase() === 'new_sentence';
  const gateResult = gateResultLabel(anchor?.gate_result);
  const anchorConfidence = fmtPct(anchor?.confidence);
  const anchorParts = anchorSentence && anchorPhrase ? splitAroundAnchor(anchorSentence, anchorPhrase) : null;

  // Defense-in-depth: the route param IS the candidate id we fetched, so a
  // loaded candidate whose id does not match the current route is stale (e.g. a
  // racing/failed refetch after navigation). Never render or act on stale data.
  const candidateMatchesRoute = !!candidate && candidate.candidate_id === id;

  // D7 governance guard: flag scaffold/placeholder proposals and title/meta that
  // don't reference the page's primary keyword target. On the Action Card we have
  // the dossier, so we can run the keyword-aware check. This is advisory — a
  // human can still deliberately approve (the whole screen IS the human gate) —
  // but it must be impossible to approve one of these without an explicit warning.
  const review = useMemo(
    () => (candidate ? proposalReview(candidate, dossier?.dossier?.keyword_targets?.primary?.keyword) : { flagged: false, reasons: [] }),
    [candidate, dossier],
  );

  async function act(kind: 'approve' | 'reject') {
    if (!candidate || !candidateMatchesRoute || busy) return;
    if (kind === 'approve' && schemaApprovalPaused) return;
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

      {candidate && candidateMatchesRoute && !loading && (
        <>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space['5'], gap: space['4'], flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: space['2'], alignItems: 'center', marginBottom: space['2'], flexWrap: 'wrap' }}>
                <Pill tone="violet" tc={tc}>{candidate.mutation_label ?? md.tag}</Pill>
                {candidate.confidence_tier && (
                  <span title="auto = engine-confident, eligible for auto-approval; review = needs a human to author/check before approval">
                    <Pill tone="info" tc={tc}>confidence: {candidate.confidence_tier}</Pill>
                  </span>
                )}
                {score != null && <Pill tone="neutral" tc={tc}>score {score}</Pill>}
                {candidate.gate_status && <Pill tone="good" tc={tc}>gate: {candidate.gate_status}</Pill>}
                {schemaApprovalPaused && <Pill tone="warn" tc={tc}>schema paused</Pill>}
                {candidate.approval_status === 'approved' && <Pill tone="good" tc={tc}>approved · active draft</Pill>}
                {candidate.approval_status === 'rejected' && <Pill tone="bad" tc={tc}>rejected</Pill>}
              </div>
              <h1 style={{ fontFamily: fontFamily.display, fontSize: '24px', fontWeight: fontWeight.semibold, color: tc.text.primary, margin: 0 }}>
                {candidate.mutation_label ?? md.verb(candidate.proposed_value)}
              </h1>
              <div style={{ fontFamily: monoStack, fontSize: '13px', color: tc.text.muted, marginTop: '4px', wordBreak: 'break-all' }}>
                {candidate.page_url_canonical ?? (candidate.target_page_url ? pathOf(candidate.target_page_url) : '—')}
              </div>
            </div>
            {candidate.approval_status === 'approved' || candidate.approval_status === 'rejected' ? (
              // A3: this candidate is already decided. The page has exactly one title/meta/H1,
              // so we surface the single active decision instead of re-offering Approve/Reject
              // (which would let a reviewer queue a second conflicting proposal for the field).
              <div
                data-testid="text-decided-state"
                style={{ padding: '8px 14px', maxWidth: 340, borderRadius: radius.sm, fontFamily: fontFamily.body, fontSize: '13px', lineHeight: 1.5, background: candidate.approval_status === 'approved' ? PALETTE.goodSoft : PALETTE.badSoft, color: candidate.approval_status === 'approved' ? PALETTE.good : PALETTE.bad }}
              >
                {candidate.approval_status === 'approved'
                  ? 'Approved — the active proposal for this field (recorded as a draft). No further action here.'
                  : 'Rejected — not queued. No further action here.'}
              </div>
            ) : (
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
                  disabled={busy !== null || done !== null || schemaApprovalPaused}
                  data-testid="button-approve-queue"
                  title={schemaApprovalPaused ? 'Schema execution temporarily paused — write path under repair.' : undefined}
                  style={{ padding: '8px 18px', background: schemaApprovalPaused ? tc.background.muted : PALETTE.violet, color: schemaApprovalPaused ? tc.text.muted : '#fff', border: schemaApprovalPaused ? `1px solid ${tc.border.default}` : 'none', borderRadius: radius.sm, fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, cursor: (busy || done || schemaApprovalPaused) ? 'default' : 'pointer', opacity: (busy || done) ? 0.6 : 1 }}
                >
                  {busy === 'approve' ? 'Queuing…' : schemaApprovalPaused ? 'Schema approval paused' : 'Approve & queue (draft)'}
                </button>
              </div>
            )}
          </div>

          {schemaApprovalPaused && candidate.approval_status === 'pending' && (
            <div style={{ marginBottom: space['4'], padding: space['4'], borderRadius: radius.md, background: PALETTE.warnSoft, color: PALETTE.warn, fontFamily: fontFamily.body, fontSize: '13px', lineHeight: 1.5 }} data-testid="banner-schema-approval-paused">
              Schema execution temporarily paused — write path under repair. This recommendation remains visible for review, but approval is disabled until Batch 1 re-enables schema writes.
            </div>
          )}

          {done && (
            <div style={{ marginBottom: space['4'], padding: space['3'], borderRadius: radius.sm, background: done === 'approved' ? PALETTE.goodSoft : PALETTE.badSoft, color: done === 'approved' ? PALETTE.good : PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="text-done">
              {done === 'approved' ? 'Queued as DRAFT. Returning to Command Center…' : 'Rejected. Returning to Command Center…'}
            </div>
          )}
          {actionErr && (
            <div style={{ marginBottom: space['4'], padding: space['3'], borderRadius: radius.sm, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>{actionErr}</div>
          )}

          {review.flagged && !done && (
            <div style={{ marginBottom: space['4'], padding: space['4'], borderRadius: radius.md, background: PALETTE.warnSoft, color: PALETTE.warn, fontFamily: fontFamily.body, fontSize: '13px', border: `1px solid ${PALETTE.warn}33` }} data-testid="banner-needs-review">
              <div style={{ display: 'flex', gap: space['2'], alignItems: 'center', marginBottom: space['1'] }}>
                <Pill tone="warn" tc={tc}>needs review</Pill>
                <strong>Not auto-approvable — review before queuing.</strong>
              </div>
              <ul style={{ margin: `${space['1']} 0 0`, paddingLeft: 20, lineHeight: 1.6 }}>
                {review.reasons.map((r, i) => <li key={i} data-testid={`needs-review-reason-${i}`}>{r}</li>)}
              </ul>
            </div>
          )}

          {/* LIFECYCLE */}
          <Card tc={tc} style={{ marginBottom: space['4'] }}>
            <Label tc={tc}>Lifecycle &amp; trace</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: space['2'], alignItems: 'center' }}>
              {candidate.gate_status && <Pill tone="good" tc={tc}>Gate: {candidate.gate_status}</Pill>}
              {candidate.approval_status && <Pill tone={candidate.approval_status === 'pending' ? 'warn' : candidate.approval_status === 'approved' ? 'good' : 'bad'} tc={tc}>Approval: {candidate.approval_status}</Pill>}
              {candidate.execution_status && <Pill tone="info" tc={tc}>Execution: {candidate.execution_status}</Pill>}
              {candidate.qa_status && <Pill tone={candidate.qa_status === 'pass' ? 'good' : candidate.qa_status === 'warn' ? 'warn' : 'bad'} tc={tc}>QA: {candidate.qa_status}</Pill>}
              <Pill tone={candidate.page_is_live ? 'good' : 'bad'} tc={tc}>{candidate.page_is_live ? 'Live page' : 'Lost/non-live page'}</Pill>
              {candidate.outcome_verdict && <Pill tone="violet" tc={tc}>Outcome: {candidate.outcome_verdict}</Pill>}
            </div>
            <div style={{ marginTop: space['3'], display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: space['3'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.secondary }}>
              <div><span style={{ color: tc.text.muted }}>Candidate:</span> <span style={{ fontFamily: monoStack }}>{candidate.candidate_id}</span></div>
              <div><span style={{ color: tc.text.muted }}>Canonical page:</span> <span style={{ fontFamily: monoStack }}>{candidate.page_url_canonical ?? '—'}</span></div>
              <div><span style={{ color: tc.text.muted }}>Published:</span> <span style={{ fontFamily: monoStack }}>{candidate.published_at ?? '—'}</span></div>
              <div><span style={{ color: tc.text.muted }}>Outcome decided:</span> <span style={{ fontFamily: monoStack }}>{candidate.outcome_decided_at ?? '—'}</span></div>
            </div>
          </Card>

          {/* WHY */}
          <Card tc={tc} style={{ marginBottom: space['4'] }}>
            <Label tc={tc}>Why we&apos;re recommending this</Label>
            <ul style={{ margin: 0, paddingLeft: 20, fontFamily: fontFamily.body, fontSize: '14px', lineHeight: 1.7, color: tc.text.primary }}>
              {(candidate.why ?? evidence?.why) && <li data-testid="text-why">{candidate.why ?? evidence?.why}</li>}
              {candidate.evidence_summary && candidate.evidence_summary !== (candidate.why ?? evidence?.why) && <li>{candidate.evidence_summary}</li>}
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
              {!candidate.why && !evidence?.why && !candidate.evidence_summary && !sourceNode?.entity && (
                <li style={{ color: tc.text.muted }}>No structured rationale recorded for this candidate beyond the gate decision.</li>
              )}
            </ul>
          </Card>

          {/* BEFORE / AFTER — contextual diff (Part B) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space['4'], marginBottom: space['4'] }}>
            <Card tc={tc}>
              <Label tc={tc}>Before</Label>
              <div style={{ padding: space['3'], background: PALETTE.badSoft, border: `1px solid ${PALETTE.bad}30`, borderRadius: radius.sm, marginBottom: space['3'] }} data-testid="block-before">
                <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: PALETTE.bad, marginBottom: '6px', fontWeight: fontWeight.semibold }}>
                  {isInternalLink ? 'Source sentence today (not yet linked)' : `Current ${md.tag.toLowerCase()} on the live page`}
                </div>
                {isInternalLink ? (
                  anchorParts ? (
                    <div style={{ fontFamily: fontFamily.body, fontSize: '14px', color: tc.text.primary, lineHeight: 1.6 }} data-testid="text-anchor-before">
                      “{anchorParts[0]}
                      <span style={{ fontWeight: fontWeight.semibold, textDecoration: 'underline', textDecorationStyle: 'dotted' }}>{anchorParts[1]}</span>
                      {anchorParts[2]}”
                    </div>
                  ) : isNewSentence && anchorSentence ? (
                    <div style={{ fontFamily: fontFamily.body, fontSize: '14px', color: tc.text.muted, lineHeight: 1.6 }} data-testid="text-anchor-before">
                      No natural anchor for <strong>{candidate.proposed_value || targetNode?.entity || 'the target'}</strong> exists in the current copy — a new sentence will be inserted (see right).
                    </div>
                  ) : (
                    <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, lineHeight: 1.6 }} data-testid="text-anchor-before-uncaptured">
                      Exact source sentence not yet captured for this candidate. Today there is no internal link from this page to {targetNode?.entity ? <strong>{targetNode.entity}</strong> : 'the related page'}.
                    </div>
                  )
                ) : diff ? (
                  <DiffTokens tokens={diff.beforeTokens} tone="removed" tc={tc} />
                ) : beforeValue ? (
                  <span style={{ fontFamily: fontFamily.body, fontSize: '14px', color: tc.text.primary }} data-testid="text-before-value">{beforeValue}</span>
                ) : (
                  <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, lineHeight: 1.6 }} data-testid="text-before-uncaptured">
                    Current value not yet captured for this candidate. The generation run snapshots the live {md.tag.toLowerCase()} so this will fill in for new candidates.
                  </div>
                )}
                {!isInternalLink && beforeValue && beforeIsLive && (
                  <div style={{ marginTop: '6px', fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted }} data-testid="text-before-provenance">
                    Live page value read from the engine dossier (no generation-time snapshot on this candidate yet).
                  </div>
                )}
              </div>
              <table style={{ width: '100%', fontFamily: fontFamily.body, fontSize: '13px' }}>
                <tbody>
                  <tr><td style={{ padding: '4px 0', color: tc.text.muted }}>Top query (full-history)</td><td style={{ textAlign: 'right', color: tc.text.primary }}>{baseline.topQuery || '—'}</td></tr>
                  <tr><td style={{ padding: '4px 0', color: tc.text.muted }}>Top-query position (full-history)</td><td style={{ textAlign: 'right', fontFamily: monoStack }}>{fmtPos(baseline.position)}</td></tr>
                  <tr><td style={{ padding: '4px 0', color: tc.text.muted }}>Top-query impressions (full-history)</td><td style={{ textAlign: 'right', fontFamily: monoStack }}>{fmtInt(baseline.impressions)}</td></tr>
                </tbody>
              </table>
              <div style={{ marginTop: space['2'], fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted }}>Live GSC baseline for this page.</div>
            </Card>
            <Card tc={tc}>
              <Label tc={tc}>After (proposed)</Label>
              <div style={{ padding: space['3'], background: PALETTE.goodSoft, border: `1px solid ${PALETTE.good}30`, borderRadius: radius.sm, marginBottom: space['3'] }} data-testid="block-after">
                <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], flexWrap: 'wrap', marginBottom: '6px' }}>
                  <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: PALETTE.good, fontWeight: fontWeight.semibold }}>
                    {isInternalLink ? (isNewSentence ? 'New sentence to be inserted' : 'Same sentence, anchor now linked') : 'Proposed value'}
                  </div>
                  {isInternalLink && gateResult && <Pill tone={gateResult.tone} tc={tc}>{gateResult.text}</Pill>}
                  {isInternalLink && anchorConfidence && <Pill tone="neutral" tc={tc}>naturalness {anchorConfidence}</Pill>}
                </div>
                {isInternalLink ? (
                  anchorParts ? (
                    <div style={{ fontFamily: fontFamily.body, fontSize: '14px', color: tc.text.primary, lineHeight: 1.6 }} data-testid="text-anchor-after">
                      “{anchorParts[0]}
                      {anchorTargetUrl ? (
                        <a href={anchorTargetUrl} target="_blank" rel="noopener noreferrer" title={anchorTargetUrl} style={{ color: PALETTE.violet, fontWeight: fontWeight.semibold, textDecoration: 'underline' }}>{anchorParts[1]}</a>
                      ) : (
                        <span style={{ color: PALETTE.violet, fontWeight: fontWeight.semibold, textDecoration: 'underline' }}>{anchorParts[1]}</span>
                      )}
                      {anchorParts[2]}”
                    </div>
                  ) : isNewSentence && anchorSentence ? (
                    <div data-testid="text-anchor-after">
                      <div style={{ fontFamily: fontFamily.body, fontSize: '14px', color: tc.text.primary, lineHeight: 1.6, fontStyle: 'italic' }}>
                        “{anchorPhrase && splitAroundAnchor(anchorSentence, anchorPhrase) ? (
                          (() => { const p = splitAroundAnchor(anchorSentence, anchorPhrase)!; return (<>{p[0]}<a href={anchorTargetUrl || '#'} target="_blank" rel="noopener noreferrer" style={{ color: PALETTE.violet, fontWeight: fontWeight.semibold, textDecoration: 'underline' }}>{p[1]}</a>{p[2]}</>); })()
                        ) : anchorSentence}”
                      </div>
                      {anchor?.insertion_hint && <div style={{ marginTop: '6px', fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>Placement: {anchor.insertion_hint}</div>}
                    </div>
                  ) : (
                    <div style={{ fontFamily: fontFamily.body, fontSize: '14px', color: tc.text.primary, lineHeight: 1.6 }} data-testid="text-anchor-after-fallback">
                      Insert a contextual internal link to {candidate.proposed_value ? <strong>{candidate.proposed_value}</strong> : 'the related page'}{anchorTargetUrl ? <> (<a href={anchorTargetUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: monoStack, fontSize: '12px', color: PALETTE.violet }}>{pathOf(anchorTargetUrl)}</a>)</> : ''}. The exact anchor sentence will be captured at generation.
                    </div>
                  )
                ) : diff ? (
                  <DiffTokens tokens={diff.afterTokens} tone="added" tc={tc} />
                ) : (
                  <span style={{ fontFamily: fontFamily.body, fontSize: '14px', color: tc.text.primary }} data-testid="text-after-value">
                    {candidate.proposed_value || md.verb()}
                  </span>
                )}
              </div>
              <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.secondary, lineHeight: 1.6 }}>
                No modelled click/position projection is generated for this change in the source data. Outcomes are measured against the live baseline after deploy (see measurement plan below).
              </div>
            </Card>
          </div>

          {/* WHAT HAPPENS ON APPROVAL — lifecycle (Part C, display-only) */}
          <ApprovalLifecycle candidate={candidate} tc={tc} />

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
