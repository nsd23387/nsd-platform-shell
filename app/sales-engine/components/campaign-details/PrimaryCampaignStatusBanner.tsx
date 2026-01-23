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
 * STATES:
 * - Draft: Campaign is being configured
 * - Pending Approval: Configured but awaiting governance
 * - Approved: Ready to execute
 * - Running: Execution in progress
 * - Completed: Execution finished successfully
 * - Failed: Execution encountered an error
 */

'use client';

import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SHADOWS } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { formatEtDate } from '../../lib/time';

/**
 * Campaign phase derived from governance and execution state.
 * This is the canonical campaign state for display.
 */
export type CampaignPhase = 
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'running'
  | 'completed'
  | 'failed';

/**
 * Status configuration for each phase.
 */
interface PhaseConfig {
  label: string;
  description: string;
  icon: string;
  color: { bg: string; text: string; border: string };
}

const PHASE_CONFIG: Record<CampaignPhase, PhaseConfig> = {
  draft: {
    label: 'Draft',
    description: 'Campaign is being configured and is not yet ready for review.',
    icon: 'edit',
    color: NSD_COLORS.semantic.muted,
  },
  pending_approval: {
    label: 'Pending Approval',
    description: 'Campaign is fully configured but cannot execute until governance approval is granted.',
    icon: 'clock',
    color: NSD_COLORS.semantic.attention,
  },
  approved: {
    label: 'Approved',
    description: 'Campaign is approved and ready to execute when you choose.',
    icon: 'check',
    color: NSD_COLORS.semantic.info,
  },
  running: {
    label: 'Running',
    description: 'Execution is in progress. Results will appear as stages complete.',
    icon: 'refresh',
    color: NSD_COLORS.semantic.active,
  },
  completed: {
    label: 'Completed',
    description: 'Execution has finished. Review results and insights below.',
    icon: 'check',
    color: NSD_COLORS.semantic.positive,
  },
  failed: {
    label: 'Needs Attention',
    description: 'Execution encountered an issue that may require review.',
    icon: 'warning',
    color: NSD_COLORS.semantic.critical,
  },
};

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
}

/**
 * Derive campaign phase from governance status and execution state.
 * This is the canonical mapping function.
 */
export function deriveCampaignPhase(
  governanceStatus: string,
  hasRun: boolean,
  runStatus?: string | null
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
}: PrimaryCampaignStatusBannerProps) {
  const config = PHASE_CONFIG[phase];

  return (
    <div style={{
      backgroundColor: config.color.bg,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${config.color.border}`,
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
            <Icon name={config.icon as any} size={20} color={config.color.text} />
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
                color: config.color.text,
                opacity: 0.8,
              }}>
                Status
              </span>
            </div>
            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              fontWeight: 600,
              color: config.color.text,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            }}>
              {config.label}
            </h2>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: config.color.text,
              opacity: 0.9,
              maxWidth: '500px',
            }}>
              {customDescription || config.description}
            </p>
            {/* Show current stage when running */}
            {phase === 'running' && currentStage && (
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '13px',
                color: config.color.text,
                fontWeight: 500,
              }}>
                Current stage: {currentStage}
              </p>
            )}
          </div>
        </div>

        {/* Timestamps */}
        <div style={{
          textAlign: 'right',
          fontSize: '12px',
          color: config.color.text,
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
