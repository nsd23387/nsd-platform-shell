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
  approveSeoCandidate,
  approveSeoPageEnhancement,
  bulkApproveSeoPageEnhancements,
  getSeoPageEnhancements,
  rejectSeoPageEnhancement,
  skipSeoCandidate,
} from '../../../../lib/seoApi';
import type { SeoPageEnhancementChange, SeoPageEnhancementLifecycle, SeoPageEnhancementMember, SeoPageEnhancementPackage, SeoPageEnhancementsResponse } from '../../../../lib/seoApi';
import { EmptyState, PALETTE, monoStack, Pill, fmtInt, pathOf } from '../_shared';

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

function mutationLabel(type: string | null | undefined): string {
  const raw = String(type ?? '').toLowerCase();
  const labels: Record<string, string> = {
    title_tag_refinement: 'Title tag',
    meta_description_update: 'Meta description',
    h1_tag_refinement: 'H1',
    heading_refinement: 'Heading',
    image_alt_text_improvement: 'Image alt text',
    breadcrumb_schema_addition: 'Breadcrumb schema',
    product_offer_schema_addition: 'Product offer schema',
    internal_link_insertion: 'Internal link',
  };
  if (labels[raw]) return labels[raw];
  return raw
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Change';
}

function parseJsonValue(value: string | null | undefined): unknown | null {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function prettyJson(value: string | null | undefined): string {
  const parsed = parseJsonValue(value);
  if (parsed == null) return value ?? '';
  return JSON.stringify(parsed, null, 2);
}

function findSchemaType(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findSchemaType(item);
      if (found) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  const direct = record['@type'];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const graph = record['@graph'];
  if (Array.isArray(graph)) return findSchemaType(graph);
  for (const v of Object.values(record)) {
    const found = findSchemaType(v);
    if (found) return found;
  }
  return null;
}

function schemaSummary(change: SeoPageEnhancementChange): string {
  const schemaType = findSchemaType(parseJsonValue(change.proposed_value));
  return schemaType ? `Adds structured data: ${schemaType}` : `Adds structured data: ${mutationLabel(change.mutation_type)}`;
}

function ChangeValue({
  children,
  muted = false,
  strike = false,
  tc,
}: {
  children: React.ReactNode;
  muted?: boolean;
  strike?: boolean;
  tc: ReturnType<typeof useThemeColors>;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        fontFamily: monoStack,
        fontSize: '12px',
        lineHeight: 1.55,
        color: muted ? tc.text.muted : tc.text.primary,
        textDecoration: strike ? 'line-through' : 'none',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
      }}
    >
      {children}
    </div>
  );
}

function SchemaPre({
  label,
  value,
  defaultOpen = false,
  tc,
}: {
  label: string;
  value: string | null | undefined;
  defaultOpen?: boolean;
  tc: ReturnType<typeof useThemeColors>;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!value) return null;
  return (
    <div style={{ marginTop: space['2'] }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        style={{
          padding: 0,
          border: 0,
          background: 'transparent',
          color: PALETTE.violet,
          cursor: 'pointer',
          fontFamily: fontFamily.body,
          fontSize: '12px',
        }}
      >
        {open ? 'Hide' : 'View'} {label}
      </button>
      {open && (
        <pre
          style={{
            margin: `${space['2']} 0 0`,
            padding: space['3'],
            border: `1px solid ${tc.border.subtle}`,
            borderRadius: radius.sm,
            background: tc.background.muted,
            color: tc.text.primary,
            fontFamily: monoStack,
            fontSize: '11.5px',
            lineHeight: 1.5,
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
          }}
        >
          {prettyJson(value)}
        </pre>
      )}
    </div>
  );
}

function ChangeItem({ change, tc }: { change: SeoPageEnhancementChange; tc: ReturnType<typeof useThemeColors> }) {
  const kind = String(change.change_kind ?? '').toLowerCase();
  const label = mutationLabel(change.mutation_type);

  if (kind === 'schema') {
    return (
      <div data-testid={`review-change-${change.candidate_id ?? label}`}>
        <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.primary, marginBottom: space['1'] }}>
          {schemaSummary(change)}
        </div>
        <SchemaPre label="structured data" value={change.proposed_value} tc={tc} />
        {change.current_value && String(change.current_value).toLowerCase() !== 'missing' && (
          <SchemaPre label="current structured data" value={change.current_value} tc={tc} />
        )}
      </div>
    );
  }

  if (kind === 'internal_link') {
    return (
      <div data-testid={`review-change-${change.candidate_id ?? label}`} style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.primary }}>
        Adds internal link: <span style={{ fontFamily: monoStack }}>&ldquo;{change.proposed_value ?? '—'}&rdquo;</span>
      </div>
    );
  }

  if (change.is_noop) {
    return (
      <div data-testid={`review-change-${change.candidate_id ?? label}`} style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
        <span style={{ color: tc.text.secondary }}>{label}</span>: No change (proposed equals current)
      </div>
    );
  }

  return (
    <div data-testid={`review-change-${change.candidate_id ?? label}`}>
      <div style={{ fontFamily: fontFamily.body, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: tc.text.muted, marginBottom: space['2'] }}>
        {label}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
          gap: space['2'],
          alignItems: 'start',
        }}
      >
        <ChangeValue muted strike tc={tc}>{change.current_value ?? '—'}</ChangeValue>
        <span style={{ color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '12px', lineHeight: 1.55 }}>→</span>
        <ChangeValue tc={tc}>{change.proposed_value ?? '—'}</ChangeValue>
      </div>
    </div>
  );
}

