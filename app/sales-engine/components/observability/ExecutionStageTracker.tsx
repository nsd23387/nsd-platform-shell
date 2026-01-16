'use client';

/**
 * ExecutionStageTracker Component
 * 
 * A vertical stage tracker showing the canonical execution stages:
 * - Organizations Sourced (org_sourcing)
 * - Contacts Discovered (contact_discovery)  
 * - Leads Promoted (lead_creation)
 * 
 * GOVERNANCE CONSTRAINTS:
 * - Status derived from campaign_runs.phase and funnel data
 * - Only show Waiting/Running/Completed (no Failed per-stage)
 * - Read-only display
 * - No inference by time
 * 
 * Each stage shows status and optional count when completed.
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import type { ObservabilityFunnel, PipelineStage } from '../../types/campaign';

export type StageStatus = 'waiting' | 'running' | 'completed';

export interface ExecutionStage {
  id: string;
  label: string;
  sublabel: string;
  status: StageStatus;
  count?: number;
  countLabel?: string;
}

interface ExecutionStageTrackerProps {
  runStatus: string | null;
  runPhase: string | null;
  funnel: ObservabilityFunnel | null;
  noRuns: boolean;
}

const STAGE_ORDER = ['org_sourcing', 'contact_discovery', 'lead_creation'] as const;

function deriveStageStatus(
  stageId: string,
  runStatus: string | null,
  runPhase: string | null,
  funnel: ObservabilityFunnel | null,
  noRuns: boolean
): { status: StageStatus; count?: number } {
  if (noRuns || !runStatus) {
    return { status: 'waiting' };
  }

  const normalizedStatus = runStatus?.toLowerCase() || '';
  const normalizedPhase = runPhase?.toLowerCase() || '';

  const stageIndex = STAGE_ORDER.indexOf(stageId as typeof STAGE_ORDER[number]);
  
  const currentPhaseIndex = STAGE_ORDER.findIndex(
    (s) => s === normalizedPhase || normalizedPhase.includes(s)
  );

  const funnelStageMap: Record<string, string> = {
    org_sourcing: 'orgs_sourced',
    contact_discovery: 'contacts_discovered',
    lead_creation: 'leads_promoted',
  };

  const funnelCount = funnel?.stages?.find(
    (s) => s.stage === funnelStageMap[stageId]
  )?.count;

  if (normalizedStatus === 'completed' || normalizedStatus === 'success' || normalizedStatus === 'succeeded') {
    return { status: 'completed', count: funnelCount };
  }

  if (normalizedStatus === 'failed' || normalizedStatus === 'error') {
    if (currentPhaseIndex >= 0 && stageIndex < currentPhaseIndex) {
      return { status: 'completed', count: funnelCount };
    }
    if (stageIndex === currentPhaseIndex) {
      return { status: 'completed', count: funnelCount };
    }
    return { status: 'waiting' };
  }

  if (normalizedStatus === 'running' || normalizedStatus === 'in_progress') {
    if (currentPhaseIndex >= 0) {
      if (stageIndex < currentPhaseIndex) {
        return { status: 'completed', count: funnelCount };
      }
      if (stageIndex === currentPhaseIndex) {
        return { status: 'running' };
      }
      return { status: 'waiting' };
    }
    if (stageIndex === 0) {
      return { status: 'running' };
    }
    return { status: 'waiting' };
  }

  if (normalizedStatus === 'queued' || normalizedStatus === 'run_requested' || normalizedStatus === 'pending') {
    return { status: 'waiting' };
  }

  return { status: 'waiting' };
}

function getStageConfig(stageId: string): { label: string; sublabel: string; countLabel: string } {
  switch (stageId) {
    case 'org_sourcing':
      return {
        label: 'Organizations Identified',
        sublabel: 'Sourcing organizations based on ICP',
        countLabel: 'organizations sourced',
      };
    case 'contact_discovery':
      return {
        label: 'Contacts Discovered',
        sublabel: 'Scanning organizations for contacts',
        countLabel: 'contacts discovered',
      };
    case 'lead_creation':
      return {
        label: 'Leads Promoted',
        sublabel: 'Qualifying contacts for lead promotion',
        countLabel: 'leads promoted',
      };
    default:
      return {
        label: stageId,
        sublabel: '',
        countLabel: 'items',
      };
  }
}

function StageIndicator({ status }: { status: StageStatus }) {
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
}: {
  stage: ExecutionStage;
  isLast: boolean;
}) {
  const config = getStageConfig(stage.id);
  
  const statusLabel = 
    stage.status === 'completed' && stage.count !== undefined
      ? `${stage.count.toLocaleString()} ${config.countLabel}`
      : stage.status === 'running'
      ? config.sublabel
      : 'Pending';

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <StageIndicator status={stage.status} />
        {!isLast && (
          <div
            style={{
              width: 2,
              height: 32,
              backgroundColor:
                stage.status === 'completed'
                  ? NSD_COLORS.semantic.positive.text
                  : NSD_COLORS.border.light,
              marginTop: 4,
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
                : NSD_COLORS.text.muted,
            marginBottom: 2,
          }}
        >
          {config.label}
        </div>
        <div
          style={{
            fontSize: '13px',
            fontFamily: NSD_TYPOGRAPHY.fontBody,
            color:
              stage.status === 'running'
                ? NSD_COLORS.secondary
                : NSD_COLORS.text.muted,
            fontStyle: stage.status === 'waiting' ? 'italic' : 'normal',
          }}
        >
          {statusLabel}
        </div>
      </div>
    </div>
  );
}

export function ExecutionStageTracker({
  runStatus,
  runPhase,
  funnel,
  noRuns,
}: ExecutionStageTrackerProps) {
  const stages: ExecutionStage[] = STAGE_ORDER.map((stageId) => {
    const { status, count } = deriveStageStatus(stageId, runStatus, runPhase, funnel, noRuns);
    const config = getStageConfig(stageId);
    return {
      id: stageId,
      label: config.label,
      sublabel: config.sublabel,
      countLabel: config.countLabel,
      status,
      count,
    };
  });

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
        {stages.map((stage, index) => (
          <StageRow key={stage.id} stage={stage} isLast={index === stages.length - 1} />
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
