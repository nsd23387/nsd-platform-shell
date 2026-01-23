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

  return (
    <div style={{
      backgroundColor: statusCopy.color.bg,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${statusCopy.color.border}`,
      padding: '20px 24px',
      marginBottom: '24px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
      }}>
        {/* Status Info */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: NSD_RADIUS.md,
            backgroundColor: 'rgba(255,255,255,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name={icon as any} size={20} color={statusCopy.color.text} />
          </div>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px',
            }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: statusCopy.color.text,
                opacity: 0.8,
              }}>
                Status
              </span>
            </div>
            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              fontWeight: 600,
              color: statusCopy.color.text,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            }}>
              {statusCopy.label}
            </h2>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: statusCopy.color.text,
              opacity: 0.9,
              maxWidth: '500px',
            }}>
              {customDescription || statusCopy.explanation}
            </p>
            {/* Show current stage when running */}
            {phase === 'running' && currentStage && (
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '13px',
                color: statusCopy.color.text,
                fontWeight: 500,
              }}>
                Current stage: {currentStage}
              </p>
            )}
            {/* Show termination reason for stopped/failed */}
            {(phase === 'stopped' || phase === 'failed') && terminationReason && (
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '13px',
                color: statusCopy.color.text,
                fontStyle: 'italic',
              }}>
                Reason: {terminationReason}
              </p>
            )}
          </div>
        </div>

        {/* Timestamps */}
        <div style={{
          textAlign: 'right',
          fontSize: '12px',
          color: statusCopy.color.text,
          opacity: 0.7,
        }}>
          <div>Created: {formatEtDate(createdAt)}</div>
          <div style={{ marginTop: '4px' }}>Updated: {formatEtDate(updatedAt)}</div>
        </div>
      </div>
    </div>
  );
}

export default PrimaryCampaignStatusBanner;
