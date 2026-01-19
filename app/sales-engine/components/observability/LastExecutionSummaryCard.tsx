'use client';

/**
 * LastExecutionSummaryCard Component
 * 
 * Read-only historical summary shown when execution is in terminal state
 * (completed or failed). Reinforces: "The system is idle. You are looking at history."
 * 
 * UX TRUST ACCELERATOR:
 * Users can quickly understand what happened in the last execution without
 * navigating to logs or timeline views.
 * 
 * GOVERNANCE CONSTRAINTS:
 * - Read-only display only
 * - No execution control or retry buttons
 * - Counts are backend-authoritative (no local math)
 * - Terminal reason displayed exactly as received from backend
 * 
 * Displays:
 * - Timestamp (when execution finished)
 * - Terminal reason (if failed)
 * - Counts (orgs / contacts / leads)
 * - Link to observability tab
 */

import React from 'react';
import Link from 'next/link';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { formatEt } from '../../lib/time';
import type { ObservabilityFunnel } from '../../types/campaign';
import type { LatestRun } from '../../../../hooks/useLatestRunStatus';
import type { RealTimeExecutionStatus } from '../../lib/api';

interface LastExecutionSummaryCardProps {
  campaignId: string;
  run: LatestRun | null;
  funnel: ObservabilityFunnel | null;
  noRuns?: boolean;
  /** Real-time execution status from actual database tables - preferred source */
  realTimeStatus?: RealTimeExecutionStatus | null;
}

interface CountMetric {
  label: string;
  icon: 'target' | 'users' | 'star';
  count: number;
}

/**
 * Extract counts from real-time status (preferred) or fallback to funnel data.
 * Real-time status queries actual database tables and provides accurate counts.
 */
function extractCounts(
  funnel: ObservabilityFunnel | null,
  realTimeStatus?: RealTimeExecutionStatus | null
): CountMetric[] {
  // Prefer real-time status counts (from actual database tables)
  if (realTimeStatus?.funnel) {
    return [
      { 
        label: 'Organizations', 
        icon: 'target', 
        count: realTimeStatus.funnel.organizations.total 
      },
      { 
        label: 'Contacts', 
        icon: 'users', 
        count: realTimeStatus.funnel.contacts.total 
      },
      { 
        label: 'Leads', 
        icon: 'star', 
        count: realTimeStatus.funnel.leads.total 
      },
    ];
  }

  // Fallback to ODS funnel data
  const stageMap = new Map<string, number>();
  funnel?.stages?.forEach((stage) => {
    stageMap.set(stage.stage, stage.count);
  });

  return [
    { label: 'Organizations', icon: 'target', count: stageMap.get('orgs_sourced') ?? 0 },
    { label: 'Contacts', icon: 'users', count: stageMap.get('contacts_discovered') ?? 0 },
    { label: 'Leads', icon: 'star', count: stageMap.get('leads_promoted') ?? 0 },
  ];
}

function isTerminalStatus(status?: string): boolean {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return ['completed', 'failed'].includes(normalized);
}

function isFailedStatus(status?: string): boolean {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return normalized === 'failed';
}

function getStatusConfig(status?: string): { 
  label: string; 
  icon: 'check' | 'warning'; 
  bgColor: string; 
  borderColor: string; 
  textColor: string;
  headerCopy: string;
} {
  const normalized = status?.toLowerCase() || '';
  
  if (normalized === 'failed') {
    return {
      label: 'Failed',
      icon: 'warning',
      bgColor: NSD_COLORS.semantic.critical.bg,
      borderColor: NSD_COLORS.semantic.critical.border,
      textColor: NSD_COLORS.semantic.critical.text,
      headerCopy: 'Last execution failed',
    };
  }
  
  return {
    label: 'Completed',
    icon: 'check',
    bgColor: NSD_COLORS.semantic.positive.bg,
    borderColor: NSD_COLORS.semantic.positive.border,
    textColor: NSD_COLORS.semantic.positive.text,
    headerCopy: 'Last execution completed successfully',
  };
}

