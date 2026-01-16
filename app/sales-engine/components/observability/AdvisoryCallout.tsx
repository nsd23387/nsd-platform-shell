'use client';

/**
 * AdvisoryCallout Component
 * 
 * Non-blocking contextual guidance based on execution results.
 * Clearly labeled as Advisory, never implies system malfunction.
 * 
 * GOVERNANCE CONSTRAINTS:
 * - Clearly labeled as Advisory
 * - Never imply system malfunction
 * - Never block or override execution state
 * - No buttons required / No forced actions
 * - Read-only display
 * 
 * Examples:
 * - "Most contacts lacked email — consider enabling email enrichment"
 * - "Broadening ICP keywords may increase promotable leads"
 * - "Campaign completed successfully. Review promoted leads."
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import type { ObservabilityFunnel } from '../../types/campaign';

interface AdvisoryCalloutProps {
  runStatus: string | null;
  funnel: ObservabilityFunnel | null;
  noRuns: boolean;
}

interface Advisory {
  message: string;
  type: 'success' | 'suggestion' | 'info';
}

function deriveAdvisory(
  runStatus: string | null,
  funnel: ObservabilityFunnel | null,
  noRuns: boolean
): Advisory | null {
  if (noRuns || !runStatus) {
    return null;
  }

  const normalizedStatus = runStatus.toLowerCase();

  if (normalizedStatus !== 'completed' && 
      normalizedStatus !== 'success' && 
      normalizedStatus !== 'succeeded' &&
      normalizedStatus !== 'partial') {
    return null;
  }

  const stageMap = new Map<string, number>();
  funnel?.stages?.forEach((s) => {
    stageMap.set(s.stage, s.count);
  });

  const orgs = stageMap.get('orgs_sourced') || 0;
  const contacts = stageMap.get('contacts_discovered') || 0;
  const leads = stageMap.get('leads_promoted') || 0;

  if (leads > 0) {
    return {
      message: 'Campaign completed successfully. Review promoted leads in the Leads tab.',
      type: 'success',
    };
  }

  if (contacts > 0 && leads === 0) {
    return {
      message: 'Contacts were discovered but none met lead promotion criteria. Review the pipeline funnel for detailed qualification breakdowns.',
      type: 'suggestion',
    };
  }

  if (orgs > 0 && contacts === 0) {
    return {
      message: 'Organizations were sourced but no contacts found. Consider adjusting role criteria or expanding industry targeting.',
      type: 'suggestion',
    };
  }

  if (orgs === 0) {
    return {
      message: 'No organizations matched the ICP criteria. Consider broadening keywords, expanding geographies, or adjusting company size filters.',
      type: 'suggestion',
    };
  }

  return null;
}

export function AdvisoryCallout({
  runStatus,
  funnel,
  noRuns,
}: AdvisoryCalloutProps) {
  const advisory = deriveAdvisory(runStatus, funnel, noRuns);

  if (!advisory) {
    return null;
  }

  const styles = {
    success: {
      bg: NSD_COLORS.semantic.positive.bg,
      border: NSD_COLORS.semantic.positive.border,
      text: NSD_COLORS.semantic.positive.text,
      icon: 'check' as const,
    },
    suggestion: {
      bg: NSD_COLORS.semantic.attention.bg,
      border: NSD_COLORS.semantic.attention.border,
      text: NSD_COLORS.semantic.attention.text,
      icon: 'lightbulb' as const,
    },
    info: {
      bg: NSD_COLORS.semantic.info.bg,
      border: NSD_COLORS.semantic.info.border,
      text: NSD_COLORS.semantic.info.text,
      icon: 'info' as const,
    },
  };

  const style = styles[advisory.type];

  return (
    <div
      style={{
        padding: '14px 18px',
        backgroundColor: style.bg,
        borderRadius: NSD_RADIUS.md,
        border: `1px solid ${style.border}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: style.border,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {advisory.type === 'success' ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6L5 9L10 3"
              stroke={style.text}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : advisory.type === 'suggestion' ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1V7M6 9V10"
              stroke={style.text}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="4" stroke={style.text} strokeWidth="1.5" />
          </svg>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '4px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: style.text,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Advisory
          </span>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            fontFamily: NSD_TYPOGRAPHY.fontBody,
            color: style.text,
            lineHeight: 1.5,
          }}
        >
          {advisory.message}
        </p>
      </div>
    </div>
  );
}

export default AdvisoryCallout;
