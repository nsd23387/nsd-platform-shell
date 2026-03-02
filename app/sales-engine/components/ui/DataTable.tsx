'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius, duration, easing } from '../../../../design/tokens/spacing';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T) => ReactNode;
  hideOnMobile?: boolean;
  sortable?: boolean;
  sortKey?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  pageSize?: number;
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
}

const MOBILE_BREAKPOINT = 640;

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No data available',
  onRowClick,
  pageSize = 10,
  defaultSortKey,
  defaultSortDir = 'desc',
}: DataTableProps<T>) {
  const tc = useThemeColors();
  const [isMobile, setIsMobile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [data.length, sortKey, sortDir]);

  const sortableKeys = new Set(
    columns.filter(c => c.sortable !== false && (c.sortKey || typeof data[0]?.[c.key] !== 'undefined')).map(c => c.sortKey || c.key)
  );

  const visibleColumns = isMobile 
    ? columns.filter(col => !col.hideOnMobile)
    : columns;

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      })
    : data;

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginatedData = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const showPagination = sorted.length > pageSize;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  if (data.length === 0) {
    return (
      <div
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: tc.text.muted,
          fontSize: fontSize.base,
          fontFamily: fontFamily.body,
          backgroundColor: tc.background.surface,
          borderRadius: radius.lg,
          border: `1px solid ${tc.border.default}`,
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  const sortArrow = (key: string) => {
    if (sortKey !== key) return null;
    return (
      <span style={{ marginLeft: space['1'], opacity: 0.7 }}>
        {sortDir === 'asc' ? '\u2191' : '\u2193'}
      </span>
    );
  };

  return (
    <div
      style={{
        backgroundColor: tc.background.surface,
        borderRadius: radius.lg,
        border: `1px solid ${tc.border.default}`,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 'auto' : '600px' }}>
        <thead>
          <tr style={{ backgroundColor: tc.background.muted }}>
            {visibleColumns.map((col) => {
              const colSortKey = col.sortKey || col.key;
              const isSortable = sortableKeys.has(colSortKey);
              return (
                <th
                  key={col.key}
                  onClick={isSortable ? () => handleSort(colSortKey) : undefined}
                  style={{
                    padding: isMobile ? '10px 8px' : `${space['3']} ${space['4']}`,
                    textAlign: col.align || 'left',
                    fontFamily: fontFamily.body,
                    fontSize: fontSize.xs,
                    fontWeight: fontWeight.medium,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const,
                    color: tc.text.secondary,
                    borderBottom: `1px solid ${tc.border.default}`,
                    width: isMobile ? 'auto' : col.width,
                    whiteSpace: 'nowrap',
                    cursor: isSortable ? 'pointer' : 'default',
                    userSelect: isSortable ? 'none' : 'auto',
                    transition: `color ${duration.fast}`,
                  }}
                  data-testid={`th-sort-${col.key}`}
                >
                  {col.header}
                  {isSortable && sortArrow(colSortKey)}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              style={{
                borderBottom: `1px solid ${tc.border.subtle}`,
                cursor: onRowClick ? 'pointer' : 'default',
                transition: `background-color ${duration.fast}`,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = tc.background.hover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              {visibleColumns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: isMobile ? '10px 8px' : `${space['3']} ${space['4']}`,
                    textAlign: col.align || 'left',
                    fontFamily: fontFamily.body,
                    fontSize: fontSize.md,
                    fontWeight: fontWeight.normal,
                    lineHeight: 1.5,
                    color: tc.text.primary,
                    verticalAlign: 'top',
                  }}
                >
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {showPagination && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${space['3']} ${space['4']}`,
            borderTop: `1px solid ${tc.border.default}`,
            fontFamily: fontFamily.body,
            fontSize: fontSize.sm,
            color: tc.text.muted,
          }}
        >
          <span data-testid="text-pagination-info">
            {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div style={{ display: 'flex', gap: space['1'] }}>
            <PaginationButton
              label="Prev"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(safePage - 1)}
              tc={tc}
            />
            {getPageNumbers(safePage, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} style={{ padding: `${space['1']} ${space['2']}`, color: tc.text.muted }}>
                  ...
                </span>
              ) : (
                <PaginationButton
                  key={p}
                  label={String(p)}
                  active={p === safePage}
                  onClick={() => setCurrentPage(p as number)}
                  tc={tc}
                />
              )
            )}
            <PaginationButton
              label="Next"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(safePage + 1)}
              tc={tc}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PaginationButton({ label, disabled, active, onClick, tc }: {
  label: string;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
  tc: ReturnType<typeof import('../../../../hooks/useThemeColors').useThemeColors>;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={`button-page-${label.toLowerCase()}`}
      style={{
        padding: `${space['1']} ${space['2.5']}`,
        fontFamily: fontFamily.body,
        fontSize: fontSize.sm,
        fontWeight: active ? fontWeight.medium : fontWeight.normal,
        color: disabled ? tc.text.disabled : active ? tc.text.inverse : tc.text.secondary,
        backgroundColor: active ? tc.border.strong : 'transparent',
        border: `1px solid ${disabled ? tc.border.subtle : active ? tc.border.strong : tc.border.default}`,
        borderRadius: radius.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: `all ${duration.fast} ${easing.DEFAULT}`,
        minWidth: '32px',
        textAlign: 'center',
      }}
    >
      {label}
    </button>
  );
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
