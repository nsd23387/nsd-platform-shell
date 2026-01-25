'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';

export interface WizardStepProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  isActive: boolean;
  stepNumber: number;
  totalSteps: number;
}

export function WizardStep({
  title,
  description,
  children,
  isActive,
  stepNumber,
  totalSteps,
}: WizardStepProps) {
  if (!isActive) return null;

  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        padding: '32px',
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              backgroundColor: NSD_COLORS.primary,
              color: NSD_COLORS.text.inverse,
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '50%',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
            }}
          >
            {stepNumber}
          </span>
          <span
            style={{
              fontSize: '12px',
              color: NSD_COLORS.text.muted,
              fontFamily: NSD_TYPOGRAPHY.fontBody,
            }}
          >
            Step {stepNumber} of {totalSteps}
          </span>
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 600,
            color: NSD_COLORS.primary,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
          }}
        >
          {title}
        </h2>
        {description && (
          <p
            style={{
              margin: '8px 0 0 0',
              fontSize: '14px',
              color: NSD_COLORS.text.secondary,
              lineHeight: 1.5,
              fontFamily: NSD_TYPOGRAPHY.fontBody,
            }}
          >
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
