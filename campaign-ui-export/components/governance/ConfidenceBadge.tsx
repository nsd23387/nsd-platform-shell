'use client';

import { useState } from 'react';
import type { MetricConfidence } from '../../lib/campaign-state';
import { getConfidenceLabel, getConfidenceStyle } from '../../lib/campaign-state';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';

interface ConfidenceBadgeProps {
  confidence: MetricConfidence;
  size?: 'sm' | 'md';
  showBlockedModal?: boolean;
}

const CONFIDENCE_TOOLTIPS: Record<MetricConfidence, string> = {
  SAFE: 'This metric has been validated by the backend and can be used for decision-making.',
  CONDITIONAL: 'This metric has not been explicitly validated. Use with caution until validation is complete.',
  BLOCKED: 'This metric is blocked due to validation failure or provenance mismatch. Click for details.',
};

/**
 * ConfidenceBadge - Displays metric confidence classification.
 * 
 * Shows whether a metric is Safe, Conditional, or Blocked.
 * Blocked metrics are visually muted and include a tooltip explaining why.
 */
export function ConfidenceBadge({
  confidence,
  size = 'sm',
  showBlockedModal = true,
}: ConfidenceBadgeProps) {
  const [showModal, setShowModal] = useState(false);
  const style = getConfidenceStyle(confidence);
  const label = getConfidenceLabel(confidence);
  const tooltip = CONFIDENCE_TOOLTIPS[confidence];

  const sizeStyles = {
    sm: { padding: '2px 6px', fontSize: '10px' },
    md: { padding: '3px 8px', fontSize: '11px' },
  };

  const currentSize = sizeStyles[size];

  const handleClick = () => {
    if (confidence === 'BLOCKED' && showBlockedModal) {
      setShowModal(true);
    }
  };

  return (
    <>
      <span
        onClick={handleClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: currentSize.padding,
          fontSize: currentSize.fontSize,
          fontWeight: 500,
          fontFamily: NSD_TYPOGRAPHY.fontBody,
          backgroundColor: style.bg,
          color: style.text,
          border: `1px solid ${style.border}`,
          borderRadius: NSD_RADIUS.sm,
          whiteSpace: 'nowrap',
          opacity: style.muted ? 0.7 : 1,
          cursor: confidence === 'BLOCKED' ? 'help' : 'default',
        }}
        title={tooltip}
      >
        {label}
      </span>

      {showModal && (
        <BlockedMetricModal onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

/**
 * Modal explaining why a metric is blocked.
 */
function BlockedMetricModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: NSD_COLORS.background,
          borderRadius: NSD_RADIUS.lg,
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: NSD_COLORS.semantic.critical.text,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
          }}
        >
          Why is this metric blocked?
        </h3>

        <div
          style={{
            padding: '16px',
            backgroundColor: NSD_COLORS.semantic.critical.bg,
            borderRadius: NSD_RADIUS.md,
            marginBottom: '16px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: NSD_COLORS.semantic.critical.text,
              lineHeight: 1.6,
            }}
          >
            This metric is currently blocked due to one or more of the following reasons:
          </p>
        </div>

        <ul
          style={{
            margin: '0 0 20px 0',
            padding: '0 0 0 20px',
            fontSize: '14px',
            color: NSD_COLORS.text.secondary,
            lineHeight: 1.8,
          }}
        >
          <li><strong>Insufficient Validation:</strong> The metric has not passed required validation checks.</li>
          <li><strong>Provenance Mismatch:</strong> The data source does not match the canonical ODS.</li>
          <li><strong>Stale Data:</strong> The metric data is outdated and may not reflect current state.</li>
          <li><strong>Governance Hold:</strong> A governance review is pending for this data.</li>
        </ul>

        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#EFF6FF',
            borderRadius: NSD_RADIUS.sm,
            marginBottom: '20px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#1E40AF',
            }}
          >
            <strong>Note:</strong> Blocked metrics should not be used for decision-making.
            Contact the data governance team if you need this metric unblocked.
          </p>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
            backgroundColor: NSD_COLORS.primary,
            color: NSD_COLORS.text.inverse,
            border: 'none',
            borderRadius: NSD_RADIUS.md,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default ConfidenceBadge;
