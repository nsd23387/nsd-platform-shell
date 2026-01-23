/**
 * CampaignOutcomeSummary Component
 * 
 * POST-EXECUTION ONLY:
 * Lightweight outcome summary card that appears after execution ends.
 * 
 * PRINCIPLES:
 * - Only renders after execution completes
 * - Narrative summary, not a dashboard
 * - Plain-English descriptions
 * - Neutral tone unless truly exceptional
 * 
 * CONTENT (when available):
 * - Organizations observed
 * - Contacts discovered
 * - Leads promoted
 * - Conversion rate
 * - Primary blocking or termination reason (if applicable)
 */

'use client';

import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SHADOWS } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { getOutcomeDisplay } from '../../lib/status-copy';

interface OutcomeMetrics {
  organizations: number;
  contacts: number;
  leads: number;
  emailsSent: number;
  opens?: number;
  replies?: number;
}

interface CampaignOutcomeSummaryProps {
  /** Whether execution has completed */
  hasExecutionCompleted: boolean;
  /** Outcome type from backend */
  outcomeType?: string;
  /** Termination reason (if stopped/failed) */
  terminationReason?: string;
  /** Metrics from execution */
  metrics: OutcomeMetrics;
  /** Execution duration in seconds */
  durationSeconds?: number;
  /** Timestamp when execution completed */
  completedAt?: string;
}

/**
 * Format duration for display
 */
function formatDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return `${mins} minute${mins !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

/**
 * Calculate conversion rate
 */
function calculateConversionRate(metrics: OutcomeMetrics): number | null {
  if (metrics.organizations === 0) return null;
  return (metrics.leads / metrics.organizations) * 100;
}

function MetricBlock({ 
  label, 
  value, 
  subValue,
}: { 
  label: string; 
  value: string | number;
  subValue?: string;
}) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '12px',
    }}>
      <div style={{
        fontSize: '24px',
        fontWeight: 700,
        color: NSD_COLORS.primary,
        fontFamily: NSD_TYPOGRAPHY.fontDisplay,
        marginBottom: '4px',
      }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{
        fontSize: '12px',
        fontWeight: 500,
        color: NSD_COLORS.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {label}
      </div>
      {subValue && (
        <div style={{
          fontSize: '11px',
          color: NSD_COLORS.text.muted,
          marginTop: '2px',
        }}>
          {subValue}
        </div>
      )}
    </div>
  );
}

export function CampaignOutcomeSummary({
  hasExecutionCompleted,
  outcomeType,
  terminationReason,
  metrics,
  durationSeconds,
  completedAt,
}: CampaignOutcomeSummaryProps) {
  // DO NOT RENDER unless execution has completed
  if (!hasExecutionCompleted) {
    return null;
  }

  const outcomeDisplay = getOutcomeDisplay(outcomeType);
  const conversionRate = calculateConversionRate(metrics);
  const duration = formatDuration(durationSeconds);

  // Determine header styling based on outcome
  const getHeaderConfig = () => {
    if (!outcomeDisplay) {
      return {
        bg: NSD_COLORS.semantic.positive.bg,
        text: NSD_COLORS.semantic.positive.text,
        icon: 'check' as const,
      };
    }
    switch (outcomeDisplay.tone) {
      case 'attention':
        return {
          bg: NSD_COLORS.semantic.attention.bg,
          text: NSD_COLORS.semantic.attention.text,
          icon: 'warning' as const,
        };
      case 'critical':
        return {
          bg: NSD_COLORS.semantic.critical.bg,
          text: NSD_COLORS.semantic.critical.text,
          icon: 'warning' as const,
        };
      case 'neutral':
        return {
          bg: NSD_COLORS.semantic.info.bg,
          text: NSD_COLORS.semantic.info.text,
          icon: 'info' as const,
        };
      default:
        return {
          bg: NSD_COLORS.semantic.positive.bg,
          text: NSD_COLORS.semantic.positive.text,
          icon: 'check' as const,
        };
    }
  };

  const headerConfig = getHeaderConfig();

  return (
    <div style={{
      backgroundColor: NSD_COLORS.background,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${NSD_COLORS.border.light}`,
      marginBottom: '24px',
      boxShadow: NSD_SHADOWS.sm,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        backgroundColor: headerConfig.bg,
        borderBottom: `1px solid ${headerConfig.text}20`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: NSD_RADIUS.md,
            backgroundColor: 'rgba(255,255,255,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name={headerConfig.icon} size={20} color={headerConfig.text} />
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: headerConfig.text,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            }}>
              {outcomeDisplay?.label || 'Execution Complete'}
            </h3>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: headerConfig.text,
              opacity: 0.9,
            }}>
              {outcomeDisplay?.description || 'Campaign execution has finished.'}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{
        padding: '20px 24px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
          paddingBottom: '16px',
          marginBottom: '16px',
        }}>
          <MetricBlock 
            label="Organizations" 
            value={metrics.organizations} 
          />
          <MetricBlock 
            label="Contacts" 
            value={metrics.contacts} 
          />
          <MetricBlock 
            label="Leads" 
            value={metrics.leads} 
          />
          <MetricBlock 
            label="Conversion" 
            value={conversionRate !== null ? `${conversionRate.toFixed(1)}%` : '—'} 
            subValue="org → lead"
          />
        </div>

        {/* Email metrics if available */}
        {metrics.emailsSent > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            borderBottom: `1px solid ${NSD_COLORS.border.light}`,
            paddingBottom: '16px',
            marginBottom: '16px',
          }}>
            <MetricBlock 
              label="Emails Sent" 
              value={metrics.emailsSent} 
            />
            <MetricBlock 
              label="Opens" 
              value={metrics.opens ?? 0} 
              subValue={metrics.emailsSent > 0 ? `${((metrics.opens ?? 0) / metrics.emailsSent * 100).toFixed(1)}% rate` : undefined}
            />
            <MetricBlock 
              label="Replies" 
              value={metrics.replies ?? 0} 
              subValue={metrics.emailsSent > 0 ? `${((metrics.replies ?? 0) / metrics.emailsSent * 100).toFixed(1)}% rate` : undefined}
            />
          </div>
        )}

        {/* Footer info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{
            fontSize: '12px',
            color: NSD_COLORS.text.muted,
          }}>
            {duration && (
              <span>Duration: {duration}</span>
            )}
            {duration && completedAt && <span> • </span>}
            {completedAt && (
              <span>Completed: {new Date(completedAt).toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* Termination reason if applicable */}
        {terminationReason && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            backgroundColor: NSD_COLORS.semantic.muted.bg,
            borderRadius: NSD_RADIUS.md,
          }}>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: NSD_COLORS.text.secondary,
            }}>
              <strong>Note:</strong> {terminationReason}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CampaignOutcomeSummary;
