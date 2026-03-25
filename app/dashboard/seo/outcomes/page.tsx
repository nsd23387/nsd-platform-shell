'use client';

import React, { useEffect, useState } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { getOutcomes } from '../../../../lib/seoApi';
import type { SeoOutcome } from '../../../../lib/seoApi';

// TODO: Extend SeoOutcome type in seoApi.ts to include these fields
// once the proxy endpoint returns them from seo_execution_log join
interface OutcomeWithMeasurement extends SeoOutcome {
  measured_at_14d?: string | null;
  measured_at_30d?: string | null;
  measured_at_90d?: string | null;
}

function OutcomesContent() {
  const tc = useThemeColors();
  const [outcomes, setOutcomes] = useState<OutcomeWithMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOutcomes()
      .then((data) => { if (!cancelled) { setOutcomes(data); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const tdStyle: React.CSSProperties = {
    padding: `${space['3']} ${space['4']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.secondary,
  };

  const formatChange = (value: number, suffix: string = '', invert: boolean = false) => {
    const positive = invert ? value < 0 : value > 0;
    const color = positive ? '#065f46' : value === 0 ? tc.text.muted : '#991b1b';
    const prefix = value > 0 ? '+' : '';
    return (
      <span style={{ color, fontWeight: fontWeight.medium }}>
        {prefix}{value.toFixed(1)}{suffix}
      </span>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['2'] }}>
          SEO Intelligence / Decisions
        </p>
        <h1
          style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }}
          data-testid="text-outcomes-title"
        >
          Learning Outcomes
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted }}>
          Track the impact of approved and executed SEO recommendations over time.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: space['2'],
          backgroundColor: tc.background.muted,
          borderRadius: radius.md,
          padding: `${space['2']} ${space['3']}`,
          marginBottom: space['4'],
        }}
        data-testid="banner-measurement-lag"
      >
        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
          Measurement data populates 14, 30, and 90 days after execution. Recent changes will show as Pending.
        </span>
      </div>

      {loading && (
        <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>
          Loading outcomes...
        </div>
      )}

      {error && (
        <div style={{ padding: space['6'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, color: tc.text.primary, fontFamily: fontFamily.body }}>
          Failed to load outcomes: {error}
        </div>
      )}

      {!loading && !error && outcomes.length === 0 && (
        <div
          style={{
            padding: space['8'],
            backgroundColor: tc.background.surface,
            border: `1px solid ${tc.border.default}`,
            borderRadius: radius.lg,
            textAlign: 'center',
          }}
        >
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.secondary, marginBottom: space['2'] }}>
            No outcomes yet
          </p>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
            Outcomes appear after approved recommendations are executed and measured.
          </p>
        </div>
      )}

      {!loading && !error && outcomes.length > 0 && (
        <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                {['Cluster Topic', 'Keyword', 'Page URL', 'Old Position', 'New Position', 'CTR Change', 'Traffic Change', 'Executed', 'Measured 14d', 'Measured 30d', 'Measured 90d'].map((h) => (
                  <th key={h} style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {outcomes.map((out) => {
                const posImproved = out.new_position < out.old_position;
                return (
                  <tr key={out.id} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-outcome-${out.id}`}>
                    <td style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{out.cluster_topic}</td>
                    <td style={tdStyle}>{out.keyword}</td>
                    <td style={{ ...tdStyle, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{out.page_url}</td>
                    <td style={tdStyle}>{out.old_position.toFixed(1)}</td>
                    <td style={tdStyle}>
                      <span style={{ color: posImproved ? '#065f46' : '#991b1b', fontWeight: fontWeight.medium }}>
                        {out.new_position.toFixed(1)}
                      </span>
                    </td>
                    <td style={tdStyle}>{formatChange(out.ctr_change, '%')}</td>
                    <td style={tdStyle}>{formatChange(out.traffic_change)}</td>
                    <td style={tdStyle}>{new Date(out.execution_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td style={tdStyle}>
                      {out.measured_at_14d
                        ? <span style={{ color: '#065f46' }}>{new Date(out.measured_at_14d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        : <span style={{ color: tc.text.placeholder }}>Pending</span>}
                    </td>
                    <td style={tdStyle}>
                      {out.measured_at_30d
                        ? <span style={{ color: '#065f46' }}>{new Date(out.measured_at_30d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        : <span style={{ color: tc.text.placeholder }}>Pending</span>}
                    </td>
                    <td style={tdStyle}>
                      {out.measured_at_90d
                        ? <span style={{ color: '#065f46' }}>{new Date(out.measured_at_90d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        : <span style={{ color: tc.text.placeholder }}>Pending</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SeoOutcomesPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <OutcomesContent />
    </DashboardGuard>
  );
}
