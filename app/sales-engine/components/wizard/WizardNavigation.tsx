'use client';

import { useWizard, WizardStep } from './WizardContext';
import { Icon } from '../../../../design/components/Icon';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';

interface WizardNavigationProps {
  onComplete: () => void;
  isLoading?: boolean;
}

export function WizardNavigation({ onComplete, isLoading }: WizardNavigationProps) {
  const { currentStep, setCurrentStep, canProceed } = useWizard();

  const stepOrder: WizardStep[] = ['basics', 'ai', 'icp', 'personalization', 'review'];
  const currentIndex = stepOrder.indexOf(currentStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === stepOrder.length - 1;

  const handleBack = () => {
    if (!isFirst) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '32px',
        paddingTop: '24px',
        borderTop: `1px solid ${NSD_COLORS.border.light}`,
      }}
    >
      <button
        onClick={handleBack}
        disabled={isFirst}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          backgroundColor: 'transparent',
          border: `1px solid ${NSD_COLORS.border.default}`,
          borderRadius: NSD_RADIUS.md,
          fontSize: '14px',
          fontWeight: 500,
          color: isFirst ? NSD_COLORS.text.muted : NSD_COLORS.text.primary,
          cursor: isFirst ? 'not-allowed' : 'pointer',
          opacity: isFirst ? 0.5 : 1,
          transition: 'all 0.2s ease',
          fontFamily: NSD_TYPOGRAPHY.fontBody,
        }}
      >
        <Icon name="arrow-left" size={16} color={isFirst ? NSD_COLORS.text.muted : NSD_COLORS.text.primary} />
        Back
      </button>

      <button
        onClick={handleNext}
        disabled={!canProceed || isLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          backgroundColor: canProceed && !isLoading ? NSD_COLORS.cta : NSD_COLORS.border.light,
          border: 'none',
          borderRadius: NSD_RADIUS.md,
          fontSize: '14px',
          fontWeight: 600,
          color: canProceed && !isLoading ? NSD_COLORS.text.inverse : NSD_COLORS.text.muted,
          cursor: canProceed && !isLoading ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          fontFamily: NSD_TYPOGRAPHY.fontBody,
        }}
      >
        {isLoading ? (
          'Saving...'
        ) : isLast ? (
          <>
            <Icon name="check" size={16} color={NSD_COLORS.text.inverse} />
            Create Campaign
          </>
        ) : (
          <>
            Continue
            <Icon name="arrow-right" size={16} color={canProceed ? NSD_COLORS.text.inverse : NSD_COLORS.text.muted} />
          </>
        )}
      </button>
    </div>
  );
}
