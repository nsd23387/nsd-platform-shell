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
import type { PipelineStage } from '../../types/campaign';

export interface PipelineFunnelTableProps {
  /** Pipeline stages with counts */
  stages: PipelineStage[];
  /** Whether data is loading */
  loading?: boolean;
  /** Error message if any */
  error?: string | null;
}

/**
 * Get confidence badge styling.
 */
function getConfidenceBadgeStyle(confidence: 'observed' | 'conditional'): {
  bg: string;
  text: string;
  label: string;
} {
  if (confidence === 'observed') {
    return {
      bg: '#D1FAE5',
      text: '#065F46',
      label: 'Observed',
    };
  } else {
    return {
      bg: '#FEF3C7',
      text: '#92400E',
      label: 'Conditional',
    };
  }
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
                <tr
                  key={stage.stage}
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
                      <span>{stage.label}</span>
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
                    {stage.count.toLocaleString()}
                  </td>
                  <td
                    style={{
                      padding: '14px 20px',
                      textAlign: 'center',
                    }}
                  >
                    <ConfidenceBadge confidence={stage.confidence} />
                  </td>
                </tr>
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
          Counts are backend-authoritative. No local computation is performed.
          Observability reflects pipeline state; execution is delegated.
        </p>
      </div>
    </div>
  );
}
