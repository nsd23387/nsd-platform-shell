'use client';

// =============================================================================
// System Health / Engine Integrity Checks panel (read-only).
// Extracted from the SEO Command Center (D-20) so the SAME truthful rendering —
// red/amber/green status, plain-language what-it-means, a Fix line, and
// self-heal logs — is reused wherever the engine's integrity checks appear
// (SEO Command Center, Marketing › Data Health). These rows are business-rule
// CHECK results from analytics.v_seo_system_health, not ingestion telemetry:
// a red row means "the rule is failing right now", not "a pipeline is down".
// =============================================================================

import React, { useMemo } from 'react';
import { fontFamily, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import type { SeoSystemHealthRow } from '../../../../lib/seoApi';
import {
  PALETTE, monoStack, Tc, ToneKey, Pill, fmtInt, pathOf, sectionLabelStyle,
} from '../_shared';

export function formatHealthTime(iso: string | null): string {
  if (!iso) return 'not run yet';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'not run yet';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function healthTone(row: SeoSystemHealthRow): ToneKey {
  if (row.health_group === 'red' || row.status === 'fail') return 'bad';
  if (row.health_group === 'amber' || row.status === 'warn') return 'warn';
  return 'good';
}

function sampleString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function sampleUrl(row: Record<string, unknown>): string | null {
  return sampleString(row.target_page_url)
    ?? sampleString(row.page_url)
    ?? sampleString(row.url)
    ?? sampleString(row.target_url)
    ?? sampleString(row.source_page)
    ?? null;
}

function healthSampleLabel(row: Record<string, unknown>): string {
  const url = sampleUrl(row);
  const field = sampleString(row.target_field);
  const candidate = sampleString(row.candidate_id);
  const signal = sampleString(row.source_name) ?? sampleString(row.metric_key);
  if (url) return field ? `${pathOf(url)} · ${field}` : pathOf(url);
  if (candidate) return `candidate ${candidate.slice(0, 8)}`;
  return signal ?? 'sample item';
}

export function SystemHealthPanel({
  tc,
  rows,
  error,
  onOpenDossier,
  title = 'System Health',
  description = 'Integrity failures become tracked business actions here, with self-heal attempts logged when available.',
}: {
  tc: Tc;
  rows: SeoSystemHealthRow[] | null;
  error: string | null;
  onOpenDossier: (url: string) => void;
  title?: string;
  description?: string;
}) {
  const grouped = useMemo(() => {
    const base: Record<'red' | 'amber' | 'green', SeoSystemHealthRow[]> = { red: [], amber: [], green: [] };
    (rows ?? []).forEach((row) => {
      if (row.health_group === 'red') base.red.push(row);
      else if (row.health_group === 'amber') base.amber.push(row);
      else base.green.push(row);
    });
    return base;
  }, [rows]);
  const red = grouped.red.length;
  const amber = grouped.amber.length;
  const visibleRows = rows
    ? [...grouped.red, ...grouped.amber, ...grouped.green.slice(0, Math.max(0, 6 - red - amber))]
    : [];

  return (
    <div style={{ background: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.md, padding: 0, marginBottom: space['6'] }}>
      <div style={{ padding: space['5'], borderBottom: `1px solid ${tc.border.subtle}`, display: 'flex', justifyContent: 'space-between', gap: space['4'], flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <div style={sectionLabelStyle(tc)}>{title}</div>
          <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, marginTop: '3px' }}>
            {description}
          </div>
        </div>
        <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Pill tone={red ? 'bad' : 'good'} tc={tc}>{red} red</Pill>
          <Pill tone={amber ? 'warn' : 'good'} tc={tc}>{amber} amber</Pill>
          <Pill tone="good" tc={tc}>{grouped.green.length} green</Pill>
        </div>
      </div>

      {error && (
        <div style={{ padding: space['5'], color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="error-system-health">
          System health unavailable.
        </div>
      )}
      {!error && !rows && (
        <div style={{ padding: space['5'], color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>
          Loading system health…
        </div>
      )}
      {!error && rows && rows.length === 0 && (
        <div style={{ padding: space['5'], color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>
          No integrity checks are cataloged yet — the catalog lives in analytics.seo_integrity_check_catalog; check the integrity job schedule.
        </div>
      )}
      {!error && visibleRows.length > 0 && (
        <div style={{ padding: `0 ${space['5']}` }}>
          {visibleRows.map((row) => {
            const tone = healthTone(row);
            const samples = Array.isArray(row.sample) ? row.sample.slice(0, 2) : [];
            return (
              <div key={row.check_name} style={{ padding: `${space['4']} 0`, borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`system-health-${row.check_name}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: space['3'], alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: '1 1 360px' }}>
                    <div style={{ display: 'flex', gap: space['2'], alignItems: 'center', flexWrap: 'wrap' }}>
                      <Pill tone={tone} tc={tc}>{row.status}</Pill>
                      <span style={{ fontFamily: fontFamily.body, fontSize: '14px', fontWeight: fontWeight.semibold, color: tc.text.primary }}>{row.human_title}</span>
                      <span style={{ fontFamily: monoStack, fontSize: '11px', color: tc.text.muted }}>{row.category}</span>
                    </div>
                    <div style={{ marginTop: '6px', fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, lineHeight: 1.5 }}>
                      {row.what_it_means} {row.why_it_matters}
                    </div>
                    <div style={{ marginTop: '8px', fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.primary, lineHeight: 1.5 }}>
                      <strong style={{ fontWeight: fontWeight.semibold }}>Fix:</strong> {row.remediation}
                    </div>
                    {row.last_remediation_at && (
                      <div style={{ marginTop: '6px', fontFamily: fontFamily.body, fontSize: '12px', color: row.last_remediation_result === 'failed' ? PALETTE.bad : tc.text.muted }}>
                        Last self-heal: {row.last_remediation_result ?? 'recorded'} · {formatHealthTime(row.last_remediation_at)}
                        {row.last_remediation_notes ? ` · ${row.last_remediation_notes}` : ''}
                      </div>
                    )}
                    {samples.length > 0 && (
                      <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', marginTop: '10px' }}>
                        {samples.map((sample, idx) => {
                          const url = sampleUrl(sample);
                          return (
                            <button
                              key={`${row.check_name}-${idx}`}
                              onClick={() => { if (url) onOpenDossier(url); }}
                              disabled={!url}
                              style={{ border: `1px solid ${tc.border.default}`, background: tc.background.surface, borderRadius: radius.sm, padding: '5px 8px', color: url ? PALETTE.violet : tc.text.muted, fontFamily: monoStack, fontSize: '11px', cursor: url ? 'pointer' : 'default', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={url ?? healthSampleLabel(sample)}
                            >
                              {healthSampleLabel(sample)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 120 }}>
                    <div style={{ fontFamily: monoStack, fontSize: '24px', color: tone === 'bad' ? PALETTE.bad : tone === 'warn' ? PALETTE.warn : PALETTE.good }}>
                      {fmtInt(row.count)}
                    </div>
                    <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted }}>
                      affected · {formatHealthTime(row.run_at)}
                    </div>
                    <div style={{ marginTop: '5px' }}>
                      <Pill tone={row.auto_remediated ? 'violet' : 'neutral'} tc={tc}>
                        {row.auto_remediated ? 'self-heal' : row.owner}
                      </Pill>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {rows && rows.length > visibleRows.length && (
            <div style={{ padding: `${space['3']} 0 ${space['4']}`, fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
              {rows.length - visibleRows.length} green check{rows.length - visibleRows.length === 1 ? '' : 's'} hidden to keep the panel focused.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
