'use client';

/**
 * DualLayerFunnelCard Component
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * INVARIANT:
 * Funnel scope represents business value and MUST NOT depend on execution.
 * Execution metrics are observational only.
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Displays two explicit funnel layers:
 * 
 * 1️⃣ BUSINESS SCOPE (Primary)
 *    - Represents who the campaign can reach
 *    - Derived from existing database entities
 *    - Displayed as: "X organizations match this campaign"
 *    - MUST populate even if execution has never run
 *    - MUST NOT depend on run status
 * 
 * 2️⃣ EXECUTION PROGRESS (Secondary)
 *    - Represents what this specific execution has processed
 *    - Derived from /execution-state
 *    - Displayed as: "Y processed this run"
 *    - Resets per run, may legitimately be zero
 * 
 * SUCCESS DEFINITION:
 * A non-technical user should be able to answer this instantly:
 * "How many organizations does this campaign reach — and how much has been processed so far?"
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import type { FunnelScope, FunnelExecution, DualLayerFunnel } from '../../types/campaign';

export interface DualLayerFunnelCardProps {
  /** Dual-layer funnel data (scope + execution) */
  funnel: DualLayerFunnel | null;
  /** Whether data is loading */
  loading?: boolean;
  /** Error message if any */
  error?: string | null;
}

/**
 * Stage configuration for the funnel.
 */
interface FunnelStageConfig {
  id: string;
  label: string;
  icon: string;
  scopeKey: keyof FunnelScope;
  executionKey: keyof FunnelExecution;
  scopeLabel: string;
  executionLabel: string;
}

const FUNNEL_STAGES: FunnelStageConfig[] = [
  {
    id: 'organizations',
    label: 'Organizations',
    icon: 'briefcase',
    scopeKey: 'eligibleOrganizations',
    executionKey: 'processedOrganizations',
    scopeLabel: 'eligible',
    executionLabel: 'processed this run',
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: 'users',
    scopeKey: 'eligibleContacts',
    executionKey: 'processedContacts',
    scopeLabel: 'eligible',
    executionLabel: 'discovered this run',
  },
  {
    id: 'leads',
    label: 'Leads',
    icon: 'star',
    scopeKey: 'eligibleLeads',
    executionKey: 'promotedLeads',
    scopeLabel: 'promoted',
    executionLabel: 'promoted this run',
  },
];

/**
 * Single funnel stage card showing scope (primary) and execution (secondary).
 */
