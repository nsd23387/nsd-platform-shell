'use client';

/**
 * ResultsBreakdownCards Component
 * 
 * Post-stage completion cards showing counts and skip reasons.
 * Makes zero outcomes explainable, not alarming.
 * 
 * GOVERNANCE CONSTRAINTS (CRITICAL):
 * - This component is PRESENTATIONAL ONLY. It does NOT define execution semantics.
 * - Cards are keyed by stage ID, NOT hardcoded types
 * - Cards render ONLY when backend emits breakdown data
 * - Use "Skipped", never "Failed" for qualification outcomes
 * - Data sourced from ODS events / funnel data
 * - Zero promoted leads is NOT an error
 * - Numbers must reconcile from observed data only
 * - Read-only display
 * - Future stages show NO cards until data exists
 * 
 * DO NOT add placeholder cards for future stages.
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { CANONICAL_STAGE_CONFIG, getStageConfig, isFutureStage } from '../../lib/execution-stages';
import type { ObservabilityFunnel, PipelineStage } from '../../types/campaign';

interface ResultsBreakdownCardsProps {
  funnel: ObservabilityFunnel | null;
  runStatus: string | null;
}

interface BreakdownItem {
  label: string;
  value: number;
  isSkipped?: boolean;
  skipReason?: string;
}

interface BreakdownCard {
  stageId: string;
  title: string;
  icon: string;
  items: BreakdownItem[];
  status: 'completed' | 'in_progress' | 'pending';
  explanation?: string;
}

interface StageBreakdownConfig {
  stageId: string;
  funnelStageId: string;
  title: string;
  icon: string;
  countLabel: string;
  relatedStages?: Array<{
    funnelStageId: string;
    label: string;
    isSkipped: boolean;
    skipReason?: string;
  }>;
  explanationFn?: (data: Map<string, number>) => string | undefined;
}

/**
 * Stage breakdown configuration
 * 
 * GOVERNANCE CONSTRAINT (CRITICAL):
 * This configuration defines how to render breakdown cards for CURRENT stages only.
 * Cards only render when the funnelStageId has data in the funnel.
 * 
 * DO NOT add future stage funnel IDs here until backend contract confirms them.
 * Future stages will be rendered via the unknown stage fallback when their data appears.
 */
const STAGE_BREAKDOWN_CONFIG: StageBreakdownConfig[] = [
  {
    stageId: 'org_sourcing',
    funnelStageId: 'orgs_sourced',
    title: 'Organizations Sourced',
    icon: 'building',
    countLabel: 'Organizations',
  },
  {
    stageId: 'contact_discovery',
    funnelStageId: 'contacts_discovered',
    title: 'Contacts Discovered',
    icon: 'users',
    countLabel: 'Total Discovered',
    relatedStages: [
      { funnelStageId: 'contacts_with_email', label: 'With Email', isSkipped: false },
      { funnelStageId: 'contacts_without_email', label: 'Without Email', isSkipped: true, skipReason: 'skipped for promotion' },
    ],
    explanationFn: (data) => {
      const withoutEmail = data.get('contacts_without_email');
      if (withoutEmail !== undefined && withoutEmail > 0) {
        return 'Contacts without email cannot be promoted to leads.';
      }
      return undefined;
    },
  },
  {
    stageId: 'lead_creation',
    funnelStageId: 'leads_promoted',
    title: 'Lead Promotion',
    icon: 'star',
    countLabel: 'Leads Promoted',
    relatedStages: [
      { funnelStageId: 'leads_skipped_no_email', label: 'Skipped', isSkipped: true, skipReason: 'missing email' },
      { funnelStageId: 'leads_skipped_invalid_email', label: 'Skipped', isSkipped: true, skipReason: 'invalid email format' },
    ],
    explanationFn: (data) => {
      const leads = data.get('leads_promoted') || 0;
      const contacts = data.get('contacts_discovered') || 0;
      if (leads === 0 && contacts > 0) {
        return 'No contacts met the criteria for lead promotion.';
      }
      return undefined;
    },
  },
];

