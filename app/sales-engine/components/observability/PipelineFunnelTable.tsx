/**
 * PipelineFunnelTable Component
 * 
 * Displays the campaign pipeline funnel with stage counts and confidence.
 * 
 * Data source: GET /campaigns/{id}/observability
 * 
 * OBSERVABILITY GOVERNANCE:
 * - Read-only display
 * - No local math - counts come directly from backend
 * - Confidence badge required for each stage
 * - Tooltips explain each stage
 * - No execution control, retries, or overrides
 * 
 * Pipeline stages:
 * - Organizations sourced
 * - Contacts discovered
 * - Contacts evaluated
 * - Leads promoted
 * - Leads awaiting approval
 * - Leads approved
 * - Emails sent
 * - Replies
 */

'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { getStageLabel } from '../../lib/api';
import type { PipelineStage, AdapterExecutionStatus, AdapterExecutionDetails } from '../../types/campaign';

export interface PipelineFunnelTableProps {
  /** Pipeline stages with counts */
  stages: PipelineStage[];
  /** Whether data is loading */
  loading?: boolean;
  /** Error message if any */
  error?: string | null;
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
 * PipelineFunnelTable - Core pipeline visibility component.
 * 
 * Rules:
 * - No local math - counts are backend-authoritative
 * - Confidence badge required for each row
 * - Tooltips explain what each stage represents
 * - Observability reflects pipeline state; execution is delegated
 */
export function PipelineFunnelTable({
  stages,
  loading = false,
  error = null,
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
          backgroundColor: '#FEE2E2',
          borderRadius: NSD_RADIUS.lg,
          border: '1px solid #FECACA',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Icon name="warning" size={20} color="#991B1B" />
        <p style={{ margin: 0, fontSize: '14px', color: '#991B1B' }}>{error}</p>
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

      {/* Empty state - No activity observed yet */}
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
            No activity observed yet
          </h5>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: NSD_COLORS.text.secondary,
            }}
          >
            Pipeline activity will appear here after campaign execution begins.
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
              {stages.map((stage, index) => (
                <React.Fragment key={stage.stage}>
                  <tr
                    style={{
                      borderTop: index > 0 ? `1px solid ${NSD_COLORS.border.light}` : undefined,
                    }}
                  >
                    <td
                      style={{
                        padding: '14px 20px',
                        fontSize: '14px',
                        color: NSD_COLORS.text.primary,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {/* Use stage.label if provided, otherwise fallback to getStageLabel for unknown stages */}
                        <span>{stage.label || getStageLabel(stage.stage)}</span>
                        {stage.tooltip && <StageTooltip tooltip={stage.tooltip} />}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '14px 20px',
                        textAlign: 'right',
                        fontSize: '16px',
                        fontWeight: 600,
                        fontFamily: NSD_TYPOGRAPHY.fontDisplay,
                        color: NSD_COLORS.primary,
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Governance note */}
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
          Counts are backend-authoritative. Read-only projection from activity events.
        </p>
      </div>
    </div>
  );
}
