'use client';

import React, { useEffect, useState } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface ExecutionLogEntry {
  id: string;
  target_url: string;
  execution_type: string;
  executed_by: string | null;
  executed_at: string;
  baseline_position: number | null;
  baseline_impressions: number | null;
  measured_at_14d: string | null;
  measured_at_30d: string | null;
  measured_at_90d: string | null;
}

function ExecutionLogContent() {
  const tc = useThemeColors();
  const [entries, setEntries] = useState<ExecutionLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/proxy/seo/execution-log')
      .then(r => r.json())
      .then((data) => { if (!cancelled) { setEntries(data.data ?? []); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const tdStyle: React.CSSProperties = {
    padding: `${space['3']} ${space['4']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.secondary,
  };

  const statusBadge = (type: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      metadata_update: { bg: '#d1fae5', text: '#065f46' },
      new_page: { bg: '#dbeafe', text: '#1e40af' },
      page_update: { bg: '#e0e7ff', text: '#3730a3' },
      content_expand: { bg: '#f3e8ff', text: '#6b21a8' },
      internal_links: { bg: '#fef3c7', text: '#92400e' },
    };
    const s = styles[type] || { bg: '#f5f5f5', text: '#525252' };
    return (
      <span style={{
        display: 'inline-block',
        padding: `${space['0.5']} ${space['2']}`,
        borderRadius: radius.full,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        backgroundColor: s.bg,
        color: s.text,
      }}>
        {type.replace(/_/g, ' ')}
      </span>
    );
  };

  const measurementCell = (value: string | null) => {
    if (value) {
      return <span style={{ color: '#065f46' }}>{new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>;
    }
    return <span style={{ color: tc.text.placeholder }}>Pending</span>;
  };

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['2'] }}>
          SEO Intelligence / Optimization
        </p>
        <h1
          style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }}
          data-testid="text-execution-log-title"
        >
          Execution Log
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted }}>
          Track all SEO mutations applied to WordPress — metadata updates, internal links, and content changes.
        </p>
      </div>

      {loading && (
        <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>
          Loading execution log...
        </div>
      )}

      {error && (
        <div style={{ padding: space['6'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, color: tc.text.primary, fontFamily: fontFamily.body }}>
          Failed to load execution log: {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
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
            No executions yet
          </p>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
            The first run will occur at 03:30 UTC after cluster generation completes.
          </p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                {['Target URL', 'Type', 'Executed', 'Baseline Pos', '14d', '30d', '90d'].map((h) => (
                  <th key={h} style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <React.Fragment key={entry.id}>
                  <tr
                    style={{ borderBottom: `1px solid ${tc.border.subtle}`, cursor: 'pointer' }}
                    onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}
                    data-testid={`row-exec-${entry.id}`}
                  >
                    <td style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.primary, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.target_url}>
                      {entry.target_url.replace('https://neonsignsdepot.com', '')}
                    </td>
                    <td style={tdStyle}>{statusBadge(entry.execution_type)}</td>
                    <td style={tdStyle}>{new Date(entry.executed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={tdStyle}>{entry.baseline_position != null ? Number(entry.baseline_position).toFixed(1) : '—'}</td>
                    <td style={tdStyle}>{measurementCell(entry.measured_at_14d)}</td>
                    <td style={tdStyle}>{measurementCell(entry.measured_at_30d)}</td>
                    <td style={tdStyle}>{measurementCell(entry.measured_at_90d)}</td>
                  </tr>
                  {expandedRow === entry.id && (
                    <tr>
                      <td colSpan={7} style={{ padding: `${space['2']} ${space['4']}`, backgroundColor: tc.background.muted }}>
                        <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
                          <strong>Executed by:</strong> {entry.executed_by || 'system'}
                          {' | '}
                          <strong>Baseline impressions:</strong> {entry.baseline_impressions != null ? Number(entry.baseline_impressions).toLocaleString() : '—'}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ExecutionLogPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <ExecutionLogContent />
    </DashboardGuard>
  );
}
