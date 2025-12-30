'use client';

import { useWizard, WIZARD_STEPS } from './WizardContext';
import { Icon } from '../../../../design/components/Icon';
import { text, border, violet, magenta } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';

interface WizardNavigationProps {
  onSubmit?: () => void;
  isSubmitting?: boolean;
}

export function WizardNavigation({ onSubmit, isSubmitting }: WizardNavigationProps) {
  const { state, nextStep, prevStep, canProceed, getCurrentStepIndex } = useWizard();
  const currentIndex = getCurrentStepIndex();
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === WIZARD_STEPS.length - 1;
  const proceed = canProceed();

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: '32px',
      marginTop: '32px',
      borderTop: `1px solid ${border.subtle}`,
    }}>
      <button
        onClick={prevStep}
        disabled={isFirstStep}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          fontSize: fontSize.sm,
          fontWeight: fontWeight.medium,
          fontFamily: fontFamily.body,
          backgroundColor: 'transparent',
          color: isFirstStep ? text.muted : text.secondary,
          border: `1px solid ${isFirstStep ? 'transparent' : border.default}`,
          borderRadius: '8px',
          cursor: isFirstStep ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <Icon name="arrow-left" size={16} color={isFirstStep ? text.muted : text.secondary} />
        Back
      </button>

      {isLastStep ? (
        <button
          onClick={onSubmit}
          disabled={!proceed || isSubmitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '14px 32px',
            fontSize: fontSize.base,
            fontWeight: fontWeight.semibold,
            fontFamily: fontFamily.body,
            backgroundColor: proceed && !isSubmitting ? magenta[500] : border.default,
            color: proceed && !isSubmitting ? text.inverse : text.muted,
            border: 'none',
            borderRadius: '8px',
            cursor: proceed && !isSubmitting ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
          }}
        >
          {isSubmitting ? 'Creating...' : 'Create Campaign'}
        </button>
      ) : (
        <button
          onClick={nextStep}
          disabled={!proceed}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '14px 32px',
            fontSize: fontSize.base,
            fontWeight: fontWeight.medium,
            fontFamily: fontFamily.body,
            backgroundColor: proceed ? violet[500] : border.default,
            color: proceed ? text.inverse : text.muted,
            border: 'none',
            borderRadius: '8px',
            cursor: proceed ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
          }}
        >
          Continue
          <Icon name="arrow-right" size={16} color={proceed ? text.inverse : text.muted} />
        </button>
      )}
    </div>
  );
}
