'use client';

import { useThemeColors } from '../../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../../design/tokens/typography';
import { space, radius } from '../../../../../design/tokens/spacing';

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'positive';

export interface Insight {
  id: string;
  message: string;
  severity: InsightSeverity;
  timestamp?: string;
  source?: string;
}

export interface InsightsFeedProps {
  insights: Insight[];
  title?: string;
  emptyMessage?: string;
  maxVisible?: number;
}

export function InsightsFeed({
  insights,
  title = 'What Changed?',
  emptyMessage = 'No new insights',
  maxVisible,
}: InsightsFeedProps) {
  const tc = useThemeColors();

  const severityMap: Record<InsightSeverity, { bg: string; text: string; indicator: string }> = {
    critical: {
      bg: tc.semantic.danger.light,
      text: tc.semantic.danger.dark,
      indicator: tc.semantic.danger.base,
    },
    warning: {
      bg: tc.semantic.warning.light,
      text: tc.semantic.warning.dark,
      indicator: tc.semantic.warning.base,
    },
    info: {
      bg: tc.semantic.info.light,
      text: tc.semantic.info.dark,
      indicator: tc.semantic.info.base,
    },
    positive: {
      bg: tc.semantic.success.light,
      text: tc.semantic.success.dark,
      indicator: tc.semantic.success.base,
    },
  };

  const displayed = maxVisible ? insights.slice(0, maxVisible) : insights;

  return (
    <div
      data-testid="insights-feed"
      style={{
        backgroundColor: tc.background.surface,
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.lg,
        overflow: 'hidden',
      }}
    >
      {title && (
        <div
          style={{
            padding: `${space['4']} ${space['5']}`,
            borderBottom: `1px solid ${tc.border.default}`,
          }}
        >
          <span
            style={{
              fontFamily: fontFamily.display,
              fontSize: fontSize.lg,
              fontWeight: fontWeight.medium,
              color: tc.text.primary,
            }}
          >
            {title}
          </span>
        </div>
      )}

      {displayed.length === 0 ? (
        <div
          style={{
            padding: `${space['8']} ${space['5']}`,
            textAlign: 'center',
            color: tc.text.muted,
            fontFamily: fontFamily.body,
            fontSize: fontSize.base,
          }}
        >
          {emptyMessage}
        </div>
      ) : (
        <div style={{ padding: space['2'] }}>
          {displayed.map((insight) => {
            const sev = severityMap[insight.severity];
            return (
              <div
                key={insight.id}
                data-testid={`insight-item-${insight.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: space['3'],
                  padding: `${space['3']} ${space['3']}`,
                  borderRadius: radius.md,
                  marginBottom: space['1'],
                  backgroundColor: sev.bg,
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: radius.full,
                    backgroundColor: sev.indicator,
                    flexShrink: 0,
                    marginTop: '6px',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: fontFamily.body,
                      fontSize: fontSize.md,
                      fontWeight: fontWeight.normal,
                      color: sev.text,
                      lineHeight: lineHeight.normal,
                      margin: 0,
                    }}
                  >
                    {insight.message}
                  </p>
                  {(insight.timestamp || insight.source) && (
                    <div
                      style={{
                        display: 'flex',
                        gap: space['2'],
                        marginTop: space['1'],
                        fontFamily: fontFamily.body,
                        fontSize: fontSize.sm,
                        color: tc.text.muted,
                        flexWrap: 'wrap',
                      }}
                    >
                      {insight.timestamp && <span>{insight.timestamp}</span>}
                      {insight.source && <span>{insight.source}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {maxVisible && insights.length > maxVisible && (
        <div
          style={{
            padding: `${space['3']} ${space['5']}`,
            borderTop: `1px solid ${tc.border.default}`,
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontFamily: fontFamily.body,
              fontSize: fontSize.base,
              color: tc.text.muted,
            }}
          >
            +{insights.length - maxVisible} more insights
          </span>
        </div>
      )}
    </div>
  );
}
