/**
 * SEO Intelligence - Recommendations List Page
 * 
 * Admin UI for viewing and filtering SEO recommendations.
 * Consumes GET /api/seo/recommendations API.
 * 
 * ============================================================
 * NON-GOALS (Governance)
 * ============================================================
 * - This UI does NOT deploy changes
 * - This UI does NOT modify site content
 * - All implementation occurs externally (e.g., website repo via PR)
 * - This is a read-only view with navigation to detail pages
 * ============================================================
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  background,
  text,
  border,
  semantic,
  violet,
  statusColors,
} from '../../../design/tokens/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
} from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import type {
  SeoRecommendation,
  RecommendationStatus,
  SeoRecommendationType,
  RiskLevel,
  PaginatedResponse,
} from '../../../lib/seo/types';
import {
  formatRecommendationType,
  formatRecommendationStatus,
  formatRiskLevel,
  formatIntentTarget,
  formatConfidence,
  formatRelativeTime,
  formatUrl,
} from '../../../lib/seo/formatters';
import {
  RECOMMENDATION_STATUS_LABELS,
  RECOMMENDATION_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  SEO_ROUTES,
} from '../../../lib/seo/constants';
import { toRecommendationSummary, type SeoRecommendationSummary } from '../../../lib/seo/ui-contracts';

// ============================================
// Types
// ============================================

interface FiltersState {
  status?: RecommendationStatus;
  type?: SeoRecommendationType;
  riskLevel?: RiskLevel;
}

// ============================================
// Component
// ============================================

export default function RecommendationsListPage() {
  // State
  const [recommendations, setRecommendations] = useState<SeoRecommendationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersState>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Fetch recommendations
  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '25');
      if (filters.status) params.set('status', filters.status);
      if (filters.type) params.set('type', filters.type);
      if (filters.riskLevel) params.set('riskLevel', filters.riskLevel);

      const response = await fetch(`/api/seo/recommendations?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations: ${response.status}`);
      }

      const data: PaginatedResponse<SeoRecommendation> = await response.json();
      
      // Convert to summaries for rendering
      const summaries = data.data.map(rec => toRecommendationSummary(rec));
      
      setRecommendations(summaries);
      setTotal(data.total);
      setHasMore(data.has_more);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Filter change handlers
  const handleFilterChange = (key: keyof FiltersState, value: string | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
    setPage(1); // Reset to first page on filter change
  };

  // Navigate to detail
  const handleRowClick = (id: string) => {
    window.location.href = SEO_ROUTES.RECOMMENDATION_DETAIL(id);
  };

  return (
    <div style={containerStyles}>
      {/* Page Header */}
      <div style={headerStyles}>
        <div>
          <h1 style={h1Styles}>Recommendations</h1>
          <p style={descStyles}>
            AI-generated SEO improvement suggestions awaiting review.
          </p>
        </div>
        {total > 0 && (
          <div style={countBadgeStyles}>
            {total} recommendation{total !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={filtersContainerStyles}>
        <select
          style={selectStyles}
          value={filters.status || ''}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          {Object.entries(RECOMMENDATION_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          style={selectStyles}
          value={filters.type || ''}
          onChange={(e) => handleFilterChange('type', e.target.value)}
        >
          <option value="">All Types</option>
          {Object.entries(RECOMMENDATION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          style={selectStyles}
          value={filters.riskLevel || ''}
          onChange={(e) => handleFilterChange('riskLevel', e.target.value)}
        >
          <option value="">All Risk Levels</option>
          {Object.entries(RISK_LEVEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <button
          style={clearButtonStyles}
          onClick={() => { setFilters({}); setPage(1); }}
          disabled={!filters.status && !filters.type && !filters.riskLevel}
        >
          Clear Filters
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={loadingStyles}>
          <div style={spinnerStyles} />
          <span>Loading recommendations...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={errorStyles}>
          <strong>Error loading recommendations</strong>
          <p>{error}</p>
          <button style={retryButtonStyles} onClick={fetchRecommendations}>
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && recommendations.length === 0 && (
        <div style={emptyStateStyles}>
          <span style={emptyIconStyles}>💡</span>
          <h3 style={emptyTitleStyles}>No Recommendations Found</h3>
          <p style={emptyDescStyles}>
            {filters.status || filters.type || filters.riskLevel
              ? 'No recommendations match your filters. Try adjusting the filters above.'
              : 'Recommendations will appear here once the AI engine generates them.'}
          </p>
        </div>
      )}

      {/* Recommendations Table */}
      {!loading && !error && recommendations.length > 0 && (
        <>
          <div style={tableContainerStyles}>
            <table style={tableStyles}>
              <thead>
                <tr>
                  <th style={thStyles}>URL</th>
                  <th style={thStyles}>Type</th>
                  <th style={thStyles}>Intent</th>
                  <th style={{ ...thStyles, textAlign: 'center' }}>Confidence</th>
                  <th style={{ ...thStyles, textAlign: 'center' }}>Risk</th>
                  <th style={{ ...thStyles, textAlign: 'center' }}>Status</th>
                  <th style={thStyles}>Created</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((rec) => (
                  <tr
                    key={rec.id}
                    style={trStyles}
                    onClick={() => handleRowClick(rec.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleRowClick(rec.id)}
                  >
                    <td style={tdStyles}>
                      <span style={urlCellStyles} title={rec.url}>
                        {formatUrl(rec.url, 40)}
                      </span>
                    </td>
                    <td style={tdStyles}>
                      <span style={typeCellStyles}>
                        {formatRecommendationType(rec.type)}
                      </span>
                    </td>
                    <td style={tdStyles}>
                      <span style={intentBadgeStyles}>
                        {formatIntentTarget(rec.intent_target)}
                      </span>
                    </td>
                    <td style={{ ...tdStyles, textAlign: 'center' }}>
                      <ConfidenceCell score={rec.confidence_score} />
                    </td>
                    <td style={{ ...tdStyles, textAlign: 'center' }}>
                      <RiskBadge level={rec.risk_level} />
                    </td>
                    <td style={{ ...tdStyles, textAlign: 'center' }}>
                      <StatusChip status={rec.status} />
                    </td>
                    <td style={tdStyles}>
                      <span style={dateCellStyles}>
                        {formatRelativeTime(rec.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={paginationStyles}>
            <button
              style={paginationButtonStyles}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span style={pageInfoStyles}>
              Page {page} {total > 0 && `of ${Math.ceil(total / 25)}`}
            </span>
            <button
              style={paginationButtonStyles}
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore}
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Governance Notice */}
      <div style={governanceNoticeStyles}>
        <strong>Review Only</strong> — This interface displays recommendations for review.
        Approving a recommendation does not deploy changes. All implementation occurs externally.
      </div>
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

function ConfidenceCell({ score }: { score: number }) {
  const color = score >= 0.85 ? semantic.success.dark 
    : score >= 0.5 ? semantic.info.dark 
    : semantic.warning.dark;
  const bg = score >= 0.85 ? semantic.success.light 
    : score >= 0.5 ? semantic.info.light 
    : semantic.warning.light;

  return (
    <span style={{ ...confidenceCellStyles, color, backgroundColor: bg }}>
      {formatConfidence(score)}
    </span>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const style = getRiskBadgeStyle(level);
  return (
    <span style={{ ...riskBadgeStyles, ...style }}>
      {formatRiskLevel(level)}
    </span>
  );
}

function StatusChip({ status }: { status: RecommendationStatus }) {
  const style = getStatusChipStyle(status);
  return (
    <span style={{ ...statusChipStyles, ...style }}>
      {formatRecommendationStatus(status)}
    </span>
  );
}

// ============================================
// Style Helpers
// ============================================

function getRiskBadgeStyle(level: RiskLevel): React.CSSProperties {
  switch (level) {
    case 'high':
      return { backgroundColor: semantic.danger.light, color: semantic.danger.dark };
    case 'medium':
      return { backgroundColor: semantic.warning.light, color: semantic.warning.dark };
    case 'low':
    default:
      return { backgroundColor: semantic.success.light, color: semantic.success.dark };
  }
}

function getStatusChipStyle(status: RecommendationStatus): React.CSSProperties {
  switch (status) {
    case 'approved':
      return { backgroundColor: statusColors.exceptional.bg, color: statusColors.exceptional.text };
    case 'rejected':
      return { backgroundColor: statusColors.breach.bg, color: statusColors.breach.text };
    case 'deferred':
      return { backgroundColor: statusColors.standard.bg, color: statusColors.standard.text };
    case 'implemented':
      return { backgroundColor: statusColors.active.bg, color: statusColors.active.text };
    case 'rolled_back':
      return { backgroundColor: semantic.danger.light, color: semantic.danger.dark };
    case 'pending':
    default:
      return { backgroundColor: statusColors.pending.bg, color: statusColors.pending.text };
  }
}

// ============================================
// Styles
// ============================================

const containerStyles: React.CSSProperties = {
  maxWidth: '1400px',
  margin: '0 auto',
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: space['6'],
};

const h1Styles: React.CSSProperties = {
  fontFamily: fontFamily.display,
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.bold,
  color: text.primary,
  margin: 0,
};

const descStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.base,
  color: text.muted,
  marginTop: space['1'],
  margin: 0,
};

const countBadgeStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: violet[600],
  backgroundColor: violet[50],
  padding: `${space['2']} ${space['4']}`,
  borderRadius: radius.full,
};

const filtersContainerStyles: React.CSSProperties = {
  display: 'flex',
  gap: space['3'],
  marginBottom: space['6'],
  flexWrap: 'wrap',
};

const selectStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  padding: `${space['2']} ${space['3']}`,
  borderRadius: radius.md,
  border: `1px solid ${border.default}`,
  backgroundColor: background.surface,
  color: text.primary,
  cursor: 'pointer',
};

const clearButtonStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  padding: `${space['2']} ${space['4']}`,
  borderRadius: radius.md,
  border: `1px solid ${border.default}`,
  backgroundColor: background.surface,
  color: text.muted,
  cursor: 'pointer',
};

const loadingStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: space['3'],
  padding: space['12'],
  color: text.muted,
  fontFamily: fontFamily.body,
  fontSize: fontSize.base,
};

const spinnerStyles: React.CSSProperties = {
  width: '24px',
  height: '24px',
  border: `3px solid ${border.default}`,
  borderTopColor: violet[500],
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
};

const errorStyles: React.CSSProperties = {
  padding: space['6'],
  backgroundColor: semantic.danger.light,
  borderRadius: radius.lg,
  border: `1px solid ${semantic.danger.base}20`,
  textAlign: 'center',
  fontFamily: fontFamily.body,
  color: semantic.danger.dark,
};

const retryButtonStyles: React.CSSProperties = {
  marginTop: space['4'],
  padding: `${space['2']} ${space['4']}`,
  backgroundColor: semantic.danger.base,
  color: 'white',
  border: 'none',
  borderRadius: radius.md,
  cursor: 'pointer',
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
};

const emptyStateStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: space['12'],
  backgroundColor: background.surface,
  borderRadius: radius.xl,
  border: `1px solid ${border.default}`,
  textAlign: 'center',
};

const emptyIconStyles: React.CSSProperties = {
  fontSize: '48px',
  marginBottom: space['4'],
};

const emptyTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.lg,
  fontWeight: fontWeight.semibold,
  color: text.primary,
  margin: 0,
};

const emptyDescStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.muted,
  marginTop: space['2'],
  maxWidth: '400px',
  margin: `${space['2']} 0 0`,
};

const tableContainerStyles: React.CSSProperties = {
  backgroundColor: background.surface,
  borderRadius: radius.xl,
  border: `1px solid ${border.default}`,
  overflow: 'hidden',
};

const tableStyles: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
};

const thStyles: React.CSSProperties = {
  padding: `${space['3']} ${space['4']}`,
  textAlign: 'left',
  fontWeight: fontWeight.semibold,
  color: text.muted,
  backgroundColor: background.muted,
  borderBottom: `1px solid ${border.default}`,
  fontSize: fontSize.xs,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const trStyles: React.CSSProperties = {
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
};

const tdStyles: React.CSSProperties = {
  padding: `${space['3']} ${space['4']}`,
  borderBottom: `1px solid ${border.subtle}`,
  color: text.primary,
};

const urlCellStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.xs,
  color: text.secondary,
};

const typeCellStyles: React.CSSProperties = {
  fontWeight: fontWeight.medium,
};

const intentBadgeStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  padding: `${space['0.5']} ${space['2']}`,
  borderRadius: radius.sm,
  backgroundColor: background.muted,
  color: text.secondary,
};

const confidenceCellStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
  padding: `${space['1']} ${space['2']}`,
  borderRadius: radius.md,
};

const riskBadgeStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  padding: `${space['1']} ${space['2']}`,
  borderRadius: radius.md,
};

const statusChipStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  padding: `${space['1']} ${space['2']}`,
  borderRadius: radius.full,
};

const dateCellStyles: React.CSSProperties = {
  color: text.muted,
  fontSize: fontSize.xs,
};

const paginationStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: space['4'],
  marginTop: space['6'],
};

const paginationButtonStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  padding: `${space['2']} ${space['4']}`,
  borderRadius: radius.md,
  border: `1px solid ${border.default}`,
  backgroundColor: background.surface,
  color: text.primary,
  cursor: 'pointer',
};

const pageInfoStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.muted,
};

const governanceNoticeStyles: React.CSSProperties = {
  marginTop: space['8'],
  padding: space['4'],
  backgroundColor: semantic.info.light,
  borderRadius: radius.lg,
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: semantic.info.dark,
  textAlign: 'center',
};
