'use client';

/**
 * M68-04.1: Readiness Resolution Panel
 * 
 * Displays comprehensive readiness evaluation results.
 * Shows individual check results and overall readiness state.
 * 
 * CONSTRAINTS:
 * - Read-only display only
 * - No execution triggers
 * - No side effects
 */

import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../lib/design-tokens';
import type { ReadinessResolution, ReadinessCheckResult } from '../lib/readiness-resolver';
import { getReadinessStateStyle, getCheckResultStyle, getCheckLabel } from '../lib/readiness-resolver';

interface ReadinessResolutionPanelProps {
  resolution: ReadinessResolution;
  /** Optional title override */
  title?: string;
  /** Show detailed blocking reasons */
  showBlockingReasons?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

export function ReadinessResolutionPanel({
  resolution,
  title = 'Execution Readiness',
  showBlockingReasons = true,
  compact = false,
}: ReadinessResolutionPanelProps) {
  const stateStyle = getReadinessStateStyle(resolution.state);

  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        overflow: 'hidden',
      }}
    >
      {/* Header with overall state */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: compact ? '12px 16px' : '16px 20px',
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
          backgroundColor: stateStyle.bg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontSize: compact ? '18px' : '24px',
              lineHeight: 1,
            }}
          >
            {stateStyle.icon}
          </span>
          <div>
            <h4
              style={{
                margin: 0,
                fontSize: compact ? '14px' : '16px',
                fontWeight: 600,
                fontFamily: NSD_TYPOGRAPHY.fontDisplay,
                color: stateStyle.text,
              }}
            >
              {title}
            </h4>
            <p
              style={{
                margin: '2px 0 0 0',
                fontSize: compact ? '12px' : '13px',
                color: stateStyle.text,
                opacity: 0.9,
              }}
            >
              {resolution.summary}
            </p>
          </div>
        </div>
        <div
          style={{
            padding: '6px 14px',
            backgroundColor: stateStyle.text,
            color: '#ffffff',
            borderRadius: NSD_RADIUS.md,
            fontSize: compact ? '12px' : '13px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
          }}
        >
          {resolution.state}
        </div>
      </div>

      {/* Individual checks */}
      <div style={{ padding: compact ? '12px' : '16px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: compact ? '1fr' : 'repeat(2, 1fr)',
            gap: compact ? '8px' : '12px',
          }}
        >
          {resolution.checks.map((check) => (
            <CheckResultCard key={check.check} result={check} compact={compact} />
          ))}
        </div>

        {/* Missing data warning */}
        {resolution.hasIncompleteData && (
          <div
            style={{
              marginTop: compact ? '12px' : '16px',
              padding: '10px 14px',
              backgroundColor: '#FEF3C7',
              borderRadius: NSD_RADIUS.md,
              border: '1px solid #FCD34D',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: '#92400E',
              }}
            >
              <strong>Incomplete Data:</strong> Some readiness data is unavailable.
              Missing: {resolution.missingFields.join(', ')}.
            </p>
          </div>
        )}

        {/* Blocking reasons */}
        {showBlockingReasons && resolution.blockingReasons.length > 0 && (
          <div style={{ marginTop: compact ? '12px' : '16px' }}>
            <h5
              style={{
                margin: '0 0 8px 0',
                fontSize: '12px',
                fontWeight: 600,
                color: NSD_COLORS.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Blocking Reasons
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {resolution.blockingReasons.map((reason, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#FEE2E2',
                    borderRadius: NSD_RADIUS.sm,
                  }}
                >
                  <span style={{ color: '#991B1B', fontSize: '12px' }}>•</span>
                  <span style={{ fontSize: '13px', color: '#991B1B' }}>{reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resolution timestamp */}
        <p
          style={{
            margin: `${compact ? '10px' : '14px'} 0 0 0`,
            fontSize: '11px',
            color: NSD_COLORS.text.muted,
            textAlign: 'right',
          }}
        >
          Resolved: {new Date(resolution.resolvedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

/**
 * Individual check result card.
 */
function CheckResultCard({
  result,
  compact,
}: {
  result: ReadinessCheckResult;
  compact: boolean;
}) {
  const style = getCheckResultStyle(result);
  const label = getCheckLabel(result.check);

  return (
    <div
      style={{
        padding: compact ? '10px 12px' : '14px 16px',
        backgroundColor: style.bg,
        borderRadius: NSD_RADIUS.md,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
      }}
    >
      <span
        style={{
          fontSize: compact ? '14px' : '16px',
          lineHeight: 1,
          marginTop: '2px',
        }}
      >
        {style.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: compact ? '12px' : '13px',
              fontWeight: 600,
              color: style.text,
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontSize: compact ? '11px' : '12px',
              fontWeight: 500,
              color: style.text,
              opacity: 0.9,
            }}
          >
            {result.status}
          </span>
        </div>
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: compact ? '11px' : '12px',
            color: style.text,
            opacity: 0.85,
            lineHeight: 1.4,
          }}
        >
          {result.message}
        </p>
        {result.value !== undefined && result.threshold !== undefined && (
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '11px',
              color: style.text,
              opacity: 0.7,
            }}
          >
            Value: {String(result.value)} | Threshold: {result.threshold}
          </p>
        )}
      </div>
    </div>
  );
}

export default ReadinessResolutionPanel;
