'use client';

/**
 * LastExecutionSummaryCardENM Component
 * 
 * ENM-GOVERNED: Read-only historical summary for terminal execution states.
 * 
 * GOVERNANCE LOCK:
 * - This component consumes ONLY ExecutionNarrative output
 * - Funnel counts are only used for display, NOT for state derivation
 * - NO access to raw campaign_runs, status, or timestamps for logic
 * - Pure presentation of ENM-provided data
 * 
 * This component replaces LastExecutionSummaryCard for ENM-compliant usage.
 */

import React from 'react';
import Link from 'next/link';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { formatEt } from '../../lib/time';
import type { ExecutionNarrative } from '../../lib/execution-narrative-mapper';
import { 
  isNarrativeTerminal,
  isNarrativeFailed,
  type ExecutionNarrativeConsumerProps 
} from '../../lib/execution-narrative-governance';
import type { ObservabilityFunnel } from '../../types/campaign';

interface LastExecutionSummaryCardENMProps extends ExecutionNarrativeConsumerProps {
  campaignId: string;
  funnel: ObservabilityFunnel | null;
}

interface CountMetric {
  label: string;
  icon: 'target' | 'users' | 'star';
  count: number;
}

function extractCounts(funnel: ObservabilityFunnel | null): CountMetric[] {
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

/**
 * LastExecutionSummaryCardENM
 * 
 * Displays execution summary using ONLY ExecutionNarrative for state.
 * Funnel counts are display-only, not used for state derivation.
 */
export function LastExecutionSummaryCardENM({ 
  narrative,
  campaignId, 
  funnel,
}: LastExecutionSummaryCardENMProps) {
  if (!isNarrativeTerminal(narrative)) {
    return null;
  }

  const isFailed = isNarrativeFailed(narrative);
  const counts = extractCounts(funnel);
  const completedAt = narrative.terminal?.completedAt;
  const terminalReason = narrative.terminal?.reason;

  const config = isFailed ? {
    label: 'Failed',
    icon: 'warning' as const,
    bgColor: NSD_COLORS.semantic.critical.bg,
    borderColor: NSD_COLORS.semantic.critical.border,
    textColor: NSD_COLORS.semantic.critical.text,
  } : {
    label: 'Completed',
    icon: 'check' as const,
    bgColor: NSD_COLORS.semantic.positive.bg,
    borderColor: NSD_COLORS.semantic.positive.border,
    textColor: NSD_COLORS.semantic.positive.text,
  };

  return (
    <div
      style={{
        backgroundColor: config.bgColor,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${config.borderColor}`,
        padding: '20px 24px',
      }}
    >
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

      <p
        style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          fontWeight: 500,
          color: config.textColor,
        }}
      >
        {narrative.headline}
      </p>

      {completedAt && (
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
            {formatEt(completedAt)}
          </span>
        </div>
      )}

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
                {terminalReason}
              </span>
            </div>
          </div>
        </div>
      )}

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

      {narrative.trustNote && (
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
            {narrative.trustNote}
          </span>
        </div>
      )}
    </div>
  );
}

export default LastExecutionSummaryCardENM;
