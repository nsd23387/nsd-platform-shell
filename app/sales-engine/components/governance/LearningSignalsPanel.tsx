'use client';

import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import type { AutonomyLevel } from '../../lib/campaign-state';
import { getAutonomyLevelDescription } from '../../lib/campaign-state';

interface LearningSignal {
  id: string;
  name: string;
  type: 'reply_outcome' | 'bounce' | 'open_rate' | 'click_rate' | 'engagement' | 'other';
  collected: boolean;
  eligibleForLearning: boolean;
  excludedFromAutomation: boolean;
  reason?: string;
}

interface LearningSignalsPanelProps {
  signals?: LearningSignal[];
  autonomyLevel: AutonomyLevel;
  campaignId: string;
}

const SIGNAL_ICONS: Record<string, string> = {
  reply_outcome: '💬',
  bounce: '↩️',
  open_rate: '👁️',
  click_rate: '🔗',
  engagement: '📊',
  other: '📝',
};

/**
 * LearningSignalsPanel - Displays learning signal status (Insight-Only).
 * 
 * Per target-state constraints:
 * - Signals are observational only
 * - Autonomy is L0-L2 only; no automated write-backs
 * - UI must not imply autonomous optimization
 */
export function LearningSignalsPanel({
  signals,
  autonomyLevel,
  campaignId,
}: LearningSignalsPanelProps) {
  const autonomyDescription = getAutonomyLevelDescription(autonomyLevel);
  
  // Count signal categories
  const collected = signals?.filter(s => s.collected).length || 0;
  const eligible = signals?.filter(s => s.eligibleForLearning).length || 0;
  const excluded = signals?.filter(s => s.excludedFromAutomation).length || 0;

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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🧠</span>
          <h4
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: NSD_COLORS.text.primary,
            }}
          >
            Learning Signals (Insight-Only)
          </h4>
        </div>
        <span
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 500,
            backgroundColor: '#EFF6FF',
            color: '#1E40AF',
            borderRadius: NSD_RADIUS.sm,
          }}
        >
          Observational
        </span>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Autonomy Level */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            padding: '14px 16px',
            backgroundColor: '#FEF3C7',
            borderRadius: NSD_RADIUS.md,
            marginBottom: '20px',
          }}
        >
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                fontWeight: 600,
                color: '#92400E',
              }}
            >
              Autonomy Level: {autonomyLevel}
            </p>
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '12px',
                color: '#92400E',
                opacity: 0.9,
              }}
            >
              {autonomyDescription}
            </p>
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '11px',
                fontWeight: 500,
                color: '#92400E',
              }}
            >
              No automated write-backs are performed by this UI.
            </p>
          </div>
        </div>

        {/* Signal summary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <SummaryCard
            label="Signals Collected"
            value={collected}
            color={NSD_COLORS.info}
          />
          <SummaryCard
            label="Eligible for Learning"
            value={eligible}
            color={NSD_COLORS.success}
          />
          <SummaryCard
            label="Excluded from Automation"
            value={excluded}
            color={NSD_COLORS.warning}
          />
        </div>

        {/* Signal list */}
        {signals && signals.length > 0 ? (
          <div style={{ marginBottom: '20px' }}>
            <h5
              style={{
                margin: '0 0 12px 0',
                fontSize: '12px',
                fontWeight: 600,
                color: NSD_COLORS.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Signal Details
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {signals.map((signal) => (
                <SignalRow key={signal.id} signal={signal} />
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '32px 24px',
              textAlign: 'center',
              backgroundColor: NSD_COLORS.surface,
              borderRadius: NSD_RADIUS.lg,
              marginBottom: '20px',
              border: `1px dashed ${NSD_COLORS.border.default}`,
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 16px',
                backgroundColor: NSD_COLORS.background,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              🧠
            </div>
            <h5
              style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: NSD_TYPOGRAPHY.fontDisplay,
                color: NSD_COLORS.primary,
              }}
            >
              No Learning Signals Configured
            </h5>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: NSD_COLORS.text.secondary,
                maxWidth: '360px',
                marginLeft: 'auto',
                marginRight: 'auto',
                lineHeight: 1.5,
              }}
            >
              Learning signals will appear here once they are configured for this campaign by the backend system.
              Signals are collected for observability only.
            </p>
          </div>
        )}

        {/* Governance notice */}
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: '#EFF6FF',
            borderRadius: NSD_RADIUS.md,
            border: '1px solid #BFDBFE',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '14px' }}>ℹ️</span>
          <div>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: '#1E40AF' }}>
              Governance Note
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#1E40AF', opacity: 0.9, lineHeight: 1.5 }}>
              Learning signals are collected for observability and offline analysis only.
              This UI does not trigger automated optimization or model updates.
              All learning is human-supervised and governed by the data governance team.
            </p>
          </div>
        </div>

        {/* Campaign ID reference */}
        <p
          style={{
            margin: '12px 0 0 0',
            fontSize: '11px',
            color: NSD_COLORS.text.muted,
          }}
        >
          Campaign: {campaignId}
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        padding: '14px',
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.md,
        textAlign: 'center',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 700,
          fontFamily: NSD_TYPOGRAPHY.fontDisplay,
          color,
        }}
      >
        {value}
      </p>
      <p
        style={{
          margin: '4px 0 0 0',
          fontSize: '11px',
          color: NSD_COLORS.text.muted,
        }}
      >
        {label}
      </p>
    </div>
  );
}

function SignalRow({ signal }: { signal: LearningSignal }) {
  const icon = SIGNAL_ICONS[signal.type] || SIGNAL_ICONS.other;
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.sm,
      }}
    >
      <span style={{ fontSize: '14px' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 500,
            color: NSD_COLORS.text.primary,
          }}
        >
          {signal.name}
        </p>
        {signal.reason && (
          <p
            style={{
              margin: '2px 0 0 0',
              fontSize: '11px',
              color: NSD_COLORS.text.muted,
            }}
          >
            {signal.reason}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {signal.collected && (
          <span
            style={{
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 500,
              backgroundColor: '#DBEAFE',
              color: '#1E40AF',
              borderRadius: NSD_RADIUS.sm,
            }}
          >
            Collected
          </span>
        )}
        {signal.eligibleForLearning && (
          <span
            style={{
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 500,
              backgroundColor: '#D1FAE5',
              color: '#065F46',
              borderRadius: NSD_RADIUS.sm,
            }}
          >
            Eligible
          </span>
        )}
        {signal.excludedFromAutomation && (
          <span
            style={{
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 500,
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              borderRadius: NSD_RADIUS.sm,
            }}
          >
            Excluded
          </span>
        )}
      </div>
    </div>
  );
}

export default LearningSignalsPanel;
