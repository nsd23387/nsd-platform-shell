'use client';

import { useWizard, WizardStep } from './WizardContext';
import { Icon } from '../../../../design/components/Icon';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';

const stepIcons: Record<WizardStep, string> = {
  basics: 'edit',
  ai: 'ai',
  icp: 'target',
  personalization: 'message',
  review: 'review',
};

export function WizardProgress() {
  const { currentStep, setCurrentStep, steps } = useWizard();

  const stepOrder: WizardStep[] = ['basics', 'ai', 'icp', 'personalization', 'review'];
  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <div
      style={{
        width: '240px',
        padding: '32px 24px',
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        height: 'fit-content',
      }}
    >
      <h3
        style={{
          margin: '0 0 24px 0',
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isPast = index < currentIndex;
          const isClickable = isPast || index === currentIndex;

          return (
            <button
              key={step.id}
              onClick={() => isClickable && setCurrentStep(step.id)}
              disabled={!isClickable}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: isActive ? `${NSD_COLORS.secondary}10` : 'transparent',
                border: 'none',
                borderRadius: NSD_RADIUS.md,
                cursor: isClickable ? 'pointer' : 'not-allowed',
                opacity: isClickable ? 1 : 0.5,
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: NSD_RADIUS.md,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isActive
                    ? NSD_COLORS.secondary
                    : isPast
                    ? NSD_COLORS.semantic.positive.text
                    : NSD_COLORS.border.light,
                  color: isActive || isPast ? NSD_COLORS.text.inverse : NSD_COLORS.text.muted,
                  transition: 'all 0.2s ease',
                }}
              >
                {isPast ? (
                  <Icon name="check" size={16} color={NSD_COLORS.text.inverse} />
                ) : (
                  <Icon name={stepIcons[step.id] as any} size={16} color={isActive ? NSD_COLORS.text.inverse : NSD_COLORS.text.muted} />
                )}
              </div>

              <div style={{ textAlign: 'left' }}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? NSD_COLORS.secondary : isPast ? NSD_COLORS.text.primary : NSD_COLORS.text.secondary,
                    fontFamily: NSD_TYPOGRAPHY.fontBody,
                  }}
                >
                  {step.label}
                </div>
                {isActive && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: NSD_COLORS.secondary,
                      marginTop: '2px',
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
          marginTop: '24px',
          padding: '16px',
          backgroundColor: NSD_COLORS.surface,
          borderRadius: NSD_RADIUS.md,
        }}
      >
        <div
          style={{
            fontSize: '12px',
            color: NSD_COLORS.text.secondary,
            marginBottom: '8px',
          }}
        >
          Progress
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
              width: `${((currentIndex + 1) / steps.length) * 100}%`,
              height: '100%',
              backgroundColor: NSD_COLORS.primary,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div
          style={{
            fontSize: '12px',
            color: NSD_COLORS.text.secondary,
            marginTop: '8px',
            textAlign: 'right',
          }}
        >
          Step {currentIndex + 1} of {steps.length}
        </div>
      </div>
    </div>
  );
}
