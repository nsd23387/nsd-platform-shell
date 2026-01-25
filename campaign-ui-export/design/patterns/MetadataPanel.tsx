/**
 * Design Pattern: MetadataPanel
 * 
 * Displays key-value metadata in a structured, scannable format.
 * Used for entity details, configuration summaries, etc.
 * 
 * Features:
 * - Two-column layout (label: value)
 * - Optional grouping with section headers
 * - Read-only by default
 * - Calm, minimal styling
 */

import React from 'react';
import { background, text, border } from '../tokens/colors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../tokens/typography';
import { space, radius } from '../tokens/spacing';

// ============================================
// Types
// ============================================

export interface MetadataItem {
  /** Display label */
  label: string;
  /** Value to display */
  value: React.ReactNode;
  /** Optional tooltip/help text */
  tooltip?: string;
}

export interface MetadataGroup {
  /** Group title (optional) */
  title?: string;
  /** Items in this group */
  items: MetadataItem[];
}

export interface MetadataPanelProps {
  /** Metadata items or groups */
  data: MetadataItem[] | MetadataGroup[];
  /** Layout orientation */
  layout?: 'stacked' | 'inline';
  /** Additional styles */
  style?: React.CSSProperties;
}

// ============================================
// Styles
// ============================================

const panelStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.md,
  lineHeight: lineHeight.normal,
};

const groupTitleStyles: React.CSSProperties = {
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: text.secondary,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  marginBottom: space['3'],
  paddingBottom: space['2'],
  borderBottom: `1px solid ${border.subtle}`,
};

const stackedRowStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: space['1'],
  padding: `${space['3']} 0`,
  borderBottom: `1px solid ${border.subtle}`,
};

const inlineRowStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  padding: `${space['2.5']} 0`,
  borderBottom: `1px solid ${border.subtle}`,
};

const labelStyles: React.CSSProperties = {
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: text.muted,
};

const valueStyles: React.CSSProperties = {
  fontSize: fontSize.md,
  fontWeight: fontWeight.normal,
  color: text.primary,
};

// ============================================
// Helper Functions
// ============================================

function isMetadataGroup(item: MetadataItem | MetadataGroup): item is MetadataGroup {
  return 'items' in item;
}

// ============================================
// Component
// ============================================

export function MetadataPanel({
  data,
  layout = 'inline',
  style,
}: MetadataPanelProps) {
  const rowStyles = layout === 'stacked' ? stackedRowStyles : inlineRowStyles;

  const renderItem = (item: MetadataItem, index: number) => (
    <div key={index} style={rowStyles} title={item.tooltip}>
      <span style={labelStyles}>{item.label}</span>
      <span style={valueStyles}>{item.value}</span>
    </div>
  );

  const renderGroup = (group: MetadataGroup, groupIndex: number) => (
    <div key={groupIndex} style={{ marginBottom: space['4'] }}>
      {group.title && <h4 style={groupTitleStyles}>{group.title}</h4>}
      {group.items.map((item, index) => renderItem(item, index))}
    </div>
  );

  // Check if data is groups or flat items
  const hasGroups = data.length > 0 && isMetadataGroup(data[0]);

  return (
    <div style={{ ...panelStyles, ...style }}>
      {hasGroups
        ? (data as MetadataGroup[]).map((group, index) => renderGroup(group, index))
        : (data as MetadataItem[]).map((item, index) => renderItem(item, index))}
    </div>
  );
}

export default MetadataPanel;