function FunnelStageCard({
  config,
  scopeValue,
  executionValue,
  scopeAvailable,
  executionAvailable,
}: {
  config: FunnelStageConfig;
  scopeValue: number;
  executionValue: number;
  scopeAvailable: boolean;
  executionAvailable: boolean;
}) {
  return (
    <div
      style={{
        flex: '1 1 180px',
        minWidth: '160px',
        padding: '16px',
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}
    >
      {/* Stage Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <Icon name={config.icon as any} size={16} color={NSD_COLORS.secondary} />
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: NSD_COLORS.text.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {config.label}
        </span>
      </div>

      {/* PRIMARY: Scope Value (Business Value) */}
      <div style={{ marginBottom: '8px' }}>
        {scopeAvailable ? (
          <>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                fontFamily: NSD_TYPOGRAPHY.fontDisplay,
                color: NSD_COLORS.primary,
                lineHeight: 1.1,
              }}
            >
              {scopeValue.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: NSD_COLORS.text.secondary,
                marginTop: '2px',
              }}
            >
              {config.scopeLabel}
            </div>
          </>
        ) : (
          <div
            style={{
              fontSize: '13px',
              color: NSD_COLORS.text.muted,
              fontStyle: 'italic',
            }}
          >
            Scope not yet computed
          </div>
        )}
      </div>

      {/* SECONDARY: Execution Value (This Run) */}
      <div
        style={{
          paddingTop: '8px',
          borderTop: `1px dashed ${NSD_COLORS.border.light}`,
        }}
      >
        {executionAvailable ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '4px',
            }}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: executionValue > 0 ? NSD_COLORS.semantic.positive.text : NSD_COLORS.text.muted,
              }}
            >
              {executionValue.toLocaleString()}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: NSD_COLORS.text.muted,
              }}
            >
              {config.executionLabel}
            </span>
          </div>
        ) : (
          <span
            style={{
              fontSize: '11px',
              color: NSD_COLORS.text.muted,
              fontStyle: 'italic',
            }}
          >
            Execution has not processed them yet
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Empty state when scope is not available.
 */
function ScopeUnavailableState() {
  return (
    <div
      style={{
        padding: '32px',
        textAlign: 'center',
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.md,
      }}
    >
      <Icon name="chart" size={32} color={NSD_COLORS.text.muted} />
      <p
        style={{
          margin: '16px 0 8px 0',
          fontSize: '15px',
          fontWeight: 600,
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
          maxWidth: '320px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        Business scope will appear here once the campaign targeting is evaluated.
        This shows who the campaign can reach, regardless of execution state.
      </p>
    </div>
  );
}

/**
 * Loading state.
 */
function LoadingState() {
  return (
    <div
      style={{
        padding: '40px',
        textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.muted }}>
        Loading funnel data...
      </p>
    </div>
  );
}

/**
 * Error state.
 */
function ErrorState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: NSD_COLORS.semantic.critical.bg,
        borderRadius: NSD_RADIUS.md,
        border: `1px solid ${NSD_COLORS.semantic.critical.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <Icon name="warning" size={20} color={NSD_COLORS.semantic.critical.text} />
      <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.semantic.critical.text }}>
        {message}
      </p>
    </div>
  );
}

export function DualLayerFunnelCard({
  funnel,
  loading = false,
  error = null,
}: DualLayerFunnelCardProps) {
  if (loading) {
    return (
      <div
        style={{
          backgroundColor: NSD_COLORS.background,
          borderRadius: NSD_RADIUS.lg,
          border: `1px solid ${NSD_COLORS.border.light}`,
          overflow: 'hidden',
        }}
      >
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          backgroundColor: NSD_COLORS.background,
          borderRadius: NSD_RADIUS.lg,
          border: `1px solid ${NSD_COLORS.border.light}`,
          overflow: 'hidden',
          padding: '16px',
        }}
      >
        <ErrorState message={error} />
      </div>
    );
  }

  const scopeAvailable = funnel?.scope?.scopeAvailable ?? false;
  const executionAvailable = funnel?.execution?.executionAvailable ?? false;
  const runStatus = funnel?.execution?.runStatus;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {runStatus && (
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: NSD_RADIUS.sm,
                backgroundColor: runStatus === 'running' 
                  ? NSD_COLORS.semantic.active.bg 
                  : NSD_COLORS.semantic.muted.bg,
                color: runStatus === 'running'
                  ? NSD_COLORS.semantic.active.text
                  : NSD_COLORS.semantic.muted.text,
              }}
            >
              {runStatus === 'running' ? 'Running' : runStatus}
            </span>
          )}
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
      </div>

      {/* Content */}
      <div style={{ padding: '16px 20px' }}>
        {!scopeAvailable && !funnel ? (
          <ScopeUnavailableState />
        ) : (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {FUNNEL_STAGES.map((stage) => {
              // Get values, handling type safety
              const scopeValue = funnel?.scope 
                ? (funnel.scope[stage.scopeKey] as number) ?? 0
                : 0;
              const executionValue = funnel?.execution
                ? (funnel.execution[stage.executionKey] as number) ?? 0
                : 0;

              return (
                <FunnelStageCard
                  key={stage.id}
                  config={stage}
                  scopeValue={scopeValue}
                  executionValue={executionValue}
                  scopeAvailable={scopeAvailable}
                  executionAvailable={executionAvailable}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with invariant explanation */}
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
          Eligible counts show who this campaign can reach. Processed counts show execution progress.
        </p>
      </div>
    </div>
  );
}

export default DualLayerFunnelCard;
