/**
 * SEO Intelligence - Status Chip Component
 * 
 * Visual indicator for recommendation lifecycle status.
 * Part of the governance signal components.
 * 
 * ============================================================
 * NON-GOALS (Governance)
 * ============================================================
 * - This UI does NOT deploy changes
 * - This UI does NOT modify site content
 * - Status chips reflect current state, not influence decisions
 * ============================================================
 * 
 * GOVERNANCE:
 * - Display-only component
 * - Shows actual status (no manipulation)
 * - Clear visual distinction between states
 * 
 * NOT ALLOWED:
 * - Hiding any status
 * - Modifying status display
 * - Status manipulation
 */

'use client';

import React from 'react';
import {
  background,
  text,
  semantic,
  statusColors,
} from '../../../design/tokens/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
} from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import type { RecommendationStatus, ApprovalDecision } from '../../../lib/seo/types';
import { formatRecommendationStatus, formatApprovalDecision } from '../../../lib/seo/formatters';

// ============================================
// Types
// ============================================

export interface StatusChipProps {
  /** Recommendation status */
  status: RecommendationStatus;
  /** Show icon */
  showIcon?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

export interface ApprovalDecisionChipProps {
  /** Approval decision */
  decision: ApprovalDecision;
  /** Show icon */
  showIcon?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

// ============================================
// Components
// ============================================

/**
 * StatusChip - Recommendation lifecycle status indicator.
 * 
 * Status types:
 * - Pending: Awaiting review
 * - Approved: Ready for implementation
 * - Rejected: Not proceeding
 * - Deferred: Postponed
 * - Implemented: Change deployed
 * - Rolled Back: Change reverted
 */
export function StatusChip({ status, showIcon = true, size = 'md' }: StatusChipProps) {
  const style = getStatusStyle(status);
  const sizeStyle = getSizeStyle(size);
  const icon = getStatusIcon(status);

  return (
    <span
      style={{
        ...chipStyles,
        ...style,
        ...sizeStyle,
      }}
      title={`Status: ${formatRecommendationStatus(status)}`}
    >
      {showIcon && <span style={iconStyles}>{icon}</span>}
      {formatRecommendationStatus(status)}
    </span>
  );
}

/**
 * ApprovalDecisionChip - Approval decision indicator.
 */
export function ApprovalDecisionChip({ 
  decision, 
  showIcon = true, 
  size = 'md' 
}: ApprovalDecisionChipProps) {
  const style = getDecisionStyle(decision);
  const sizeStyle = getSizeStyle(size);
  const icon = getDecisionIcon(decision);

  return (
    <span
      style={{
        ...chipStyles,
        ...style,
        ...sizeStyle,
      }}
      title={`Decision: ${formatApprovalDecision(decision)}`}
    >
      {showIcon && <span style={iconStyles}>{icon}</span>}
      {formatApprovalDecision(decision)}
    </span>
  );
}

// ============================================
// Style Helpers
// ============================================

function getStatusStyle(status: RecommendationStatus): React.CSSProperties {
  switch (status) {
    case 'approved':
      return { 
        backgroundColor: semantic.success.light, 
        color: semantic.success.dark,
        borderColor: `${semantic.success.base}30`,
      };
    case 'rejected':
      return { 
        backgroundColor: semantic.danger.light, 
        color: semantic.danger.dark,
        borderColor: `${semantic.danger.base}30`,
      };
    case 'deferred':
      return { 
        backgroundColor: semantic.warning.light, 
        color: semantic.warning.dark,
        borderColor: `${semantic.warning.base}30`,
      };
    case 'implemented':
      return { 
        backgroundColor: statusColors.active.bg, 
        color: statusColors.active.text,
        borderColor: `${statusColors.active.text}30`,
      };
    case 'rolled_back':
      return { 
        backgroundColor: semantic.danger.light, 
        color: semantic.danger.dark,
        borderColor: `${semantic.danger.base}30`,
      };
    case 'pending':
    default:
      return { 
        backgroundColor: statusColors.pending.bg, 
        color: statusColors.pending.text,
        borderColor: `${statusColors.pending.text}30`,
      };
  }
}

function getDecisionStyle(decision: ApprovalDecision): React.CSSProperties {
  switch (decision) {
    case 'approve':
      return { 
        backgroundColor: semantic.success.light, 
        color: semantic.success.dark,
        borderColor: `${semantic.success.base}30`,
      };
    case 'reject':
      return { 
        backgroundColor: semantic.danger.light, 
        color: semantic.danger.dark,
        borderColor: `${semantic.danger.base}30`,
      };
    case 'defer':
    default:
      return { 
        backgroundColor: semantic.warning.light, 
        color: semantic.warning.dark,
        borderColor: `${semantic.warning.base}30`,
      };
  }
}

function getStatusIcon(status: RecommendationStatus): string {
  switch (status) {
    case 'approved':
      return '✓';
    case 'rejected':
      return '✕';
    case 'deferred':
      return '⏳';
    case 'implemented':
      return '✓✓';
    case 'rolled_back':
      return '↩';
    case 'pending':
    default:
      return '○';
  }
}

function getDecisionIcon(decision: ApprovalDecision): string {
  switch (decision) {
    case 'approve':
      return '✓';
    case 'reject':
      return '✕';
    case 'defer':
    default:
      return '⏳';
  }
}

function getSizeStyle(size: 'sm' | 'md' | 'lg'): React.CSSProperties {
  switch (size) {
    case 'lg':
      return { 
        padding: `${space['2']} ${space['4']}`, 
        fontSize: fontSize.base,
        gap: space['2'],
      };
    case 'sm':
      return { 
        padding: `${space['0.5']} ${space['2']}`, 
        fontSize: fontSize.xs,
        gap: space['1'],
      };
    case 'md':
    default:
      return { 
        padding: `${space['1']} ${space['3']}`, 
        fontSize: fontSize.sm,
        gap: space['1'],
      };
  }
}

// ============================================
// Styles
// ============================================

const chipStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  fontFamily: fontFamily.body,
  fontWeight: fontWeight.medium,
  borderRadius: radius.full,
  border: '1px solid',
  whiteSpace: 'nowrap',
};

const iconStyles: React.CSSProperties = {
  flexShrink: 0,
};

export default StatusChip;
