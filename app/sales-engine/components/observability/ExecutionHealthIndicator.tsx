'use client';

/**
 * ExecutionHealthIndicator Component
 * 
 * Single sentence health line visible without scrolling.
 * Reconciles status + results into one clear statement.
 * 
 * GOVERNANCE CONSTRAINTS (CRITICAL):
 * - This component is PRESENTATIONAL ONLY. It does NOT define execution semantics.
 * - Exactly one sentence
 * - Must reconcile status + results from observed data
 * - No alarmist language
 * - Stage-agnostic: Must NOT assume a 3-stage funnel
 * - Future stages degrade gracefully
 * - Read-only display
 * 
 * The health statement must work regardless of which stages exist.
 * If future stages are present but empty, show neutral messaging.
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { CANONICAL_STAGE_CONFIG, isFutureStage } from '../../lib/execution-stages';
import type { ObservabilityFunnel } from '../../types/campaign';

interface ExecutionHealthIndicatorProps {
  runStatus: string | null;
  runPhase: string | null;
  funnel: ObservabilityFunnel | null;
  noRuns: boolean;
}

type HealthLevel = 'success' | 'warning' | 'error' | 'info' | 'neutral';

/**
 * Stage-to-copy mapping for known stages
 * 
 * GOVERNANCE CONSTRAINT:
 * Only exact matches are allowed. No substring inference.
 * Unknown stages use neutral fallback.
 */
const STAGE_RUNNING_COPY: Record<string, string> = {
  org_sourcing: 'sourcing organizations',
  contact_discovery: 'discovering contacts',
  lead_creation: 'qualifying contacts for promotion',
  email_readiness: 'checking email readiness',
  personalization: 'generating personalization',
  outbound_activation: 'activating outbound',
  send_in_progress: 'sending messages',
  send_completed: 'completing sends',
};

function getRunningPhaseCopy(phase: string): string {
  const normalizedPhase = phase.toLowerCase();
  return STAGE_RUNNING_COPY[normalizedPhase] || 'processing stage';
}

/**
 * Stage-to-copy mapping for failure states
 * 
 * GOVERNANCE CONSTRAINT:
 * Only exact matches are allowed. No substring inference.
 * Unknown stages use neutral fallback.
 */
const STAGE_FAILURE_COPY: Record<string, string> = {
  org_sourcing: 'error during organization sourcing',
  contact_discovery: 'error during contact discovery',
  lead_creation: 'error during lead promotion',
  email_readiness: 'error during email readiness check',
  personalization: 'error during personalization',
  outbound_activation: 'error during outbound activation',
  send_in_progress: 'error during sending',
  send_completed: 'error during send completion',
};

function getFailurePhaseCopy(phase: string): string {
  const normalizedPhase = phase.toLowerCase();
  return STAGE_FAILURE_COPY[normalizedPhase] || 'see timeline for details';
}

/**
 * Derive health statement from observed data
 * 
 * GOVERNANCE CONSTRAINT:
 * This function must work with ANY number of stages.
 * It must NOT assume leads or sends exist.
 * It must degrade gracefully for future stages.
 */
