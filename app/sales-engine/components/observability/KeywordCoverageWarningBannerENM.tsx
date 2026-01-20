/**
 * KeywordCoverageWarningBannerENM
 * 
 * GOVERNANCE: This component consumes ONLY ExecutionNarrative.keywordContext.
 * It MUST NOT access raw campaign_runs, activity.events, or timestamps.
 * 
 * Displays a non-error, informational warning banner when keyword_coverage_low
 * warning is present. Tone is informational, not alarming.
 * 
 * UI GUARDRAILS:
 * - NEVER treats keyword coverage warnings as failures
 * - NEVER shows this as an error state
 * - Uses informational styling (magenta light, not red/yellow)
 */

'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import type { KeywordContext } from '../../lib/execution-narrative-mapper';
import { KEYWORD_COPY } from '../../lib/execution-narrative-governance';

interface KeywordCoverageWarningBannerENMProps {
  keywordContext: KeywordContext | undefined;
  isRunning?: boolean;
}

export function KeywordCoverageWarningBannerENM({
  keywordContext,
  isRunning = false,
}: KeywordCoverageWarningBannerENMProps) {
  if (!keywordContext) {
    return null;
  }

  const { keywordsWithZeroResults, hasLowCoverageWarning, warningMessage } = keywordContext;
  const hasZeroResultKeywords = keywordsWithZeroResults && keywordsWithZeroResults.length > 0;

  if (!hasZeroResultKeywords && !hasLowCoverageWarning) {
    return null;
  }

  const displayMessage = warningMessage || KEYWORD_COPY.LOW_COVERAGE_WARNING;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: NSD_COLORS.semantic.attention.bg,
        border: `1px solid ${NSD_COLORS.semantic.attention.border}`,
        borderRadius: NSD_RADIUS.md,
        marginTop: '12px',
      }}
    >
      <Icon name="info" size={18} color={NSD_COLORS.semantic.attention.text} />
      <div style={{ flex: 1 }}>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 500,
            color: NSD_COLORS.semantic.attention.text,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
            lineHeight: 1.5,
          }}
        >
          {displayMessage}
        </p>
        {hasZeroResultKeywords && (
          <div style={{ marginTop: '8px' }}>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: NSD_COLORS.semantic.attention.text,
                fontFamily: NSD_TYPOGRAPHY.fontBody,
              }}
            >
              {KEYWORD_COPY.SOME_ZERO_RESULTS_PREFIX}{' '}
              <span style={{ fontStyle: 'italic' }}>
                {keywordsWithZeroResults.join(', ')}
              </span>
            </p>
            {isRunning && (
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '13px',
                  color: NSD_COLORS.text.muted,
                  fontFamily: NSD_TYPOGRAPHY.fontBody,
                }}
              >
                {KEYWORD_COPY.CONTINUING_AVAILABLE}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default KeywordCoverageWarningBannerENM;
