'use client';

/**
 * FunnelSummaryWidget Component
 * 
 * Compact pipeline funnel snapshot for the Overview tab.
 * Shows key counts so users understand "Where in the funnel is this campaign?"
 * without navigating to the Observability tab.
 * 
 * GOVERNANCE CONSTRAINTS:
 * - Read-only display
 * - Counts are backend-authoritative (no local math)
 * - Empty funnel presented as valid state, not broken
 * 
 * Displays:
 * - Organizations sourced
 * - Contacts discovered
 * - Leads promoted
 * - Messages sent
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { formatEt } from '../../lib/time';
import type { ObservabilityFunnel, PipelineStage } from '../../types/campaign';

interface FunnelSummaryWidgetProps {
  funnel: ObservabilityFunnel | null;
  loading?: boolean;
}

interface FunnelMetric {
  stage: string;
  label: string;
  icon: string;
  count: number;
}

function extractFunnelMetrics(funnel: ObservabilityFunnel | null): FunnelMetric[] {
  // AUTHORITATIVE PIPELINE ORDER:
  // Organizations Sourced → Contacts Discovered → Contacts Scored → Leads Promoted → Emails Sent
  const metrics: FunnelMetric[] = [
    { stage: 'orgs_sourced', label: 'Organizations', icon: 'briefcase', count: 0 },
    { stage: 'contacts_discovered', label: 'Contacts', icon: 'users', count: 0 },
    { stage: 'contacts_scored', label: 'Scored', icon: 'check', count: 0 },
    { stage: 'leads_promoted', label: 'Leads', icon: 'star', count: 0 },
    { stage: 'emails_sent', label: 'Sent', icon: 'mail', count: 0 },
  ];

  if (!funnel || !funnel.stages) return metrics;

  const stageMap = new Map<string, number>();
  funnel.stages.forEach((stage) => {
    stageMap.set(stage.stage, stage.count);
  });

  return metrics.map((m) => ({
    ...m,
    count: stageMap.get(m.stage) ?? 0,
  }));
}

function MetricCard({ metric }: { metric: FunnelMetric }) {
  return (
    <div
      style={{
        flex: '1 1 120px',
        minWidth: '100px',
        padding: '12px 16px',
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.md,
        border: `1px solid ${NSD_COLORS.border.light}`,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          marginBottom: '8px',
        }}
      >
        <Icon name={metric.icon as any} size={14} color={NSD_COLORS.text.muted} />
        <span
          style={{
            fontSize: '11px',
            color: NSD_COLORS.text.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {metric.label}
        </span>
      </div>
      <div
        style={{
          fontSize: '24px',
          fontWeight: 600,
          fontFamily: NSD_TYPOGRAPHY.fontDisplay,
          color: NSD_COLORS.primary,
        }}
      >
        {metric.count.toLocaleString()}
      </div>
    </div>
  );
}

function EmptyFunnelState() {
  return (
    <div
      style={{
        padding: '24px',
        textAlign: 'center',
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.md,
      }}
    >
      <Icon name="chart" size={24} color={NSD_COLORS.text.muted} />
      <p
        style={{
          margin: '12px 0 4px 0',
          fontSize: '14px',
          fontWeight: 500,
          color: NSD_COLORS.text.secondary,
        }}
      >
        No funnel activity yet
      </p>
      <p
        style={{
          margin: 0,
          fontSize: '13px',
          color: NSD_COLORS.text.muted,
        }}
      >
        Pipeline counts will appear here after execution begins.
      </p>
    </div>
  );
}

export function FunnelSummaryWidget({ funnel, loading = false }: FunnelSummaryWidgetProps) {
  const metrics = extractFunnelMetrics(funnel);
  const hasAnyActivity = metrics.some((m) => m.count > 0);

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
          padding: '14px 20px',
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
          backgroundColor: NSD_COLORS.surface,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon name="chart" size={18} color={NSD_COLORS.secondary} />
          <h4
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: NSD_COLORS.primary,
            }}
          >
            Pipeline Funnel
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

      <div style={{ padding: '16px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.muted }}>
              Loading funnel data...
            </p>
          </div>
        ) : !hasAnyActivity && !funnel ? (
          <EmptyFunnelState />
        ) : (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {metrics.map((metric) => (
              <MetricCard key={metric.stage} metric={metric} />
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 20px',
          borderTop: `1px solid ${NSD_COLORS.border.light}`,
          backgroundColor: NSD_COLORS.surface,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            color: NSD_COLORS.text.muted,
            fontStyle: 'italic',
          }}
        >
          Counts are backend-authoritative. View Observability tab for details.
        </p>
        {funnel?.last_updated_at && (
          <p
            style={{
              margin: 0,
              fontSize: '10px',
              color: NSD_COLORS.text.muted,
            }}
          >
            Updated: {formatEt(funnel.last_updated_at)}
          </p>
        )}
      </div>
    </div>
  );
}