function ChangesSection({ changes, tc }: { changes: SeoPageEnhancementChange[]; tc: ReturnType<typeof useThemeColors> }) {
  const [open, setOpen] = useState(true);
  if (!changes.length) {
    return (
      <div style={{ marginTop: space['3'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
        Change details are unavailable for this package.
      </div>
    );
  }
  return (
    <section style={{ marginTop: space['4'] }} aria-label="Proposed changes">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: space['2'],
          padding: 0,
          border: 0,
          background: 'transparent',
          color: PALETTE.violet,
          cursor: 'pointer',
          fontFamily: fontFamily.body,
          fontSize: '12px',
          fontWeight: fontWeight.semibold,
        }}
      >
        <span>{open ? 'Hide' : 'Show'} Changes</span>
        <span style={{ color: tc.text.muted, fontWeight: fontWeight.normal }}>({fmtInt(changes.length)})</span>
      </button>
      {open && (
        <div
          style={{
            marginTop: space['3'],
            borderTop: `1px solid ${tc.border.subtle}`,
            borderBottom: `1px solid ${tc.border.subtle}`,
          }}
        >
          {changes.map((change, index) => (
            <div
              key={`${change.candidate_id ?? change.mutation_type ?? 'change'}-${index}`}
              style={{
                padding: `${space['3']} 0`,
                borderTop: index === 0 ? 'none' : `1px solid ${tc.border.subtle}`,
              }}
            >
              <ChangeItem change={change} tc={tc} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
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
                className="seo-button seo-button-primary primary-action"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                {candidateBusy[member.candidate_id] === 'approving' ? 'Approving…' : '✓ Approve field'}
              </button>
              <button
                type="button"
                onClick={() => onSkipCandidate(member.candidate_id, pkg)}
                disabled={!!candidateBusy[member.candidate_id]}
                className="seo-button seo-button-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
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
  onApproveCandidate,
  onSkipCandidate,
  candidateBusy,
  tc,
}: {
  pkg: SeoPageEnhancementPackage;
  active: boolean;
  busy: boolean;
  onApprove: (pkg: SeoPageEnhancementPackage, e: React.MouseEvent) => void;
  onReject: (pkg: SeoPageEnhancementPackage, e: React.MouseEvent) => void;
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
          </div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: fontWeight.semibold, color: tc.text.primary, wordBreak: 'break-word' }}>
            {path}
          </h2>
          <div style={{ marginTop: '3px', fontFamily: monoStack, fontSize: '12.5px', color: tc.text.muted, wordBreak: 'break-all' }}>
            {pkg.canonical_url}
          </div>
        </div>
        <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={(e) => onReject(pkg, e)}
            disabled={busy}
            className="seo-button seo-button-secondary"
            data-testid={`button-reject-package-${pkg.enhancement_id}`}
          >
            Reject page
          </button>
          <button
            type="button"
            onClick={(e) => onApprove(pkg, e)}
            disabled={busy}
            className="seo-button seo-button-primary primary-action"
            data-testid={`button-approve-package-${pkg.enhancement_id}`}
          >
            Approve page
          </button>
        </div>
      </div>
      <ChangesSection changes={pkg.changes ?? []} tc={tc} />
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
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: fontWeight.semibold, color: tc.text.primary, wordBreak: 'break-word' }}>
            {path}
          </h2>
          <div style={{ marginTop: '3px', fontFamily: monoStack, fontSize: '12.5px', color: tc.text.muted, wordBreak: 'break-all' }}>
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
  const [candidateBusy, setCandidateBusy] = useState<Record<string, 'approving' | 'skipping'>>({});

  type PendingConfirm = {
    title: string;
    warnings?: string[];
    onConfirm: () => void;
    anchorRect?: DOMRect;
  };
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

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
        return [
          pkg.canonical_url,
          pkg.rep_url,
          ...pkg.members.map((m) => `${m.proposed_value ?? ''} ${m.current_value_snapshot ?? ''}`),
          ...(pkg.changes ?? []).map((c) => `${c.current_value ?? ''} ${c.proposed_value ?? ''} ${c.mutation_type ?? ''}`),
        ]
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

  // Optimistic helpers — mutate local state instantly, no reload
  const removePackage = useCallback((enhancementId: string) => {
    setPackages(prev => prev.filter(p => p.enhancement_id !== enhancementId));
  }, []);

  const removeCandidate = useCallback((candidateId: string, enhancementId: string) => {
    setPackages(prev =>
      prev
        .map(p => {
          if (p.enhancement_id !== enhancementId) return p;
          const remaining = p.members.filter(m => m.candidate_id !== candidateId);
          const remainingChanges = (p.changes ?? []).filter((change) => change.candidate_id !== candidateId);
          return { ...p, members: remaining, changes: remainingChanges, change_count: remainingChanges.length || remaining.length };
        })
        .filter(p => p.members.length > 0),
    );
  }, []);

  const approvePackage = useCallback(async (pkg: SeoPageEnhancementPackage, e?: React.MouseEvent) => {
    const guardedMembers = pkg.members.filter(m => !m.safe_to_approve);
    const warnings = guardedMembers.length > 0
      ? [`QA warnings on: ${guardedMembers.map(m => m.field_label || m.mutation_type || 'field').join(', ')}`]
      : undefined;
    setPendingConfirm({
      title: `Approve page package? ${pkg.auto_publish_count} field(s) publish live · ${pkg.draft_count} queue as drafts.`,
      warnings,
      anchorRect: (e?.currentTarget as HTMLElement | undefined)?.getBoundingClientRect(),
      onConfirm: async () => {
        setPendingConfirm(null);
        setBusy(true);
        setActionMsg(null);
        try {
          await approveSeoPageEnhancement(pkg.enhancement_id);
          removePackage(pkg.enhancement_id);
          setActionMsg(`Approved ${pathOf(pkg.rep_url || pkg.canonical_url)}.`);
        } catch (err) {
          setActionMsg(err instanceof Error ? err.message : 'Approval failed');
        } finally {
          setBusy(false);
        }
      },
    });
  }, [removePackage]);

  const rejectPackage = useCallback(async (pkg: SeoPageEnhancementPackage, e?: React.MouseEvent) => {
    setPendingConfirm({
      title: `Reject all ${pkg.change_count} changes for ${pathOf(pkg.rep_url || pkg.canonical_url)}?`,
      anchorRect: (e?.currentTarget as HTMLElement | undefined)?.getBoundingClientRect(),
      onConfirm: async () => {
        setPendingConfirm(null);
        setBusy(true);
        setActionMsg(null);
        try {
          await rejectSeoPageEnhancement(pkg.enhancement_id);
          removePackage(pkg.enhancement_id);
          setActionMsg(`Rejected ${pathOf(pkg.rep_url || pkg.canonical_url)}.`);
        } catch (err) {
          setActionMsg(err instanceof Error ? err.message : 'Reject failed');
        } finally {
          setBusy(false);
        }
      },
    });
  }, [removePackage]);

  const approveCandidate = useCallback(async (candidateId: string, pkg: SeoPageEnhancementPackage) => {
    setCandidateBusy(prev => ({ ...prev, [candidateId]: 'approving' }));
    try {
      await approveSeoCandidate(candidateId);
      removeCandidate(candidateId, pkg.enhancement_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve field');
    } finally {
      setCandidateBusy(prev => { const next = { ...prev }; delete next[candidateId]; return next; });
    }
  }, [removeCandidate]);

  const skipCandidate = useCallback(async (candidateId: string, pkg: SeoPageEnhancementPackage) => {
    setCandidateBusy(prev => ({ ...prev, [candidateId]: 'skipping' }));
    try {
      await skipSeoCandidate(candidateId);
      removeCandidate(candidateId, pkg.enhancement_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to skip field');
    } finally {
      setCandidateBusy(prev => { const next = { ...prev }; delete next[candidateId]; return next; });
    }
  }, [removeCandidate]);

  async function approveSafePackages(e?: React.MouseEvent) {
    if (safePackages.length === 0) return;
    const live = safePackages.reduce((sum, pkg) => sum + pkg.auto_publish_count, 0);
    const drafts = safePackages.reduce((sum, pkg) => sum + pkg.draft_count, 0);
    setPendingConfirm({
      title: `Approve ${safePackages.length} safe page package${safePackages.length === 1 ? '' : 's'}? ${live} publish live through policy, ${drafts} queue as drafts.`,
      anchorRect: (e?.currentTarget as HTMLElement | undefined)?.getBoundingClientRect(),
      onConfirm: async () => {
        setPendingConfirm(null);
        setBusy(true);
        setActionMsg(null);
        try {
          const approvedIds = new Set(safePackages.map(p => p.enhancement_id));
          const result = await bulkApproveSeoPageEnhancements(safePackages.map((pkg) => pkg.enhancement_id));
          setPackages(prev => prev.filter(p => !approvedIds.has(p.enhancement_id)));
          setActionMsg(`Bulk approve complete: ${result.summary.approved} pages approved, ${result.summary.skipped} skipped.`);
        } catch (err) {
          setActionMsg(err instanceof Error ? err.message : 'Bulk approval failed');
        } finally {
          setBusy(false);
        }
      },
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setPendingConfirm(null); return; }
      if (stage !== 'review') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
      } else if (e.key.toLowerCase() === 'a' && activePackage) {
        e.preventDefault();
        approvePackage(activePackage);
      } else if (e.key.toLowerCase() === 'r' && activePackage) {
        e.preventDefault();
        rejectPackage(activePackage);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePackage, approvePackage, filtered.length, rejectPackage, setPendingConfirm, stage]);

  return (
    <div style={{ padding: space['6'], maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ marginBottom: space['5'] }}>
        <h1 className="seo-page-title">Page Enhancements</h1>
        <p className="seo-page-subtitle" data-testid="text-recommendations-subtitle">
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
              style={{ padding: space['3'], borderRadius: radius.md, border: `1px solid ${active ? PALETTE.violet : tc.border.default}`, background: active ? PALETTE.violet : tc.background.surface, color: active ? 'var(--fg)' : tc.text.primary, cursor: 'pointer', textAlign: 'left' }}
              data-testid={`button-stage-${key}`}
            >
              <div style={{ fontFamily: fontFamily.body, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: active ? 0.8 : 1 }}>{label}</div>
              <div style={{ fontSize: '22px', fontWeight: fontWeight.semibold }}>{fmtInt(count)}</div>
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
        <span style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted }}>{fmtInt(filtered.length)} page{filtered.length === 1 ? '' : 's'}</span>
        <button
          type="button"
          onClick={(e) => approveSafePackages(e)}
          disabled={busy || safePackages.length === 0}
          data-testid="button-bulk-approve-safe-pages"
          className="seo-button seo-button-primary primary-action"
        >
          Safe pages to bulk-approve ({fmtInt(safePackages.length)})
        </button>
      </div>}

      {stage === 'review' && <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', marginBottom: space['4'], fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted }}>
        <span>Keys: <strong style={{ color: tc.text.primary }}>A</strong> approve safe page</span>
        <span><strong style={{ color: tc.text.primary }}>R</strong> reject page</span>
        <span><strong style={{ color: tc.text.primary }}>J</strong> next page</span>
      </div>}

      {actionMsg && (
        <div style={{ marginBottom: space['4'], padding: space['3'], borderRadius: radius.md, border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.secondary, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="text-action-message">
          {actionMsg}
        </div>
      )}

      {pendingConfirm && (() => {
        const r = pendingConfirm.anchorRect;
        // Position below the anchor button; flip above if too close to viewport bottom
        const POPOVER_H_EST = 160;
        const spaceBelow = r ? window.innerHeight - r.bottom : 9999;
        const top = r
          ? (spaceBelow < POPOVER_H_EST + 8 ? r.top - POPOVER_H_EST - 8 : r.bottom + 8)
          : window.innerHeight / 2 - POPOVER_H_EST / 2;
        const left = r ? Math.min(r.left, window.innerWidth - 332) : window.innerWidth / 2 - 160;
        return (
          <>
            {/* Backdrop — click-away to cancel */}
            <div
              aria-hidden="true"
              onClick={() => setPendingConfirm(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            />
            <div
              role="alertdialog"
              aria-label="Confirm action"
              style={{
                position: 'fixed',
                top,
                left,
                width: 320,
                zIndex: 50,
                padding: space['4'],
                borderRadius: radius.md,
                border: `1px solid ${tc.border.default}`,
                background: tc.background.surface,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                fontFamily: fontFamily.body,
                fontSize: '13px',
                color: tc.text.primary,
              }}
            >
              <div style={{ marginBottom: space['2'], lineHeight: 1.45 }}>{pendingConfirm.title}</div>
              {pendingConfirm.warnings && pendingConfirm.warnings.map((w, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: space['2'],
                    padding: `${space['1']} ${space['2']}`,
                    borderRadius: radius.sm,
                    background: PALETTE.warnSoft,
                    color: PALETTE.warn,
                    fontSize: '12px',
                    marginBottom: space['2'],
                  }}
                >
                  <span>⚠</span>
                  <span>{w}</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: space['2'], marginTop: space['3'] }}>
                <button
                  type="button"
                  onClick={pendingConfirm.onConfirm}
                  className="seo-button seo-button-primary primary-action"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setPendingConfirm(null)}
                  className="seo-button seo-button-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {loading && <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>Loading page packages…</div>}
      {error && (
        <div style={{ padding: space['4'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px', marginBottom: space['4'], display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => { setError(null); setLoading(true); setTick((t) => t + 1); }} className="seo-button seo-button-danger" style={{ marginLeft: space['4'] }}>
            Retry
          </button>
        </div>
      )}
      {!loading && !error && stage === 'review' && packages.length === 0 && evaluatingRows.length === 0 && resolvedRows.length === 0 && (
        <EmptyState
          icon="✓"
          title="All caught up"
          body="No pages are awaiting review. New packages appear here when the SEO engine generates them."
          action={<Link href="/dashboard/seo/evaluation" style={{ color: 'var(--violet)', fontSize: 13 }}>View In Evaluation</Link>}
        />
      )}
      {!loading && !error && stage === 'review' && packages.length === 0 && evaluatingRows.length > 0 && (
        <EmptyState
          icon="✓"
          title="All caught up"
          body={`${fmtInt(evaluatingRows.length)} in evaluation; first verdicts arrive on the 30-day clock.`}
          action={<Link href="/dashboard/seo/evaluation" style={{ color: 'var(--violet)', fontSize: 13 }}>View In Evaluation</Link>}
        />
      )}
      {!loading && !error && stage === 'review' && packages.length > 0 && filtered.length === 0 && (
        <EmptyState icon="⌕" title="No matches" body="No page packages match this filter." />
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
            onApproveCandidate={approveCandidate}
            onSkipCandidate={skipCandidate}
            candidateBusy={candidateBusy}
            tc={tc}
          />
        ))}
      </div>}

      {stage !== 'review' && !loading && !error && visibleLifecycleRows.length === 0 && (
        <EmptyState
          icon="•"
          title={stage === 'evaluating' ? 'No pages in evaluation' : 'No resolved pages yet'}
          body={`No page packages are currently ${stage === 'evaluating' ? 'in evaluation' : 'resolved'}.`}
        />
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
