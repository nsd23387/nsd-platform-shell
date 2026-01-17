'use client';

/**
 * ExecutionStageTracker Component
 * 
 * A vertical stage tracker showing the canonical execution stages.
 * 
 * GOVERNANCE CONSTRAINTS (CRITICAL):
 * - This component is PRESENTATIONAL ONLY. It does NOT define execution semantics.
 * - Status is derived ONLY from campaign_runs.phase and funnel data.
 * - The UI must NEVER infer execution state. It renders what the backend has emitted.
 * - If the backend has not emitted data for a stage → render "Not yet observed"
 * - Unknown stage IDs from backend must render safely (see fallback rules)
 * 
 * Stage status rules:
 * - completed: ONLY when backend has emitted data for this stage
 * - running: ONLY when campaign_runs.phase === stage.id
 * - waiting: No data observed, not current phase
 * - not_observed: Stage exists in config but no backend data received
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import {
  CANONICAL_STAGE_CONFIG,
  getStageConfig as getCentralStageConfig,
  getStageIndex,
  isFutureStage,
  type CanonicalStageConfig,
  type StageRenderStatus,
} from '../../lib/execution-stages';
import type { ObservabilityFunnel } from '../../types/campaign';

export type StageStatus = 'waiting' | 'running' | 'completed' | 'not_observed';

export interface ExecutionStage {
  id: string;
  label: string;
  sublabel: string;
  status: StageStatus;
  count?: number;
  countLabel?: string;
  isFuture: boolean;
}

interface ExecutionStageTrackerProps {
  runStatus: string | null;
  runPhase: string | null;
  funnel: ObservabilityFunnel | null;
  noRuns: boolean;
  showFutureStages?: boolean;
}

/**
 * Derive stage status from backend data
 * 
 * GOVERNANCE CONSTRAINT (CRITICAL):
 * This function must ONLY use explicit backend signals.
 * No heuristics, guesses, or derived states.
 * 
 * Rules:
 * - completed: ONLY when funnelCount > 0 (explicit data exists)
 * - running: ONLY when campaign_runs.phase === stage.id (exact match)
 * - waiting: When run exists but no data for this stage yet
 * - not_observed: When stage has no data and is not current phase
 * 
 * No ordering-based inference. Completion is determined by data presence only.
 */
function deriveStageStatus(
  stageConfig: CanonicalStageConfig,
  runStatus: string | null,
  runPhase: string | null,
  funnel: ObservabilityFunnel | null,
  noRuns: boolean
): { status: StageStatus; count?: number } {
  const stageId = stageConfig.id;
  const funnelStageId = stageConfig.funnelStageId;

  if (noRuns || !runStatus) {
    return { status: 'waiting' };
  }

  const normalizedStatus = runStatus?.toLowerCase() || '';
  const normalizedPhase = runPhase?.toLowerCase() || '';

  const funnelCount = funnelStageId
    ? funnel?.stages?.find((s) => s.stage === funnelStageId)?.count
    : undefined;

  const hasData = funnelCount !== undefined && funnelCount > 0;

  if (hasData) {
    return { status: 'completed', count: funnelCount };
  }

  if (normalizedPhase === stageId) {
    return { status: 'running' };
  }

  if (normalizedStatus === 'completed' || normalizedStatus === 'success' || normalizedStatus === 'succeeded') {
    return { status: 'not_observed' };
  }

  if (normalizedStatus === 'running' || normalizedStatus === 'in_progress') {
    return { status: 'waiting' };
  }

  if (normalizedStatus === 'queued' || normalizedStatus === 'run_requested' || normalizedStatus === 'pending') {
    return { status: 'waiting' };
  }

  if (normalizedStatus === 'failed' || normalizedStatus === 'error') {
    return { status: 'waiting' };
  }

  return { status: 'waiting' };
}

function StageIndicator({ status, isFuture }: { status: StageStatus; isFuture: boolean }) {
  const size = 24;

  if (status === 'completed') {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: NSD_COLORS.semantic.positive.bg,
          border: `2px solid ${NSD_COLORS.semantic.positive.text}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2 6L5 9L10 3"
            stroke={NSD_COLORS.semantic.positive.text}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  if (status === 'running') {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: NSD_COLORS.semantic.info.bg,
          border: `2px solid ${NSD_COLORS.secondary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: NSD_COLORS.secondary,
          }}
        />
      </div>
    );
  }

  if (status === 'not_observed') {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: NSD_COLORS.surface,
          border: `2px dashed ${NSD_COLORS.border.default}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          opacity: 0.6,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: NSD_COLORS.surface,
        border: `2px solid ${NSD_COLORS.border.default}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    />
  );
}

