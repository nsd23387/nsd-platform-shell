'use client';

/**
 * ExecutionHealthIndicator Component
 * 
 * Single sentence health line visible without scrolling.
 * Reconciles status + results into one clear statement.
 * 
 * GOVERNANCE CONSTRAINTS:
 * - Exactly one sentence
 * - Must reconcile status + results
 * - No alarmist language
 * - Read-only display
 * 
 * Examples:
 * - "Execution running — discovering contacts"
 * - "Execution completed — contacts discovered, no promotable leads"
 * - "Execution failed — adapter error during contact sourcing"
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import type { ObservabilityFunnel } from '../../types/campaign';

interface ExecutionHealthIndicatorProps {
  runStatus: string | null;
  runPhase: string | null;
  funnel: ObservabilityFunnel | null;
  noRuns: boolean;
}

type HealthLevel = 'success' | 'warning' | 'error' | 'info' | 'neutral';

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

  const orgsCount = funnel?.stages?.find(s => s.stage === 'orgs_sourced')?.count || 0;
  const contactsCount = funnel?.stages?.find(s => s.stage === 'contacts_discovered')?.count || 0;
  const leadsCount = funnel?.stages?.find(s => s.stage === 'leads_promoted')?.count || 0;

  if (normalizedStatus === 'queued' || normalizedStatus === 'run_requested' || normalizedStatus === 'pending') {
    return {
      statement: 'Execution queued — awaiting worker pickup',
      level: 'info',
    };
  }

  if (normalizedStatus === 'running' || normalizedStatus === 'in_progress') {
    if (normalizedPhase.includes('org') || normalizedPhase.includes('source')) {
      return {
        statement: 'Execution running — sourcing organizations',
        level: 'info',
      };
    }
    if (normalizedPhase.includes('contact') || normalizedPhase.includes('discover')) {
      return {
        statement: 'Execution running — discovering contacts',
        level: 'info',
      };
    }
    if (normalizedPhase.includes('lead') || normalizedPhase.includes('promot')) {
      return {
        statement: 'Execution running — qualifying contacts for promotion',
        level: 'info',
      };
    }
    return {
      statement: 'Execution running',
      level: 'info',
    };
  }

  if (normalizedStatus === 'completed' || normalizedStatus === 'success' || normalizedStatus === 'succeeded') {
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
    if (normalizedPhase.includes('org') || normalizedPhase.includes('source')) {
      return {
        statement: 'Execution failed — error during organization sourcing',
        level: 'error',
      };
    }
    if (normalizedPhase.includes('contact') || normalizedPhase.includes('discover')) {
      return {
        statement: 'Execution failed — error during contact discovery',
        level: 'error',
      };
    }
    return {
      statement: 'Execution failed — see timeline for details',
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
      <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.5" />
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
        borderRadius: NSD_RADIUS.full,
      }}
    >
      <HealthIcon level={level} />
      <span
        style={{
          fontSize: '13px',
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
