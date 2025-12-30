/**
 * Design System: Table Components
 * 
 * Minimal, readable table components.
 * Designed for data-dense interfaces with calm styling.
 * 
 * Components:
 * - Table: Container
 * - TableHeader: Column headers
 * - TableBody: Data rows container
 * - TableRow: Individual row
 * - TableCell: Individual cell
 */

import React from 'react';
import { background, text, border } from '../tokens/colors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../tokens/typography';
import { space } from '../tokens/spacing';

// ============================================
// Types
// ============================================

export interface TableProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export interface TableHeaderProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export interface TableBodyProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export interface TableRowProps {
  children: React.ReactNode;
  /** Highlight on hover */
  hoverable?: boolean;
  style?: React.CSSProperties;
}

export interface TableCellProps {
  children: React.ReactNode;
  /** Is this a header cell */
  header?: boolean;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Column width */
  width?: string;
  style?: React.CSSProperties;
}

// ============================================
// Table Container
// ============================================

export function Table({ children, style }: TableProps) {
  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: fontFamily.body,
        fontSize: fontSize.md,
        lineHeight: lineHeight.normal,
        ...style,
      }}
    >
      {children}
    </table>
  );
}

// ============================================
// Table Header
// ============================================

export function TableHeader({ children, style }: TableHeaderProps) {
  return (
    <thead
      style={{
        borderBottom: `1px solid ${border.default}`,
        ...style,
      }}
    >
      {children}
    </thead>
  );
}

// ============================================
// Table Body
// ============================================

export function TableBody({ children, style }: TableBodyProps) {
  return <tbody style={style}>{children}</tbody>;
}

// ============================================
// Table Row
// ============================================

export function TableRow({ children, hoverable = true, style }: TableRowProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <tr
      style={{
        borderBottom: `1px solid ${border.subtle}`,
        backgroundColor: isHovered && hoverable ? background.hover : 'transparent',
        transition: 'background-color 0.15s ease',
        ...style,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </tr>
  );
}

// ============================================
// Table Cell
// ============================================

export function TableCell({
  children,
  header = false,
  align = 'left',
  width,
  style,
}: TableCellProps) {
  const Component = header ? 'th' : 'td';

  return (
    <Component
      style={{
        padding: `${space['3']} ${space['4']}`,
        textAlign: align,
        fontWeight: header ? fontWeight.medium : fontWeight.normal,
        color: header ? text.muted : text.primary,
        fontSize: header ? fontSize.sm : fontSize.md,
        width,
        verticalAlign: 'middle',
        ...style,
      }}
    >
      {children}
    </Component>
  );
}

export default Table;
