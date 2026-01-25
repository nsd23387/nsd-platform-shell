/**
 * NextStepCard
 * 
 * A lightweight, read-only component that provides a single advisory recommendation
 * when execution completes without work.
 * 
 * RULES:
 * - Exactly one recommendation
 * - Advisory only (never framed as an error)
 * - Never implies system failure
 * - Only shown when relevant (no-work completions)
 * 
 * READ-ONLY: Does not trigger any actions.
 */

'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

interface NextStepCardProps {
  recommendation: string;
  context?: string;
}

export function NextStepCard({ recommendation, context }: NextStepCardProps) {
  return (
    <div
      style={{
        padding: '16px 20px',
        backgroundColor: NSD_COLORS.semantic.info.bg,
        border: `1px solid ${NSD_COLORS.semantic.info.border}`,
        borderRadius: NSD_RADIUS.md,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '10px',
        }}
      >
        <Icon name="info" size={16} color={NSD_COLORS.semantic.info.text} />
        <h4
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: NSD_COLORS.semantic.info.text,
          }}
        >
          Next Step
        </h4>
      </div>

      {/* Context (if provided) */}
      {context && (
        <p
          style={{
            margin: '0 0 8px 0',
            fontSize: '13px',
            fontFamily: NSD_TYPOGRAPHY.fontBody,
            color: NSD_COLORS.text.secondary,
            lineHeight: 1.5,
          }}
        >
          {context}
        </p>
      )}

      {/* Recommendation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
        }}
      >
        <span
          style={{
            color: NSD_COLORS.semantic.info.text,
            fontSize: '14px',
            lineHeight: 1,
            marginTop: '2px',
          }}
        >
          •
        </span>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 500,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
            color: NSD_COLORS.semantic.info.text,
            lineHeight: 1.5,
          }}
        >
          {recommendation}
        </p>
      </div>

      {/* Advisory note */}
      <p
        style={{
          margin: '12px 0 0 0',
          fontSize: '11px',
          fontFamily: NSD_TYPOGRAPHY.fontBody,
          color: NSD_COLORS.text.muted,
          fontStyle: 'italic',
        }}
      >
        This is an advisory recommendation only.
      </p>
    </div>
  );
}

export default NextStepCard;
