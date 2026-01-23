'use client';

/**
 * FunnelSummaryWidget Component
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * INVARIANT:
 * Funnel scope represents business value and MUST NOT depend on execution.
 * Execution metrics are observational only.
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Compact pipeline funnel snapshot for the Overview tab.
 * Shows key counts so users understand "Where in the funnel is this campaign?"
 * without navigating to the Observability tab.
 * 
 * DUAL-LAYER DISPLAY:
 * 1. SCOPE (Primary): "X organizations match this campaign" - business value
 * 2. EXECUTION (Secondary): "Y processed this run" - execution progress
 * 
 * GOVERNANCE CONSTRAINTS:
 * - Read-only display
 * - Counts are backend-authoritative (no local math)
 * - Scope MUST populate even if execution has never run
 * - Empty execution is valid state, not broken
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

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { formatEt } from '../../lib/time';
import type { ObservabilityFunnel, PipelineStage, FunnelScope, FunnelExecution } from '../../types/campaign';

interface FunnelSummaryWidgetProps {
  /** Legacy: Execution funnel data (for backward compatibility) */
  funnel: ObservabilityFunnel | null;
  /** NEW: Business scope data (primary display) */
  scope?: FunnelScope | null;
  /** NEW: Execution progress data (secondary display) */
  execution?: FunnelExecution | null;
  loading?: boolean;
}

interface FunnelMetric {
  stage: string;
  label: string;
  icon: string;
  scopeValue: number;
  executionValue: number;
  scopeLabel: string;
  executionLabel: string;
}

/**
 * Extract funnel metrics with dual-layer support.
 * Prioritizes scope data when available, falls back to execution funnel.
 */
function extractFunnelMetrics(
  funnel: ObservabilityFunnel | null,
  scope?: FunnelScope | null,
  execution?: FunnelExecution | null
): FunnelMetric[] {
  // AUTHORITATIVE PIPELINE ORDER with dual-layer values
  const metrics: FunnelMetric[] = [
    { 
      stage: 'orgs_sourced', 
      label: 'Organizations', 
      icon: 'briefcase',
      scopeValue: scope?.eligibleOrganizations ?? 0,
      executionValue: execution?.processedOrganizations ?? 0,
      scopeLabel: 'eligible',
      executionLabel: 'processed',
    },
    { 
      stage: 'contacts_discovered', 
      label: 'Contacts', 
      icon: 'users',
      scopeValue: scope?.eligibleContacts ?? 0,
      executionValue: execution?.processedContacts ?? 0,
      scopeLabel: 'eligible',
      executionLabel: 'discovered',
    },
    { 
      stage: 'leads_promoted', 
      label: 'Leads', 
      icon: 'star',
      scopeValue: scope?.eligibleLeads ?? 0,
      executionValue: execution?.promotedLeads ?? 0,
      scopeLabel: 'promoted',
      executionLabel: 'this run',
    },
    { 
      stage: 'emails_sent', 
      label: 'Sent', 
      icon: 'mail',
      scopeValue: 0, // Messages don't have scope
      executionValue: execution?.sentMessages ?? 0,
      scopeLabel: '',
      executionLabel: 'sent',
    },
  ];

  // If no scope data, try to use execution funnel for backward compatibility
  if (!scope?.scopeAvailable && funnel?.stages) {
    const stageMap = new Map<string, number>();
    funnel.stages.forEach((stage) => {
      stageMap.set(stage.stage, stage.count);
    });

    return metrics.map((m) => ({
      ...m,
      // Use funnel value as scope (legacy behavior)
      scopeValue: m.scopeValue || (stageMap.get(m.stage) ?? 0),
      executionValue: m.executionValue || (stageMap.get(m.stage) ?? 0),
    }));
  }

  return metrics;
}

/**
 * Dual-layer metric card showing scope (primary) and execution (secondary).
 */
