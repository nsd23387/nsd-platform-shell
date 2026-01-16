'use client';

/**
 * ResultsBreakdownCards Component
 * 
 * Post-stage completion cards showing counts and skip reasons.
 * Makes zero outcomes explainable, not alarming.
 * 
 * GOVERNANCE CONSTRAINTS:
 * - Use "Skipped", never "Failed" for qualification outcomes
 * - Data sourced from ODS events / funnel data
 * - Zero promoted leads is NOT an error
 * - Numbers must reconcile
 * - Read-only display
 * 
 * Cards:
 * - Contact Discovery: Total, With Email, Without Email (skipped)
 * - Lead Promotion: Eligible, Promoted, Skipped reasons
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
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
  title: string;
  icon: string;
  items: BreakdownItem[];
  status: 'completed' | 'in_progress' | 'pending';
  explanation?: string;
}

function extractBreakdownData(funnel: ObservabilityFunnel | null): {
  orgs: number;
  contacts: number;
  contactsWithEmail: number | null;
  contactsWithoutEmail: number | null;
  leads: number;
  leadsSkippedNoEmail: number | null;
  leadsSkippedInvalidEmail: number | null;
} {
  const stageMap = new Map<string, number>();
  funnel?.stages?.forEach((s) => {
    stageMap.set(s.stage, s.count);
  });

  const orgs = stageMap.get('orgs_sourced') || 0;
  const contacts = stageMap.get('contacts_discovered') || 0;
  const leads = stageMap.get('leads_promoted') || 0;
  
  const contactsWithEmail = stageMap.has('contacts_with_email') 
    ? stageMap.get('contacts_with_email')! 
    : null;
  const contactsWithoutEmail = stageMap.has('contacts_without_email')
    ? stageMap.get('contacts_without_email')!
    : null;
  
  const leadsSkippedNoEmail = stageMap.has('leads_skipped_no_email')
    ? stageMap.get('leads_skipped_no_email')!
    : null;
  const leadsSkippedInvalidEmail = stageMap.has('leads_skipped_invalid_email')
    ? stageMap.get('leads_skipped_invalid_email')!
    : null;

  return {
    orgs,
    contacts,
    contactsWithEmail,
    contactsWithoutEmail,
    leads,
    leadsSkippedNoEmail,
    leadsSkippedInvalidEmail,
  };
}

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

export function ResultsBreakdownCards({
  funnel,
  runStatus,
}: ResultsBreakdownCardsProps) {
  const data = extractBreakdownData(funnel);
  const isCompleted = runStatus?.toLowerCase() === 'completed' || 
                      runStatus?.toLowerCase() === 'success' ||
                      runStatus?.toLowerCase() === 'succeeded';
  const isRunning = runStatus?.toLowerCase() === 'running' || 
                    runStatus?.toLowerCase() === 'in_progress';

  const hasAnyData = data.orgs > 0 || data.contacts > 0 || data.leads > 0;

  if (!hasAnyData && !isRunning) {
    return null;
  }

  const cards: BreakdownCard[] = [];

  if (data.contacts > 0 || isRunning) {
    const contactItems: BreakdownItem[] = [
      { label: 'Total Discovered', value: data.contacts },
    ];

    if (data.contactsWithEmail !== null) {
      contactItems.push({ label: 'With Email', value: data.contactsWithEmail });
    }
    if (data.contactsWithoutEmail !== null) {
      contactItems.push({ 
        label: 'Without Email', 
        value: data.contactsWithoutEmail, 
        isSkipped: true, 
        skipReason: 'skipped for promotion' 
      });
    }

    cards.push({
      title: 'Contacts Discovered',
      icon: 'users',
      items: contactItems,
      status: data.contacts > 0 ? 'completed' : isRunning ? 'in_progress' : 'pending',
      explanation: data.contactsWithoutEmail !== null && data.contactsWithoutEmail > 0
        ? 'Contacts without email cannot be promoted to leads.'
        : undefined,
    });
  }

  if (data.leads >= 0 && (data.contacts > 0 || isCompleted)) {
    const leadItems: BreakdownItem[] = [
      { label: 'Leads Promoted', value: data.leads },
    ];

    if (data.leadsSkippedNoEmail !== null && data.leadsSkippedNoEmail > 0) {
      leadItems.push({
        label: 'Skipped',
        value: data.leadsSkippedNoEmail,
        isSkipped: true,
        skipReason: 'missing email',
      });
    }
    if (data.leadsSkippedInvalidEmail !== null && data.leadsSkippedInvalidEmail > 0) {
      leadItems.push({
        label: 'Skipped',
        value: data.leadsSkippedInvalidEmail,
        isSkipped: true,
        skipReason: 'invalid email format',
      });
    }

    cards.push({
      title: 'Lead Promotion',
      icon: 'star',
      items: leadItems,
      status: isCompleted ? 'completed' : isRunning ? 'in_progress' : 'pending',
      explanation: data.leads === 0 && data.contacts > 0
        ? 'No contacts met the criteria for lead promotion.'
        : undefined,
    });
  }

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
      {cards.map((card, index) => (
        <CardComponent key={index} card={card} />
      ))}
    </div>
  );
}

export default ResultsBreakdownCards;
