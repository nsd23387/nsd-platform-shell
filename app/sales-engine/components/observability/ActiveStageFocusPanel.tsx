'use client';

/**
 * ActiveStageFocusPanel Component
 * 
 * Live-updating panel that answers "What is the system doing right now?"
 * Displays human-readable status sentence derived from observed state only.
 * 
 * GOVERNANCE CONSTRAINTS (CRITICAL):
 * - This component is PRESENTATIONAL ONLY. It does NOT define execution semantics.
 * - Derived from observed execution state only
 * - No speculation or inferred intent
 * - Unknown/future stages must produce NEUTRAL copy
 * - Read-only display
 * 
 * Stage-Agnostic Copy Rules:
 * - Known stages: Use stage-specific copy with context
 * - Unknown/future stages: "Stage in progress — awaiting further data"
 * - No marketing language for unknown stages
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { getStageConfig, isKnownStage, isFutureStage } from '../../lib/execution-stages';
import { isRunStale, type ResolvableRun } from '../../lib/resolveActiveRun';
import type { ObservabilityFunnel } from '../../types/campaign';

interface ActiveStageFocusPanelProps {
  runStatus: string | null;
  runPhase: string | null;
  funnel: ObservabilityFunnel | null;
  noRuns: boolean;
  isPolling?: boolean;
  /** Staleness can be passed directly from parent (centralized resolution) or calculated from runStartedAt */
  isStale?: boolean;
  /** @deprecated Use isStale prop instead. Kept for backward compatibility. */
  runStartedAt?: string | null;
}

/**
 * Generate copy for a known stage
 * 
 * GOVERNANCE CONSTRAINT:
 * These are the only stages with specific copy.
 * All other stages use neutral fallback.
 */
function getKnownStageCopy(
  stageId: string,
  funnel: ObservabilityFunnel | null
): { headline: string; description: string } {
  const orgsCount = funnel?.stages?.find(s => s.stage === 'orgs_sourced')?.count || 0;
  const contactsCount = funnel?.stages?.find(s => s.stage === 'contacts_discovered')?.count || 0;
  const leadsCount = funnel?.stages?.find(s => s.stage === 'leads_promoted')?.count || 0;

  switch (stageId) {
    case 'org_sourcing':
      return {
        headline: 'Sourcing organizations',
        description: 'Identifying organizations that match your ICP criteria.',
      };
    case 'contact_discovery':
      const orgsText = orgsCount > 0 ? `across ${orgsCount.toLocaleString()} organizations` : '';
      return {
        headline: 'Discovering contacts',
        description: `Scanning ${orgsText} for contacts matching role criteria.`.trim(),
      };
    case 'lead_creation':
      const contactsText = contactsCount > 0 ? `${contactsCount.toLocaleString()} contacts` : 'contacts';
      return {
        headline: 'Qualifying contacts',
        description: `Evaluating ${contactsText} for lead promotion eligibility.`,
      };
    case 'email_readiness':
      return {
        headline: 'Checking email readiness',
        description: 'Verifying email availability and enrichment status.',
      };
    case 'personalization':
      return {
        headline: 'Generating personalization',
        description: 'Creating personalized outreach content.',
      };
    case 'outbound_activation':
      return {
        headline: 'Activating outbound',
        description: 'Connecting to outbound delivery system.',
      };
    case 'send_in_progress':
      return {
        headline: 'Sending messages',
        description: 'Outbound messages in delivery.',
      };
    case 'send_completed':
      return {
        headline: 'Sending completed',
        description: 'All outbound activity completed.',
      };
    default:
      return {
        headline: 'Stage in progress',
        description: 'Awaiting further data.',
      };
  }
}

/**
 * Generate neutral copy for unknown/future stages
 * 
 * GOVERNANCE CONSTRAINT:
 * No assumptions. No marketing language.
 */
function getUnknownStageCopy(stageId: string): { headline: string; description: string } {
  return {
    headline: 'Stage in progress',
    description: 'Awaiting further data.',
  };
}

