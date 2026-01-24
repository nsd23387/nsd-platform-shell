'use client';

import { ReactNode, useState, useEffect } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_SHADOWS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T) => ReactNode;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

const MOBILE_BREAKPOINT = 640;

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No data available',
  onRowClick,
}: DataTableProps<T>) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const visibleColumns = isMobile 
    ? columns.filter(col => !col.hideOnMobile)
    : columns;

  if (data.length === 0) {
    return (
      <div
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: NSD_COLORS.text.muted,
          fontSize: '14px',
          fontFamily: NSD_TYPOGRAPHY.fontBody,
          backgroundColor: NSD_COLORS.surface,
          borderRadius: NSD_RADIUS.md,
        }}
      >
        {emptyMessage}
      </div>
    );
  }
  
  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        boxShadow: NSD_SHADOWS.sm,
        border: `1px solid ${NSD_COLORS.border.light}`,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 'auto' : '600px' }}>
        <thead>
          <tr style={{ backgroundColor: NSD_COLORS.surface }}>
            {visibleColumns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: isMobile ? '12px 10px' : '14px 16px',
                  textAlign: col.align || 'left',
                  ...NSD_TYPOGRAPHY.label,
                  color: NSD_COLORS.text.secondary,
                  fontFamily: NSD_TYPOGRAPHY.fontBody,
                  borderBottom: `1px solid ${NSD_COLORS.border.light}`,
                  width: col.width,
                  whiteSpace: 'nowrap',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              style={{
                borderBottom: `1px solid ${NSD_COLORS.border.light}`,
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background-color 0.15s',
              }}
            >
              {visibleColumns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: isMobile ? '12px 10px' : '14px 16px',
                    textAlign: col.align || 'left',
                    ...NSD_TYPOGRAPHY.body,
                    color: NSD_COLORS.text.primary,
                    fontFamily: NSD_TYPOGRAPHY.fontBody,
                  }}
                >
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
