/**
 * LeadStatusBadge Component
 * 
 * Displays the approval status of a lead with correct copy.
 * 
 * BACKEND ENFORCEMENT:
 * - Leads start as `pending_approval`
 * - Only approved leads can be sent/exported
 * - Approval/rejection are explicit actions
 * 
 * COPY ALIGNMENT (exact language):
 * - pending_approval → "Awaiting approval"
 * - approved → "Approved for outreach"
 * - rejected → "Rejected"
 * 
 * No "Qualified" labels - that terminology is deprecated.
 */

import React from 'react';
import { NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import type { LeadApprovalStatus } from '../../types/campaign';

export interface LeadStatusBadgeProps {
  /** Lead approval status from backend */
  status: LeadApprovalStatus;
  /** Badge size */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Get display label for approval status.
 * Uses exact copy as specified in governance requirements.
 */
function getStatusLabel(status: LeadApprovalStatus): string {
  const labels: Record<LeadApprovalStatus, string> = {
    pending_approval: 'Awaiting approval',
    approved: 'Approved for outreach',
    rejected: 'Rejected',
  };
  return labels[status] || status;
}

/**
 * Get styling for approval status badge.
 */
function getStatusStyle(status: LeadApprovalStatus): {
  bg: string;
  text: string;
  border: string;
} {
  const styles: Record<LeadApprovalStatus, { bg: string; text: string; border: string }> = {
    pending_approval: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
    approved: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
    rejected: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  };
  return styles[status] || styles.pending_approval;
}

/**
 * LeadStatusBadge - Displays lead approval status.
 * 
 * No "Qualified" labels. Uses governance-safe copy:
 * - "Awaiting approval" (not "Pending" or "Qualified")
 * - "Approved for outreach" (not "Ready to send")
 * - "Rejected" (explicit rejection state)
 */
export function LeadStatusBadge({ status, size = 'md' }: LeadStatusBadgeProps) {
  const style = getStatusStyle(status);
  const label = getStatusLabel(status);

  const sizeStyles = {
    sm: { padding: '3px 8px', fontSize: '11px' },
    md: { padding: '4px 12px', fontSize: '12px' },
    lg: { padding: '6px 14px', fontSize: '13px' },
  };

  const sizeStyle = sizeStyles[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: sizeStyle.padding,
        borderRadius: NSD_RADIUS.full,
        fontSize: sizeStyle.fontSize,
        fontWeight: 500,
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        fontFamily: NSD_TYPOGRAPHY.fontBody,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
