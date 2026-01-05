'use client';

import type { ProvenanceType } from '../../lib/campaign-state';
import { getProvenanceLabel, getProvenanceStyle } from '../../lib/campaign-state';
import { NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';

interface ProvenancePillProps {
  provenance: ProvenanceType;
  size?: 'sm' | 'md';
  showTooltip?: boolean;
}

const PROVENANCE_TOOLTIPS: Record<ProvenanceType, string> = {
  CANONICAL: 'This data originates from the canonical ODS, which is the authoritative source of truth.',
  LEGACY_OBSERVED: 'This data was observed from a legacy system. It may require additional validation before use.',
};

/**
 * ProvenancePill - Displays data provenance classification.
 * 
 * Shows whether a record is from the canonical ODS or observed from legacy systems.
 * Per target-state constraints, provenance must be derived from backend fields,
 * never inferred client-side.
 */
export function ProvenancePill({
  provenance,
  size = 'sm',
  showTooltip = true,
}: ProvenancePillProps) {
  const style = getProvenanceStyle(provenance);
  const label = getProvenanceLabel(provenance);
  const tooltip = PROVENANCE_TOOLTIPS[provenance];

  const sizeStyles = {
    sm: { padding: '2px 6px', fontSize: '10px' },
    md: { padding: '3px 8px', fontSize: '11px' },
  };

  const currentSize = sizeStyles[size];

  return (
    <span
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
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
      }}
      title={showTooltip ? tooltip : undefined}
    >
      {label}
    </span>
  );
}

export default ProvenancePill;