export function LastExecutionSummaryCard({ 
  campaignId, 
  run, 
  funnel,
  noRuns = false,
  realTimeStatus,
}: LastExecutionSummaryCardProps) {
  if (noRuns || !run) {
    return null;
  }

  if (!isTerminalStatus(run.status)) {
    return null;
  }

  const config = getStatusConfig(run.status);
  // Use real-time counts (from actual DB tables) when available
  const counts = extractCounts(funnel, realTimeStatus);
  
  // Get any active alerts from real-time status
  const alerts = realTimeStatus?.alerts || [];
  const isFailed = isFailedStatus(run.status);
  const finishedAt = run.updated_at || run.created_at;
  const rawReason = (run as Record<string, unknown>).error_message || 
                    (run as Record<string, unknown>).failure_reason ||
                    (run as Record<string, unknown>).reason;
  const terminalReason: string | null = typeof rawReason === 'string' ? rawReason : null;

  return (
    <div
      style={{
        backgroundColor: config.bgColor,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${config.borderColor}`,
        padding: '20px 24px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        <Icon name={config.icon} size={20} color={config.textColor} />
        <h4
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: config.textColor,
          }}
        >
          Last Execution Summary
        </h4>
        <span
          style={{
            marginLeft: 'auto',
            padding: '4px 10px',
            backgroundColor: `${config.textColor}15`,
            borderRadius: NSD_RADIUS.sm,
            fontSize: '12px',
            fontWeight: 600,
            color: config.textColor,
          }}
        >
          {config.label}
        </span>
      </div>

      {/* Status copy */}
      <p
        style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          fontWeight: 500,
          color: config.textColor,
        }}
      >
        {config.headerCopy}
      </p>

      {/* Timestamp */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: isFailed && terminalReason ? '12px' : '16px',
          padding: '10px 12px',
          backgroundColor: NSD_COLORS.surface,
          borderRadius: NSD_RADIUS.md,
          border: `1px solid ${NSD_COLORS.border.light}`,
        }}
      >
        <Icon name="clock" size={14} color={NSD_COLORS.text.muted} />
        <span
          style={{
            fontSize: '12px',
            color: NSD_COLORS.text.muted,
          }}
        >
          Finished:
        </span>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: NSD_COLORS.text.primary,
          }}
        >
          {finishedAt ? formatEt(finishedAt) : '—'}
        </span>
      </div>

      {/* Terminal reason (if failed) */}
      {isFailed && terminalReason && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: `${NSD_COLORS.semantic.critical.text}08`,
            borderRadius: NSD_RADIUS.md,
            border: `1px solid ${NSD_COLORS.semantic.critical.border}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <Icon name="warning" size={14} color={NSD_COLORS.semantic.critical.text} />
            <div>
              <span
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: NSD_COLORS.semantic.critical.text,
                  marginBottom: '4px',
                }}
              >
                Failure Reason
              </span>
              <span
                style={{
                  fontSize: '13px',
                  color: NSD_COLORS.text.primary,
                  lineHeight: 1.5,
                }}
              >
                {String(terminalReason)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Counts */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        {counts.map((metric) => (
          <div
            key={metric.label}
            style={{
              flex: '1 1 80px',
              minWidth: '80px',
              padding: '12px 16px',
              backgroundColor: NSD_COLORS.surface,
              borderRadius: NSD_RADIUS.md,
              border: `1px solid ${NSD_COLORS.border.light}`,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                marginBottom: '6px',
              }}
            >
              <Icon name={metric.icon} size={12} color={NSD_COLORS.text.muted} />
              <span
                style={{
                  fontSize: '10px',
                  color: NSD_COLORS.text.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                {metric.label}
              </span>
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 600,
                fontFamily: NSD_TYPOGRAPHY.fontDisplay,
                color: NSD_COLORS.primary,
              }}
            >
              {metric.count.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Alerts from real-time status (if any) */}
      {alerts.length > 0 && (
        <div
          style={{
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {alerts.map((alert, index) => {
            const alertColors = alert.type === 'error' 
              ? { bg: NSD_COLORS.semantic.critical.bg, border: NSD_COLORS.semantic.critical.border, text: NSD_COLORS.semantic.critical.text }
              : alert.type === 'warning'
              ? { bg: NSD_COLORS.semantic.attention.bg, border: NSD_COLORS.semantic.attention.border, text: NSD_COLORS.semantic.attention.text }
              : { bg: NSD_COLORS.semantic.info.bg, border: NSD_COLORS.semantic.info.border, text: NSD_COLORS.semantic.info.text };
            
            return (
              <div
                key={index}
                style={{
                  padding: '10px 12px',
                  backgroundColor: alertColors.bg,
                  borderRadius: NSD_RADIUS.md,
                  border: `1px solid ${alertColors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Icon 
                  name={alert.type === 'error' ? 'warning' : 'info'} 
                  size={14} 
                  color={alertColors.text} 
                />
                <span
                  style={{
                    fontSize: '12px',
                    color: alertColors.text,
                    fontWeight: 500,
                  }}
                >
                  {alert.message}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Link to monitoring tab (observability) */}
      <Link
        href={`/sales-engine/campaigns/${campaignId}?tab=monitoring`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: 500,
          color: NSD_COLORS.secondary,
          textDecoration: 'none',
        }}
      >
        <Icon name="chart" size={14} color={NSD_COLORS.secondary} />
        View full observability details
        <Icon name="arrow-right" size={12} color={NSD_COLORS.secondary} />
      </Link>

      {/* Trust signal: System is idle */}
      <div
        style={{
          marginTop: '16px',
          padding: '10px 12px',
          backgroundColor: `${NSD_COLORS.text.muted}08`,
          borderRadius: NSD_RADIUS.md,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Icon name="info" size={14} color={NSD_COLORS.text.muted} />
        <span
          style={{
            fontSize: '12px',
            color: NSD_COLORS.text.muted,
            fontStyle: 'italic',
          }}
        >
          The system is idle. You are looking at history.
        </span>
      </div>
    </div>
  );
}

export default LastExecutionSummaryCard;
