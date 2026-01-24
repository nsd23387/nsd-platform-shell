/**
 * PrimaryCampaignStatusBanner Component
 * 
 * DECISION-FIRST UX:
 * Single canonical campaign status at the top of the page.
 * This is the ONE source of truth for campaign state.
 * 
 * PRINCIPLES:
 * - ONE status, not duplicated across the page
 * - Plain-English explanation of what the state means
 * - Timestamp metadata for context
 * - No backend jargon (no "null", "undefined", etc.)
 * 
 * USES CANONICAL STATUS COPY from lib/status-copy.ts
 */

'use client';

import { NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { formatEtDate } from '../../lib/time';
import { 
  STATUS_COPY, 
  type CampaignStatusKey,
  deriveStatusKey,
} from '../../lib/status-copy';

/**
 * Campaign phase derived from governance and execution state.
 * Maps to CampaignStatusKey for canonical copy.
 */
export type CampaignPhase = 
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'running'
  | 'completed'
  | 'stopped'
  | 'failed';

/**
 * Map CampaignPhase to CampaignStatusKey
 */
function phaseToStatusKey(phase: CampaignPhase): CampaignStatusKey {
  const mapping: Record<CampaignPhase, CampaignStatusKey> = {
    draft: 'DRAFT',
    pending_approval: 'PENDING_REVIEW',
    approved: 'RUNNABLE',
    running: 'RUNNING',
    completed: 'COMPLETED',
    stopped: 'STOPPED',
    failed: 'FAILED',
  };
  return mapping[phase];
}

/**
 * Get icon for phase
 */
function getPhaseIcon(phase: CampaignPhase): string {
  const icons: Record<CampaignPhase, string> = {
    draft: 'edit',
    pending_approval: 'clock',
    approved: 'check',
    running: 'refresh',
    completed: 'check',
    stopped: 'warning',
    failed: 'warning',
  };
  return icons[phase];
}

interface PrimaryCampaignStatusBannerProps {
  /** Campaign phase to display */
  phase: CampaignPhase;
  /** Campaign creation timestamp */
  createdAt: string;
  /** Campaign last updated timestamp */
  updatedAt: string;
  /** Optional custom description override */
  customDescription?: string;
  /** Optional current execution stage (only shown when running) */
  currentStage?: string;
  /** Optional termination reason (for stopped/failed states) */
  terminationReason?: string;
}

/**
 * Derive campaign phase from governance status and execution state.
 * This is the canonical mapping function.
 */
export function deriveCampaignPhase(
  governanceStatus: string,
  hasRun: boolean,
  runStatus?: string | null,
  terminationReason?: string | null
): CampaignPhase {
  // If there's an active or completed run, use execution state
  if (hasRun && runStatus) {
    switch (runStatus) {
      case 'running':
      case 'queued':
        return 'running';
      case 'completed':
        return 'completed';
      case 'failed':
        // Distinguish between stopped (intentional) and failed (system error)
        if (terminationReason) {
          const reason = terminationReason.toLowerCase();
          if (
            reason.includes('stopped') ||
            reason.includes('paused') ||
            reason.includes('safety') ||
            reason.includes('user') ||
            reason.includes('manual')
          ) {
            return 'stopped';
          }
        }
        return 'failed';
    }
  }

  // Otherwise, use governance state
  switch (governanceStatus?.toUpperCase()) {
    case 'DRAFT':
      return 'draft';
    case 'PENDING_REVIEW':
      return 'pending_approval';
    case 'RUNNABLE':
    case 'APPROVED':
      return 'approved';
    case 'RUNNING':
      return 'running';
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
      return 'failed';
    default:
      return 'draft';
  }
}

export function PrimaryCampaignStatusBanner({
  phase,
  createdAt,
  updatedAt,
  customDescription,
  currentStage,
  terminationReason,
}: PrimaryCampaignStatusBannerProps) {
  // Get canonical copy from status-copy.ts
  const statusKey = phaseToStatusKey(phase);
  const statusCopy = STATUS_COPY[statusKey];
  const icon = getPhaseIcon(phase);

  // Phase-aware styling for visual weight
  const isActivePhase = phase === 'running';
  const isTerminalPhase = phase === 'completed' || phase === 'stopped' || phase === 'failed';

  return (
    <div style={{
      backgroundColor: statusCopy.color.bg,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${statusCopy.color.border}`,
      padding: 'clamp(16px, 4vw, 28px) clamp(16px, 4vw, 32px)',
      marginBottom: 'clamp(20px, 4vw, 32px)',
      // Subtle shadow for depth and prominence
      boxShadow: isActivePhase 
        ? `0 4px 12px ${statusCopy.color.border}40`
        : '0 1px 3px rgba(0,0,0,0.04)',
      // Subtle left border accent for visual hierarchy
      borderLeft: `4px solid ${statusCopy.color.text}`,
      transition: 'box-shadow 0.2s ease',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {/* Status Info */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'clamp(12px, 3vw, 20px)', flex: 1 }}>
          <div style={{
            width: 'clamp(36px, 8vw, 48px)',
            height: 'clamp(36px, 8vw, 48px)',
            borderRadius: NSD_RADIUS.md,
            backgroundColor: 'rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            // Subtle pulse effect for running state
            animation: isActivePhase ? 'pulse 2s ease-in-out infinite' : undefined,
          }}>
            <Icon name={icon as any} size={20} color={statusCopy.color.text} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '6px',
            }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.75px',
                color: statusCopy.color.text,
                opacity: 0.7,
              }}>
                Campaign Status
              </span>
            </div>
            <h2 style={{
              margin: '0 0 10px 0',
              fontSize: 'clamp(20px, 5vw, 26px)',
              fontWeight: 700,
              color: statusCopy.color.text,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              wordBreak: 'break-word',
            }}>
              {statusCopy.label}
            </h2>
            <p style={{
              margin: 0,
              fontSize: 'clamp(13px, 3vw, 15px)',
              lineHeight: 1.5,
              color: statusCopy.color.text,
              opacity: 0.85,
              wordBreak: 'break-word',
            }}>
              {customDescription || statusCopy.explanation}
            </p>
            {/* Show current stage when running */}
            {phase === 'running' && currentStage && (
              <div style={{
                marginTop: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'rgba(255,255,255,0.4)',
                borderRadius: NSD_RADIUS.full,
              }}>
                <Icon name="play" size={12} color={statusCopy.color.text} />
                <span style={{
                  fontSize: '13px',
                  color: statusCopy.color.text,
                  fontWeight: 500,
                }}>
                  {currentStage}
                </span>
              </div>
            )}
            {/* Show termination reason for stopped/failed */}
            {(phase === 'stopped' || phase === 'failed') && terminationReason && (
              <p style={{
                margin: '12px 0 0 0',
                fontSize: '13px',
                color: statusCopy.color.text,
                opacity: 0.8,
                fontStyle: 'italic',
              }}>
                {terminationReason}
              </p>
            )}
          </div>
        </div>

        {/* Timestamps - visually de-emphasized, shown below on mobile */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 16px',
          fontSize: '11px',
          color: statusCopy.color.text,
          opacity: 0.6,
          lineHeight: 1.4,
          paddingTop: '8px',
          borderTop: `1px solid ${statusCopy.color.border}40`,
        }}>
          <span>Created {formatEtDate(createdAt)}</span>
          <span>Updated {formatEtDate(updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}

export default PrimaryCampaignStatusBanner;
