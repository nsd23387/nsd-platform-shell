import type { CampaignStatus } from '../types/campaign';

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'In Review',
  RUNNABLE: 'Approved & Ready',
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  ARCHIVED: 'Archived',
};

export const STATUS_STYLES: Record<CampaignStatus, { bg: string; text: string; border: string }> = {
  DRAFT: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  PENDING_REVIEW: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  RUNNABLE: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  RUNNING: { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
  COMPLETED: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  FAILED: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  ARCHIVED: { bg: '#f3f4f6', text: '#4b5563', border: '#d1d5db' },
};

export function getStatusLabel(status: CampaignStatus): string {
  return STATUS_LABELS[status] || status;
}

export function getStatusStyle(status: CampaignStatus) {
  return STATUS_STYLES[status] || STATUS_STYLES.DRAFT;
}

export const STATUS_FILTER_OPTIONS: { value: CampaignStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_REVIEW', label: 'In Review' },
  { value: 'RUNNABLE', label: 'Approved & Ready' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'ARCHIVED', label: 'Archived' },
];
