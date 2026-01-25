/**
 * PipelineFunnelTable Component
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * INVARIANT:
 * Funnel scope represents business value and MUST NOT depend on execution.
 * Execution metrics are observational only.
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Displays the campaign pipeline funnel with stage counts and confidence.
 * 
 * DUAL-LAYER DISPLAY:
 * 1. SCOPE (Primary): "X eligible" - who the campaign CAN reach
 * 2. EXECUTION (Secondary): "Y processed this run" - execution progress
 * 
 * OBSERVABILITY GOVERNANCE:
 * - Read-only display
 * - No local math - counts come directly from backend
 * - Confidence badge required for each stage
 * - Tooltips explain each stage
 * - No execution control, retries, or overrides
 * - Scope MUST populate even if execution has never run
 * 
 * ❌ FORBIDDEN MESSAGING:
 * - "No activity observed yet"
 * - "No data available"  
 * - "Nothing processed"
 * 
 * ✅ REQUIRED MESSAGING:
 * - "X organizations match this campaign"
 * - "Execution has not processed them yet"
 * - "0 processed in this run"
 */

'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { getStageLabel } from '../../lib/api';
import type { PipelineStage, AdapterExecutionStatus, AdapterExecutionDetails } from '../../types/campaign';

/**
 * Extended pipeline stage with blocking reason support.
 */
export interface PipelineStageWithReason extends PipelineStage {
  /** If count is zero, the reason why (for UX clarity) */
  zeroReason?: string;
  /** Whether this stage was blocked/skipped */
  blocked?: boolean;
}

export interface PipelineFunnelTableProps {
  /** Pipeline stages with counts (supports PipelineStageWithReason for zero explanations) */
  stages: (PipelineStage | PipelineStageWithReason)[];
  /** Whether data is loading */
  loading?: boolean;
  /** Error message if any */
  error?: string | null;
  /** Global blocking reason (if entire pipeline is blocked) */
  globalBlockingReason?: string;
}

/**
 * Get confidence badge styling - uses brand-aligned semantic colors.
 */
function getConfidenceBadgeStyle(confidence: 'observed' | 'conditional'): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  if (confidence === 'observed') {
    return {
      ...NSD_COLORS.semantic.positive,
      label: 'Observed',
    };
  } else {
    return {
      ...NSD_COLORS.semantic.attention,
      label: 'Conditional',
    };
  }
}

/**
 * Get adapter status display - explains WHY adapter was or wasn't called.
 * 
 * IMPORTANT: Status must come ONLY from event payload fields:
 * - details.adapterRequestMade
 * - reason
 */
function getAdapterStatusDisplay(status: AdapterExecutionStatus, reason?: string): {
  icon: 'check' | 'info' | 'warning' | 'close';
  bg: string;
  text: string;
  border: string;
  label: string;
  description: string;
} {
  switch (status) {
    case 'called_success':
      return {
        icon: 'check',
        ...NSD_COLORS.semantic.positive,
        label: 'Adapter Called',
        description: reason || 'Adapter returned results successfully',
      };
    case 'called_no_results':
      return {
        icon: 'info',
        ...NSD_COLORS.semantic.muted,
        label: 'No Matches',
        description: reason || 'Adapter called but returned zero results',
      };
    case 'adapter_error':
      return {
        icon: 'warning',
        ...NSD_COLORS.semantic.critical,
        label: 'Adapter Error',
        description: reason || 'Adapter call failed - see error details',
      };
    case 'not_called':
    default:
      return {
        icon: 'info',
        ...NSD_COLORS.semantic.muted,
        label: 'Not Called',
        description: reason || 'Adapter was not invoked for this stage',
      };
  }
}

/**
 * AdapterStatusBadge - Displays adapter execution status with explanation.
 * 
 * Shows:
 * - Whether adapter was called
 * - If not called, WHY (invalid config, gated, etc.)
 * - If called with zero results, "No matches found"
 * - If adapter_error, error state (brand critical color)
 */
