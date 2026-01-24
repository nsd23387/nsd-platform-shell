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
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SHADOWS, NSD_GRADIENTS, NSD_TRANSITIONS, NSD_SPACING, NSD_GLOW } from '../../lib/design-tokens';
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
  const progressPercent = Math.round(((currentStep + 1) / steps.length) * 100);

  return (
    <div
      style={{
        width: '300px',
        minWidth: '300px',
        padding: NSD_SPACING.lg,
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.xl,
        border: `1px solid ${NSD_COLORS.border.light}`,
        boxShadow: NSD_SHADOWS.card,
        height: 'fit-content',
        position: 'sticky',
        top: NSD_SPACING.lg,
      }}
    >
      <h3
        style={{
          margin: `0 0 ${NSD_SPACING.lg} 0`,
          ...NSD_TYPOGRAPHY.label,
          color: NSD_COLORS.text.muted,
          fontFamily: NSD_TYPOGRAPHY.fontDisplay,
        }}
      >
        Campaign Setup
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: NSD_SPACING.xs, position: 'relative' }}>
        {/* Background track line - positioned at center of step circles */}
        {/* Circle center = 16px button padding + 20px (half of 40px circle) = 36px */}
        <div
          style={{
            position: 'absolute',
            left: '35px',
            top: '34px',
            bottom: '34px',
            width: '2px',
            backgroundColor: NSD_COLORS.border.light,
            borderRadius: '1px',
          }}
        />
        
        {/* Progress line - fills based on current step */}
        <div
          style={{
            position: 'absolute',
            left: '35px',
            top: '34px',
            width: '2px',
            height: steps.length > 1 ? `calc(${(currentStep / (steps.length - 1)) * 100}% - ${currentStep === steps.length - 1 ? 0 : 34}px)` : '0px',
            background: NSD_GRADIENTS.brand,
            borderRadius: '1px',
            transition: 'height 0.4s ease',
          }}
        />

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
                gap: NSD_SPACING.md,
                padding: '14px 16px',
                backgroundColor: isActive ? NSD_COLORS.violet.light : 'transparent',
                border: 'none',
                borderRadius: NSD_RADIUS.lg,
                cursor: isClickable ? 'pointer' : isActive ? 'default' : 'not-allowed',
                opacity: isClickable || isActive ? 1 : 0.5,
                transition: NSD_TRANSITIONS.default,
                width: '100%',
                textAlign: 'left',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive
                    ? NSD_GRADIENTS.brand
                    : isCompleted
                    ? NSD_COLORS.violet.base
                    : NSD_COLORS.background,
                  border: !isActive && !isCompleted ? `2px solid ${NSD_COLORS.border.default}` : 'none',
                  color: isActive || isCompleted ? '#fff' : NSD_COLORS.text.muted,
                  fontSize: '14px',
                  fontWeight: 600,
                  flexShrink: 0,
                  transition: NSD_TRANSITIONS.default,
                  boxShadow: isActive ? NSD_GLOW.magentaSubtle : 'none',
                }}
              >
                {isCompleted ? (
                  <Icon name="check" size={16} color="#fff" />
                ) : (
                  index + 1
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive
                      ? NSD_COLORS.violet.dark
                      : isCompleted
                      ? NSD_COLORS.text.primary
                      : NSD_COLORS.text.secondary,
                    fontFamily: NSD_TYPOGRAPHY.fontBody,
                    lineHeight: 1.4,
                  }}
                >
                  {step.label}
                </div>
                {isActive && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: NSD_COLORS.magenta.dark,
                      marginTop: '2px',
                      fontWeight: 500,
                    }}
                  >
                    Current step
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: NSD_SPACING.lg,
          padding: NSD_SPACING.md,
          backgroundColor: NSD_COLORS.surface,
          borderRadius: NSD_RADIUS.lg,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: NSD_SPACING.sm,
          }}
        >
          <span style={{ ...NSD_TYPOGRAPHY.label, color: NSD_COLORS.text.muted }}>
            Progress
          </span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
            {progressPercent}%
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: NSD_COLORS.border.light,
            borderRadius: NSD_RADIUS.full,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: NSD_GRADIENTS.brand,
              borderRadius: NSD_RADIUS.full,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
        <div
          style={{
            fontSize: '12px',
            color: NSD_COLORS.text.muted,
            marginTop: NSD_SPACING.sm,
          }}
        >
          Step {currentStep + 1} of {steps.length} • {steps.length - currentStep - 1} remaining
        </div>
      </div>
    </div>
  );
}
