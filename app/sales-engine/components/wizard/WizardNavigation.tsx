'use client';

import { useWizard, WizardStep } from './WizardContext';
import { Icon } from '../../../../design/components/Icon';

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
        borderTop: '1px solid #e5e7eb',
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
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 500,
          color: isFirst ? '#9ca3af' : '#374151',
          cursor: isFirst ? 'not-allowed' : 'pointer',
          opacity: isFirst ? 0.5 : 1,
          transition: 'all 0.2s ease',
          fontFamily: 'var(--font-body, Inter, sans-serif)',
        }}
      >
        <Icon name="arrow-left" size={16} />
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
          backgroundColor: canProceed && !isLoading ? '#ec4899' : '#e5e7eb',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          color: canProceed && !isLoading ? '#ffffff' : '#9ca3af',
          cursor: canProceed && !isLoading ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          fontFamily: 'var(--font-body, Inter, sans-serif)',
        }}
      >
        {isLoading ? (
          'Saving...'
        ) : isLast ? (
          <>
            <Icon name="check" size={16} />
            Create Campaign
          </>
        ) : (
          <>
            Continue
            <Icon name="arrow-right" size={16} />
          </>
        )}
      </button>
    </div>
  );
}
