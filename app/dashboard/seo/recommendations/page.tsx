'use client';

// =============================================================================
// SEO Recommendations — page-package review
// Decision unit: one page enhancement package from
// analytics.v_seo_page_enhancement_queue. Candidate-level rows remain available
// only as drill-down details behind each field chip.
// =============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import {
  approveSeoCandidate,
  approveSeoPageEnhancement,
  bulkApproveSeoPageEnhancements,
  getSeoPageEnhancements,
  rejectSeoPageEnhancement,
  skipSeoCandidate,
} from '../../../../lib/seoApi';
import type { SeoPageEnhancementLifecycle, SeoPageEnhancementMember, SeoPageEnhancementPackage, SeoPageEnhancementsResponse } from '../../../../lib/seoApi';
import { PALETTE, monoStack, Pill, fmtInt, pathOf } from '../_shared';

type Stage = 'review' | 'evaluating' | 'resolved';
type Tone = 'good' | 'bad' | 'warn' | 'info' | 'violet' | 'neutral';

const EVALUATING_STATUSES = new Set(['evaluating', 'performer', 'probation', 'watch']);
const RESOLVED_STATUSES = new Set(['winner', 'retired', 'inconclusive']);

function valuePreview(value: string | null | undefined, max = 120): string {
  const v = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!v) return '—';
  return v.length > max ? `${v.slice(0, max - 3)}...` : v;
}

function fieldTone(field: string): Tone {
  switch (field) {
    case 'title': return 'info';
    case 'meta': return 'violet';
    case 'h1': return 'good';
    case 'alt': return 'neutral';
    default: return 'warn';
  }
}

function lifecycleLabel(status: string | null | undefined): string {
  const s = String(status ?? 'evaluating').replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function lifecycleTone(status: string | null | undefined): Tone {
  switch (status) {
    case 'winner':
    case 'performer': return 'good';
    case 'retired': return 'bad';
    case 'probation':
    case 'watch': return 'warn';
    case 'inconclusive': return 'neutral';
    default: return 'info';
  }
}

function LifecycleIcon({ status }: { status: string | null | undefined }) {
  if (status === 'winner' || status === 'performer') {
    return <path d="M5 12l4 4L19 6" />;
  }
  if (status === 'retired') {
    return <path d="M7 7l10 10M17 7L7 17" />;
  }
  if (status === 'probation' || status === 'watch') {
    return <path d="M12 8v5l3 2M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0Z" />;
  }
  if (status === 'inconclusive') {
    return <path d="M8 9a4 4 0 1 1 7 2.7c-1.2.8-2 1.5-2 3.3M12 18h.01" />;
  }
  return <path d="M4 12h16M12 4v16" />;
}

function LifecyclePill({ status, tc }: { status: string | null | undefined; tc: ReturnType<typeof useThemeColors> }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <LifecycleIcon status={status} />
      </svg>
      <Pill tone={lifecycleTone(status)} tc={tc}>{lifecycleLabel(status)}</Pill>
    </span>
  );
}

