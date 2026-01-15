'use client';

/**
 * CampaignScopeSummary Component
 * 
 * Compact, scannable summary of campaign ICP configuration.
 * Displays targeting criteria so users understand "What is this campaign targeting?"
 * without navigating elsewhere.
 * 
 * GOVERNANCE CONSTRAINTS:
 * - Read-only display
 * - No editing capabilities
 * - No deep nesting
 * - No abbreviations without labels
 * 
 * Displays:
 * - Keywords (ICP filters)
 * - Industries
 * - Employee Size Range
 * - Target Roles
 * - Pain Points
 * - Value Propositions
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import type { CampaignICP } from '../../types/campaign';

interface CampaignScopeSummaryProps {
  icp: CampaignICP | undefined;
  compact?: boolean;
}

function ScopeLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'block',
        fontSize: '11px',
        fontWeight: 500,
        color: NSD_COLORS.text.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: '6px',
      }}
    >
      {children}
    </span>
  );
}

function ScopeValue({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: '13px',
        color: NSD_COLORS.text.primary,
        lineHeight: 1.4,
      }}
    >
      {children}
    </span>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {items.map((item, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            padding: '4px 10px',
            backgroundColor: NSD_COLORS.surface,
            borderRadius: NSD_RADIUS.sm,
            fontSize: '12px',
            color: NSD_COLORS.text.secondary,
            border: `1px solid ${NSD_COLORS.border.light}`,
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '24px',
        textAlign: 'center',
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.md,
      }}
    >
      <Icon name="target" size={24} color={NSD_COLORS.text.muted} />
      <p
        style={{
          margin: '12px 0 0 0',
          fontSize: '13px',
          color: NSD_COLORS.text.muted,
        }}
      >
        {message}
      </p>
    </div>
  );
}

export function CampaignScopeSummary({ icp, compact = false }: CampaignScopeSummaryProps) {
  const hasAnyConfig = icp && (
    (icp.keywords && icp.keywords.length > 0) ||
    (icp.industries && icp.industries.length > 0) ||
    (icp.roles && icp.roles.length > 0) ||
    (icp.painPoints && icp.painPoints.length > 0) ||
    (icp.valuePropositions && icp.valuePropositions.length > 0) ||
    icp.employeeSize
  );

  if (!hasAnyConfig) {
    return <EmptyState message="No ICP criteria configured for this campaign" />;
  }

  const rows: Array<{ label: string; content: React.ReactNode }> = [];

  if (icp.keywords && icp.keywords.length > 0) {
    rows.push({
      label: 'Keywords',
      content: <TagList items={icp.keywords} />,
    });
  }

  if (icp.industries && icp.industries.length > 0) {
    rows.push({
      label: 'Industries',
      content: <TagList items={icp.industries} />,
    });
  }

  if (icp.employeeSize) {
    const sizeLabel = `${icp.employeeSize.min.toLocaleString()}–${icp.employeeSize.max.toLocaleString()} employees`;
    rows.push({
      label: 'Company Size',
      content: <ScopeValue>{sizeLabel}</ScopeValue>,
    });
  }

  if (icp.roles && icp.roles.length > 0) {
    rows.push({
      label: 'Target Roles',
      content: <TagList items={icp.roles} />,
    });
  }

  if (icp.painPoints && icp.painPoints.length > 0) {
    rows.push({
      label: 'Pain Points',
      content: <TagList items={icp.painPoints} />,
    });
  }

  if (icp.valuePropositions && icp.valuePropositions.length > 0) {
    rows.push({
      label: 'Value Propositions',
      content: <TagList items={icp.valuePropositions} />,
    });
  }

  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: compact ? '12px 16px' : '16px 20px',
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
          backgroundColor: NSD_COLORS.surface,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon name="target" size={18} color={NSD_COLORS.secondary} />
          <h4
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: NSD_COLORS.primary,
            }}
          >
            Campaign Scope
          </h4>
        </div>
        <span
          style={{
            fontSize: '11px',
            color: NSD_COLORS.text.muted,
            fontStyle: 'italic',
          }}
        >
          Read-only
        </span>
      </div>

      <div style={{ padding: compact ? '12px 16px' : '16px 20px' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: compact ? '12px' : '16px',
          }}
        >
          {rows.map((row, i) => (
            <div key={i}>
              <ScopeLabel>{row.label}</ScopeLabel>
              {row.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
