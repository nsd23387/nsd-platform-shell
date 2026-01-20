/**
 * Status Labels
 * 
 * This module provides status labels and styles for the Sales Engine UI.
 * Uses NSD Brand colors (magenta, indigo, violet) - NO yellow, green, or red.
 */

import type { CampaignStatus } from '../types/campaign';
import { NSD_COLORS } from './design-tokens';

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
  DRAFT: NSD_COLORS.status.draft,
  PENDING_REVIEW: NSD_COLORS.status.pendingReview,
  RUNNABLE: NSD_COLORS.status.approvedReady,
  RUNNING: NSD_COLORS.status.running,
  COMPLETED: NSD_COLORS.status.completed,
  FAILED: NSD_COLORS.status.failed,
  ARCHIVED: NSD_COLORS.status.archived,
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
