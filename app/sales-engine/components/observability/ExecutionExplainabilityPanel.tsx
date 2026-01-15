/**
 * ExecutionExplainabilityPanel
 * 
 * A comprehensive, read-only panel that combines all execution explainability
 * components into a single coherent view.
 * 
 * Components included:
 * - ExecutionConfidenceBadge: Quick 1-second status signal
 * - ExecutionTimeline: Outcome-oriented timeline of events
 * - NextStepCard: Single advisory recommendation (when applicable)
 * 
 * USER EXPERIENCE GOAL:
 * A user can determine in under 10 seconds:
 * - Whether execution happened
 * - Whether it was expected
 * - Whether action is required
 * 
 * A user never needs logs to answer "Did Apollo run?"
 * 
 * READ-ONLY: This panel only displays state, never modifies it.
 */

'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { useLatestRunStatus } from '../../../../hooks/useLatestRunStatus';
import { deriveExecutionState, type ExecutionState } from '../../lib/execution-state-mapping';
import { ExecutionConfidenceBadge } from './ExecutionConfidenceBadge';
import { ExecutionTimeline } from './ExecutionTimeline';
import { NextStepCard } from './NextStepCard';

interface ExecutionExplainabilityPanelProps {
  campaignId: string;
  compact?: boolean;
}

function LoadingState() {
  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: `2px solid ${NSD_COLORS.border.light}`,
            borderTopColor: NSD_COLORS.secondary,
            animation: 'spin 1s linear infinite',
          }}
        />
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: NSD_COLORS.text.secondary,
          }}
        >
          Loading execution state...
        </p>
      </div>
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: NSD_COLORS.semantic.critical.bg,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.semantic.critical.border}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <Icon name="warning" size={18} color={NSD_COLORS.semantic.critical.text} />
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: NSD_COLORS.semantic.critical.text,
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}

function ExplainabilityContent({
  executionState,
  compact,
}: {
  executionState: ExecutionState;
  compact: boolean;
}) {
  // Show next step recommendation for failed executions and completed runs
  // where no execution steps were observed (both are valid terminal outcomes
  // where user guidance is helpful)
  const showNextStep = 
    executionState.nextStepRecommendation && 
    (executionState.confidence === 'failed' || 
     executionState.confidence === 'completed_no_steps_observed');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '16px' : '20px',
      }}
    >
      {/* Header with confidence badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Icon name="chart" size={18} color={NSD_COLORS.primary} />
          <h3
            style={{
              margin: 0,
              fontSize: compact ? '15px' : '16px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: NSD_COLORS.text.primary,
            }}
          >
            Execution Summary
          </h3>
        </div>
        <ExecutionConfidenceBadge
          confidence={executionState.confidence}
          size={compact ? 'sm' : 'md'}
        />
      </div>

      {/* Confidence description */}
      <p
        style={{
          margin: 0,
          fontSize: compact ? '13px' : '14px',
          fontFamily: NSD_TYPOGRAPHY.fontBody,
          color: NSD_COLORS.text.secondary,
          lineHeight: 1.5,
        }}
      >
        {executionState.confidenceDescription}
      </p>

      {/* Timeline */}
      <ExecutionTimeline
        executionState={executionState}
        showOutcomeStatement={true}
        compact={compact}
      />

      {/* Next step recommendation (only for failed executions) */}
      {showNextStep && executionState.nextStepRecommendation && (
        <NextStepCard
          recommendation={executionState.nextStepRecommendation}
        />
      )}

      {/* Read-only footer */}
      <div
        style={{
          paddingTop: compact ? '8px' : '12px',
          borderTop: `1px solid ${NSD_COLORS.border.light}`,
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
          Read-only execution state. Data from Sales Engine observability API.
        </p>
      </div>
    </div>
  );
}

export function ExecutionExplainabilityPanel({
  campaignId,
  compact = false,
}: ExecutionExplainabilityPanelProps) {
  const { run, noRuns, notFound, serviceUnavailable, loading, error } =
    useLatestRunStatus(campaignId);

  // Loading state
  if (loading) {
    return <LoadingState />;
  }

  // Error states
  if (notFound) {
    return <ErrorState message="Campaign not found" />;
  }

  if (serviceUnavailable) {
    return <ErrorState message="Execution service unavailable" />;
  }

  if (error && !run && !noRuns) {
    return <ErrorState message={error} />;
  }

  // Derive execution state from backend signals
  const executionState = deriveExecutionState(run, noRuns);

  return (
    <div
      style={{
        padding: compact ? '16px' : '20px 24px',
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}
    >
      <ExplainabilityContent 
        executionState={executionState} 
        compact={compact} 
      />
    </div>
  );
}

export default ExecutionExplainabilityPanel;
