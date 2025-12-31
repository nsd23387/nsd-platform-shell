'use client';

import { useWizard, WizardStep } from './WizardContext';
import { Icon } from '../../../../design/components/Icon';

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
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        height: 'fit-content',
      }}
    >
      <h3
        style={{
          margin: '0 0 24px 0',
          fontSize: '14px',
          fontWeight: 600,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontFamily: 'var(--font-display, Poppins, sans-serif)',
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
                backgroundColor: isActive ? '#f3f0ff' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: isClickable ? 'pointer' : 'not-allowed',
                opacity: isClickable ? 1 : 0.5,
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isActive
                    ? '#8b5cf6'
                    : isPast
                    ? '#10b981'
                    : '#e5e7eb',
                  color: isActive || isPast ? '#ffffff' : '#9ca3af',
                  transition: 'all 0.2s ease',
                }}
              >
                {isPast ? (
                  <Icon name="check" size={16} />
                ) : (
                  <Icon name={stepIcons[step.id] as any} size={16} />
                )}
              </div>

              <div style={{ textAlign: 'left' }}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#8b5cf6' : isPast ? '#111827' : '#6b7280',
                    fontFamily: 'var(--font-body, Inter, sans-serif)',
                  }}
                >
                  {step.label}
                </div>
                {isActive && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#8b5cf6',
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
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            color: '#6b7280',
            marginBottom: '8px',
          }}
        >
          Progress
        </div>
        <div
          style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#e5e7eb',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${((currentIndex + 1) / steps.length) * 100}%`,
              height: '100%',
              backgroundColor: '#8b5cf6',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#6b7280',
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
