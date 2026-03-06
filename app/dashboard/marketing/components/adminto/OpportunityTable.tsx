'use client';

import { ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import { useThemeColors } from '../../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../../../design/tokens/typography';
import { space, radius, duration } from '../../../../../design/tokens/spacing';

export interface OpportunityColumn<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  hideOnMobile?: boolean;
}

export type ActionTagVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface ActionTag {
  label: string;
  variant: ActionTagVariant;
}

export interface OpportunityTableProps<T> {
  columns: OpportunityColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  getRowTags?: (item: T) => ActionTag[];
  getRowVariant?: (item: T) => ActionTagVariant | undefined;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  filterPlaceholder?: string;
  filterKeys?: string[];
  pageSize?: number;
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
  title?: string;
}

export function OpportunityTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  getRowTags,
  getRowVariant,
  onRowClick,
  emptyMessage = 'No opportunities found',
  filterPlaceholder = 'Filter...',
  filterKeys,
  pageSize = 10,
  defaultSortKey,
  defaultSortDir = 'desc',
  title,
}: OpportunityTableProps<T>) {
  const tc = useThemeColors();
  const [isMobile, setIsMobile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const filtered = useMemo(() => {
    if (!filterText.trim()) return data;
    const q = filterText.toLowerCase();
    const keys = filterKeys || columns.map((c) => c.key);
    return data.filter((item) =>
      keys.some((k) => {
        const val = item[k];
        return val != null && String(val).toLowerCase().includes(q);
      }),
    );
  }, [data, filterText, filterKeys, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [filterText, sortKey, sortDir]);

  const safePage = Math.min(currentPage, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const visibleCols = isMobile ? columns.filter((c) => !c.hideOnMobile) : columns;

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('desc');
      }
    },
    [sortKey],
  );

  const tagColors: Record<ActionTagVariant, { bg: string; text: string }> = {
    success: { bg: tc.semantic.success.light, text: tc.semantic.success.dark },
    warning: { bg: tc.semantic.warning.light, text: tc.semantic.warning.dark },
    danger: { bg: tc.semantic.danger.light, text: tc.semantic.danger.dark },
    info: { bg: tc.semantic.info.light, text: tc.semantic.info.dark },
    neutral: { bg: tc.background.muted, text: tc.text.secondary },
  };

  const rowVariantBg: Record<ActionTagVariant, string> = {
    success: tc.semantic.success.light,
    warning: tc.semantic.warning.light,
    danger: tc.semantic.danger.light,
    info: tc.semantic.info.light,
    neutral: 'transparent',
  };

  return (
    <div
      data-testid={title ? `opportunity-table-${title.toLowerCase().replace(/\s+/g, '-')}` : 'opportunity-table'}
      style={{
        backgroundColor: tc.background.surface,
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.lg,
        overflow: 'hidden',
      }}
    >
      {(title || filterKeys) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${space['3']} ${space['4']}`,
            borderBottom: `1px solid ${tc.border.default}`,
            gap: space['3'],
            flexWrap: 'wrap',
          }}
        >
          {title && (
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
          )}
          <input
            data-testid="input-opportunity-filter"
            type="text"
            placeholder={filterPlaceholder}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{
              fontFamily: fontFamily.body,
              fontSize: fontSize.md,
              color: tc.text.primary,
              backgroundColor: tc.background.muted,
              border: `1px solid ${tc.border.default}`,
              borderRadius: radius.md,
              padding: `${space['1.5']} ${space['3']}`,
              outline: 'none',
              minWidth: '180px',
              maxWidth: '280px',
            }}
          />
        </div>
      )}

      {sorted.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: tc.text.muted,
            fontSize: fontSize.base,
            fontFamily: fontFamily.body,
          }}
        >
          {emptyMessage}
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 'auto' : '600px' }}>
              <thead>
                <tr style={{ backgroundColor: tc.background.muted }}>
                  {visibleCols.map((col) => {
                    const isSortable = col.sortable !== false;
                    return (
                      <th
                        key={col.key}
                        data-testid={`th-opp-${col.key}`}
                        onClick={isSortable ? () => handleSort(col.key) : undefined}
                        style={{
                          padding: isMobile ? '10px 8px' : `${space['3']} ${space['4']}`,
                          textAlign: col.align || 'left',
                          fontFamily: fontFamily.body,
                          fontSize: fontSize.sm,
                          fontWeight: fontWeight.medium,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase' as const,
                          color: tc.text.secondary,
                          borderBottom: `1px solid ${tc.border.default}`,
                          width: isMobile ? 'auto' : col.width,
                          whiteSpace: 'nowrap',
                          cursor: isSortable ? 'pointer' : 'default',
                          userSelect: isSortable ? 'none' : 'auto',
                        }}
                      >
                        {col.header}
                        {isSortable && sortKey === col.key && (
                          <span style={{ marginLeft: space['1'], opacity: 0.7 }}>
                            {sortDir === 'asc' ? '\u2191' : '\u2193'}
                          </span>
                        )}
                      </th>
                    );
                  })}
                  {getRowTags && (
                    <th
                      style={{
                        padding: `${space['3']} ${space['4']}`,
                        textAlign: 'left',
                        fontFamily: fontFamily.body,
                        fontSize: fontSize.sm,
                        fontWeight: fontWeight.medium,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase' as const,
                        color: tc.text.secondary,
                        borderBottom: `1px solid ${tc.border.default}`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Tags
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginated.map((item) => {
                  const variant = getRowVariant?.(item);
                  const tags = getRowTags?.(item) ?? [];
                  return (
                    <tr
                      key={keyExtractor(item)}
                      onClick={() => onRowClick?.(item)}
                      style={{
                        borderBottom: `1px solid ${tc.border.subtle}`,
                        cursor: onRowClick ? 'pointer' : 'default',
                        backgroundColor: variant ? rowVariantBg[variant] : 'transparent',
                        transition: `background-color ${duration.fast}`,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          variant ? rowVariantBg[variant] : tc.background.hover;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          variant ? rowVariantBg[variant] : 'transparent';
                      }}
                    >
                      {visibleCols.map((col) => (
                        <td
                          key={col.key}
                          style={{
                            padding: isMobile ? '10px 8px' : `${space['3']} ${space['4']}`,
                            textAlign: col.align || 'left',
                            fontFamily: fontFamily.body,
                            fontSize: fontSize.base,
                            fontWeight: fontWeight.normal,
                            lineHeight: 1.5,
                            color: tc.text.primary,
                            verticalAlign: 'middle',
                          }}
                        >
                          {col.render ? col.render(item) : item[col.key]}
                        </td>
                      ))}
                      {getRowTags && (
                        <td
                          style={{
                            padding: `${space['3']} ${space['4']}`,
                            verticalAlign: 'middle',
                          }}
                        >
                          <div style={{ display: 'flex', gap: space['1'], flexWrap: 'wrap' }}>
                            {tags.map((tag, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontFamily: fontFamily.body,
                                  fontSize: fontSize.sm,
                                  fontWeight: fontWeight.medium,
                                  padding: `${space['0.5']} ${space['2']}`,
                                  borderRadius: radius.full,
                                  backgroundColor: tagColors[tag.variant].bg,
                                  color: tagColors[tag.variant].text,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {tag.label}
                              </span>
                            ))}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${space['3']} ${space['4']}`,
                borderTop: `1px solid ${tc.border.default}`,
                fontFamily: fontFamily.body,
                fontSize: fontSize.base,
                color: tc.text.muted,
                gap: space['2'],
              }}
            >
              <span data-testid="text-opp-pagination-info">
                {(safePage - 1) * pageSize + 1}&ndash;{Math.min(safePage * pageSize, sorted.length)} of{' '}
                {sorted.length}
              </span>
              <div style={{ display: 'flex', gap: space['1'] }}>
                <PageBtn
                  label="Prev"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(safePage - 1)}
                  tc={tc}
                />
                <PageBtn
                  label="Next"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(safePage + 1)}
                  tc={tc}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PageBtn({
  label,
  disabled,
  onClick,
  tc,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  tc: ReturnType<typeof import('../../../../../hooks/useThemeColors').useThemeColors>;
}) {
  return (
    <button
      data-testid={`button-opp-page-${label.toLowerCase()}`}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: `${space['1']} ${space['2.5']}`,
        fontFamily: fontFamily.body,
        fontSize: fontSize.base,
        fontWeight: fontWeight.medium,
        color: disabled ? tc.text.disabled : tc.text.secondary,
        backgroundColor: 'transparent',
        border: `1px solid ${disabled ? tc.border.subtle : tc.border.default}`,
        borderRadius: radius.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}
