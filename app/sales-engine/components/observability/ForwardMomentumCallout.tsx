'use client';

/**
 * ForwardMomentumCallout Component
 * 
 * Advisory-only guidance callouts based on campaign state.
 * Answers: "What should I do next?"
 * 
 * GOVERNANCE CONSTRAINTS:
 * - Advisory only - no CTAs that mutate data
 * - Read-only observations
 * - Forward momentum guidance without implying execution
 * 
 * Examples:
 * - "Review ICP criteria if results are empty"
 * - "Execution completed successfully — you can review results or refine this campaign"
 * - "Campaign is pending review"
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import type { CampaignGovernanceState } from '../../lib/campaign-state';
import type { ExecutionConfidence } from '../../lib/execution-state-mapping';

interface ForwardMomentumCalloutProps {
  governanceState: CampaignGovernanceState;
  executionConfidence?: ExecutionConfidence;
  hasFunnelActivity?: boolean;
  isPlanningOnly?: boolean;
}

interface CalloutConfig {
  icon: string;
  iconColor: string;
  bg: string;
  border: string;
  title: string;
  message: string;
}

function deriveCallout(
  governanceState: CampaignGovernanceState,
  executionConfidence: ExecutionConfidence | undefined,
  hasFunnelActivity: boolean,
  isPlanningOnly: boolean
): CalloutConfig | null {
  if (isPlanningOnly) {
    return {
      icon: 'info',
      iconColor: NSD_COLORS.semantic.attention.text,
      bg: NSD_COLORS.semantic.attention.bg,
      border: NSD_COLORS.semantic.attention.border,
      title: 'Planning Mode',
      message:
        'This campaign is in planning-only mode. ICP criteria are being tested without live execution. Review benchmarks to validate targeting.',
    };
  }

  if (governanceState === 'DRAFT') {
    return {
      icon: 'edit',
      iconColor: NSD_COLORS.semantic.muted.text,
      bg: NSD_COLORS.semantic.muted.bg,
      border: NSD_COLORS.semantic.muted.border,
      title: 'Draft Campaign',
      message:
        'This campaign is in draft state. Configure ICP criteria and submit for review when ready.',
    };
  }

  if (governanceState === 'PENDING_APPROVAL') {
    return {
      icon: 'clock',
      iconColor: NSD_COLORS.semantic.attention.text,
      bg: NSD_COLORS.semantic.attention.bg,
      border: NSD_COLORS.semantic.attention.border,
      title: 'Awaiting Approval',
      message:
        'This campaign is pending approval. An authorized reviewer must approve before execution can proceed.',
    };
  }

  if (governanceState === 'BLOCKED') {
    return {
      icon: 'warning',
      iconColor: NSD_COLORS.semantic.critical.text,
      bg: NSD_COLORS.semantic.critical.bg,
      border: NSD_COLORS.semantic.critical.border,
      title: 'Campaign Blocked',
      message:
        'This campaign is currently blocked. Check configuration and governance requirements.',
    };
  }

  if (executionConfidence === 'failed') {
    return {
      icon: 'warning',
      iconColor: NSD_COLORS.semantic.critical.text,
      bg: NSD_COLORS.semantic.critical.bg,
      border: NSD_COLORS.semantic.critical.border,
      title: 'Execution Failed',
      message:
        'The last execution failed. Review the timeline for details on what went wrong.',
    };
  }

  if (executionConfidence === 'completed_no_steps_observed') {
    return {
      icon: 'info',
      iconColor: NSD_COLORS.semantic.attention.text,
      bg: NSD_COLORS.semantic.attention.bg,
      border: NSD_COLORS.semantic.attention.border,
      title: 'Execution Completed',
      message: hasFunnelActivity
        ? 'Execution completed. Review the pipeline funnel to see results.'
        : 'Execution completed but no execution steps were observed. Review ICP criteria if the funnel is empty.',
    };
  }

  if (executionConfidence === 'completed' && !hasFunnelActivity) {
    return {
      icon: 'info',
      iconColor: NSD_COLORS.semantic.attention.text,
      bg: NSD_COLORS.semantic.attention.bg,
      border: NSD_COLORS.semantic.attention.border,
      title: 'Review Recommended',
      message:
        'Execution completed but the funnel shows no activity. Consider reviewing ICP criteria or sourcing parameters.',
    };
  }

  if (executionConfidence === 'completed' && hasFunnelActivity) {
    return {
      icon: 'check',
      iconColor: NSD_COLORS.semantic.positive.text,
      bg: NSD_COLORS.semantic.positive.bg,
      border: NSD_COLORS.semantic.positive.border,
      title: 'Execution Successful',
      message:
        'Execution completed successfully. Review the pipeline funnel for detailed results.',
    };
  }

  if (executionConfidence === 'in_progress') {
    return {
      icon: 'play',
      iconColor: NSD_COLORS.semantic.active.text,
      bg: NSD_COLORS.semantic.active.bg,
      border: NSD_COLORS.semantic.active.border,
      title: 'Execution In Progress',
      message:
        'This campaign is currently being executed. Check back shortly for results.',
    };
  }

  if (executionConfidence === 'queued') {
    return {
      icon: 'clock',
      iconColor: NSD_COLORS.semantic.attention.text,
      bg: NSD_COLORS.semantic.attention.bg,
      border: NSD_COLORS.semantic.attention.border,
      title: 'Execution Queued',
      message:
        'This campaign is queued for execution. The worker will process it shortly.',
    };
  }

  if (governanceState === 'APPROVED_READY' && executionConfidence === 'not_executed') {
    return {
      icon: 'check',
      iconColor: NSD_COLORS.semantic.positive.text,
      bg: NSD_COLORS.semantic.positive.bg,
      border: NSD_COLORS.semantic.positive.border,
      title: 'Ready for Execution',
      message:
        'This campaign is approved and ready for execution. Request a run from the Observability tab.',
    };
  }

  return null;
}

export function ForwardMomentumCallout({
  governanceState,
  executionConfidence,
  hasFunnelActivity = false,
  isPlanningOnly = false,
}: ForwardMomentumCalloutProps) {
  const callout = deriveCallout(
    governanceState,
    executionConfidence,
    hasFunnelActivity,
    isPlanningOnly
  );

  if (!callout) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        padding: '16px 20px',
        backgroundColor: callout.bg,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${callout.border}`,
      }}
    >
      <Icon name={callout.icon as any} size={20} color={callout.iconColor} />
      <div style={{ flex: 1 }}>
        <h5
          style={{
            margin: '0 0 6px 0',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: callout.iconColor,
          }}
        >
          {callout.title}
        </h5>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: callout.iconColor,
            lineHeight: 1.5,
            opacity: 0.9,
          }}
        >
          {callout.message}
        </p>
      </div>
    </div>
  );
}
