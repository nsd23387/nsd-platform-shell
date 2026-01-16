'use client';

/**
 * ActiveStageFocusPanel Component
 * 
 * Live-updating panel that answers "What is the system doing right now?"
 * Displays human-readable status sentence derived from observed state only.
 * 
 * GOVERNANCE CONSTRAINTS:
 * - Derived from observed execution state only
 * - No speculation or inferred intent
 * - Updates automatically via polling
 * - Read-only display
 * 
 * Examples:
 * - "Sourcing organizations based on ICP"
 * - "Discovering contacts across 55 organizations"
 * - "Qualifying contacts for lead promotion"
 * - "Execution completed"
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import type { ObservabilityFunnel } from '../../types/campaign';

interface ActiveStageFocusPanelProps {
  runStatus: string | null;
  runPhase: string | null;
  funnel: ObservabilityFunnel | null;
  noRuns: boolean;
  isPolling?: boolean;
}

function deriveActiveStageCopy(
  runStatus: string | null,
  runPhase: string | null,
  funnel: ObservabilityFunnel | null,
  noRuns: boolean
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

  if (normalizedStatus === 'running' || normalizedStatus === 'in_progress') {
    if (normalizedPhase.includes('org') || normalizedPhase.includes('source')) {
      return {
        headline: 'Sourcing organizations',
        description: 'Identifying organizations that match your ICP criteria.',
        isActive: true,
      };
    }
    if (normalizedPhase.includes('contact') || normalizedPhase.includes('discover')) {
      const orgsText = orgsCount > 0 ? `across ${orgsCount.toLocaleString()} organizations` : '';
      return {
        headline: 'Discovering contacts',
        description: `Scanning ${orgsText} for contacts matching role criteria.`.trim(),
        isActive: true,
      };
    }
    if (normalizedPhase.includes('lead') || normalizedPhase.includes('promot') || normalizedPhase.includes('qualif')) {
      const contactsText = contactsCount > 0 ? `${contactsCount.toLocaleString()} contacts` : 'contacts';
      return {
        headline: 'Qualifying contacts',
        description: `Evaluating ${contactsText} for lead promotion eligibility.`,
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
    if (leadsCount > 0) {
      return {
        headline: 'Execution completed',
        description: `Successfully promoted ${leadsCount.toLocaleString()} leads from ${contactsCount.toLocaleString()} contacts.`,
        isActive: false,
      };
    }
    if (contactsCount > 0) {
      return {
        headline: 'Execution completed',
        description: `${contactsCount.toLocaleString()} contacts discovered. No contacts qualified for lead promotion.`,
        isActive: false,
      };
    }
    if (orgsCount > 0) {
      return {
        headline: 'Execution completed',
        description: `${orgsCount.toLocaleString()} organizations sourced. No contacts discovered.`,
        isActive: false,
      };
    }
    return {
      headline: 'Execution completed',
      description: 'No results produced. Review ICP criteria to improve targeting.',
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
}: ActiveStageFocusPanelProps) {
  const { headline, description, isActive } = deriveActiveStageCopy(
    runStatus,
    runPhase,
    funnel,
    noRuns
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
                color: textColor,
                opacity: 0.7,
                fontStyle: 'italic',
              }}
            >
              Auto-refreshing
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
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.9); }
        }
      `}</style>
    </div>
  );
}

export default ActiveStageFocusPanel;
