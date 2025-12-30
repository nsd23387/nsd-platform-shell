/**
 * Design Pattern: ExceptionPanel
 * 
 * Displays exceptions, breaches, or items requiring attention.
 * Used for SLA breaches, validation errors, anomalies.
 * 
 * Features:
 * - Severity-based visual treatment
 * - Expandable details
 * - Action-less (read-only)
 * - Calm, non-alarming design
 */

import React from 'react';
import { background, text, border, semantic } from '../tokens/colors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../tokens/typography';
import { space, radius } from '../tokens/spacing';

// ============================================
// Types
// ============================================

export type ExceptionSeverity = 'info' | 'warning' | 'critical';

export interface ExceptionItem {
  /** Unique identifier */
  id: string;
  /** Exception title/type */
  title: string;
  /** Description or details */
  description?: string;
  /** Severity level */
  severity: ExceptionSeverity;
  /** Timestamp when exception occurred */
  timestamp?: string;
  /** Related entity (e.g., order ID) */
  relatedEntity?: string;
  /** Additional metadata */
  metadata?: Record<string, string | number>;
}

export interface ExceptionPanelProps {
  /** Exception items to display */
  items: ExceptionItem[];
  /** Empty state message */
  emptyMessage?: string;
  /** Maximum items to show before "show more" */
  maxItems?: number;
  /** Additional styles */
  style?: React.CSSProperties;
}

// ============================================
// Severity Configuration
// ============================================

const severityConfig: Record<ExceptionSeverity, {
  bg: string;
  border: string;
  text: string;
  indicator: string;
}> = {
  info: {
    bg: semantic.info.light,
    border: border.default,
    text: semantic.info.dark,
    indicator: semantic.info.base,
  },
  warning: {
    bg: semantic.warning.light,
    border: border.default,
    text: semantic.warning.dark,
    indicator: semantic.warning.base,
  },
  critical: {
    bg: semantic.danger.light,
    border: border.default,
    text: semantic.danger.dark,
    indicator: semantic.danger.base,
  },
};

// ============================================
// Styles
// ============================================

const panelStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
};

const itemStyles = (severity: ExceptionSeverity): React.CSSProperties => ({
  display: 'flex',
  gap: space['3'],
  padding: space['4'],
  backgroundColor: severityConfig[severity].bg,
  borderRadius: radius.lg,
  border: `1px solid ${severityConfig[severity].border}`,
  marginBottom: space['3'],
});

const indicatorStyles = (severity: ExceptionSeverity): React.CSSProperties => ({
  width: '4px',
  borderRadius: radius.full,
  backgroundColor: severityConfig[severity].indicator,
  flexShrink: 0,
});

const contentStyles: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  marginBottom: space['1'],
};

const titleStyles = (severity: ExceptionSeverity): React.CSSProperties => ({
  fontSize: fontSize.md,
  fontWeight: fontWeight.medium,
  color: severityConfig[severity].text,
});

const timestampStyles: React.CSSProperties = {
  fontSize: fontSize.xs,
  color: text.muted,
};

const descriptionStyles: React.CSSProperties = {
  fontSize: fontSize.sm,
  color: text.secondary,
  lineHeight: lineHeight.relaxed,
  marginBottom: space['2'],
};

const metadataStyles: React.CSSProperties = {
  fontSize: fontSize.xs,
  color: text.muted,
  display: 'flex',
  flexWrap: 'wrap',
  gap: `${space['1']} ${space['4']}`,
};

const emptyStyles: React.CSSProperties = {
  padding: space['6'],
  textAlign: 'center',
  color: text.muted,
  fontSize: fontSize.sm,
  backgroundColor: background.muted,
  borderRadius: radius.lg,
};

// ============================================
// Component
// ============================================

export function ExceptionPanel({
  items,
  emptyMessage = 'No exceptions found',
  maxItems,
  style,
}: ExceptionPanelProps) {
  const displayItems = maxItems ? items.slice(0, maxItems) : items;
  const hasMore = maxItems && items.length > maxItems;

  if (items.length === 0) {
    return (
      <div style={{ ...panelStyles, ...style }}>
        <div style={emptyStyles}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div style={{ ...panelStyles, ...style }}>
      {displayItems.map((item) => (
        <div key={item.id} style={itemStyles(item.severity)}>
          {/* Severity Indicator */}
          <div style={indicatorStyles(item.severity)} />

          {/* Content */}
          <div style={contentStyles}>
            <div style={headerStyles}>
              <span style={titleStyles(item.severity)}>{item.title}</span>
              {item.timestamp && (
                <span style={timestampStyles}>{item.timestamp}</span>
              )}
            </div>

            {item.description && (
              <div style={descriptionStyles}>{item.description}</div>
            )}

            {(item.relatedEntity || item.metadata) && (
              <div style={metadataStyles}>
                {item.relatedEntity && (
                  <span>Entity: {item.relatedEntity}</span>
                )}
                {item.metadata &&
                  Object.entries(item.metadata).map(([key, value]) => (
                    <span key={key}>
                      {key}: {value}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {hasMore && (
        <div
          style={{
            fontSize: fontSize.sm,
            color: text.muted,
            textAlign: 'center',
            padding: space['3'],
          }}
        >
          + {items.length - displayItems.length} more exceptions
        </div>
      )}
    </div>
  );
}

export default ExceptionPanel;
