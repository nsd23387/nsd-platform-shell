/**
 * Status Labels
 * 
 * This module provides status labels and styles for the Sales Engine UI.
 */

import type { CampaignStatus } from '../types/campaign';

/**
 * Status labels for display.
 */
export const STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending Approval',
  RUNNABLE: 'Approved',
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  ARCHIVED: 'Archived',
};

export const STATUS_STYLES: Record<CampaignStatus, { bg: string; text: string; border: string }> = {
  DRAFT: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  PENDING_REVIEW: { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
  RUNNABLE: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  RUNNING: { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
  COMPLETED: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
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
 */
export const STATUS_FILTER_OPTIONS: { value: CampaignStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_REVIEW', label: 'Pending Approval' },
  { value: 'RUNNABLE', label: 'Approved' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

/**
 * Get status description.
 */
export function getStatusDescription(status: CampaignStatus): string {
  const descriptions: Record<CampaignStatus, string> = {
    DRAFT: 'Campaign is being authored and can be modified.',
    PENDING_REVIEW: 'Campaign is awaiting approval.',
    RUNNABLE: 'Campaign is approved and ready for execution.',
    RUNNING: 'Campaign execution is in progress.',
    COMPLETED: 'Campaign execution completed successfully.',
    FAILED: 'Campaign execution encountered errors.',
    ARCHIVED: 'Campaign is archived.',
  };
  return descriptions[status] || 'Unknown status';
}
