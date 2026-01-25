'use client';

import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

interface MiniPipelineIndicatorProps {
  orgs: number | null;
  contacts: number | null;
  leads: number | null;
}

export function MiniPipelineIndicator({ orgs, contacts, leads }: MiniPipelineIndicatorProps) {
  const hasData = orgs !== null || contacts !== null || leads !== null;

  if (!hasData) {
    return (
      <span
        style={{
          fontSize: '12px',
          color: NSD_COLORS.text.muted,
          fontStyle: 'italic',
        }}
      >
        No data
      </span>
    );
  }

  const formatCount = (count: number | null): string => {
    if (count === null) return '—';
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        fontFamily: NSD_TYPOGRAPHY.fontBody,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '2px 6px',
          backgroundColor: NSD_COLORS.surface,
          borderRadius: NSD_RADIUS.sm,
          color: NSD_COLORS.text.secondary,
        }}
        title="Organizations"
      >
        <span style={{ fontSize: '10px', opacity: 0.7 }}>O</span>
        {formatCount(orgs)}
      </span>
      <Icon name="arrow-right" size={10} color={NSD_COLORS.text.muted} />
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '2px 6px',
          backgroundColor: NSD_COLORS.surface,
          borderRadius: NSD_RADIUS.sm,
          color: NSD_COLORS.text.secondary,
        }}
        title="Contacts"
      >
        <span style={{ fontSize: '10px', opacity: 0.7 }}>C</span>
        {formatCount(contacts)}
      </span>
      <Icon name="arrow-right" size={10} color={NSD_COLORS.text.muted} />
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '2px 6px',
          backgroundColor: '#FFFFFF',
          border: `1px solid ${leads !== null && leads > 0 ? NSD_COLORS.violet.base : NSD_COLORS.border.light}`,
          borderRadius: NSD_RADIUS.sm,
          color: leads !== null && leads > 0 ? NSD_COLORS.violet.base : NSD_COLORS.text.secondary,
          fontWeight: leads !== null && leads > 0 ? 600 : 400,
        }}
        title="Leads"
      >
        <span style={{ fontSize: '10px', opacity: 0.7 }}>L</span>
        {formatCount(leads)}
      </span>
    </div>
  );
}

export default MiniPipelineIndicator;
