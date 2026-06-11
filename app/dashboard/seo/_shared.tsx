'use client';

// =============================================================================
// SEO Command Center — shared primitives
// Governance lock: read-first. The ONLY write paths are the existing engine
// candidate approve/reject endpoints (Lane 1), routed through
// approveEngineCandidate / rejectEngineCandidate -> /api/proxy/seo/recommendations.
// Lanes 2 (Rank Math manual) and 3 (off-page) are advisory only — no mutations.
// Ahrefs is decommissioned — keyword value is sourced from DataForSEO via
// analytics.external_query_intelligence. The candidate queue itself comes from
// analytics.v_seo_dashboard_queue; non-live redirect work is sectioned, not
// silently hidden.
// =============================================================================

import React, { useEffect, useState } from 'react';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import { violet } from '../../../design/tokens/colors';
import {
  getSeoPageDossier, approveEngineCandidate, rejectEngineCandidate, getSeoOffpageBriefs,
} from '../../../lib/seoApi';
import { fmtDataForSeoCpc, fmtDataForSeoDifficulty, fmtDataForSeoVolume } from '../../../lib/dataforseoFormat';
import type {
  PortfolioPage, PortfolioBucket, PageDossier, PageDossierCandidate,
  PageDossierMeta, PageDossierKeywordTarget, PageGateTransition, SeoOffpageBrief,
  PageDossierRankedAction, SeoWindowRequest,
} from '../../../lib/seoApi';

// -----------------------------------------------------------------------------
// Brand accents not present in the global theme tokens.
// -----------------------------------------------------------------------------
export const PALETTE = {
  violet: violet[500],
  violetSoft: '#ede9fe',
  good: '#065f46', goodSoft: '#d1fae5',
  bad: '#991b1b', badSoft: '#fee2e2',
  warn: '#92400e', warnSoft: '#fef3c7',
  info: '#1e40af', infoSoft: '#dbeafe',
};
export const monoStack = '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace';

export type Tc = ReturnType<typeof useThemeColors>;
export type ToneKey = 'good' | 'bad' | 'warn' | 'info' | 'violet' | 'neutral';

export function toneStyle(tone: ToneKey, tc: Tc) {
  switch (tone) {
    case 'good':   return { bg: PALETTE.goodSoft,   fg: PALETTE.good };
    case 'bad':    return { bg: PALETTE.badSoft,    fg: PALETTE.bad };
    case 'warn':   return { bg: PALETTE.warnSoft,   fg: PALETTE.warn };
    case 'info':   return { bg: PALETTE.infoSoft,   fg: PALETTE.info };
    case 'violet': return { bg: PALETTE.violetSoft, fg: PALETTE.violet };
    default:       return { bg: tc.background.muted, fg: tc.text.muted };
  }
}

