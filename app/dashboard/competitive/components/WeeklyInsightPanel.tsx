'use client';

import React from 'react';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

export interface WeeklyInsightChange {
  competitor: string;
  page_type: string;
  change_type: 'new' | 'changed' | string;
  title: string;
  url: string;
}

export interface WeeklyInsightAction {
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  action: string;
  reason: string;
}

export interface WeeklyInsight {
  id: string;
  week_start_date: string;
  week_end_date: string;
  priority: 'high' | 'medium' | 'low' | string;
  summary: string;
  key_changes_json: WeeklyInsightChange[] | null;
  recommended_actions_json: WeeklyInsightAction[] | null;
  pages_new: number;
  pages_changed: number;
  competitors_with_changes: number;
  generated_at: string;
}

interface PanelProps {
  data: WeeklyInsight | null;
  loading: boolean;
  error?: string;
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  HIGH: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  MEDIUM: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  LOW: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
};

function PriorityBadge({ priority }: { priority: string }) {
  const key = priority.toUpperCase();
  const style = PRIORITY_STYLES[key] || PRIORITY_STYLES.LOW;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: `${space['0.5']} ${space['2']}`,
        borderRadius: radius.full,
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        fontFamily: fontFamily.body,
        fontSize: '11px',
        fontWeight: fontWeight.semibold,
        letterSpacing: '0.05em',
      }}
    >
      {key}
    </span>
  );
}

function formatDateRange(start: string, end: string): string {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const month = s.toLocaleString('en-US', { month: 'short' });
    return `Week of ${month} ${s.getDate()}–${e.getDate()}`;
  } catch {
    return `${start} – ${end}`;
  }
}

export function WeeklyInsightPanel({ data, loading, error }: PanelProps) {
  const tc = useThemeColors();

  const containerStyle: React.CSSProperties = {
    backgroundColor: tc.background.surface,
    border: `1px solid ${tc.border.default}`,
    borderRadius: radius.lg,
    padding: space['6'],
  };

  if (loading) {
    return (
      <div style={{ ...containerStyle, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }} data-testid="weekly-insight-loading">
        Loading weekly insight…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...containerStyle, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary }} data-testid="weekly-insight-error">
        Failed to load weekly insight: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ ...containerStyle, textAlign: 'center' }} data-testid="weekly-insight-empty">
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.secondary, marginBottom: space['2'] }}>
          No weekly insight generated yet
        </p>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
          The weekly crawl runs every Sunday at 02:00 UTC.
        </p>
      </div>
    );
  }

  const changes = data.key_changes_json ?? [];
  const actions = data.recommended_actions_json ?? [];

  const cellStyle: React.CSSProperties = {
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.secondary,
  };
  const headerStyle: React.CSSProperties = { ...cellStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' };

  return (
    <div style={containerStyle} data-testid="weekly-insight-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: space['3'], marginBottom: space['3'] }}>
        <h3 style={{ fontFamily: fontFamily.display, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: tc.text.primary }}>
          Weekly Insight — {formatDateRange(data.week_start_date, data.week_end_date)}
        </h3>
        <PriorityBadge priority={data.priority} />
      </div>

      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.secondary, lineHeight: lineHeight.normal, marginBottom: space['5'] }} data-testid="text-insight-summary">
        {data.summary}
      </p>

      {changes.length > 0 && (
        <div style={{ marginBottom: space['5'] }}>
          <h4 style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['2'], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Key Changes
          </h4>
          <div style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                  <th style={headerStyle}>Competitor</th>
                  <th style={headerStyle}>Type</th>
                  <th style={headerStyle}>Change</th>
                  <th style={headerStyle}>Title</th>
                </tr>
              </thead>
              <tbody>
                {changes.slice(0, 10).map((c, i) => (
                  <tr key={i} style={{ borderBottom: i < Math.min(changes.length, 10) - 1 ? `1px solid ${tc.border.subtle}` : 'none' }} data-testid={`row-key-change-${i}`}>
                    <td style={{ ...cellStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{c.competitor}</td>
                    <td style={cellStyle}>{c.page_type}</td>
                    <td style={cellStyle}>{c.change_type}</td>
                    <td style={cellStyle}>
                      <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: tc.text.primary, textDecoration: 'underline' }}>
                        {c.title}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {actions.length > 0 && (
        <div>
          <h4 style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['2'], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Recommended Actions
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: space['2'] }}>
            {actions.map((a, i) => (
              <div
                key={i}
                style={{
                  padding: space['3'],
                  backgroundColor: tc.background.muted,
                  borderRadius: radius.md,
                  display: 'flex',
                  gap: space['3'],
                  alignItems: 'flex-start',
                }}
                data-testid={`row-recommended-action-${i}`}
              >
                <div style={{ flexShrink: 0, marginTop: '2px' }}>
                  <PriorityBadge priority={a.priority} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.primary, marginBottom: space['1'] }}>
                    {a.action}
                  </div>
                  <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
                    {a.reason}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
