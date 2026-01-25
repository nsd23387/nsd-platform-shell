'use client';

import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, getSemanticStatusStyle } from '../../lib/design-tokens';

export type ExecutionState = 'idle' | 'queued' | 'running' | 'stalled' | 'completed' | 'failed' | 'blocked';

interface ExecutionStatusBadgeProps {
  state: ExecutionState;
  currentStage?: string;
  size?: 'sm' | 'md';
}

const STATE_LABELS: Record<ExecutionState, string> = {
  idle: 'Idle',
  queued: 'Queued',
  running: 'Running',
  stalled: 'Stalled',
  completed: 'Completed',
  failed: 'Failed',
  blocked: 'Blocked',
};

const STAGE_LABELS: Record<string, string> = {
  org_sourcing: 'Orgs',
  contact_discovery: 'Contacts',
  contact_evaluation: 'Evaluating',
  lead_promotion: 'Leads',
  email_send: 'Sending',
};

export function ExecutionStatusBadge({ state, currentStage, size = 'sm' }: ExecutionStatusBadgeProps) {
  const styles = getSemanticStatusStyle(state);
  const label = STATE_LABELS[state] || state;
  const stageLabel = currentStage ? STAGE_LABELS[currentStage] || currentStage : null;

  const isCompact = size === 'sm';
  const showStage = state === 'running' && stageLabel;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: isCompact ? '3px 8px' : '4px 10px',
        backgroundColor: styles.bg,
        color: styles.text,
        border: `1px solid ${styles.border}`,
        borderRadius: NSD_RADIUS.full,
        fontSize: isCompact ? '11px' : '12px',
        fontWeight: 500,
        fontFamily: NSD_TYPOGRAPHY.fontBody,
        whiteSpace: 'nowrap',
      }}
    >
      {state === 'running' && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: styles.text,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      )}
      {label}
      {showStage && (
        <span style={{ opacity: 0.8, fontSize: isCompact ? '10px' : '11px' }}>
          ({stageLabel})
        </span>
      )}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </span>
  );
}

export default ExecutionStatusBadge;
