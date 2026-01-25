/**
 * ResultsSection Component
 * 
 * DECISION-FIRST UX:
 * Phase-aware results display.
 * Only renders after first execution has started.
 * 
 * PRINCIPLES:
 * - Does NOT render at all until a run exists
 * - Appears only after execution has started
 * - Uses neutral empty states (informational, not error)
 * - No pre-rendering of future states
 * - No backend jargon
 */

'use client';

import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SHADOWS } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

interface FunnelMetrics {
  organizations: number;
  contacts: number;
  leads: number;
  emailsSent: number;
  opens: number;
  replies: number;
}

interface ResultsSectionProps {
  /** Whether execution has started */
  hasExecutionStarted: boolean;
  /** Whether execution is complete */
  isExecutionComplete: boolean;
  /** Funnel metrics */
  metrics: FunnelMetrics;
  /** Reply rate (calculated or from backend) */
  replyRate?: number;
  /** Open rate */
  openRate?: number;
  /** Optional: Run outcome type */
  outcomeType?: string;
  /** Optional: Outcome description */
  outcomeDescription?: string;
}

function MetricCard({ 
  label, 
  value, 
  subLabel,
  icon,
  color = NSD_COLORS.primary,
}: { 
  label: string; 
  value: number | string;
  subLabel?: string;
  icon: string;
  color?: string;
}) {
  return (
    <div style={{
      backgroundColor: NSD_COLORS.surface,
      borderRadius: NSD_RADIUS.md,
      padding: '16px',
      border: `1px solid ${NSD_COLORS.border.light}`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
      }}>
        <Icon name={icon as any} size={14} color={NSD_COLORS.text.muted} />
        <span style={{
          fontSize: '11px',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: NSD_COLORS.text.muted,
        }}>
          {label}
        </span>
      </div>
      <div style={{
        fontSize: '24px',
        fontWeight: 700,
        color: color,
        fontFamily: NSD_TYPOGRAPHY.fontDisplay,
      }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {subLabel && (
        <div style={{
          fontSize: '12px',
          color: NSD_COLORS.text.muted,
          marginTop: '4px',
        }}>
          {subLabel}
        </div>
      )}
    </div>
  );
}

function FunnelBar({
  label,
  value,
  maxValue,
  color,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}) {
  const percentage = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '4px',
      }}>
        <span style={{
          fontSize: '13px',
          color: NSD_COLORS.text.secondary,
        }}>
          {label}
        </span>
        <span style={{
          fontSize: '13px',
          fontWeight: 600,
          color: NSD_COLORS.text.primary,
        }}>
          {value.toLocaleString()}
        </span>
      </div>
      <div style={{
        height: '8px',
        backgroundColor: NSD_COLORS.semantic.muted.bg,
        borderRadius: NSD_RADIUS.full,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          backgroundColor: color,
          borderRadius: NSD_RADIUS.full,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}

export function ResultsSection({
  hasExecutionStarted,
  isExecutionComplete,
  metrics,
  replyRate,
  openRate,
  outcomeType,
  outcomeDescription,
}: ResultsSectionProps) {
  // DO NOT RENDER until execution has started
  if (!hasExecutionStarted) {
    return null;
  }

  const calculatedReplyRate = replyRate ?? (metrics.emailsSent > 0 
    ? (metrics.replies / metrics.emailsSent) * 100 
    : 0);
  
  const calculatedOpenRate = openRate ?? (metrics.emailsSent > 0 
    ? (metrics.opens / metrics.emailsSent) * 100 
    : 0);

  const maxFunnelValue = Math.max(
    metrics.organizations,
    metrics.contacts,
    metrics.leads,
    metrics.emailsSent,
  );

  // Check if we have any meaningful data
  const hasData = metrics.organizations > 0 || metrics.contacts > 0 || 
                  metrics.leads > 0 || metrics.emailsSent > 0;

  // Special handling for valid empty observation
  const isValidEmpty = outcomeType === 'VALID_EMPTY_OBSERVATION';

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: NSD_RADIUS.lg,
      border: '1px solid #E5E7EB',
      borderLeft: `4px solid ${NSD_COLORS.violet.base}`,
      padding: '24px',
      marginBottom: '24px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: `1px solid ${NSD_COLORS.border.light}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: NSD_RADIUS.md,
            backgroundColor: isExecutionComplete 
              ? NSD_COLORS.semantic.positive.bg 
              : NSD_COLORS.semantic.active.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon 
              name={isExecutionComplete ? 'check' : 'chart'} 
              size={18} 
              color={isExecutionComplete 
                ? NSD_COLORS.semantic.positive.text 
                : NSD_COLORS.semantic.active.text} 
            />
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: NSD_COLORS.text.primary,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            }}>
              Execution Results
            </h3>
            <p style={{
              margin: '2px 0 0 0',
              fontSize: '13px',
              color: NSD_COLORS.text.secondary,
            }}>
              {isExecutionComplete 
                ? 'Campaign execution completed' 
                : 'Results updating as execution progresses'}
            </p>
          </div>
        </div>
        {isExecutionComplete && (
          <span style={{
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 500,
            backgroundColor: NSD_COLORS.semantic.positive.bg,
            color: NSD_COLORS.semantic.positive.text,
            borderRadius: NSD_RADIUS.full,
          }}>
            Complete
          </span>
        )}
      </div>

      {/* Valid Empty Observation Info */}
      {isValidEmpty && (
        <div style={{
          padding: '16px',
          backgroundColor: NSD_COLORS.semantic.info.bg,
          borderRadius: NSD_RADIUS.md,
          marginBottom: '20px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}>
            <Icon name="info" size={18} color={NSD_COLORS.semantic.info.text} />
            <div>
              <p style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 500,
                color: NSD_COLORS.semantic.info.text,
              }}>
                No matching results found
              </p>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '13px',
                color: NSD_COLORS.semantic.info.text,
                opacity: 0.9,
              }}>
                {outcomeDescription || 
                  'The campaign executed successfully but found no organizations or contacts matching your criteria. This is a valid outcome reflecting current market reality.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Neutral empty state when no data yet (not an error) */}
      {!hasData && !isValidEmpty && (
        <div style={{
          padding: '32px',
          textAlign: 'center',
          backgroundColor: NSD_COLORS.semantic.muted.bg,
          borderRadius: NSD_RADIUS.md,
        }}>
          <Icon name="clock" size={32} color={NSD_COLORS.text.muted} />
          <p style={{
            margin: '12px 0 0 0',
            fontSize: '14px',
            color: NSD_COLORS.text.secondary,
          }}>
            Results will appear as execution progresses
          </p>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '13px',
            color: NSD_COLORS.text.muted,
          }}>
            Metrics update in real-time during campaign execution
          </p>
        </div>
      )}

      {/* Results Display */}
      {hasData && (
        <>
          {/* Key Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}>
            <MetricCard 
              label="Organizations" 
              value={metrics.organizations} 
              icon="building"
              color={NSD_COLORS.primary}
            />
            <MetricCard 
              label="Contacts" 
              value={metrics.contacts} 
              icon="users"
              color={NSD_COLORS.primary}
            />
            <MetricCard 
              label="Leads" 
              value={metrics.leads} 
              icon="trending"
              color={NSD_COLORS.semantic.positive.text}
            />
            <MetricCard 
              label="Emails Sent" 
              value={metrics.emailsSent} 
              icon="mail"
              color={NSD_COLORS.semantic.info.text}
            />
          </div>

          {/* Funnel Visualization */}
          <div style={{
            backgroundColor: NSD_COLORS.surface,
            borderRadius: NSD_RADIUS.md,
            padding: '16px',
            marginBottom: '20px',
          }}>
            <h4 style={{
              margin: '0 0 16px 0',
              fontSize: '13px',
              fontWeight: 600,
              color: NSD_COLORS.text.secondary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Pipeline Funnel
            </h4>
            <FunnelBar 
              label="Organizations" 
              value={metrics.organizations} 
              maxValue={maxFunnelValue}
              color={NSD_COLORS.primary}
            />
            <FunnelBar 
              label="Contacts" 
              value={metrics.contacts} 
              maxValue={maxFunnelValue}
              color="#5C6BC0"
            />
            <FunnelBar 
              label="Leads" 
              value={metrics.leads} 
              maxValue={maxFunnelValue}
              color="#26A69A"
            />
            <FunnelBar 
              label="Emails Sent" 
              value={metrics.emailsSent} 
              maxValue={maxFunnelValue}
              color="#42A5F5"
            />
          </div>

          {/* Engagement Metrics (only if emails sent) */}
          {metrics.emailsSent > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              <MetricCard 
                label="Opens" 
                value={metrics.opens} 
                subLabel={`${calculatedOpenRate.toFixed(1)}% open rate`}
                icon="eye"
                color={NSD_COLORS.semantic.info.text}
              />
              <MetricCard 
                label="Replies" 
                value={metrics.replies} 
                subLabel={`${calculatedReplyRate.toFixed(1)}% reply rate`}
                icon="chat"
                color={NSD_COLORS.semantic.positive.text}
              />
              <MetricCard 
                label="Reply Rate" 
                value={`${calculatedReplyRate.toFixed(1)}%`}
                icon="trending"
                color={calculatedReplyRate > 5 ? NSD_COLORS.semantic.positive.text : NSD_COLORS.text.secondary}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ResultsSection;