function AdapterStatusBadge({ details }: { details: AdapterExecutionDetails }) {
  const display = getAdapterStatusDisplay(details.status, details.reason);
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '10px 14px',
        backgroundColor: display.bg,
        borderRadius: NSD_RADIUS.md,
        border: `1px solid ${display.border}`,
        marginTop: '8px',
      }}
    >
      <Icon name={display.icon} size={16} color={display.text} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: display.text,
            }}
          >
            {details.adapterName ? `${details.adapterName}: ` : ''}{display.label}
          </span>
          {details.resultCount !== undefined && details.status === 'called_success' && (
            <span
              style={{
                fontSize: '11px',
                color: display.text,
                opacity: 0.8,
              }}
            >
              ({details.resultCount} result{details.resultCount !== 1 ? 's' : ''})
            </span>
          )}
        </div>
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            color: display.text,
            opacity: 0.9,
            lineHeight: 1.4,
          }}
        >
          {display.description}
        </p>
      </div>
    </div>
  );
}

/**
 * ConfidenceBadge - Displays confidence level for a stage count.
 */
function ConfidenceBadge({ confidence }: { confidence: 'observed' | 'conditional' }) {
  const style = getConfidenceBadgeStyle(confidence);
  
  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '3px 8px',
        fontSize: '11px',
        fontWeight: 500,
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        borderRadius: NSD_RADIUS.full,
      }}
    >
      {style.label}
    </span>
  );
}

/**
 * StageTooltip - Inline tooltip for stage explanation.
 */
function StageTooltip({ tooltip }: { tooltip: string }) {
  return (
    <span
      title={tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: NSD_COLORS.surface,
        color: NSD_COLORS.text.muted,
        fontSize: '10px',
        cursor: 'help',
        marginLeft: '6px',
      }}
    >
      ?
    </span>
  );
}

/**
 * ZeroValueExplanation - Displays why a stage count is zero.
 * 
 * CRITICAL UX RULE: Never show unexplained zeros.
 * If count is zero, explain why (blocked, skipped, not reached, etc.)
 */