function deriveActiveStageCopy(
  runStatus: string | null,
  runPhase: string | null,
  funnel: ObservabilityFunnel | null,
  noRuns: boolean,
  isStale: boolean
): { headline: string; description: string; isActive: boolean } {
  if (noRuns || !runStatus) {
    return {
      headline: 'Awaiting first execution',
      description: 'This campaign has not been executed yet. Request execution when ready.',
      isActive: false,
    };
  }

  const normalizedStatus = runStatus.toLowerCase();
  const normalizedPhase = runPhase?.toLowerCase() || '';

  const orgsCount = funnel?.stages?.find(s => s.stage === 'orgs_sourced')?.count || 0;
  const contactsCount = funnel?.stages?.find(s => s.stage === 'contacts_discovered')?.count || 0;
  const leadsCount = funnel?.stages?.find(s => s.stage === 'leads_promoted')?.count || 0;

  if (normalizedStatus === 'queued' || normalizedStatus === 'run_requested' || normalizedStatus === 'pending') {
    return {
      headline: 'Execution queued',
      description: 'Awaiting worker pickup. Execution will begin shortly.',
      isActive: true,
    };
  }

  // STALENESS HANDLING: Show warning for stale running runs
  if (isStale && (normalizedStatus === 'running' || normalizedStatus === 'in_progress')) {
    return {
      headline: 'Execution stalled',
      description: 'Execution stalled — system will mark failed.',
      isActive: false,
    };
  }

  if (normalizedStatus === 'running' || normalizedStatus === 'in_progress') {
    if (normalizedPhase && isKnownStage(normalizedPhase)) {
      const copy = getKnownStageCopy(normalizedPhase, funnel);
      return { ...copy, isActive: true };
    }
    
    if (normalizedPhase) {
      return {
        headline: 'Stage in progress',
        description: 'Awaiting further data.',
        isActive: true,
      };
    }
    
    return {
      headline: 'Execution in progress',
      description: 'Processing campaign stages.',
      isActive: true,
    };
  }

  if (normalizedStatus === 'completed' || normalizedStatus === 'success' || normalizedStatus === 'succeeded') {
    const totalStages = funnel?.stages?.length || 0;
    const stageLabels: string[] = [];
    
    if (leadsCount > 0) stageLabels.push(`${leadsCount.toLocaleString()} leads promoted`);
    else if (contactsCount > 0) stageLabels.push(`${contactsCount.toLocaleString()} contacts discovered`);
    else if (orgsCount > 0) stageLabels.push(`${orgsCount.toLocaleString()} organizations sourced`);

    const observedFutureStages = funnel?.stages?.filter(s => {
      const knownIds = ['orgs_sourced', 'contacts_discovered', 'leads_promoted'];
      return !knownIds.includes(s.stage) && s.count > 0;
    }) || [];

    if (observedFutureStages.length > 0) {
      stageLabels.push(`${observedFutureStages.length} additional stages observed`);
    }

    if (stageLabels.length === 0) {
      return {
        headline: 'Execution completed',
        description: 'No results produced. Review ICP criteria to improve targeting.',
        isActive: false,
      };
    }

    return {
      headline: 'Execution completed',
      description: stageLabels.join('. ') + '.',
      isActive: false,
    };
  }

  if (normalizedStatus === 'failed' || normalizedStatus === 'error') {
    return {
      headline: 'Execution failed',
      description: 'An error occurred during execution. See timeline for details.',
      isActive: false,
    };
  }

  if (normalizedStatus === 'partial' || normalizedStatus === 'partial_success') {
    return {
      headline: 'Partially completed',
      description: 'Some stages completed with issues. See timeline for details.',
      isActive: false,
    };
  }

  return {
    headline: 'Status unknown',
    description: `Current status: ${runStatus}`,
    isActive: false,
  };
}

export function ActiveStageFocusPanel({
  runStatus,
  runPhase,
  funnel,
  noRuns,
  isPolling = false,
  isStale: isStaleFromParent,
  runStartedAt,
}: ActiveStageFocusPanelProps) {
  // STALENESS HANDLING: Use centralized staleness from parent when provided,
  // otherwise fall back to calculating from runStartedAt for backward compatibility
  const normalizedStatus = runStatus?.toLowerCase() || '';
  const isRunning = normalizedStatus === 'running' || normalizedStatus === 'in_progress';
  const stale = isStaleFromParent ?? (isRunning && runStartedAt ? isRunStale({
    id: 'check',
    status: runStatus || '',
    started_at: runStartedAt,
    created_at: runStartedAt,
  }) : false);

  const { headline, description, isActive } = deriveActiveStageCopy(
    runStatus,
    runPhase,
    funnel,
    noRuns,
    stale
  );

  const bgColor = isActive
    ? NSD_COLORS.semantic.active.bg
    : noRuns
    ? NSD_COLORS.semantic.muted.bg
    : NSD_COLORS.semantic.positive.bg;

  const borderColor = isActive
    ? NSD_COLORS.semantic.active.border
    : noRuns
    ? NSD_COLORS.semantic.muted.border
    : NSD_COLORS.semantic.positive.border;

  const textColor = isActive
    ? NSD_COLORS.semantic.active.text
    : noRuns
    ? NSD_COLORS.semantic.muted.text
    : NSD_COLORS.semantic.positive.text;

  return (
    <div
      style={{
        padding: '16px 20px',
        backgroundColor: bgColor,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      {isActive && (
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: textColor,
            animation: 'pulse 1.5s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
      )}
      
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px',
          }}
        >
          <h4
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: textColor,
            }}
          >
            {headline}
          </h4>
          {isPolling && isActive && (
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                backgroundColor: `${textColor}20`,
                borderRadius: '4px',
                color: textColor,
                fontFamily: NSD_TYPOGRAPHY.fontBody,
              }}
            >
              live
            </span>
          )}
        </div>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            fontFamily: NSD_TYPOGRAPHY.fontBody,
            color: textColor,
            opacity: 0.9,
          }}
        >
          {description}
        </p>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default ActiveStageFocusPanel;
