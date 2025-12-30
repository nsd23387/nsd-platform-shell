'use client';

import { useWizard, WIZARD_STEPS } from './WizardContext';
import { Icon } from '../../../../design/components/Icon';
import { background, text, border, violet } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';

export function WizardProgress() {
  const { state, goToStep, getStepStatus, getCurrentStepIndex } = useWizard();
  const currentIndex = getCurrentStepIndex();
  const progress = ((currentIndex + 1) / WIZARD_STEPS.length) * 100;

  return (
    <div style={{ width: '280px', flexShrink: 0 }}>
      <div style={{
        position: 'sticky',
        top: '32px',
        backgroundColor: background.surface,
        borderRadius: '16px',
        padding: '32px 24px',
        border: `1px solid ${border.subtle}`,
      }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            height: '4px',
            backgroundColor: border.subtle,
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: violet[500],
              borderRadius: '2px',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: fontSize.xs,
            color: text.muted,
            fontFamily: fontFamily.body,
          }}>
            Step {currentIndex + 1} of {WIZARD_STEPS.length}
          </p>
        </div>

        <nav>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {WIZARD_STEPS.map((step, index) => {
              const status = getStepStatus(step.id);
              const isClickable = status === 'completed' || status === 'current';
              
              return (
                <li key={step.id} style={{ marginBottom: index < WIZARD_STEPS.length - 1 ? '8px' : 0 }}>
                  <button
                    onClick={() => isClickable && goToStep(step.id)}
                    disabled={!isClickable}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '16px',
                      padding: '16px',
                      backgroundColor: status === 'current' ? violet[50] : 'transparent',
                      border: status === 'current' ? `1px solid ${violet[200]}` : '1px solid transparent',
                      borderRadius: '12px',
                      cursor: isClickable ? 'pointer' : 'default',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: status === 'completed' ? violet[500] : status === 'current' ? violet[100] : background.muted,
                      color: status === 'completed' ? '#fff' : status === 'current' ? violet[600] : text.muted,
                      flexShrink: 0,
                      fontSize: fontSize.sm,
                      fontWeight: fontWeight.medium,
                      fontFamily: fontFamily.body,
                    }}>
                      {status === 'completed' ? (
                        <Icon name="check" size={16} color="#fff" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: fontSize.sm,
                        fontWeight: fontWeight.medium,
                        color: status === 'upcoming' ? text.muted : text.primary,
                        marginBottom: '4px',
                        fontFamily: fontFamily.body,
                      }}>
                        {step.label}
                      </div>
                      <div style={{
                        fontSize: fontSize.xs,
                        color: text.muted,
                        fontFamily: fontFamily.body,
                      }}>
                        {step.description}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