function ZeroValueExplanation({ reason, blocked }: { reason?: string; blocked?: boolean }) {
  if (!reason) return null;
  
  const style = blocked ? NSD_COLORS.semantic.critical : NSD_COLORS.semantic.attention;
  
  return (
    <div
      style={{
        marginTop: '8px',
        padding: '8px 12px',
        backgroundColor: style.bg,
        borderRadius: NSD_RADIUS.sm,
        border: `1px solid ${style.border}`,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '11px',
          color: style.text,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <Icon name={blocked ? 'close' : 'info'} size={12} color={style.text} />
        {reason}
      </p>
    </div>
  );
}

/**
 * PipelineFunnelTable - Core pipeline visibility component.
 * 
 * Rules:
 * - No local math - counts are backend-authoritative
 * - Confidence badge required for each row
 * - Tooltips explain what each stage represents
 * - CRITICAL: Zero values must be explained (never show unexplained zeros)
 * - Observability reflects pipeline state; execution is delegated
 */
export function PipelineFunnelTable({
  stages,
  loading = false,
  error = null,
  globalBlockingReason,
}: PipelineFunnelTableProps) {
  if (loading) {
    return (
      <div
        style={{
          backgroundColor: NSD_COLORS.background,
          borderRadius: NSD_RADIUS.lg,
          border: `1px solid ${NSD_COLORS.border.light}`,
          padding: '40px',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.muted }}>
          Loading pipeline data...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          backgroundColor: NSD_COLORS.semantic.critical.bg,
          borderRadius: NSD_RADIUS.lg,
          border: `1px solid ${NSD_COLORS.semantic.critical.border}`,
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Icon name="warning" size={20} color={NSD_COLORS.semantic.critical.text} />
        <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.semantic.critical.text }}>{error}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
          backgroundColor: NSD_COLORS.surface,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon name="chart" size={18} color={NSD_COLORS.secondary} />
          <h4
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: NSD_COLORS.primary,
            }}
          >
            Pipeline Funnel
          </h4>
        </div>
        <span
          style={{
            fontSize: '11px',
            color: NSD_COLORS.text.muted,
            fontStyle: 'italic',
          }}
        >
          Read-only
        </span>
      </div>

      {/* Global blocking reason banner */}
      {globalBlockingReason && (
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: NSD_COLORS.semantic.critical.bg,
            borderBottom: `1px solid ${NSD_COLORS.border.light}`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <Icon name="warning" size={18} color={NSD_COLORS.semantic.critical.text} />
          <div>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                fontWeight: 600,
                color: NSD_COLORS.semantic.critical.text,
              }}
            >
              Pipeline Blocked
            </p>
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '13px',
                color: NSD_COLORS.semantic.critical.text,
                lineHeight: 1.5,
              }}
            >
              {globalBlockingReason}
            </p>
          </div>
        </div>
      )}

      {/* Empty state - Scope available but no execution yet */}
      {stages.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 16px',
              backgroundColor: NSD_COLORS.surface,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="chart" size={24} color={NSD_COLORS.text.muted} />
          </div>
          <h5
            style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: 600,
              color: NSD_COLORS.primary,
            }}
          >
            Execution has not processed entities yet
          </h5>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: NSD_COLORS.text.secondary,
            }}
          >
            This campaign has eligible entities. Execution progress will appear here once processing begins.
          </p>
        </div>
      ) : (
        /* Table */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: NSD_COLORS.surface }}>
                <th
                  style={{
                    padding: '12px 20px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: NSD_COLORS.text.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  Stage
                </th>
                <th
                  style={{
                    padding: '12px 20px',
                    textAlign: 'right',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: NSD_COLORS.text.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  Count
                </th>
                <th
                  style={{
                    padding: '12px 20px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: NSD_COLORS.text.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage, index) => {
                // Cast to extended type to access zeroReason and blocked
                const extStage = stage as PipelineStageWithReason;
                const isZeroWithReason = (stage.count ?? 0) === 0 && extStage.zeroReason;
                const isBlocked = extStage.blocked;
                
                return (
                  <React.Fragment key={stage.stage}>
                    <tr
                      style={{
                        borderTop: index > 0 ? `1px solid ${NSD_COLORS.border.light}` : undefined,
                        backgroundColor: isBlocked ? NSD_COLORS.semantic.critical.bg : undefined,
                      }}
                    >
                      <td
                        style={{
                          padding: '14px 20px',
                          fontSize: '14px',
                          color: isBlocked ? NSD_COLORS.semantic.critical.text : NSD_COLORS.text.primary,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {/* Use stage.label if provided, otherwise fallback to getStageLabel for unknown stages */}
                          <span>{stage.label || getStageLabel(stage.stage)}</span>
                          {stage.tooltip && <StageTooltip tooltip={stage.tooltip} />}
                          {isBlocked && (
                            <span
                              style={{
                                marginLeft: '8px',
                                display: 'inline-flex',
                                padding: '2px 6px',
                                fontSize: '10px',
                                fontWeight: 600,
                                backgroundColor: NSD_COLORS.semantic.critical.text,
                                color: NSD_COLORS.semantic.critical.bg,
                                borderRadius: NSD_RADIUS.sm,
                              }}
                            >
                              BLOCKED
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          textAlign: 'right',
                          fontSize: '16px',
                          fontWeight: 600,
                          fontFamily: NSD_TYPOGRAPHY.fontDisplay,
                          color: isBlocked ? NSD_COLORS.semantic.critical.text : NSD_COLORS.primary,
                        }}
                      >
                        {(stage.count ?? 0).toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          textAlign: 'center',
                        }}
                      >
                        <ConfidenceBadge confidence={stage.confidence ?? 'conditional'} />
                      </td>
                    </tr>
                    {/* Zero value explanation - CRITICAL: Never show unexplained zeros */}
                    {isZeroWithReason && (
                      <tr>
                        <td
                          colSpan={3}
                          style={{
                            padding: '0 20px 14px 20px',
                            backgroundColor: NSD_COLORS.surface,
                          }}
                        >
                          <ZeroValueExplanation reason={extStage.zeroReason} blocked={isBlocked} />
                        </td>
                      </tr>
                    )}
                    {/* Adapter execution details row - only shown if adapter was involved */}
                    {stage.adapterDetails && (
                      <tr>
                        <td
                          colSpan={3}
                          style={{
                            padding: '0 20px 14px 20px',
                            backgroundColor: NSD_COLORS.surface,
                          }}
                        >
                          <AdapterStatusBadge details={stage.adapterDetails} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Governance note - INVARIANT explanation */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: `1px solid ${NSD_COLORS.border.light}`,
          backgroundColor: NSD_COLORS.surface,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            color: NSD_COLORS.text.muted,
            fontStyle: 'italic',
          }}
        >
          {/* INVARIANT: Scope is business value, execution is observational */}
          Counts show execution progress. Business scope shown separately above.
        </p>
      </div>
    </div>
  );
}