function MetricCard({ 
  metric, 
  showScope = true,
  scopeAvailable = false,
}: { 
  metric: FunnelMetric; 
  showScope?: boolean;
  scopeAvailable?: boolean;
}) {
  const hasScopeValue = metric.scopeValue > 0 || (metric.stage !== 'emails_sent' && scopeAvailable);
  const hasExecutionValue = metric.executionValue > 0;
  
  return (
    <div
      style={{
        flex: '1 1 120px',
        minWidth: '100px',
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
          gap: '6px',
          marginBottom: '8px',
        }}
      >
        <Icon name={metric.icon as any} size={14} color={NSD_COLORS.text.muted} />
        <span
          style={{
            fontSize: '11px',
            color: NSD_COLORS.text.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {metric.label}
        </span>
      </div>
      
      {/* PRIMARY: Scope value (when available) */}
      {showScope && metric.scopeLabel && (
        <div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: NSD_COLORS.primary,
            }}
          >
            {metric.scopeValue.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: '10px',
              color: NSD_COLORS.text.muted,
              marginTop: '2px',
            }}
          >
            {metric.scopeLabel}
          </div>
        </div>
      )}
      
      {/* SECONDARY: Execution value (smaller, subtle) */}
      {(!showScope || !metric.scopeLabel) ? (
        <div
          style={{
            fontSize: '24px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: NSD_COLORS.primary,
          }}
        >
          {metric.executionValue.toLocaleString()}
        </div>
      ) : (
        <div
          style={{
            fontSize: '11px',
            color: hasExecutionValue ? NSD_COLORS.semantic.positive.text : NSD_COLORS.text.muted,
            marginTop: '4px',
            borderTop: `1px dashed ${NSD_COLORS.border.light}`,
            paddingTop: '4px',
          }}
        >
          {metric.executionValue.toLocaleString()} {metric.executionLabel}
        </div>
      )}
    </div>
  );
}

/**
 * Empty state when scope is not yet computed.
 * NOTE: This is NOT "no activity" - scope should exist even without execution.
 */
function ScopeNotComputedState() {
  return (
    <div
      style={{
        padding: '24px',
        textAlign: 'center',
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.md,
      }}
    >
      <Icon name="chart" size={24} color={NSD_COLORS.text.muted} />
      <p
        style={{
          margin: '12px 0 4px 0',
          fontSize: '14px',
          fontWeight: 500,
          color: NSD_COLORS.text.secondary,
        }}
      >
        Campaign scope not yet computed
      </p>
      <p
        style={{
          margin: 0,
          fontSize: '13px',
          color: NSD_COLORS.text.muted,
        }}
      >
        Business scope will show who this campaign can reach, regardless of execution.
      </p>
    </div>
  );
}

export function FunnelSummaryWidget({ 
  funnel, 
  scope, 
  execution,
  loading = false,
}: FunnelSummaryWidgetProps) {
  const metrics = extractFunnelMetrics(funnel, scope, execution);
  const scopeAvailable = scope?.scopeAvailable ?? false;
  const hasAnyScope = metrics.some((m) => m.scopeValue > 0);
  const hasAnyExecution = metrics.some((m) => m.executionValue > 0);
  const hasAnyData = hasAnyScope || hasAnyExecution || funnel?.stages?.some(s => s.count > 0);

  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
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

      <div style={{ padding: '16px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.muted }}>
              Loading funnel data...
            </p>
          </div>
        ) : !hasAnyData && !scopeAvailable ? (
          <ScopeNotComputedState />
        ) : (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {metrics.map((metric) => (
              <MetricCard 
                key={metric.stage} 
                metric={metric}
                showScope={scopeAvailable || hasAnyScope}
                scopeAvailable={scopeAvailable}
              />
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 20px',
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
          {scopeAvailable 
            ? 'Eligible shows reach. Processed shows execution progress.'
            : 'Counts are backend-authoritative. View Observability tab for details.'}
        </p>
        {(funnel?.last_updated_at || scope?.scopeComputedAt) && (
          <p
            style={{
              margin: 0,
              fontSize: '10px',
              color: NSD_COLORS.text.muted,
            }}
          >
            Updated: {formatEt(funnel?.last_updated_at || scope?.scopeComputedAt || '')}
          </p>
        )}
      </div>
    </div>
  );
}