export function Pill({ children, tone, tc }: { children: React.ReactNode; tone: ToneKey; tc: Tc }) {
  const s = toneStyle(tone, tc);
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
      fontSize: '11px', fontWeight: fontWeight.medium, background: s.bg, color: s.fg,
      fontFamily: fontFamily.body, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

// Mutation-type presentation: color-coded category tag + human title + effort +
// lane. Drives the "DO THIS NEXT" detection rows and the Action Card so each of the
// six action types renders distinctly (not all as "INTERNAL LINK").
// -----------------------------------------------------------------------------
export type ActionMeta = { label: string; tone: ToneKey; title: string; effort: string; lane: 1 | 2 | 3 };

export function actionMeta(mutationType: string | null | undefined, proposedValue?: string | null): ActionMeta {
  switch (mutationType) {
    case 'title_tag_refinement':
      return { label: 'TITLE', tone: 'info', title: 'Rewrite title tag', effort: 'Low', lane: 1 };
    case 'meta_description_update':
      return { label: 'META', tone: 'violet', title: 'Rewrite meta description', effort: 'Low', lane: 1 };
    case 'h1_tag_refinement':
      return { label: 'H1', tone: 'good', title: 'Refine H1 heading', effort: 'Low', lane: 1 };
    case 'product_offer_schema':
      return { label: 'SCHEMA', tone: 'warn', title: 'Add Product/Offer schema', effort: 'Medium', lane: 1 };
    case 'organization_schema_addition':
      return { label: 'ORG SCHEMA', tone: 'warn', title: 'Add Organization schema', effort: 'Medium', lane: 1 };
    case 'website_schema_addition':
      return { label: 'WEBSITE SCHEMA', tone: 'warn', title: 'Add WebSite schema', effort: 'Medium', lane: 1 };
    case 'breadcrumb_schema_addition':
      return { label: 'BREADCRUMB', tone: 'warn', title: 'Add Breadcrumb schema', effort: 'Medium', lane: 1 };
    case 'local_business_schema_addition':
      return { label: 'LOCALBUSINESS', tone: 'warn', title: 'Add LocalBusiness schema', effort: 'Medium', lane: 1 };
    case 'faq_schema_addition':
      return { label: 'FAQ SCHEMA', tone: 'warn', title: 'Add FAQ schema', effort: 'Medium', lane: 1 };
    case 'image_alt_text_improvement':
      return { label: 'IMAGE ALT', tone: 'neutral', title: 'Improve image alt text', effort: 'Low', lane: 1 };
    case 'internal_link_insertion':
      return { label: 'INTERNAL LINK', tone: 'violet', title: proposedValue ? `Add internal link → ${proposedValue}` : 'Add internal link', effort: 'Low', lane: 1 };
    case 'lost_page_redirect':
      return { label: 'REDIRECT', tone: 'bad', title: 'Lost-page 301 redirect (Rank Math)', effort: 'Manual', lane: 2 };
    case 'canonical_consolidation':
      return { label: 'CANONICAL', tone: 'warn', title: 'Canonical consolidation (Rank Math)', effort: 'Manual', lane: 2 };
    case 'noindex_hygiene':
      return { label: 'NOINDEX', tone: 'neutral', title: 'Noindex / sitemap hygiene (Rank Math)', effort: 'Manual', lane: 2 };
    default:
      return { label: (mutationType || 'ACTION').replace(/_/g, ' ').toUpperCase(), tone: 'neutral', title: mutationType || 'Action', effort: '—', lane: 1 };
  }
}

// -----------------------------------------------------------------------------
// Bucket presentation metadata.
// -----------------------------------------------------------------------------
export const BUCKETS: { key: PortfolioBucket; label: string; tone: ToneKey; blurb: string }[] = [
  { key: 'win',       label: 'Wins',           tone: 'good',   blurb: 'Live pages ranking 1–30 — defend and lift CTR' },
  { key: 'strategic', label: 'Strategic',      tone: 'info',   blurb: 'Live pages ranking >30 or unranked — earn position' },
  { key: 'fix',       label: 'Fix',            tone: 'warn',   blurb: 'Duplicate / canonicalization issues to resolve' },
  { key: 'lost',      label: 'Lost queue',     tone: 'bad',    blurb: 'Pages no longer live — restore or 301 redirect' },
];

// How many cards to paint per bucket before requiring a "Show more" click.
export const PAGE_SIZE = 36;

export function bucketTone(b: PortfolioBucket): ToneKey {
  return BUCKETS.find(x => x.key === b)?.tone ?? 'neutral';
}

export function statusTone(statusClass: string): ToneKey {
  if (statusClass === 'canonical_live') return 'good';
  if (statusClass === 'lost') return 'bad';
  return 'warn';
}

// Deterministic one-line "read" for a portfolio card — what to do with this page.
export function cardRead(p: PortfolioPage): string {
  const q = p.gsc_top_query ? `“${p.gsc_top_query}”` : 'its target query';
  switch (p.bucket) {
    case 'lost':
      return `HTTP ${p.http_status ?? '404'} — restore or 301 redirect to the closest live page.`;
    case 'fix':
      return 'Duplicate / canonical issue — consolidate signals to the primary URL.';
    case 'win':
      return `Ranking ~${fmtPos(p.top_q_pos ?? p.gsc_best_position)} for ${q} — defend and lift CTR.`;
    default:
      return (p.top_q_pos ?? p.gsc_best_position) == null
        ? `Not yet ranking for ${q} — earn position.`
        : `Position ~${fmtPos(p.top_q_pos ?? p.gsc_best_position)} for ${q} — earn position.`;
  }
}

// -----------------------------------------------------------------------------
// Formatting helpers.
// -----------------------------------------------------------------------------
export const fmtInt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-US'));
export const fmtPos = (n: number | null | undefined) => (n == null ? '—' : n.toFixed(1));
export const fmtMoney = (n: number | null | undefined) => (n == null ? '—' : `$${n.toFixed(2)}`);
export const fmtScore = (n: number | null | undefined) => (n == null ? '—' : n.toFixed(1));
const formatRefDate = (d: string | null | undefined) => {
  if (!d) return '—';
  const dt = new Date(`${d.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return d.slice(0, 10);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};
const referenceSourceLabel = (source?: string | null, observedAt?: string | null) => {
  const src = source === 'dataforseo' ? 'DataForSEO' : source === 'ahrefs_fallback' ? 'Ahrefs fallback' : 'Keyword refs';
  return `${src}${observedAt ? ` · as of ${formatRefDate(observedAt)}` : ''}`;
};

// Mutation-type display — the engine emits several distinct candidate types
// (title, meta, h1, schema, internal_link, redirect). The UI must reflect the
// ACTUAL type of each candidate, never a hardcoded one (data truthfulness).
// `tag` is the short pill label; `verb(proposedValue)` is the headline phrase.
export function mutationDisplay(
  mutationType: string | null | undefined,
  primaryRemedy?: string | null,
): { tag: string; verb: (proposedValue?: string | null) => string } {
  const t = (mutationType ?? '').toLowerCase();
  const tgt = (v?: string | null) => (v ? ` → ${v}` : '');
  if (t.includes('internal_link')) {
    return { tag: 'INTERNAL LINK', verb: (v) => `Add internal link${tgt(v)}` };
  }
  if (t.includes('redirect')) {
    return { tag: 'REDIRECT', verb: (v) => `Add redirect${tgt(v)}` };
  }
  if (t.includes('organization_schema')) {
    return { tag: 'ORG SCHEMA', verb: () => 'Organization schema' };
  }
  if (t.includes('website_schema')) {
    return { tag: 'WEBSITE SCHEMA', verb: () => 'WebSite schema' };
  }
  if (t.includes('breadcrumb_schema')) {
    return { tag: 'BREADCRUMB', verb: () => 'Breadcrumb schema' };
  }
  if (t.includes('local_business_schema')) {
    return { tag: 'LOCALBUSINESS', verb: () => 'LocalBusiness schema' };
  }
  if (t.includes('faq_schema')) {
    return { tag: 'FAQ SCHEMA', verb: () => 'FAQ schema' };
  }
  if (t.includes('schema') || t.includes('offer')) {
    return { tag: 'SCHEMA', verb: () => 'Add structured-data schema' };
  }
  if (t.includes('meta')) {
    return { tag: 'META', verb: () => 'Update meta description' };
  }
  if (t.includes('title')) {
    return { tag: 'TITLE', verb: () => 'Update title tag' };
  }
  if (t === 'h1' || t.includes('h1')) {
    return { tag: 'H1', verb: () => 'Update H1 heading' };
  }
  // Unknown / future mutation type — surface the raw type honestly rather than
  // inventing a friendly label that could misrepresent the action. When neither
  // field is present, fall back to an explicit UNKNOWN (governance: never imply a
  // specific action we cannot name).
  const raw = mutationType || primaryRemedy;
  if (!raw) return { tag: 'UNKNOWN', verb: () => 'Unknown change type' };
  return { tag: raw.replace(/_/g, ' ').toUpperCase(), verb: () => raw.replace(/_/g, ' ') };
}

export function isSchemaMutation(mutationType: string | null | undefined): boolean {
  const t = (mutationType ?? '').toLowerCase();
  return t.includes('schema') || t.includes('structured_data') || t.includes('offer');
}

// -----------------------------------------------------------------------------
// Proposal review guard (governance, UI-only).
// Some engine candidates surface a scaffold/placeholder proposed_value (e.g.
// "Set H1 to <primary keyword>") or a title/meta that doesn't actually mention
// the page's primary keyword target. These must be flagged "needs review — not
// auto-approvable" so a human authors/checks them before approval, and they must
// be excluded from one-click bulk approve. This NEVER changes the draft-only
// write path, the engine's gating, or candidate ranking — it only annotates.
// -----------------------------------------------------------------------------
export function isTextMutation(mutationType: string | null | undefined): boolean {
  const t = (mutationType ?? '').toLowerCase();
  // Only title/meta/h1 carry authored copy as proposed_value. internal_link /
  // redirect / schema proposals are URLs or structured targets, not prose, so a
  // placeholder/keyword check would be meaningless (and produce false flags).
  return t.includes('title') || t.includes('meta') || t === 'h1' || t.includes('h1');
}

// Unambiguous placeholder / scaffold markers. Kept conservative so finished copy
// is never mis-flagged: an imperative scaffold directive only matches when it
// ALSO names the element it is scaffolding (e.g. "set ... h1").
const PLACEHOLDER_PATTERNS: RegExp[] = [
  /\{\{|\}\}/,                                   // mustache / template tokens
  /<[a-z][^>]*>/i,                               // raw HTML tags left in copy
  /\[[^\]]*\b(keyword|primary|secondary|topic|brand|product|category|city|location)\b[^\]]*\]/i, // [keyword] style slots
  /\b(tbd|todo|fixme|placeholder|lorem ipsum|your keyword|target keyword|keyword here|example (?:title|meta|heading|description))\b/i,
  /^\s*(set|add|write|insert|create|update|choose|pick|provide|enter)\b.*\b(h1|title|meta|heading|headline|description)\b/i, // scaffold directive
];

export function isPlaceholderProposal(
  c: { mutation_type?: string | null; proposed_value?: string | null },
): boolean {
  if (!isTextMutation(c.mutation_type)) return false;
  const v = (c.proposed_value ?? '').trim();
  if (!v) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(v));
}

export interface ProposalReview {
  flagged: boolean;
  reasons: string[];
}

// `primaryKeyword` is optional: the per-page dossier (Action Card) knows the
// keyword target, the portfolio-wide list/queue does not. Without it we run the
// placeholder check only; with it we additionally flag keyword drift.
export function proposalReview(
  c: { mutation_type?: string | null; proposed_value?: string | null },
  primaryKeyword?: string | null,
): ProposalReview {
  const reasons: string[] = [];
  if (isPlaceholderProposal(c)) {
    reasons.push('Proposal looks like a scaffold/placeholder, not finished copy — author it before approving.');
  } else if (isTextMutation(c.mutation_type) && primaryKeyword && primaryKeyword.trim()) {
    const v = (c.proposed_value ?? '').toLowerCase();
    const kw = primaryKeyword.trim().toLowerCase();
    // Match the full phrase OR every meaningful token (word order/punctuation
    // may legitimately differ). Tokens shorter than 3 chars are ignored.
    const tokens = kw.split(/\s+/).filter((t) => t.length >= 3);
    const contains = v.includes(kw) || (tokens.length > 0 && tokens.every((t) => v.includes(t)));
    if (!contains) {
      reasons.push(`Proposed copy doesn't mention the page's primary keyword target "${primaryKeyword.trim()}".`);
    }
  }
  return { flagged: reasons.length > 0, reasons };
}

export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + (u.search || '');
  } catch {
    return url.replace(/^https?:\/\/[^/]+/, '') || url;
  }
}

// Render `text` with every case-insensitive occurrence of `term` wrapped in a
// subtle highlight mark. Returns the plain string when there is no active term
// (or no match) so non-searching renders stay untouched.
export function highlightMatch(text: string, term: string): React.ReactNode {
  const needle = term.trim();
  if (!needle) return text;
  const lowerText = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const parts: React.ReactNode[] = [];
  let from = 0;
  let idx = lowerText.indexOf(lowerNeedle, from);
  if (idx === -1) return text;
  let key = 0;
  while (idx !== -1) {
    if (idx > from) parts.push(text.slice(from, idx));
    parts.push(
      <mark
        key={key++}
        style={{ background: PALETTE.warnSoft, color: 'inherit', borderRadius: '2px', padding: '0 1px' }}
      >
        {text.slice(idx, idx + needle.length)}
      </mark>,
    );
    from = idx + needle.length;
    idx = lowerText.indexOf(lowerNeedle, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return parts;
}

// =============================================================================
// Level-2 — Page Dossier drawer
// =============================================================================

export function lane2Suggestion(d: PageDossier): { title: string; body: string } {
  const p = d.page;
  const q = p.gsc_top_query || 'the page’s priority query';
  switch (p.status_class) {
    case 'lost':
      return {
        title: 'Restore or redirect (Rank Math)',
        body: p.rankmath_redirect_target
          ? `A redirect to ${p.rankmath_redirect_target} is already configured — verify it resolves and is the closest live match.`
          : `Page returns HTTP ${p.http_status ?? '404'}. Add a 301 in Rank Math to the closest live page, or restore the URL if demand justifies it.`,
      };
    default:
      break;
  }
  if (p.has_rankmath_redirect) {
    return {
      title: 'Resolve duplicate / canonical (Rank Math)',
      body: `This URL has a Rank Math redirect (${p.rankmath_redirect_target ?? 'target set'}). Confirm the canonical primary URL and consolidate signals to it.`,
    };
  }
  if (p.gsc_best_position != null && p.gsc_best_position <= 30) {
    return {
      title: 'Improve CTR (Rank Math)',
      body: `Ranking ~${fmtPos(p.gsc_best_position)} for "${q}". Sharpen the SEO title & meta description in Rank Math to win more clicks at the current position.`,
    };
  }
  return {
    title: 'Strengthen on-page (Rank Math)',
    body: `Position ${p.gsc_best_position == null ? 'not yet ranking' : `~${fmtPos(p.gsc_best_position)}`} for "${q}". Expand on-page content depth and tighten the title/H1 around the target intent before chasing links.`,
  };
}

export function lane3Applicable(d: PageDossier): boolean {
  const p = d.page;
  // Off-page authority work matters most for live, indexable pages that are
  // stuck outside the top 10 — i.e. authority-bound rather than content-bound.
  if (p.status_class !== 'canonical_live') return false;
  if (p.gsc_best_position == null) return true;
  return p.gsc_best_position > 10;
}

export function CandidateCard({
  c, tc, onDone, readOnly = false,
}: {
  c: PageDossierCandidate;
  tc: Tc;
  onDone: () => void;
  // Governance: on the single-action detail screen the only approvable candidate
  // is the one whose id is in the URL — its write controls live at the top of
  // that page. Sibling candidates for the same page must render read-only here so
  // Screen 2 can never mutate a candidate other than the one it is scoped to.
  readOnly?: boolean;
}) {
  const [busy, setBusy] = useState<null | 'approve' | 'reject'>(null);
  const [done, setDone] = useState<null | 'approved' | 'rejected'>(null);
  const [err, setErr] = useState<string | null>(null);

  const pending = !readOnly && c.approval_status === 'pending' && !done;
  const schemaPaused = isSchemaMutation(c.mutation_type);

  async function act(kind: 'approve' | 'reject') {
    if (kind === 'approve' && schemaPaused) return;
    setBusy(kind); setErr(null);
    try {
      if (kind === 'approve') {
        await approveEngineCandidate({
          candidate_id: c.candidate_id,
          opportunity_id: c.opportunity_id ?? undefined,
          proposed_value: c.proposed_value ?? undefined,
          target_page_url: c.target_page_url ?? undefined,
        });
        setDone('approved');
      } else {
        await rejectEngineCandidate({
          candidate_id: c.candidate_id,
          opportunity_id: c.opportunity_id ?? undefined,
        });
        setDone('rejected');
      }
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  const statusLabel = done ?? c.approval_status ?? 'pending';
  const statusToneKey: ToneKey = statusLabel === 'approved' ? 'good' : statusLabel === 'rejected' ? 'bad' : 'warn';

  return (
    <div
      data-testid={`card-candidate-${c.candidate_id}`}
      style={{
        border: `1px solid ${tc.border.default}`, borderRadius: radius.md,
        padding: space['4'], background: tc.background.surface, marginBottom: space['3'],
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: space['3'], alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', alignItems: 'center' }}>
          <Pill tone="violet" tc={tc}>{c.mutation_label || c.primary_remedy || c.mutation_type || 'remedy'}</Pill>
          {c.confidence_tier && <Pill tone="info" tc={tc}>{c.confidence_tier}</Pill>}
          {c.opportunity_score != null && (
            <span style={{ fontFamily: monoStack, fontSize: '11px', color: tc.text.muted }}>
              score {fmtScore(c.opportunity_score)}
            </span>
          )}
        </div>
        <Pill tone={statusToneKey} tc={tc}>{statusLabel}</Pill>
      </div>

      {c.proposed_value && (
        <div style={{ marginTop: space['2'], fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.primary }}>
          <span style={{ color: tc.text.muted }}>Proposed: </span>{c.proposed_value}
        </div>
      )}
      {c.evidence_summary && (
        <div style={{ marginTop: space['1'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
          {c.why ?? c.evidence_summary}
        </div>
      )}

      {err && (
        <div style={{ marginTop: space['2'], fontSize: '12px', color: PALETTE.bad, fontFamily: fontFamily.body }}>
          {err}
        </div>
      )}

      {pending && (
        <div style={{ display: 'flex', gap: space['2'], marginTop: space['3'] }}>
          <button
            data-testid={`button-approve-${c.candidate_id}`}
            onClick={() => act('approve')}
            disabled={busy !== null || schemaPaused}
            title={schemaPaused ? 'Schema execution temporarily paused — write path under repair.' : undefined}
            style={{
              padding: '6px 14px', borderRadius: radius.sm, border: schemaPaused ? `1px solid ${tc.border.default}` : 'none', cursor: (busy || schemaPaused) ? 'default' : 'pointer',
              background: schemaPaused ? tc.background.muted : PALETTE.good, color: schemaPaused ? tc.text.muted : '#fff', fontFamily: fontFamily.body, fontSize: '12px', fontWeight: fontWeight.medium,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy === 'approve' ? 'Approving…' : schemaPaused ? 'Schema paused' : 'Approve'}
          </button>
          <button
            data-testid={`button-reject-${c.candidate_id}`}
            onClick={() => act('reject')}
            disabled={busy !== null}
            style={{
              padding: '6px 14px', borderRadius: radius.sm, cursor: busy ? 'default' : 'pointer',
              background: 'transparent', color: PALETTE.bad, border: `1px solid ${PALETTE.bad}`,
              fontFamily: fontFamily.body, fontSize: '12px', fontWeight: fontWeight.medium, opacity: busy ? 0.6 : 1,
            }}
          >
            {busy === 'reject' ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Dossier-bound shared sections — used by BOTH the Page Dossier drawer (Screen 1)
// and the Action Card detail (Screen 2) so the two screens render identical,
// honest, engine-sourced reasoning. NONE of these fabricate numbers: every
// figure is a real observed/derived value from analytics.seo_page_dossier,
// the off-page brief, or live GSC demand. Empty states are explicit.
// -----------------------------------------------------------------------------

export function sectionLabelStyle(tc: Tc): React.CSSProperties {
  return {
    fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold,
    textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: tc.text.muted,
    marginBottom: space['2'],
  };
}

const fmtPct01 = (n: number | null | undefined) =>
  n == null ? '—' : `${Math.round(n * 100)}%`;

export function laneName(lane: number | null | undefined): string {
  if (lane === 1) return 'Lane 1 · Engine';
  if (lane === 2) return 'Lane 2 · Rank Math';
  if (lane === 3) return 'Lane 3 · Off-page';
  return 'Lane —';
}

export function executorLabel(executor: string | null | undefined): string {
  switch ((executor ?? '').toLowerCase()) {
    case 'engine_draft': return 'Engine draft';
    case 'rankmath_human': return 'Rank Math (human)';
    case 'seo_pr_human': return 'SEO / PR (human)';
    default: return executor || 'unassigned';
  }
}

function KeywordTargetRow({ k, tc, primary }: { k: PageDossierKeywordTarget; tc: Tc; primary?: boolean }) {
  return (
    <div
      data-testid={`row-keyword-target-${primary ? 'primary' : 'secondary'}`}
      style={{
        border: `1px solid ${primary ? PALETTE.violet : tc.border.subtle}`,
        borderRadius: radius.md, padding: space['3'], background: tc.background.surface,
        marginBottom: space['2'],
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: space['2'], alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: fontFamily.body, fontSize: primary ? '15px' : '13px', fontWeight: primary ? fontWeight.semibold : fontWeight.medium, color: tc.text.primary }}>
          {k.keyword || '—'}
        </span>
        <span style={{ display: 'flex', gap: space['2'], alignItems: 'center' }}>
          {primary && <Pill tone="violet" tc={tc}>primary</Pill>}
          {k.on_intent === true && <Pill tone="good" tc={tc}>on-intent</Pill>}
          {k.on_intent === false && <Pill tone="warn" tc={tc}>off-intent</Pill>}
        </span>
      </div>
      <div style={{ display: 'flex', gap: space['4'], flexWrap: 'wrap', marginTop: space['2'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
        <span>pos <span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtPos(k.position)}</span></span>
        <span>impr <span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtInt(k.impressions)}</span></span>
        <span>vol <span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtDataForSeoVolume(k.volume)}</span></span>
        <span>KD <span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtDataForSeoDifficulty(k.kd)}</span></span>
        <span>cpc <span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtDataForSeoCpc(k.cpc)}</span></span>
        <span>confidence <span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtPct01(k.confidence)}</span></span>
      </div>
    </div>
  );
}

export function KeywordTargetsSection({ meta, tc }: { meta: PageDossierMeta | null | undefined; tc: Tc }) {
  const kt = meta?.keyword_targets;
  return (
    <div style={{ marginTop: space['6'] }} data-testid="section-keyword-targets">
      <div style={sectionLabelStyle(tc)}>Keyword targets (engine-selected)</div>
      {!kt || (!kt.primary && kt.secondary.length === 0) ? (
        <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted }}>
          The engine has not selected keyword targets for this page yet.
        </div>
      ) : (
        <>
          {kt.primary && <KeywordTargetRow k={kt.primary} tc={tc} primary />}
          {kt.secondary.length > 0 && (
            <>
              <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, margin: `${space['2']} 0 ${space['1']}` }}>
                Secondary
              </div>
              {kt.secondary.map((k, i) => <KeywordTargetRow key={i} k={k} tc={tc} />)}
            </>
          )}
        </>
      )}
    </div>
  );
}

function routeTone(decision: string | null): ToneKey {
  switch ((decision ?? '').toLowerCase()) {
    case 'own': return 'good';
    case 'route': return 'info';
    case 'discard': return 'bad';
    default: return 'neutral';
  }
}

// Human-readable framing per routing decision. "own" = this page should rank for
// the query; "route" = the engine sends the query to a different page; "discard" =
// the query is intentionally not pursued (off-intent / competitor-only / mirage).
const ROUTE_DECISION_ORDER = ['own', 'route', 'discard'];
const ROUTE_DECISION_LABEL: Record<string, string> = {
  own: 'Own — this page should rank',
  route: 'Route — sent to another page',
  discard: 'Discard — not pursued',
};

export function RoutedQueriesSection({ meta, tc }: { meta: PageDossierMeta | null | undefined; tc: Tc }) {
  const routed = meta?.routed_queries ?? [];

  // Group by routing decision so each decision lane renders as its own block,
  // with discard (and any unrecognized decision) clearly called out rather than
  // buried in a flat list. Unknown/null decisions fall into a trailing "other"
  // bucket keyed by their raw value.
  const groups = new Map<string, typeof routed>();
  for (const q of routed) {
    const key = (q.decision ?? '').toLowerCase() || 'unrouted';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(q);
  }
  const orderedKeys = [
    ...ROUTE_DECISION_ORDER.filter((k) => groups.has(k)),
    ...Array.from(groups.keys()).filter((k) => !ROUTE_DECISION_ORDER.includes(k)),
  ];

  return (
    <div style={{ marginTop: space['6'] }} data-testid="section-routed-queries">
      <div style={sectionLabelStyle(tc)}>Query routing (own · route · discard)</div>
      {routed.length === 0 ? (
        <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted }}>
          No query-routing decisions recorded for this page.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: space['3'] }}>
          {orderedKeys.map((key) => {
            const rows = groups.get(key)!;
            const decision = rows[0].decision || key;
            const label = ROUTE_DECISION_LABEL[key] ?? decision;
            const isDiscard = key === 'discard';
            const isRoute = key === 'route';
            return (
              <div
                key={key}
                data-testid={`group-routed-${key}`}
                style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, overflow: 'hidden', opacity: isDiscard ? 0.92 : 1 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], padding: '8px 10px', background: tc.background.muted }}>
                  <Pill tone={routeTone(decision)} tc={tc}>{decision}</Pill>
                  <span style={{ fontFamily: fontFamily.body, fontSize: '12px', fontWeight: fontWeight.medium, color: tc.text.secondary }}>{label}</span>
                  <span style={{ fontFamily: monoStack, fontSize: '11px', color: tc.text.muted, marginLeft: 'auto' }}>{rows.length}</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fontFamily.body, fontSize: '12px' }}>
                  <tbody>
                    {rows.map((q, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${tc.border.subtle}` }} data-testid={`row-routed-${key}-${i}`}>
                        <td style={{ padding: '8px 10px', color: tc.text.primary, width: '45%' }}>{q.query}</td>
                        <td style={{ padding: '8px 10px', color: isDiscard ? tc.text.secondary : tc.text.muted }}>
                          {isRoute && q.target_page
                            ? <span style={{ fontFamily: monoStack }}>{pathOf('https://' + q.target_page.replace(/^https?:\/\//, ''))}</span>
                            : isDiscard
                              ? (q.reason || 'no discard reason recorded')
                              : (q.target_page
                                  ? <span style={{ fontFamily: monoStack }}>{pathOf('https://' + q.target_page.replace(/^https?:\/\//, ''))}</span>
                                  : (q.reason || '—'))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Detects the engine's "demand crossed the gate threshold → re-surfaced for human
// re-review" cause from a transition's reason strings. Honest keyword match against
// real engine reason text — never fabricated. Drives the explicit callout below.
const THRESHOLD_SURFACE_RE = /threshold|demand (re-?)?cross|crossed|re-?surfac|re-?gat|regat/i;

// Gate-decision trail. Renders NOTHING when there are no transitions (the gate
// table is currently empty) — an honest absence rather than a fabricated note.
export function GateTransitionNote({ transitions, tc }: { transitions: PageGateTransition[] | null | undefined; tc: Tc }) {
  const list = transitions ?? [];
  if (list.length === 0) return null;
  const surfacedByThreshold = list.some((t) => t.reason.some((r) => THRESHOLD_SURFACE_RE.test(r)));
  return (
    <div style={{ marginTop: space['4'] }} data-testid="section-gate-transitions">
      <div style={sectionLabelStyle(tc)}>Gate decision trail</div>
      {surfacedByThreshold && (
        <div
          data-testid="note-threshold-surfaced"
          style={{ display: 'flex', gap: space['2'], alignItems: 'flex-start', border: `1px solid ${tc.border.default}`, borderLeft: `3px solid ${tc.text.secondary}`, borderRadius: radius.md, padding: space['3'], marginBottom: space['2'], background: tc.background.surface, fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.secondary }}
        >
          <span style={{ fontWeight: fontWeight.medium, color: tc.text.primary }}>Newly surfaced</span>
          <span>— demand crossed the gate threshold, so the engine re-queued this page for human re-review.</span>
        </div>
      )}
      <div style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, padding: space['3'], background: tc.background.surface }}>
        {list.map((t, i) => (
          <div key={i} style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.secondary, paddingTop: i ? space['2'] : 0 }} data-testid={`row-gate-transition-${i}`}>
            <span style={{ fontFamily: monoStack, color: tc.text.muted }}>{t.from_status || '—'} → {t.to_status || '—'}</span>
            {t.reason.length > 0 && <span> · {t.reason.join(', ')}</span>}
            {t.gated_at && <span style={{ color: tc.text.muted }}> · {new Date(t.gated_at).toLocaleDateString()}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// Lane 3 off-page briefs. Self-fetches by url so it is reusable in either screen.
export function OffpageBriefSection({ url, tc, window }: { url: string; tc: Tc; window?: SeoWindowRequest }) {
  const [briefs, setBriefs] = useState<SeoOffpageBrief[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    getSeoOffpageBriefs(url, window)
      .then((b) => { if (alive) setBriefs(b); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, [url, window]);

  if (err) {
    return <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted }}>Off-page briefs unavailable.</div>;
  }
  if (briefs == null) {
    return <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted }}>Loading off-page briefs…</div>;
  }
  if (briefs.length === 0) {
    return (
      <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted }}>
        No off-page authority brief for this page — on-page work (Lanes 1 &amp; 2) is the priority.
      </div>
    );
  }
  return (
    <>
      {briefs.map((b, i) => (
        <div key={i} data-testid={`card-offpage-${i}`} style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, padding: space['4'], background: tc.background.surface, marginBottom: space['2'] }}>
          <div style={{ fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, color: tc.text.primary }}>
            Earn links / digital PR — &ldquo;{b.target_keyword || 'target keyword'}&rdquo;
          </div>
          <div style={{ display: 'flex', gap: space['4'], flexWrap: 'wrap', marginTop: space['2'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
            <span>pos <span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtPos(b.current_position)}</span></span>
            <span>impr <span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtInt(b.impressions)}</span></span>
            <span>vol <span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtDataForSeoVolume(b.search_volume)}</span></span>
            <span>KD <span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtDataForSeoDifficulty(b.keyword_difficulty)}</span></span>
          </div>
          {b.reason && (
            <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginTop: space['2'] }}>{b.reason}</div>
          )}
        </div>
      ))}
    </>
  );
}

// Engine's informational lane-routed action plan (analytics.seo_page_dossier
// ranked_actions). These are the engine's PLAN rows — distinct from the live,
// approvable Lane-1 candidates rendered as CandidateCards. `impact` is a real
// measured impression count, never a predicted lift.
function RankedActionPlanRow({ a, tc }: { a: PageDossierRankedAction; tc: Tc }) {
  return (
    <div style={{ border: `1px solid ${tc.border.subtle}`, borderRadius: radius.md, padding: space['3'], background: tc.background.surface, marginBottom: space['2'] }} data-testid="row-ranked-action">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: space['2'], alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', gap: space['2'], alignItems: 'center', flexWrap: 'wrap' }}>
          <Pill tone="neutral" tc={tc}>{(a.action || 'action').replace(/_/g, ' ')}</Pill>
          {a.speed && <Pill tone={a.speed === 'fast' ? 'good' : 'warn'} tc={tc}>{a.speed}</Pill>}
          {a.status && <Pill tone="info" tc={tc}>{a.status.replace(/_/g, ' ')}</Pill>}
        </span>
        <span style={{ display: 'flex', gap: space['3'], fontFamily: monoStack, fontSize: '11px', color: tc.text.muted }}>
          {a.impact != null && <span>{fmtInt(a.impact)} impr</span>}
          {a.score != null && <span>score {Math.round(a.score * 100)}</span>}
          <span>{executorLabel(a.executor)}</span>
        </span>
      </div>
      {a.change && (
        <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.secondary, marginTop: space['2'] }}>{a.change}</div>
      )}
    </div>
  );
}

