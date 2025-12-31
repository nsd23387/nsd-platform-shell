/**
 * Status Labels - Target-State Architecture
 * 
 * This module provides status labels and styles for the Sales Engine UI.
 * Updated to reflect governance-first terminology per target-state constraints.
 */

import type { CampaignStatus } from '../types/campaign';

/**
 * Legacy status labels mapped to target-state terminology.
 * Note: The CampaignStatus type is preserved for backend compatibility,
 * but display labels reflect governance-first semantics.
 */
export const STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending Approval',
  RUNNABLE: 'Approved (Execution Observed)',
  RUNNING: 'Executed (Read-Only)',
  COMPLETED: 'Executed (Read-Only)',
  FAILED: 'Executed (Read-Only)',
  ARCHIVED: 'Archived',
};

export const STATUS_STYLES: Record<CampaignStatus, { bg: string; text: string; border: string }> = {
  DRAFT: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  PENDING_REVIEW: { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
  RUNNABLE: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  RUNNING: { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' },
  COMPLETED: { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' },
  FAILED: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  ARCHIVED: { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' },
};

export function getStatusLabel(status: CampaignStatus): string {
  return STATUS_LABELS[status] || status;
}

export function getStatusStyle(status: CampaignStatus) {
  return STATUS_STYLES[status] || STATUS_STYLES.DRAFT;
}

/**
 * Status filter options for campaign list.
 * Updated to reflect governance-first terminology.
 */
export const STATUS_FILTER_OPTIONS: { value: CampaignStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_REVIEW', label: 'Pending Approval' },
  { value: 'RUNNABLE', label: 'Approved (Observed)' },
  { value: 'COMPLETED', label: 'Executed (Read-Only)' },
  { value: 'ARCHIVED', label: 'Archived' },
];

/**
 * Get governance-aware status description.
 */
export function getStatusDescription(status: CampaignStatus): string {
  const descriptions: Record<CampaignStatus, string> = {
    DRAFT: 'Campaign is being authored and can be modified.',
    PENDING_REVIEW: 'Campaign is awaiting governance approval.',
    RUNNABLE: 'Campaign is approved. Execution is managed externally and observed in this UI.',
    RUNNING: 'Campaign execution is in progress. This UI observes execution status.',
    COMPLETED: 'Campaign execution completed. View observability data.',
    FAILED: 'Campaign execution encountered errors. View error details.',
    ARCHIVED: 'Campaign is archived and read-only.',
  };
  return descriptions[status] || 'Unknown status';
}
