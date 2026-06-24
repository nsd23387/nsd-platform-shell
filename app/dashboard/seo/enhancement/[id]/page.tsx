'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardGuard } from '../../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../../components/dashboard';
import { useThemeColors } from '../../../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../../../design/tokens/typography';
import { space, radius } from '../../../../../design/tokens/spacing';
import { getSeoEnhancement, releasePageEnhancement, rejectPageEnhancement } from '../../../../../lib/seoApi';
import type { SeoPageEnhancement, SeoFieldMember } from '../../../../../lib/seoApi';
import { PALETTE, monoStack, type Tc } from '../../_shared';
import { LifecycleBadge } from '../../components/LifecycleBadge';
import { FieldDiffRow } from '../../components/FieldDiffRow';

type FieldKey = 'h1' | 'meta' | 'title' | 'alt';

function mutationToField(mutationType: string): FieldKey {
  const t = mutationType.toLowerCase();
  if (t.includes('h1')) return 'h1';
  if (t.includes('meta')) return 'meta';
  if (t.includes('title')) return 'title';
  return 'alt';
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.replace(/^https?:\/\/[^/]+/, '') || url;
  }
}

// ── Confirm overlay ────────────────────────────────────────────────
function ConfirmOverlay({
  liveCount, draftCount, onConfirm, onCancel, tc,
}: {
  liveCount: number;
  draftCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  tc: Tc;
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: tc.background.page, borderRadius: radius.lg,
          border: `1px solid ${tc.border.strong}`, padding: space['6'],
          maxWidth: '420px', width: '90vw',
          boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ fontFamily: fontFamily.body, fontSize: '16px', fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['2'] }}>
          Publish page enhancement?
        </div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.secondary, marginBottom: space['5'], lineHeight: 1.55 }}>
          This will publish {liveCount} field{liveCount !== 1 ? 's' : ''} live
          {draftCount > 0 ? ` and queue ${draftCount} as draft${draftCount !== 1 ? 's' : ''}` : ''}.
          Confirm to proceed.
        </div>
        <div style={{ display: 'flex', gap: space['3'], justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px', borderRadius: radius.sm,
              border: `1px solid ${tc.border.default}`, background: 'transparent',
              color: tc.text.secondary, fontFamily: fontFamily.body, fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px', borderRadius: radius.sm,
              border: 'none', background: PALETTE.good, color: '#fff',
              fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium,
              cursor: 'pointer',
            }}
          >
            Confirm &amp; publish
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main detail component ──────────────────────────────────────────
function EnhancementDetailContent({ id }: { id: string }) {
  const tc = useThemeColors();
  const router = useRouter();

  const [pkg, setPkg] = useState<SeoPageEnhancement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmApprove, setConfirmApprove] = useState(false);
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getSeoEnhancement(id)
      .then((data: SeoPageEnhancement) => { if (alive) { setPkg(data); setLoading(false); } })
      .catch((e: unknown) => { if (alive) { setError(e instanceof Error ? e.message : 'Failed to load'); setLoading(false); } });
    return () => { alive = false; };
  }, [id]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.key === 'a') setConfirmApprove(true);
      if (e.key === 'r') handleReject();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg]);

  async function handleApproveConfirmed() {
    if (!pkg) return;
    setConfirmApprove(false);
    setBusy('approve');
    setActionError(null);
    try {
      await releasePageEnhancement(pkg.enhancement_id);
      router.push('/dashboard/seo/review');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Approve failed');
      setBusy(null);
    }
  }

  async function handleReject() {
    if (!pkg || busy) return;
    setBusy('reject');
    setActionError(null);
    try {
      await rejectPageEnhancement(pkg.enhancement_id);
      router.push('/dashboard/seo/review');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Reject failed');
      setBusy(null);
    }
  }

  const isLocked = Boolean(pkg?.lifecycle_state);
  const liveCount = pkg?.fields.filter((f: SeoFieldMember) => f.publish_live).length ?? 0;
  const draftCount = (pkg?.fields.length ?? 0) - liveCount;

  // ── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ maxWidth: '800px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{ background: tc.background.muted, borderRadius: radius.md, height: '64px', marginBottom: space['3'] }}
          />
        ))}
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────
  if (error || !pkg) {
    return (
      <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: PALETTE.bad, padding: space['4'], background: PALETTE.badSoft, borderRadius: radius.md }}>
        {error ?? 'Enhancement not found.'}
      </div>
    );
  }

  const pagePath = pathOf(pkg.canonical_url);

  return (
    <>
      {confirmApprove && (
        <ConfirmOverlay
          liveCount={liveCount}
          draftCount={draftCount}
          onConfirm={handleApproveConfirmed}
          onCancel={() => setConfirmApprove(false)}
          tc={tc}
        />
      )}

      <div style={{ maxWidth: '800px', paddingBottom: '100px' }}>
        {/* Back link */}
        <Link
          href="/dashboard/seo/review"
          style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: space['4'] }}
        >
          ← Back to Review
        </Link>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: space['3'], marginBottom: space['3'] }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], flexWrap: 'wrap', marginBottom: '4px' }}>
              <span style={{ fontFamily: monoStack, fontSize: '15px', color: tc.text.primary, fontWeight: fontWeight.medium }}>
                {pagePath}
              </span>
              <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
                · v{pkg.version}
              </span>
              {pkg.lifecycle_state ? (
                <LifecycleBadge state={pkg.lifecycle_state as import('../../components/LifecycleBadge').LifecycleState} size="sm" />
              ) : (
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: '11px', fontFamily: 'inherit', background: '#f3f4f6', color: '#6b7280', fontWeight: 500 }}>
                  pending review
                </span>
              )}
              {pkg.prov_label && (
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: '11px', fontFamily: 'inherit', background: '#fef3c7', color: '#92400e', fontWeight: 500 }}>
                  {pkg.prov_label}
                </span>
              )}
              <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
                · {pkg.change_count} change{pkg.change_count !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap' }}>
              {pkg.has_live_members && (
                <span style={{ fontSize: '11px', fontFamily: fontFamily.body, padding: '2px 8px', borderRadius: 999, background: PALETTE.goodSoft, color: PALETTE.good, fontWeight: fontWeight.medium }}>
                  publishes live
                </span>
              )}
              {pkg.has_qa_warnings && (
                <span style={{ fontSize: '11px', fontFamily: fontFamily.body, padding: '2px 8px', borderRadius: 999, background: PALETTE.warnSoft, color: PALETTE.warn, fontWeight: fontWeight.medium }}>
                  QA warnings
                </span>
              )}
            </div>
          </div>

          {!isLocked && (
            <div style={{ display: 'flex', gap: space['2'], flexShrink: 0 }}>
              <button
                onClick={handleReject}
                disabled={busy !== null}
                style={{
                  padding: '8px 16px', borderRadius: radius.sm, cursor: busy ? 'default' : 'pointer',
                  background: 'transparent', color: PALETTE.bad, border: `1px solid ${PALETTE.bad}`,
                  fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium,
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {busy === 'reject' ? 'Rejecting…' : 'Reject page'}
              </button>
              <button
                onClick={() => setConfirmApprove(true)}
                disabled={busy !== null}
                style={{
                  padding: '8px 16px', borderRadius: radius.sm, cursor: busy ? 'default' : 'pointer',
                  background: PALETTE.good, color: '#fff', border: 'none',
                  fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium,
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {busy === 'approve' ? 'Approving…' : 'Approve & publish page'}
              </button>
            </div>
          )}
        </div>

        {/* Locked banner */}
        {isLocked && (
          <div style={{ padding: space['4'], borderRadius: radius.md, background: tc.background.muted, border: `1px solid ${tc.border.default}`, fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.secondary, marginBottom: space['4'] }}>
            Version {pkg.version} is in evaluation — no further decisions available for this package.
          </div>
        )}

        {actionError && (
          <div style={{ padding: space['3'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px', marginBottom: space['4'] }}>
            {actionError}
          </div>
        )}

        {/* Why this page? */}
        <details style={{ marginBottom: space['4'] }}>
          <summary
            style={{
              cursor: 'pointer', fontFamily: fontFamily.body, fontSize: '13px',
              fontWeight: fontWeight.medium, color: tc.text.secondary,
              padding: `${space['2']} 0`, listStyle: 'none', display: 'flex', alignItems: 'center', gap: space['1'],
            }}
          >
            ▶ Why this page?
          </summary>
          <div
            style={{
              padding: space['4'], background: tc.background.surface, borderRadius: radius.md,
              border: `1px solid ${tc.border.default}`, fontFamily: fontFamily.body, fontSize: '13px',
              color: tc.text.secondary, lineHeight: 1.6, marginTop: '4px',
            }}
          >
            <div style={{ fontWeight: fontWeight.medium, color: tc.text.primary, marginBottom: '4px' }}>
              {pkg.canonical_url}
            </div>
            <div>
              This page was packaged as v{pkg.version} with {pkg.change_count} field change{pkg.change_count !== 1 ? 's' : ''}.
              Lifecycle state: <strong>{pkg.lifecycle_state}</strong>.
              {pkg.evaluation_start_at && (
                <> Evaluation started {new Date(pkg.evaluation_start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.</>
              )}
            </div>
          </div>
        </details>

        {/* Field changes */}
        <div
          style={{
            fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold,
            textTransform: 'uppercase' as const, letterSpacing: '0.06em',
            color: tc.text.muted, marginBottom: space['3'],
          }}
        >
          Field changes ({pkg.fields.length})
        </div>

        {pkg.fields.length === 0 ? (
          <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted }}>
            No field members in this package.
          </div>
        ) : (
          pkg.fields.map((field: SeoFieldMember) => (
            <FieldDiffRow
              key={field.candidate_id}
              field={mutationToField(field.mutation_type)}
              before={field.current_value_snapshot}
              after={field.proposed_value}
              qualityScore={field.quality_self_score}
              guardReason={field.guard_reason}
            />
          ))
        )}
      </div>

      {/* Sticky bottom bar */}
      {!isLocked && (
        <div
          style={{
            position: 'sticky', bottom: 0,
            background: tc.background.surface,
            borderTop: `1px solid ${tc.border.default}`,
            padding: `${space['3']} ${space['6']}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: space['3'], flexWrap: 'wrap',
            zIndex: 100,
          }}
        >
          <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted }}>
            {liveCount > 0 && (
              <span style={{ color: PALETTE.good, fontWeight: fontWeight.medium }}>
                {liveCount} publish live
              </span>
            )}
            {liveCount > 0 && draftCount > 0 && <span> · </span>}
            {draftCount > 0 && <span>{draftCount} draft</span>}
            {pkg.has_qa_warnings && (
              <span style={{ marginLeft: space['2'], color: PALETTE.warn }}>· QA issues present</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: space['2'] }}>
            <button
              onClick={handleReject}
              disabled={busy !== null}
              style={{
                padding: '8px 16px', borderRadius: radius.sm, cursor: busy ? 'default' : 'pointer',
                background: 'transparent', color: PALETTE.bad, border: `1px solid ${PALETTE.bad}`,
                fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium,
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy === 'reject' ? 'Rejecting…' : 'Reject page'}
            </button>
            <button
              onClick={() => setConfirmApprove(true)}
              disabled={busy !== null}
              style={{
                padding: '8px 16px', borderRadius: radius.sm, cursor: busy ? 'default' : 'pointer',
                background: PALETTE.good, color: '#fff', border: 'none',
                fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium,
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy === 'approve' ? 'Approving…' : 'Approve & publish'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function EnhancementDetailPage({ params }: { params: { id: string } }) {
  return (
    <DashboardGuard
      dashboard="seo"
      fallback={<AccessDenied message="You do not have permission to view this page." />}
    >
      <EnhancementDetailContent id={params.id} />
    </DashboardGuard>
  );
}
