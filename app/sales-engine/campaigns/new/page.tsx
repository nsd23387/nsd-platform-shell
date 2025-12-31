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
        backgroundColor: '#fafafa',
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
              color: '#8b5cf6',
              textDecoration: 'none',
              fontFamily: 'var(--font-body, Inter, sans-serif)',
            }}
          >
            <Icon name="arrow-left" size={16} />
            Back to Campaigns
          </Link>
        </div>

        <h1
          style={{
            margin: '0 0 32px 0',
            fontSize: '28px',
            fontWeight: 600,
            color: '#1e1e4a',
            fontFamily: 'var(--font-display, Poppins, sans-serif)',
          }}
        >
          Create New Campaign
        </h1>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              marginBottom: '24px',
              color: '#b91c1c',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Icon name="warning" size={16} />
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
          <WizardProgress />

          <div
            style={{
              flex: 1,
              padding: '32px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
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
