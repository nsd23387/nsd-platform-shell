'use client';

import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import type { ReadinessLevel } from '../../lib/campaign-state';

interface ExecutionReadinessData {
  // Mailbox health
  mailboxHealthy: boolean;
  mailboxHealthStatus?: string;
  
  // Deliverability
  deliverabilityScore?: number;
  deliverabilityThreshold: number; // >=95 required
  
  // Throughput limits
  currentThroughput?: number;
  maxThroughput?: number;
  
  // Kill switch
  killSwitchEnabled: boolean;
  
  // Last check timestamp
  lastReadinessCheck?: string;
  
  // Overall readiness
  readinessLevel: ReadinessLevel;
  blockingReasons: string[];
}

interface ExecutionReadinessProps {
  data: ExecutionReadinessData;
  onViewDetails?: () => void;
}

const READINESS_STYLES: Record<ReadinessLevel, { bg: string; text: string; border: string; icon: string }> = {
  READY: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7', icon: '✓' },
  NOT_READY: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA', icon: '✗' },
  UNKNOWN: { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB', icon: '?' },
};

/**
 * ExecutionReadinessPanel - Displays execution readiness status.
 * 
 * Read-only panel showing:
 * - Mailbox health status
 * - Deliverability threshold (>=95)
 * - Throughput limits (current vs max)
 * - Kill switch state (default OFF)
 * - Last readiness check timestamp
 * 
 * Per target-state constraints, this is observability only - no execution triggers.
 */
export function ExecutionReadinessPanel({ data, onViewDetails }: ExecutionReadinessProps) {
  const readinessStyle = READINESS_STYLES[data.readinessLevel];
  const deliverabilityOk = (data.deliverabilityScore ?? 0) >= data.deliverabilityThreshold;

  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        overflow: 'hidden',
      }}
    >
      {/* Header with overall status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: readinessStyle.bg,
          borderBottom: `1px solid ${readinessStyle.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              backgroundColor: NSD_COLORS.background,
              borderRadius: '50%',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {readinessStyle.icon}
          </span>
          <div>
            <h4
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: NSD_TYPOGRAPHY.fontDisplay,
                color: readinessStyle.text,
              }}
            >
              Execution Readiness
            </h4>
            <p
              style={{
                margin: '2px 0 0 0',
                fontSize: '12px',
                color: readinessStyle.text,
                opacity: 0.9,
              }}
            >
              {data.readinessLevel === 'READY' && 'System ready for execution (observed externally)'}
              {data.readinessLevel === 'NOT_READY' && 'System not ready - see blocking reasons'}
              {data.readinessLevel === 'UNKNOWN' && 'Readiness status unknown'}
            </p>
          </div>
        </div>

        <span
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
            backgroundColor: NSD_COLORS.background,
            color: readinessStyle.text,
            borderRadius: NSD_RADIUS.sm,
            textTransform: 'uppercase',
          }}
        >
          {data.readinessLevel.replace('_', ' ')}
        </span>
      </div>

      {/* Status grid */}
      <div style={{ padding: '20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          {/* Mailbox Health */}
          <StatusItem
            label="Mailbox Health"
            value={data.mailboxHealthStatus || (data.mailboxHealthy ? 'Healthy' : 'Unhealthy')}
            status={data.mailboxHealthy ? 'ok' : 'error'}
          />

          {/* Deliverability */}
          <StatusItem
            label="Deliverability"
            value={data.deliverabilityScore !== undefined 
              ? `${data.deliverabilityScore}% (threshold: ${data.deliverabilityThreshold}%)`
              : 'Unknown'
            }
            status={data.deliverabilityScore === undefined ? 'unknown' : deliverabilityOk ? 'ok' : 'error'}
          />

          {/* Throughput */}
          <StatusItem
            label="Throughput"
            value={data.currentThroughput !== undefined && data.maxThroughput !== undefined
              ? `${data.currentThroughput} / ${data.maxThroughput}`
              : 'Not configured'
            }
            status={data.currentThroughput !== undefined ? 'ok' : 'unknown'}
          />

          {/* Kill Switch */}
          <StatusItem
            label="Kill Switch"
            value={data.killSwitchEnabled ? 'ENABLED (Execution Halted)' : 'Off'}
            status={data.killSwitchEnabled ? 'error' : 'ok'}
          />
        </div>

        {/* Blocking reasons */}
        {data.blockingReasons.length > 0 && (
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#FEF2F2',
              borderRadius: NSD_RADIUS.md,
              marginBottom: '16px',
            }}
          >
            <h5
              style={{
                margin: '0 0 10px 0',
                fontSize: '12px',
                fontWeight: 600,
                color: '#991B1B',
                textTransform: 'uppercase',
              }}
            >
              Blocking Reasons
            </h5>
            <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: '13px', color: '#991B1B' }}>
              {data.blockingReasons.map((reason, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>
                  {reason.replace(/_/g, ' ')}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Last check timestamp */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: NSD_COLORS.text.muted,
          }}
        >
          <span>
            Last checked:{' '}
            {data.lastReadinessCheck
              ? new Date(data.lastReadinessCheck).toLocaleString()
              : 'Never'}
          </span>
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 500,
                color: NSD_COLORS.secondary,
                backgroundColor: 'transparent',
                border: `1px solid ${NSD_COLORS.secondary}`,
                borderRadius: NSD_RADIUS.sm,
                cursor: 'pointer',
              }}
            >
              View Details
            </button>
          )}
        </div>

        {/* Read-only notice */}
        <div
          style={{
            marginTop: '16px',
            padding: '10px 14px',
            backgroundColor: '#EFF6FF',
            borderRadius: NSD_RADIUS.sm,
            fontSize: '12px',
            color: '#1E40AF',
          }}
        >
          <strong>Note:</strong> Readiness status is observational. Execution is managed by backend systems.
        </div>
      </div>
    </div>
  );
}

function StatusItem({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: 'ok' | 'error' | 'unknown';
}) {
  const statusColors = {
    ok: NSD_COLORS.success,
    error: NSD_COLORS.error,
    unknown: NSD_COLORS.text.muted,
  };

  return (
    <div
      style={{
        padding: '12px 14px',
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.md,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '11px',
          fontWeight: 500,
          color: NSD_COLORS.text.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: '4px 0 0 0',
          fontSize: '13px',
          fontWeight: 600,
          color: statusColors[status],
        }}
      >
        {value}
      </p>
    </div>
  );
}

export default ExecutionReadinessPanel;
