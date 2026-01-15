'use client';

/**
 * GOVERNANCE LOCK (M67-14)
 * Campaign creation MUST use vertical left-hand navigation.
 * Horizontal steppers are explicitly forbidden due to UX and governance requirements.
 * Do not reintroduce a horizontal stepper under any condition.
 * 
 * This component renders a VERTICAL navigation sidebar that:
 * - Is always visible during campaign creation
 * - Shows completed, active, and remaining steps
 * - Does not require scrolling to discover steps
 * - Is scroll-independent from the main content area
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

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

/**
 * Vertical left-hand navigation for campaign creation wizard.
 * 
 * GOVERNANCE LOCK: This component MUST remain vertical.
 * Horizontal steppers are forbidden per M67-14 UX requirements.
 */
export function WizardNav({ steps, currentStep, onStepClick }: WizardNavProps) {
  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div
      style={{
        width: '280px',
        minWidth: '280px',
        padding: '24px',
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        height: 'fit-content',
        position: 'sticky',
        top: '24px',
      }}
    >
      {/* Header */}
      <h3
        style={{
          margin: '0 0 20px 0',
          fontSize: '12px',
          fontWeight: 600,
          color: NSD_COLORS.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontFamily: NSD_TYPOGRAPHY.fontDisplay,
        }}
      >
        Campaign Setup
      </h3>

      {/* Vertical Step List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = step.completed;
          const isPast = index < currentStep;
          const isClickable = onStepClick && (isCompleted || isPast);

          return (
            <button
              key={step.id}
              onClick={() => isClickable && onStepClick(index)}
              disabled={!isClickable && !isActive}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                backgroundColor: isActive ? `${NSD_COLORS.secondary}12` : 'transparent',
                border: 'none',
                borderRadius: NSD_RADIUS.md,
                cursor: isClickable ? 'pointer' : isActive ? 'default' : 'not-allowed',
                opacity: isClickable || isActive ? 1 : 0.5,
                transition: 'all 0.15s ease',
                width: '100%',
                textAlign: 'left',
              }}
            >
              {/* Step Number/Icon */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isActive
                    ? NSD_COLORS.secondary
                    : isCompleted
                    ? NSD_COLORS.semantic.positive.text
                    : NSD_COLORS.border.light,
                  color: isActive || isCompleted ? '#fff' : NSD_COLORS.text.muted,
                  fontSize: '12px',
                  fontWeight: 600,
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                {isCompleted ? (
                  <Icon name="check" size={14} color="#fff" />
                ) : (
                  index + 1
                )}
              </div>

              {/* Step Label */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive
                      ? NSD_COLORS.secondary
                      : isCompleted
                      ? NSD_COLORS.text.primary
                      : NSD_COLORS.text.secondary,
                    fontFamily: NSD_TYPOGRAPHY.fontBody,
                    lineHeight: 1.3,
                  }}
                >
                  {step.label}
                </div>
                {isActive && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: NSD_COLORS.secondary,
                      marginTop: '2px',
                    }}
                  >
                    Current step
                  </div>
                )}
                {isCompleted && !isActive && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: NSD_COLORS.semantic.positive.text,
                      marginTop: '2px',
                    }}
                  >
                    Completed
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Progress Summary */}
      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: NSD_COLORS.surface,
          borderRadius: NSD_RADIUS.md,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontSize: '12px', color: NSD_COLORS.text.secondary }}>
            Progress
          </span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
            {progressPercent}%
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '6px',
            backgroundColor: NSD_COLORS.border.light,
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${((currentStep + 1) / steps.length) * 100}%`,
              height: '100%',
              backgroundColor: NSD_COLORS.primary,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div
          style={{
            fontSize: '11px',
            color: NSD_COLORS.text.muted,
            marginTop: '8px',
          }}
        >
          Step {currentStep + 1} of {steps.length} • {steps.length - currentStep - 1} remaining
        </div>
      </div>
    </div>
  );
}