function StageRow({
  stage,
  isLast,
  nextStatus,
}: {
  stage: ExecutionStage;
  isLast: boolean;
  nextStatus?: StageStatus;
}) {
  const getStatusLabel = (): string => {
    if (stage.status === 'completed' && stage.count !== undefined) {
      return `${stage.count.toLocaleString()} ${stage.countLabel || 'items'}`;
    }
    if (stage.status === 'running') {
      return stage.sublabel;
    }
    if (stage.status === 'not_observed') {
      return 'Not yet observed';
    }
    return 'Pending';
  };

  const getConnectorColor = (): string => {
    if (stage.status === 'completed') {
      return NSD_COLORS.semantic.positive.text;
    }
    if (stage.isFuture || stage.status === 'not_observed') {
      return NSD_COLORS.border.light;
    }
    return NSD_COLORS.border.light;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <StageIndicator status={stage.status} isFuture={stage.isFuture} />
        {!isLast && (
          <div
            style={{
              width: 2,
              height: 32,
              backgroundColor: getConnectorColor(),
              marginTop: 4,
              borderStyle: stage.isFuture ? 'dashed' : 'solid',
            }}
          />
        )}
      </div>
      <div style={{ paddingBottom: isLast ? 0 : 24 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color:
              stage.status === 'completed'
                ? NSD_COLORS.text.primary
                : stage.status === 'running'
                ? NSD_COLORS.secondary
                : stage.status === 'not_observed'
                ? NSD_COLORS.text.muted
                : NSD_COLORS.text.muted,
            marginBottom: 2,
            opacity: stage.isFuture && stage.status !== 'completed' ? 0.7 : 1,
          }}
        >
          {stage.label}
          {stage.isFuture && stage.status !== 'completed' && (
            <span
              style={{
                marginLeft: '8px',
                fontSize: '11px',
                fontWeight: 400,
                color: NSD_COLORS.text.muted,
                fontStyle: 'italic',
              }}
            >
              (future)
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: '13px',
            fontFamily: NSD_TYPOGRAPHY.fontBody,
            color:
              stage.status === 'running'
                ? NSD_COLORS.secondary
                : NSD_COLORS.text.muted,
            fontStyle: stage.status === 'waiting' || stage.status === 'not_observed' ? 'italic' : 'normal',
            opacity: stage.isFuture && stage.status !== 'completed' ? 0.7 : 1,
          }}
        >
          {getStatusLabel()}
        </div>
      </div>
    </div>
  );
}

/**
 * Handle unknown stages from backend
 * 
 * GOVERNANCE CONSTRAINT:
 * If the backend emits a stage ID not in CANONICAL_STAGE_CONFIG,
 * render it safely with neutral presentation.
 */
function createUnknownStage(stageId: string, count?: number): ExecutionStage {
  return {
    id: stageId,
    label: 'Additional Stage',
    sublabel: 'Stage data observed from backend',
    status: count !== undefined ? 'completed' : 'waiting',
    count,
    countLabel: 'items processed',
    isFuture: false,
  };
}

export function ExecutionStageTracker({
  runStatus,
  runPhase,
  funnel,
  noRuns,
  showFutureStages = false,
}: ExecutionStageTrackerProps) {
  const configToUse = showFutureStages
    ? CANONICAL_STAGE_CONFIG
    : CANONICAL_STAGE_CONFIG.filter((s) => !isFutureStage(s.id));

  const stages: ExecutionStage[] = configToUse.map((stageConfig) => {
    const { status, count } = deriveStageStatus(stageConfig, runStatus, runPhase, funnel, noRuns);
    return {
      id: stageConfig.id,
      label: stageConfig.label,
      sublabel: stageConfig.sublabel,
      countLabel: stageConfig.countLabel,
      status,
      count,
      isFuture: isFutureStage(stageConfig.id),
    };
  });

  const unknownStages: ExecutionStage[] = [];
  if (funnel?.stages) {
    const knownFunnelIds = new Set(
      CANONICAL_STAGE_CONFIG.map((s) => s.funnelStageId).filter(Boolean)
    );
    
    funnel.stages.forEach((funnelStage) => {
      if (!knownFunnelIds.has(funnelStage.stage)) {
        unknownStages.push(createUnknownStage(funnelStage.stage, funnelStage.count));
      }
    });
  }

  const allStages = [...stages, ...unknownStages];

  if (allStages.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        padding: '20px 24px',
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M9 1.5V16.5M9 1.5L4.5 6M9 1.5L13.5 6"
            stroke={NSD_COLORS.primary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h3
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: NSD_COLORS.primary,
          }}
        >
          Execution Stages
        </h3>
      </div>

      <div>
        {allStages.map((stage, index) => (
          <StageRow
            key={stage.id}
            stage={stage}
            isLast={index === allStages.length - 1}
            nextStatus={allStages[index + 1]?.status}
          />
        ))}
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

export default ExecutionStageTracker;