function daysSince(anchor: string | null | undefined): number | null {
  if (!anchor) return null;
  const t = new Date(anchor).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

function countdownText(row: SeoPageEnhancementLifecycle, policy: SeoPageEnhancementsResponse['policy']): string {
  const day = row.day ?? daysSince(row.anchor_at ?? row.released_at);
  if (day == null) return `Waiting for release anchor`;
  const first = policy.first_verdict_days ?? 30;
  const final = policy.final_days ?? 60;
  if (day <= first) return `Day ${day} of ${first}`;
  return `Day ${day} of ${final}`;
}

function deltaText(label: string, before: number | null, after: number | null, lowerIsBetter = false): string {
  if (before == null || after == null) return `${label}: waiting for post data`;
  const delta = after - before;
  const signed = delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
  const good = lowerIsBetter ? delta < 0 : delta > 0;
  return `${label}: ${signed}${good ? ' improved' : delta === 0 ? ' flat' : ' changed'}`;
}

function memberGuardText(m: SeoPageEnhancementMember): string | null {
  if (m.safe_to_approve) return null;
  if (m.copy_regen_status && ['pending', 'regenerating', 'escalated'].includes(m.copy_regen_status)) return `copy regeneration ${m.copy_regen_status}`;
  if (m.copy_quality_passes_floor === false && m.copy_quality_score != null && m.copy_quality_floor != null) return `quality ${m.copy_quality_score.toFixed(1)} / floor ${m.copy_quality_floor.toFixed(1)}`;
  if (m.qa_status === 'warn' || m.qa_status === 'block') return `QA ${m.qa_status}`;
  if (!m.current_value_snapshot) return 'missing before snapshot';
  if (!m.proposed_value || m.proposed_value === '__llm_pending__') return 'pending generated copy';
  if (m.gate_status !== 'accepted') return 'not accepted by gate';
  return 'guard failed';
}

function FieldChange({
  member,
  tc,
  onApproveCandidate,
  onSkipCandidate,
  candidateBusy,
  pkg,
}: {
  member: SeoPageEnhancementMember;
  tc: ReturnType<typeof useThemeColors>;
  onApproveCandidate: (candidateId: string, pkg: SeoPageEnhancementPackage) => void;
  onSkipCandidate: (candidateId: string, pkg: SeoPageEnhancementPackage) => void;
  candidateBusy: Record<string, 'approving' | 'skipping'>;
  pkg: SeoPageEnhancementPackage;
}) {
  const [expanded, setExpanded] = useState(false);
  const guard = memberGuardText(member);

  return (
    <div
      style={{
        border: `1px solid ${tc.border.subtle}`,
        borderRadius: radius.sm,
        background: tc.background.surface,
        overflow: 'hidden',
      }}
      data-testid={`field-change-${member.candidate_id}`}
    >
      {/* ── Summary row (always visible, click to toggle) ── */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          gap: space['3'],
          padding: `${space['2']} ${space['3']}`,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Field type badge */}
        <Pill tone={fieldTone(member.field_label)} tc={tc}>{member.field_label}</Pill>

        {/* Proposed value preview */}
        <span style={{
          fontFamily: fontFamily.body,
          fontSize: '12px',
          color: tc.text.primary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {valuePreview(member.proposed_value, 120)}
        </span>

        {/* Status pills + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], flexShrink: 0 }}>
          {guard
            ? <Pill tone="warn" tc={tc}>QA warn</Pill>
            : <Pill tone="good" tc={tc}>ready</Pill>
          }
          {member.auto_publish
            ? <Pill tone="good" tc={tc}>live</Pill>
            : <Pill tone="neutral" tc={tc}>draft</Pill>
          }
          <span style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, lineHeight: 1 }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{ padding: `0 ${space['3']} ${space['3']}`, borderTop: `1px solid ${tc.border.subtle}` }}>
          {/* Before → After diff */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
            gap: space['2'],
            alignItems: 'start',
            fontFamily: fontFamily.body,
            fontSize: '12px',
            lineHeight: 1.5,
            color: tc.text.muted,
            paddingTop: space['3'],
            marginBottom: space['2'],
          }}>
            <div style={{ minWidth: 0 }}>{member.current_value_snapshot ?? '—'}</div>
            <div>→</div>
            <div style={{ minWidth: 0, color: tc.text.primary }}>{member.proposed_value ?? '—'}</div>
          </div>

          {/* Guard reason if any */}
          {guard && (
            <div style={{
              fontFamily: fontFamily.body,
              fontSize: '11px',
              color: PALETTE.warn,
              marginBottom: space['2'],
              padding: `${space['1']} ${space['2']}`,
              background: PALETTE.warnSoft,
              borderRadius: radius.sm,
            }}>
              {guard}
            </div>
          )}

          {/* Per-field action buttons */}
          {member.candidate_id && (
            <div style={{ display: 'flex', gap: space['2'], alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => onApproveCandidate(member.candidate_id, pkg)}
                disabled={!!candidateBusy[member.candidate_id]}
                style={{
                  padding: '4px 12px',
                  fontSize: '11px',
                  fontFamily: fontFamily.body,
                  fontWeight: fontWeight.medium,
                  borderRadius: radius.sm,
                  border: 'none',
                  background: PALETTE.good,
                  color: '#fff',
                  cursor: candidateBusy[member.candidate_id] ? 'default' : 'pointer',
                  opacity: candidateBusy[member.candidate_id] ? 0.6 : 1,
                }}
              >
                {candidateBusy[member.candidate_id] === 'approving' ? 'Approving…' : '✓ Approve field'}
              </button>
              <button
                type="button"
                onClick={() => onSkipCandidate(member.candidate_id, pkg)}
                disabled={!!candidateBusy[member.candidate_id]}
                style={{
                  padding: '4px 12px',
                  fontSize: '11px',
                  fontFamily: fontFamily.body,
                  fontWeight: fontWeight.medium,
                  borderRadius: radius.sm,
                  border: `1px solid ${tc.border.default}`,
                  background: 'transparent',
                  color: tc.text.muted,
                  cursor: candidateBusy[member.candidate_id] ? 'default' : 'pointer',
                  opacity: candidateBusy[member.candidate_id] ? 0.6 : 1,
                }}
              >
                {candidateBusy[member.candidate_id] === 'skipping' ? 'Skipping…' : '✗ Skip field'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PackageCard({
  pkg,
  active,
  busy,
  onApprove,
  onReject,
  onReview,
  onApproveCandidate,
  onSkipCandidate,
  candidateBusy,
  tc,
}: {
  pkg: SeoPageEnhancementPackage;
  active: boolean;
  busy: boolean;
  onApprove: (pkg: SeoPageEnhancementPackage) => void;
  onReject: (pkg: SeoPageEnhancementPackage) => void;
  onReview: (pkg: SeoPageEnhancementPackage) => void;
  onApproveCandidate: (candidateId: string, pkg: SeoPageEnhancementPackage) => void;
  onSkipCandidate: (candidateId: string, pkg: SeoPageEnhancementPackage) => void;
  candidateBusy: Record<string, 'approving' | 'skipping'>;
  tc: ReturnType<typeof useThemeColors>;
}) {
  const path = pathOf(pkg.rep_url || pkg.canonical_url);
  const blocked = !pkg.safe_to_bulk_approve;
  return (
    <article
      style={{
        border: `1px solid ${active ? PALETTE.violet : tc.border.default}`,
        borderRadius: radius.md,
        background: tc.background.surface,
        padding: space['4'],
        boxShadow: active ? '0 0 0 3px rgba(124,58,237,0.12)' : 'none',
      }}
      data-testid={`package-card-${pkg.enhancement_id}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: space['4'], alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: space['2'], alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
            <Pill tone={blocked ? 'warn' : 'good'} tc={tc}>{blocked ? 'review guards' : 'safe page'}</Pill>
            <Pill tone="neutral" tc={tc}>v{pkg.version}</Pill>
            <Pill tone="violet" tc={tc}>{fmtInt(pkg.change_count)} changes</Pill>
          </div>
          <h2 style={{ margin: 0, fontFamily: fontFamily.display, fontSize: '18px', fontWeight: fontWeight.semibold, color: tc.text.primary, wordBreak: 'break-word' }}>
            {path}
          </h2>
          <div style={{ marginTop: '3px', fontFamily: monoStack, fontSize: '11px', color: tc.text.muted, wordBreak: 'break-all' }}>
            {pkg.canonical_url}
          </div>
        </div>
        <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => onReject(pkg)}
            disabled={busy}
            style={{ padding: '8px 12px', borderRadius: radius.sm, border: `1px solid ${PALETTE.bad}`, background: tc.background.surface, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, cursor: busy ? 'default' : 'pointer' }}
            data-testid={`button-reject-package-${pkg.enhancement_id}`}
          >
            Reject page
          </button>
          {blocked ? (
            <button
              type="button"
              onClick={() => onReview(pkg)}
              disabled={busy}
              title="This package has review guards. Click to open the detail page and review before approving."
              style={{ padding: '8px 12px', borderRadius: radius.sm, border: `1px solid ${tc.border.default}`, background: 'transparent', color: tc.text.secondary, fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, cursor: busy ? 'default' : 'pointer' }}
            >
              Review &amp; approve →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onApprove(pkg)}
              disabled={busy}
              style={{ padding: '8px 12px', borderRadius: radius.sm, border: 'none', background: PALETTE.good, color: '#fff', fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, cursor: busy ? 'default' : 'pointer' }}
              data-testid={`button-approve-package-${pkg.enhancement_id}`}
            >
              Approve page
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: space['1'], marginTop: space['3'] }}>
        {pkg.members.map((member) => (
          <FieldChange
            key={member.candidate_id}
            member={member}
            tc={tc}
            onApproveCandidate={onApproveCandidate}
            onSkipCandidate={onSkipCandidate}
            candidateBusy={candidateBusy}
            pkg={pkg}
          />
        ))}
      </div>
    </article>
  );
}

function LifecycleCard({
  row,
  policy,
  tc,
}: {
  row: SeoPageEnhancementLifecycle;
  policy: SeoPageEnhancementsResponse['policy'];
  tc: ReturnType<typeof useThemeColors>;
}) {
  const path = pathOf(row.rep_url || row.canonical_url);
  return (
    <article
      style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, background: tc.background.surface, padding: space['4'] }}
      data-testid={`lifecycle-card-${row.enhancement_id}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: space['3'], alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: space['2'], alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
            <LifecyclePill status={row.status} tc={tc} />
            <Pill tone="neutral" tc={tc}>v{row.version}</Pill>
            <Pill tone="violet" tc={tc}>{fmtInt(row.fields.length)} fields</Pill>
          </div>
          <h2 style={{ margin: 0, fontFamily: fontFamily.display, fontSize: '17px', fontWeight: fontWeight.semibold, color: tc.text.primary, wordBreak: 'break-word' }}>
            {path}
          </h2>
          <div style={{ marginTop: '3px', fontFamily: monoStack, fontSize: '11px', color: tc.text.muted, wordBreak: 'break-all' }}>
            {row.canonical_url}
          </div>
        </div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, textAlign: 'right' }}>
          {countdownText(row, policy)}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: space['2'], marginTop: space['4'] }}>
        <div style={{ padding: space['3'], borderRadius: radius.sm, background: tc.background.muted, fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.secondary }}>
          {deltaText('Rank', row.baseline_position, row.prov_position ?? row.final_position, true)}
        </div>
        <div style={{ padding: space['3'], borderRadius: radius.sm, background: tc.background.muted, fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.secondary }}>
          {deltaText('Clicks', row.baseline_clicks, row.prov_clicks ?? row.final_clicks)}
        </div>
        <div style={{ padding: space['3'], borderRadius: radius.sm, background: tc.background.muted, fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.secondary }}>
          {row.action ? `Next: ${row.action.replace(/_/g, ' ')}` : 'Next action follows the 30/60-day clock'}
        </div>
      </div>
    </article>
  );
}

function RecommendationsContent() {
  const tc = useThemeColors();
  const router = useRouter();
  const [data, setData] = useState<SeoPageEnhancementsResponse | null>(null);
  const [packages, setPackages] = useState<SeoPageEnhancementPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<Stage>('review');
  const [statusFilter, setStatusFilter] = useState<'all' | 'safe' | 'needs-review'>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [candidateBusy, setCandidateBusy] = useState<Record<string, 'approving' | 'skipping'>>({});

  const [tick, setTick] = useState(0);

  const load = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    const timeout = setTimeout(() => {
      if (alive) setError('Package data unavailable. The page-enhancements API may be timing out.');
    }, 12_000);

    getSeoPageEnhancements()
      .then((res) => {
        if (!alive) return;
        clearTimeout(timeout);
        setData(res);
        setPackages(res.packages ?? []);
        setActiveIndex(0);
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        clearTimeout(timeout);
        setError(err instanceof Error ? err.message : 'Could not load page packages');
        setLoading(false);
      });

    return () => { alive = false; clearTimeout(timeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return packages
      .filter((pkg) => {
        if (statusFilter === 'safe') return pkg.safe_to_bulk_approve;
        if (statusFilter === 'needs-review') return !pkg.safe_to_bulk_approve;
        return true;
      })
      .filter((pkg) => {
        if (!term) return true;
        return [pkg.canonical_url, pkg.rep_url, ...pkg.members.map((m) => `${m.proposed_value ?? ''} ${m.current_value_snapshot ?? ''}`)]
          .join(' ')
          .toLowerCase()
          .includes(term);
      });
  }, [packages, search, statusFilter]);

  const safePackages = useMemo(() => packages.filter((pkg) => pkg.safe_to_bulk_approve), [packages]);
  const activePackage = filtered[Math.min(activeIndex, Math.max(0, filtered.length - 1))] ?? null;
  const evaluatingRows = useMemo(
    () => (data?.lifecycle ?? []).filter((row) => EVALUATING_STATUSES.has(row.status)),
    [data],
  );
  const resolvedRows = useMemo(
    () => (data?.lifecycle ?? []).filter((row) => RESOLVED_STATUSES.has(row.status)),
    [data],
  );
  const visibleLifecycleRows = stage === 'evaluating' ? evaluatingRows : resolvedRows;
  const lifecycleGroups = useMemo(() => {
    const groups = new Map<string, SeoPageEnhancementLifecycle[]>();
    for (const row of visibleLifecycleRows) {
      const key = row.status || 'unknown';
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return Array.from(groups.entries());
  }, [visibleLifecycleRows]);

  const approvePackage = useCallback(async (pkg: SeoPageEnhancementPackage) => {
    if (!pkg.safe_to_bulk_approve) return;
    const msg = `Approve this page package?\n\n${pkg.auto_publish_count} publish live through policy, ${pkg.draft_count} queue as drafts.`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    setActionMsg(null);
    try {
      await approveSeoPageEnhancement(pkg.enhancement_id);
      setActionMsg(`Approved ${pathOf(pkg.rep_url || pkg.canonical_url)} as one page package.`);
      load();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setBusy(false);
    }
  }, [load]);

  const rejectPackage = useCallback(async (pkg: SeoPageEnhancementPackage) => {
    if (!window.confirm(`Reject all ${pkg.change_count} changes for ${pathOf(pkg.rep_url || pkg.canonical_url)}?`)) return;
    setBusy(true);
    setActionMsg(null);
    try {
      await rejectSeoPageEnhancement(pkg.enhancement_id);
      setActionMsg(`Rejected ${pathOf(pkg.rep_url || pkg.canonical_url)}.`);
      load();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setBusy(false);
    }
  }, [load]);

  const approveCandidate = useCallback(async (candidateId: string, _pkg: SeoPageEnhancementPackage) => {
    setCandidateBusy(prev => ({ ...prev, [candidateId]: 'approving' }));
    try {
      await approveSeoCandidate(candidateId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve field');
    } finally {
      setCandidateBusy(prev => { const next = { ...prev }; delete next[candidateId]; return next; });
    }
  }, [load]);

  const skipCandidate = useCallback(async (candidateId: string, _pkg: SeoPageEnhancementPackage) => {
    setCandidateBusy(prev => ({ ...prev, [candidateId]: 'skipping' }));
    try {
      await skipSeoCandidate(candidateId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to skip field');
    } finally {
      setCandidateBusy(prev => { const next = { ...prev }; delete next[candidateId]; return next; });
    }
  }, [load]);

  async function approveSafePackages() {
    if (safePackages.length === 0) return;
    const live = safePackages.reduce((sum, pkg) => sum + pkg.auto_publish_count, 0);
    const drafts = safePackages.reduce((sum, pkg) => sum + pkg.draft_count, 0);
    if (!window.confirm(`Approve ${safePackages.length} safe page package${safePackages.length === 1 ? '' : 's'}?\n\n${live} publish live through policy, ${drafts} queue as drafts.`)) return;
    setBusy(true);
    setActionMsg(null);
    try {
      const result = await bulkApproveSeoPageEnhancements(safePackages.map((pkg) => pkg.enhancement_id));
      setActionMsg(`Bulk approve complete: ${result.summary.approved} pages approved, ${result.summary.skipped} skipped.`);
      load();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Bulk approval failed');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (stage !== 'review') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
      } else if (e.key.toLowerCase() === 'a' && activePackage) {
        e.preventDefault();
        if (activePackage.safe_to_bulk_approve) {
          approvePackage(activePackage);
        } else {
          router.push(`/dashboard/seo/enhancement/${activePackage.enhancement_id}`);
        }
      } else if (e.key.toLowerCase() === 'r' && activePackage) {
        e.preventDefault();
        rejectPackage(activePackage);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePackage, approvePackage, filtered.length, rejectPackage, router, stage]);

  return (
    <div style={{ padding: space['6'], maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ marginBottom: space['5'] }}>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: '24px', fontWeight: fontWeight.semibold, color: tc.text.primary, margin: 0 }}>Page Enhancements</h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, marginTop: '4px' }} data-testid="text-recommendations-subtitle">
          Review one page package at a time, then follow its 30/60-day evaluation clock through the final verdict.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: space['2'], marginBottom: space['4'] }}>
        {([
          ['review', 'Review', packages.length],
          ['evaluating', 'In evaluation', evaluatingRows.length],
          ['resolved', 'Resolved', resolvedRows.length],
        ] as Array<[Stage, string, number]>).map(([key, label, count]) => {
          const active = stage === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStage(key)}
              style={{ padding: space['3'], borderRadius: radius.md, border: `1px solid ${active ? PALETTE.violet : tc.border.default}`, background: active ? PALETTE.violet : tc.background.surface, color: active ? '#fff' : tc.text.primary, cursor: 'pointer', textAlign: 'left' }}
              data-testid={`button-stage-${key}`}
            >
              <div style={{ fontFamily: fontFamily.body, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: active ? 0.8 : 1 }}>{label}</div>
              <div style={{ fontFamily: fontFamily.display, fontSize: '22px', fontWeight: fontWeight.semibold }}>{fmtInt(count)}</div>
            </button>
          );
        })}
      </div>

      {stage === 'review' && <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', alignItems: 'center', marginBottom: space['4'] }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by page or copy…"
          style={{ flex: '1 1 280px', minWidth: 220, padding: '8px 10px', borderRadius: radius.sm, border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.primary, fontFamily: fontFamily.body, fontSize: '13px' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          style={{ padding: '8px 10px', borderRadius: radius.sm, border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.primary, fontFamily: fontFamily.body, fontSize: '13px' }}
        >
          <option value="all">All pages</option>
          <option value="safe">Safe pages</option>
          <option value="needs-review">Needs review</option>
        </select>
        <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>{fmtInt(filtered.length)} page{filtered.length === 1 ? '' : 's'}</span>
        <button
          type="button"
          onClick={approveSafePackages}
          disabled={busy || safePackages.length === 0}
          data-testid="button-bulk-approve-safe-pages"
          style={{ padding: '8px 12px', borderRadius: radius.sm, border: 'none', background: safePackages.length ? PALETTE.good : tc.background.muted, color: safePackages.length ? '#fff' : tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, cursor: busy || safePackages.length === 0 ? 'default' : 'pointer' }}
        >
          Safe pages to bulk-approve ({fmtInt(safePackages.length)})
        </button>
      </div>}

      {stage === 'review' && <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', marginBottom: space['4'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
        <span>Keys: <strong style={{ color: tc.text.primary }}>A</strong> approve safe page</span>
        <span><strong style={{ color: tc.text.primary }}>R</strong> reject page</span>
        <span><strong style={{ color: tc.text.primary }}>J</strong> next page</span>
      </div>}

      {actionMsg && (
        <div style={{ marginBottom: space['4'], padding: space['3'], borderRadius: radius.md, border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.secondary, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="text-action-message">
          {actionMsg}
        </div>
      )}

      {loading && <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>Loading page packages…</div>}
      {error && (
        <div style={{ padding: space['4'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px', marginBottom: space['4'], display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => { setError(null); setLoading(true); setTick((t) => t + 1); }} style={{ marginLeft: space['4'], padding: `${space['1']} ${space['3']}`, borderRadius: radius.sm, border: `1px solid ${PALETTE.bad}`, background: 'transparent', color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '12px', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}
      {!loading && !error && stage === 'review' && packages.length === 0 && evaluatingRows.length === 0 && resolvedRows.length === 0 && (
        <div style={{ textAlign: 'center', padding: space['12'], color: tc.text.muted }}>
          <div style={{ fontSize: '32px', marginBottom: space['3'] }}>✓</div>
          <div style={{ fontFamily: fontFamily.display, fontSize: '16px', fontWeight: fontWeight.semibold, color: tc.text.primary }}>Queue is clear</div>
          <div style={{ fontFamily: fontFamily.body, fontSize: '13px', marginTop: space['2'] }}>No page packages are waiting for review. New packages appear here when the SEO engine generates them.</div>
        </div>
      )}
      {!loading && !error && stage === 'review' && packages.length > 0 && filtered.length === 0 && (
        <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="empty-recommendations">
          No page packages match this filter.
        </div>
      )}

      {stage === 'review' && <div style={{ display: 'grid', gap: space['4'] }}>
        {!loading && !error && filtered.map((pkg, index) => (
          <PackageCard
            key={pkg.enhancement_id}
            pkg={pkg}
            active={activePackage?.enhancement_id === pkg.enhancement_id || index === activeIndex}
            busy={busy}
            onApprove={approvePackage}
            onReject={rejectPackage}
            onReview={(p) => router.push(`/dashboard/seo/enhancement/${p.enhancement_id}`)}
            onApproveCandidate={approveCandidate}
            onSkipCandidate={skipCandidate}
            candidateBusy={candidateBusy}
            tc={tc}
          />
        ))}
      </div>}

      {stage !== 'review' && !loading && !error && visibleLifecycleRows.length === 0 && (
        <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid={`empty-${stage}`}>
          No page packages are currently {stage === 'evaluating' ? 'in evaluation' : 'resolved'}.
        </div>
      )}

      {stage !== 'review' && !loading && !error && (
        <div style={{ display: 'grid', gap: space['5'] }}>
          {lifecycleGroups.map(([status, rows]) => (
            <section key={status}>
              <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], marginBottom: space['3'] }}>
                <LifecyclePill status={status} tc={tc} />
                <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>{fmtInt(rows.length)} page{rows.length === 1 ? '' : 's'}</span>
              </div>
              <div style={{ display: 'grid', gap: space['3'] }}>
                {rows.map((row) => <LifecycleCard key={row.enhancement_id} row={row} policy={data?.policy ?? { first_verdict_days: 30, final_days: 60 }} tc={tc} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RecommendationsPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied message="You do not have permission to view SEO recommendations." />}>
      <RecommendationsContent />
    </DashboardGuard>
  );
}