export function LaneRoutedActions({
  dossier, tc, onDone, readOnly = false, seoWindow,
}: {
  dossier: PageDossier;
  tc: Tc;
  onDone: () => void;
  readOnly?: boolean;
  seoWindow?: SeoWindowRequest;
}) {
  const meta = dossier.dossier;
  const ranked = meta?.ranked_actions ?? [];
  const lane1Plan = ranked.filter((a) => a.lane === 1);
  const lane2Plan = ranked.filter((a) => a.lane === 2);
  const lane3Plan = ranked.filter((a) => a.lane === 3);
  const s = lane2Suggestion(dossier);

  return (
    <div data-testid="section-lane-routed-actions">
      {/* Lane 1 — engine candidates (live approve/reject) + engine plan */}
      <div style={{ marginTop: space['6'] }}>
        <div style={sectionLabelStyle(tc)}>Lane 1 · Engine actions (gate-accepted)</div>
        {readOnly && dossier.candidates.length > 0 && (
          <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginBottom: space['2'] }}>
            Read-only context for this page. Approve or reject from the Command Center, or open each as its own action.
          </div>
        )}
        {dossier.candidates.length === 0 ? (
          <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted }}>
            No gate-accepted engine candidates awaiting approval for this page.
          </div>
        ) : (
          dossier.candidates.map((c) => (
            <CandidateCard key={c.candidate_id} c={c} tc={tc} onDone={onDone} readOnly={readOnly} />
          ))
        )}
        {lane1Plan.length > 0 && (
          <div style={{ marginTop: space['3'] }}>
            <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginBottom: space['1'] }}>
              Engine plan (informational — not yet an approvable candidate)
            </div>
            {lane1Plan.map((a, i) => <RankedActionPlanRow key={i} a={a} tc={tc} />)}
          </div>
        )}
      </div>

      {/* Lane 2 — Rank Math manual checklist */}
      <div style={{ marginTop: space['6'] }}>
        <div style={sectionLabelStyle(tc)}>Lane 2 · Rank Math (manual)</div>
        <div style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, padding: space['4'], background: tc.background.surface }}>
          <div style={{ fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, color: tc.text.primary }}>{s.title}</div>
          <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginTop: '4px' }}>{s.body}</div>
        </div>
        {lane2Plan.length > 0 && (
          <div style={{ marginTop: space['3'] }}>
            {lane2Plan.map((a, i) => <RankedActionPlanRow key={i} a={a} tc={tc} />)}
          </div>
        )}
      </div>

      {/* Lane 3 — off-page authority */}
      <div style={{ marginTop: space['6'] }}>
        <div style={sectionLabelStyle(tc)}>Lane 3 · Off-page authority</div>
        <OffpageBriefSection url={dossier.page.url} tc={tc} window={seoWindow} />
        {lane3Plan.length > 0 && (
          <div style={{ marginTop: space['3'] }}>
            {lane3Plan.map((a, i) => <RankedActionPlanRow key={i} a={a} tc={tc} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// Expected outcomes & measurement plan. Baselines are REAL (live GSC + the
// engine's keyword target). Targets are deliberately "measured post-deploy" —
// we never fabricate a predicted lift, CTR, or revenue figure (the mockup does;
// we must not). Conversions have no pre-deploy source, so the baseline is shown
// as unmeasured.
export function MeasurementPlan({ dossier, tc }: { dossier: PageDossier; tc: Tc }) {
  const real = dossier.demand.filter((d) => !d.is_discard);
  const sumImpr = real.reduce((acc, d) => acc + (d.impressions || 0), 0);
  const sumClicks = real.reduce((acc, d) => acc + (d.clicks || 0), 0);
  const ctr = sumImpr > 0 ? `${((sumClicks / sumImpr) * 100).toFixed(1)}%` : '—';
  const primary = dossier.dossier?.keyword_targets?.primary;
  const basePos = primary?.position ?? dossier.page.gsc_best_position;

  const POST = 'measured post-deploy';
  const HORIZON = 'day 14 → 42';
  const rows: { kpi: string; baseline: string; how: string }[] = [
    { kpi: 'Top-query position', baseline: fmtPos(basePos), how: 'GSC avg position' },
    { kpi: 'Impressions / mo', baseline: fmtInt(dossier.page.gsc_impressions), how: 'GSC impressions' },
    { kpi: 'Clicks / mo', baseline: fmtInt(sumClicks), how: 'GSC clicks (top queries)' },
    { kpi: 'CTR', baseline: ctr, how: 'GSC clicks ÷ impressions' },
    { kpi: 'Conversions', baseline: '—', how: 'QMS deals attributed (post-deploy)' },
  ];

  const th: React.CSSProperties = { padding: '8px 10px', fontSize: '11px', fontWeight: fontWeight.semibold, color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.04em' };
  const td: React.CSSProperties = { padding: '10px', fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.secondary };

  return (
    <div style={{ marginTop: space['6'] }} data-testid="section-measurement-plan">
      <div style={sectionLabelStyle(tc)}>Expected outcomes &amp; measurement plan</div>
      <div style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: tc.background.muted }}>
              <th style={{ ...th, textAlign: 'left' }}>KPI</th>
              <th style={{ ...th, textAlign: 'right' }}>Baseline</th>
              <th style={{ ...th, textAlign: 'right' }}>Target</th>
              <th style={{ ...th, textAlign: 'left' }}>Time-horizon</th>
              <th style={{ ...th, textAlign: 'left' }}>How measured</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.kpi} style={{ borderTop: `1px solid ${tc.border.subtle}` }} data-testid={`row-measurement-${r.kpi.replace(/\W+/g, '-').toLowerCase()}`}>
                <td style={{ ...td, color: tc.text.primary }}>{r.kpi}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: monoStack }}>{r.baseline}</td>
                <td style={{ ...td, textAlign: 'right', fontStyle: 'italic', color: tc.text.muted }}>{POST}</td>
                <td style={td}>{HORIZON}</td>
                <td style={{ ...td, color: tc.text.muted }}>{r.how}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginTop: space['2'] }}>
        Targets are intentionally measured after deployment — this surface does not project lift, CTR, or revenue.
      </div>
    </div>
  );
}

