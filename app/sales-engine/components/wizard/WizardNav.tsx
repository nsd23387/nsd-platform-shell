'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';

interface Step {
  id: string;
  label: string;
  completed: boolean;
}

export interface WizardNavProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (index: number) => void;
}

export function WizardNav({ steps, currentStep, onStepClick }: WizardNavProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        overflowX: 'auto',
        padding: '4px 0',
      }}
    >
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = step.completed;
        const isClickable = onStepClick && (isCompleted || index < currentStep);

        return (
          <button
            key={step.id}
            onClick={() => isClickable && onStepClick(index)}
            disabled={!isClickable}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: isActive
                ? NSD_COLORS.primary
                : isCompleted
                ? '#EEF2FF'
                : NSD_COLORS.surface,
              color: isActive
                ? NSD_COLORS.text.inverse
                : isCompleted
                ? NSD_COLORS.primary
                : NSD_COLORS.text.secondary,
              border: 'none',
              borderRadius: NSD_RADIUS.full,
              fontSize: '13px',
              fontWeight: isActive ? 600 : 400,
              cursor: isClickable ? 'pointer' : 'default',
              opacity: isClickable || isActive ? 1 : 0.6,
              whiteSpace: 'nowrap',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
              transition: 'all 0.2s ease',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                backgroundColor: isActive
                  ? 'rgba(255,255,255,0.2)'
                  : isCompleted
                  ? NSD_COLORS.primary
                  : NSD_COLORS.border.light,
                color: isActive || isCompleted ? '#fff' : NSD_COLORS.text.muted,
                borderRadius: '50%',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {isCompleted ? '✓' : index + 1}
            </span>
            {step.label}
          </button>
        );
      })}
    </div>
  );
}