function deriveHealthStatement(
  runStatus: string | null,
  runPhase: string | null,
  funnel: ObservabilityFunnel | null,
  noRuns: boolean
): { statement: string; level: HealthLevel } {
  if (noRuns || !runStatus) {
    return {
      statement: 'Ready for execution',
      level: 'neutral',
    };
  }

  const normalizedStatus = runStatus.toLowerCase();
  const normalizedPhase = runPhase?.toLowerCase() || '';

  const stageMap = new Map<string, number>();
  funnel?.stages?.forEach(s => stageMap.set(s.stage, s.count));

  const orgsCount = stageMap.get('orgs_sourced') || 0;
  const contactsCount = stageMap.get('contacts_discovered') || 0;
  const leadsCount = stageMap.get('leads_promoted') || 0;
  
  const futureStagesWithData = funnel?.stages?.filter(s => {
    const knownCurrentIds = ['orgs_sourced', 'contacts_discovered', 'leads_promoted'];
    return !knownCurrentIds.includes(s.stage) && s.count > 0;
  }) || [];

  if (normalizedStatus === 'queued' || normalizedStatus === 'run_requested' || normalizedStatus === 'pending') {
    return {
      statement: 'Execution queued — awaiting worker pickup',
      level: 'info',
    };
  }

  if (normalizedStatus === 'running' || normalizedStatus === 'in_progress') {
    const phaseCopy = normalizedPhase ? getRunningPhaseCopy(normalizedPhase) : 'processing';
    return {
      statement: `Execution running — ${phaseCopy}`,
      level: 'info',
    };
  }

  if (normalizedStatus === 'completed' || normalizedStatus === 'success' || normalizedStatus === 'succeeded') {
    if (futureStagesWithData.length > 0) {
      const lastFutureStage = futureStagesWithData[futureStagesWithData.length - 1];
      return {
        statement: `Execution completed — activity observed beyond lead promotion`,
        level: 'success',
      };
    }
    
    if (leadsCount > 0) {
      return {
        statement: `Execution completed — ${leadsCount.toLocaleString()} leads promoted`,
        level: 'success',
      };
    }
    if (contactsCount > 0 && leadsCount === 0) {
      return {
        statement: 'Execution completed — contacts discovered, no promotable leads',
        level: 'warning',
      };
    }
    if (orgsCount > 0 && contactsCount === 0) {
      return {
        statement: 'Execution completed — organizations sourced, no contacts found',
        level: 'warning',
      };
    }
    if (orgsCount === 0) {
      return {
        statement: 'Execution completed — no matching organizations found',
        level: 'warning',
      };
    }
    return {
      statement: 'Execution completed',
      level: 'success',
    };
  }

  if (normalizedStatus === 'failed' || normalizedStatus === 'error') {
    const failureCopy = normalizedPhase ? getFailurePhaseCopy(normalizedPhase) : 'see timeline for details';
    return {
      statement: `Execution failed — ${failureCopy}`,
      level: 'error',
    };
  }

  if (normalizedStatus === 'partial' || normalizedStatus === 'partial_success') {
    return {
      statement: 'Execution partially completed — some stages had issues',
      level: 'warning',
    };
  }

  return {
    statement: `Status: ${runStatus}`,
    level: 'neutral',
  };
}

function getHealthStyles(level: HealthLevel): { bg: string; text: string; icon: string } {
  switch (level) {
    case 'success':
      return {
        bg: NSD_COLORS.semantic.positive.bg,
        text: NSD_COLORS.semantic.positive.text,
        icon: 'check',
      };
    case 'warning':
      return {
        bg: NSD_COLORS.semantic.attention.bg,
        text: NSD_COLORS.semantic.attention.text,
        icon: 'alert',
      };
    case 'error':
      return {
        bg: NSD_COLORS.semantic.critical.bg,
        text: NSD_COLORS.semantic.critical.text,
        icon: 'error',
      };
    case 'info':
      return {
        bg: NSD_COLORS.semantic.info.bg,
        text: NSD_COLORS.semantic.info.text,
        icon: 'info',
      };
    default:
      return {
        bg: NSD_COLORS.semantic.muted.bg,
        text: NSD_COLORS.semantic.muted.text,
        icon: 'circle',
      };
  }
}

function HealthIcon({ level }: { level: HealthLevel }) {
  const color = getHealthStyles(level).text;
  const size = 16;

  if (level === 'success') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.5" />
        <path d="M5 8L7 10L11 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (level === 'warning') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <path d="M8 2L14 13H2L8 2Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 6V9M8 11V11.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (level === 'error') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.5" />
        <path d="M5 5L11 11M11 5L5 11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (level === 'info') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.5" />
        <circle cx="8" cy="8" r="3" fill={color} />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
    </svg>
  );
}

export function ExecutionHealthIndicator({
  runStatus,
  runPhase,
  funnel,
  noRuns,
}: ExecutionHealthIndicatorProps) {
  const { statement, level } = deriveHealthStatement(runStatus, runPhase, funnel, noRuns);
  const styles = getHealthStyles(level);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        backgroundColor: styles.bg,
        borderRadius: NSD_RADIUS.md,
      }}
    >
      <HealthIcon level={level} />
      <span
        style={{
          fontSize: '14px',
          fontWeight: 500,
          fontFamily: NSD_TYPOGRAPHY.fontBody,
          color: styles.text,
        }}
      >
        {statement}
      </span>
    </div>
  );
}

export default ExecutionHealthIndicator;