export function PageDossierDrawer({
  url, tc, onClose, window,
}: {
  url: string;
  tc: Tc;
  onClose: () => void;
  window?: SeoWindowRequest;
}) {
  const [dossier, setDossier] = useState<PageDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    getSeoPageDossier(url, window)
      .then((d) => { if (alive) setDossier(d); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load page'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [url, reloadKey, window]);

  const sectionLabel = {
    fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold,
    textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: tc.text.muted,
    marginBottom: space['2'],
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
        display: 'flex', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="drawer-page-dossier"
        style={{
          width: 'min(720px, 96vw)', height: '100%', overflowY: 'auto',
          background: tc.background.page, borderLeft: `1px solid ${tc.border.strong}`,
          padding: space['6'], boxShadow: '-8px 0 24px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: space['3'] }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: monoStack, fontSize: '13px', color: tc.text.primary, wordBreak: 'break-all' }}>
              {pathOf(url)}
            </div>
            <a
              href={url} target="_blank" rel="noopener noreferrer"
              data-testid="link-open-live"
              style={{ fontFamily: fontFamily.body, fontSize: '12px', color: PALETTE.violet, textDecoration: 'none' }}
            >
              Open live ↗
            </a>
          </div>
          <button
            onClick={onClose}
            data-testid="button-close-dossier"
            style={{
              border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.muted,
              borderRadius: radius.sm, padding: '4px 10px', cursor: 'pointer', fontFamily: fontFamily.body, fontSize: '12px',
            }}
          >
            Close
          </button>
        </div>

        {loading && (
          <div style={{ padding: space['6'], color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>
            Loading dossier…
          </div>
        )}
        {error && (
          <div style={{ marginTop: space['4'], padding: space['4'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>
            {error}
          </div>
        )}

        {dossier && !loading && (
          <>
            {/* Page facts */}
            <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', marginTop: space['3'] }}>
              <Pill tone="neutral" tc={tc}>{dossier.page.content_type || 'page'}</Pill>
              <Pill tone={dossier.page.status_class === 'canonical_live' ? 'good' : dossier.page.status_class === 'lost' ? 'bad' : 'warn'} tc={tc}>
                {dossier.page.status_class}
              </Pill>
              {dossier.page.needs_verify && <Pill tone="warn" tc={tc}>verify live</Pill>}
              {dossier.page.noindex && <Pill tone="bad" tc={tc}>noindex</Pill>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: space['3'], marginTop: space['4'] }}>
              {[
                { k: 'Impressions', v: fmtInt(dossier.page.gsc_impressions) },
                { k: 'Best position', v: fmtPos(dossier.page.gsc_best_position) },
                { k: 'HTTP', v: dossier.page.http_status != null ? String(dossier.page.http_status) : '—' },
              ].map((m) => (
                <div key={m.k} style={{ border: `1px solid ${tc.border.subtle}`, borderRadius: radius.md, padding: space['3'], background: tc.background.surface }}>
                  <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.k}</div>
                  <div style={{ fontFamily: monoStack, fontSize: '18px', color: tc.text.primary, marginTop: '2px' }}>{m.v}</div>
                </div>
              ))}
            </div>

            {/* Gate decision trail (renders nothing when empty) */}
            <GateTransitionNote transitions={dossier.transitions} tc={tc} />

            {/* Keyword targets (engine-selected) */}
            <KeywordTargetsSection meta={dossier.dossier} tc={tc} />

            {/* Demand — real vs discard */}
            <div style={{ marginTop: space['6'] }}>
              <div style={sectionLabel}>Search demand · top queries (real vs discard)</div>
              {dossier.demand.length === 0 ? (
                <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted }}>
                  No query/page demand recorded for this URL.
                </div>
              ) : (
                <div style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fontFamily.body, fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: tc.background.muted, color: tc.text.muted }}>
                        <th style={{ textAlign: 'left', padding: '8px 10px' }}>Query</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px' }}>Impr.</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px' }}>Pos.</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px' }}>Vol. ref</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px' }}>KD ref</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px' }}>Read</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossier.demand.map((q, i) => (
                        <tr key={i} style={{ borderTop: `1px solid ${tc.border.subtle}`, opacity: q.is_discard ? 0.6 : 1 }} data-testid={`row-demand-${i}`}>
                          <td style={{ padding: '8px 10px', color: tc.text.primary }}>{q.query}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: monoStack, color: tc.text.secondary }}>{fmtInt(q.impressions)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: monoStack, color: tc.text.secondary }}>{fmtPos(q.avg_position)}</td>
                          <td
                            style={{ padding: '8px 10px', textAlign: 'right', fontFamily: monoStack, color: tc.text.secondary }}
                            title={referenceSourceLabel(q.reference_metrics_source, q.reference_metrics_observed_at)}
                          >
                            {fmtDataForSeoVolume(q.kw_volume)}
                          </td>
                          <td
                            style={{ padding: '8px 10px', textAlign: 'right', fontFamily: monoStack, color: tc.text.secondary }}
                            title={referenceSourceLabel(q.reference_metrics_source, q.reference_metrics_observed_at)}
                          >
                            {fmtDataForSeoDifficulty(q.kw_difficulty)}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {q.is_discard
                              ? <span title={q.discard_reason ?? ''}><Pill tone="bad" tc={tc}>discard</Pill></span>
                              : <Pill tone="good" tc={tc}>real</Pill>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Query routing — own / route / discard */}
            <RoutedQueriesSection meta={dossier.dossier} tc={tc} />

            {/* Lane-routed actions (Lane 1 engine candidates + plan, Lane 2 Rank Math, Lane 3 off-page) */}
            <div style={{ marginBottom: space['6'] }}>
              <LaneRoutedActions dossier={dossier} tc={tc} seoWindow={window} onDone={() => setReloadKey((k) => k + 1)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Page portfolio card
// =============================================================================

export function PageCard({ p, tc, onOpen }: { p: PortfolioPage; tc: Tc; onOpen: (url: string) => void }) {
  return (
    <button
      onClick={() => onOpen(p.url)}
      data-testid={`card-page-${p.url}`}
      style={{
        textAlign: 'left', width: '100%', cursor: 'pointer',
        border: `1px solid ${tc.border.default}`, borderRadius: radius.md,
        padding: space['4'], background: tc.background.surface, display: 'block',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: space['3'], alignItems: 'flex-start' }}>
        <div style={{ fontFamily: monoStack, fontSize: '12px', color: tc.text.primary, wordBreak: 'break-all' }}>
          {pathOf(p.url)}
        </div>
        <div style={{ display: 'flex', gap: space['2'], flexShrink: 0 }}>
          {p.needs_verify && <Pill tone="warn" tc={tc}>verify</Pill>}
          <Pill tone={statusTone(p.status_class)} tc={tc}>{p.status_class}</Pill>
          <Pill tone={bucketTone(p.bucket)} tc={tc}>{p.bucket}</Pill>
        </div>
      </div>
      <div style={{ marginTop: space['2'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.secondary }}>
        {cardRead(p)}
      </div>
      <div style={{ display: 'flex', gap: space['4'], flexWrap: 'wrap', marginTop: space['3'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
        <span><span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtInt(p.top_q_impr ?? p.gsc_impressions)}</span> impr. (30d)</span>
        <span>pos <span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtPos(p.top_q_pos ?? p.gsc_best_position)}</span> (30d)</span>
        {(p.top_query || p.gsc_top_query) && <span>top query (30d): “{p.top_query || p.gsc_top_query}”</span>}
      </div>
      <div style={{ display: 'flex', gap: space['4'], flexWrap: 'wrap', marginTop: space['2'], fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted }}>
        {p.has_dataforseo ? (
          <>
            <span title={referenceSourceLabel(p.reference_metrics_source, p.reference_metrics_observed_at)}>vol ref <span style={{ fontFamily: monoStack, color: tc.text.secondary }}>{fmtDataForSeoVolume(p.kw_volume)}</span></span>
            <span title={referenceSourceLabel(p.reference_metrics_source, p.reference_metrics_observed_at)}>KD ref <span style={{ fontFamily: monoStack, color: tc.text.secondary }}>{fmtDataForSeoDifficulty(p.kw_difficulty)}</span></span>
            <span title={referenceSourceLabel(p.reference_metrics_source, p.reference_metrics_observed_at)}>cpc ref <span style={{ fontFamily: monoStack, color: tc.text.secondary }}>{fmtDataForSeoCpc(p.kw_cpc)}</span></span>
            {p.is_competitor_only && <Pill tone="bad" tc={tc}>competitor-only</Pill>}
          </>
        ) : (
          <span style={{ fontStyle: 'italic' }}>no DataForSEO keyword value</span>
        )}
      </div>
    </button>
  );
}