function BreakdownRow({ item }: { item: BreakdownItem }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: `1px solid ${NSD_COLORS.border.light}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            fontSize: '13px',
            fontFamily: NSD_TYPOGRAPHY.fontBody,
            color: item.isSkipped ? NSD_COLORS.text.muted : NSD_COLORS.text.primary,
          }}
        >
          {item.label}
        </span>
        {item.isSkipped && item.skipReason && (
          <span
            style={{
              fontSize: '11px',
              color: NSD_COLORS.text.muted,
              fontStyle: 'italic',
            }}
          >
            ({item.skipReason})
          </span>
        )}
      </div>
      <span
        style={{
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: NSD_TYPOGRAPHY.fontDisplay,
          color: item.isSkipped ? NSD_COLORS.text.muted : NSD_COLORS.primary,
        }}
      >
        {item.value.toLocaleString()}
      </span>
    </div>
  );
}

function CardComponent({ card }: { card: BreakdownCard }) {
  const statusColors = {
    completed: NSD_COLORS.semantic.positive,
    in_progress: NSD_COLORS.semantic.active,
    pending: NSD_COLORS.semantic.muted,
  };

  const statusStyle = statusColors[card.status];

  return (
    <div
      style={{
        flex: '1 1 280px',
        minWidth: '260px',
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
          gap: '10px',
          padding: '14px 16px',
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
          backgroundColor: statusStyle.bg,
        }}
      >
        <Icon name={card.icon as any} size={16} color={statusStyle.text} />
        <h4
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: statusStyle.text,
          }}
        >
          {card.title}
        </h4>
      </div>

      <div style={{ padding: '8px 16px' }}>
        {card.items.map((item, index) => (
          <BreakdownRow key={index} item={item} />
        ))}
      </div>

      {card.explanation && (
        <div
          style={{
            padding: '10px 16px',
            borderTop: `1px solid ${NSD_COLORS.border.light}`,
            backgroundColor: NSD_COLORS.surface,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: NSD_COLORS.text.muted,
              fontStyle: 'italic',
            }}
          >
            {card.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Build breakdown cards from funnel data
 * 
 * GOVERNANCE CONSTRAINT:
 * Cards only render when backend has emitted data for the stage.
 * No placeholder cards for future stages.
 */
function buildBreakdownCards(
  funnel: ObservabilityFunnel | null,
  isCompleted: boolean,
  isRunning: boolean
): BreakdownCard[] {
  if (!funnel?.stages) {
    return [];
  }

  const stageMap = new Map<string, number>();
  funnel.stages.forEach((s) => {
    stageMap.set(s.stage, s.count);
  });

  const cards: BreakdownCard[] = [];

  for (const config of STAGE_BREAKDOWN_CONFIG) {
    const mainCount = stageMap.get(config.funnelStageId);
    
    if (mainCount === undefined) {
      continue;
    }

    const items: BreakdownItem[] = [
      { label: config.countLabel, value: mainCount },
    ];

    if (config.relatedStages) {
      for (const related of config.relatedStages) {
        const relatedCount = stageMap.get(related.funnelStageId);
        if (relatedCount !== undefined && relatedCount > 0) {
          items.push({
            label: related.label,
            value: relatedCount,
            isSkipped: related.isSkipped,
            skipReason: related.skipReason,
          });
        }
      }
    }

    const explanation = config.explanationFn ? config.explanationFn(stageMap) : undefined;

    cards.push({
      stageId: config.stageId,
      title: config.title,
      icon: config.icon,
      items,
      status: isCompleted ? 'completed' : isRunning ? 'in_progress' : 'pending',
      explanation,
    });
  }

  const knownFunnelIds = new Set(
    STAGE_BREAKDOWN_CONFIG.flatMap((c) => [
      c.funnelStageId,
      ...(c.relatedStages?.map((r) => r.funnelStageId) || []),
    ])
  );

  funnel.stages.forEach((stage) => {
    if (!knownFunnelIds.has(stage.stage) && stage.count > 0) {
      cards.push({
        stageId: `unknown_${stage.stage}`,
        title: 'Additional Data',
        icon: 'info',
        items: [{ label: stage.stage, value: stage.count }],
        status: isCompleted ? 'completed' : isRunning ? 'in_progress' : 'pending',
      });
    }
  });

  return cards;
}

export function ResultsBreakdownCards({
  funnel,
  runStatus,
}: ResultsBreakdownCardsProps) {
  const isCompleted = runStatus?.toLowerCase() === 'completed' || 
                      runStatus?.toLowerCase() === 'success' ||
                      runStatus?.toLowerCase() === 'succeeded';
  const isRunning = runStatus?.toLowerCase() === 'running' || 
                    runStatus?.toLowerCase() === 'in_progress';

  const cards = buildBreakdownCards(funnel, isCompleted, isRunning);

  if (cards.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
      }}
    >
      {cards.map((card) => (
        <CardComponent key={card.stageId} card={card} />
      ))}
    </div>
  );
}

export default ResultsBreakdownCards;
