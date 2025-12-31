'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WizardProvider, useWizard, WizardProgress, WizardNavigation } from '../../components/wizard';
import { StepBasics } from '../../components/wizard/steps/StepBasics';
import { StepAI } from '../../components/wizard/steps/StepAI';
import { StepICP } from '../../components/wizard/steps/StepICP';
import { StepPersonalization } from '../../components/wizard/steps/StepPersonalization';
import { StepReview } from '../../components/wizard/steps/StepReview';
import { createCampaign } from '../../lib/api';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

function WizardContent() {
  const router = useRouter();
  const { currentStep, data } = useWizard();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const campaign = await createCampaign({
        name: data.name,
        description: data.description,
      });
      router.push(`/sales-engine/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'basics':
        return <StepBasics />;
      case 'ai':
        return <StepAI />;
      case 'icp':
        return <StepICP />;
      case 'personalization':
        return <StepPersonalization />;
      case 'review':
        return <StepReview />;
      default:
        return <StepBasics />;
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: NSD_COLORS.surface,
        padding: '32px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link
            href="/sales-engine"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: NSD_COLORS.secondary,
              textDecoration: 'none',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
            }}
          >
            <Icon name="arrow-left" size={16} color={NSD_COLORS.secondary} />
            Back to Campaigns
          </Link>
        </div>

        <h1
          style={{
            margin: '0 0 32px 0',
            fontSize: '28px',
            fontWeight: 600,
            color: NSD_COLORS.primary,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
          }}
        >
          Create New Campaign
        </h1>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              borderRadius: NSD_RADIUS.md,
              marginBottom: '24px',
              color: NSD_COLORS.error,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Icon name="warning" size={16} color={NSD_COLORS.error} />
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
          <WizardProgress />

          <div
            style={{
              flex: 1,
              padding: '32px',
              backgroundColor: NSD_COLORS.background,
              borderRadius: NSD_RADIUS.lg,
              border: `1px solid ${NSD_COLORS.border.light}`,
            }}
          >
            {renderStep()}
            <WizardNavigation onComplete={handleComplete} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewCampaignPage() {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  );
}
