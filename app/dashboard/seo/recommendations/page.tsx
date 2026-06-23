'use client';

// =============================================================================
// SEO Recommendations — page-package review
// Decision unit: one page enhancement package from
// analytics.v_seo_page_enhancement_queue. Candidate-level rows remain available
// only as drill-down details behind each field chip.
// =============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import {
  approveSeoPageEnhancement,
  bulkApproveSeoPageEnhancements,
  getSeoPageEnhancements,
  rejectSeoPageEnhancement,
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

function FieldChange({ member, tc }: { member: SeoPageEnhancementMember; tc: ReturnType<typeof useThemeColors> }) {
  const guard = memberGuardText(member);
  return (
    <div
      style={{ border: `1px solid ${tc.border.subtle}`, borderRadius: radius.sm, padding: space['3'], background: tc.background.surface }}
      data-testid={`field-change-${member.candidate_id}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: space['2'], alignItems: 'center', marginBottom: space['2'] }}>
        <Pill tone={fieldTone(member.field_label)} tc={tc}>{member.field_label}</Pill>
        <Link
          href={`/dashboard/seo/action/${encodeURIComponent(member.candidate_id)}`}
          style={{ fontFamily: fontFamily.body, fontSize: '11px', color: PALETTE.violet, textDecoration: 'none', fontWeight: fontWeight.medium }}
        >
          Details
        </Link>
      </div>
      <div
        title={`${member.current_value_snapshot ?? '—'} → ${member.proposed_value ?? '—'}`}
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', gap: space['2'], alignItems: 'start', fontFamily: fontFamily.body, fontSize: '12px', lineHeight: 1.45, color: tc.text.muted }}
      >
        <div style={{ minWidth: 0 }}>{valuePreview(member.current_value_snapshot, 150)}</div>
        <div style={{ color: tc.text.muted }}>→</div>
        <div style={{ minWidth: 0, color: tc.text.primary }}>{valuePreview(member.proposed_value, 150)}</div>
      </div>
      <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', marginTop: space['2'] }}>
        {member.auto_publish ? <Pill tone="good" tc={tc}>publishes live</Pill> : <Pill tone="neutral" tc={tc}>draft</Pill>}
        {guard ? <Pill tone="warn" tc={tc}>{guard}</Pill> : <Pill tone="good" tc={tc}>ready</Pill>}
      </div>
    </div>
  );
}

function PackageCard({
  pkg,
  active,
  busy,
  onApprove,
  onReject,
  tc,
}: {
  pkg: SeoPageEnhancementPackage;
  active: boolean;
  busy: boolean;
  onApprove: (pkg: SeoPageEnhancementPackage) => void;
  onReject: (pkg: SeoPageEnhancementPackage) => void;
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
          <button
            type="button"
            onClick={() => onApprove(pkg)}
            disabled={busy || blocked}
            title={blocked ? 'Every field in the page package must pass guards before approval.' : undefined}
            style={{ padding: '8px 12px', borderRadius: radius.sm, border: 'none', background: blocked ? tc.background.muted : PALETTE.good, color: blocked ? tc.text.muted : '#fff', fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, cursor: busy || blocked ? 'default' : 'pointer' }}
            data-testid={`button-approve-package-${pkg.enhancement_id}`}
          >
            Approve page
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: space['3'], marginTop: space['4'] }}>
        {pkg.members.map((member) => <FieldChange key={member.candidate_id} member={member} tc={tc} />)}
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

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getSeoPageEnhancements()
      .then((data) => {
        setData(data);
        setPackages(data.packages ?? []);
        setActiveIndex(0);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load page packages'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

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
      } else if (e.key.toLowerCase() === 'a' && activePackage && activePackage.safe_to_bulk_approve) {
        e.preventDefault();
        approvePackage(activePackage);
      } else if (e.key.toLowerCase() === 'r' && activePackage) {
        e.preventDefault();
        rejectPackage(activePackage);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePackage, approvePackage, filtered.length, rejectPackage, stage]);

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
      {error && <div style={{ padding: space['4'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>{error}</div>}
      {!loading && !error && stage === 'review' && filtered.length === 0 && (
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
