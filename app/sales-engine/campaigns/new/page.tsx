'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  WizardProvider,
  useWizard,
  WizardProgress,
  WizardNavigation,
  StepBasics,
  StepAI,
  StepICP,
  StepPersonalization,
  StepReview,
} from '../../components/wizard';
import { createCampaign } from '../../lib/api';
import { Icon } from '../../../../design/components/Icon';
import { background, text, border, violet } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';

function WizardContent() {
  const router = useRouter();
  const { state, dispatch } = useWizard();

  async function handleCreate() {
    if (!state.name.trim()) return;

    dispatch({ type: 'SET_LOADING', isLoading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      const campaign = await createCampaign({
        name: state.name,
        description: state.description,
        icp: state.icp,
        personalization: state.personalization,
      });
      router.push(`/sales-engine/campaigns/${campaign.id}`);
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : 'Failed to create campaign',
      });
      dispatch({ type: 'SET_LOADING', isLoading: false });
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: background.page, fontFamily: fontFamily.body }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 32px' }}>
        <div style={{ marginBottom: '32px' }}>
          <Link
            href="/sales-engine"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: text.secondary,
              textDecoration: 'none',
              fontSize: fontSize.sm,
              fontFamily: fontFamily.body,
            }}
          >
            <Icon name="arrow-left" size={16} color={text.secondary} />
            Back to Campaigns
          </Link>
        </div>

        <div style={{ marginBottom: '48px' }}>
          <h1 style={{
            margin: 0,
            fontSize: fontSize['4xl'],
            fontWeight: fontWeight.semibold,
            color: text.primary,
            fontFamily: fontFamily.display,
          }}>
            Create New Campaign
          </h1>
          <p style={{
            margin: '12px 0 0 0',
            color: text.secondary,
            fontSize: fontSize.base,
            fontFamily: fontFamily.body,
            lineHeight: 1.6,
          }}>
            Set up your campaign targeting and personalization. New campaigns start in draft mode.
          </p>
        </div>

        {state.error && (
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            marginBottom: '32px',
            color: '#b91c1c',
            fontSize: fontSize.sm,
            fontFamily: fontFamily.body,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <Icon name="alert" size={20} color="#b91c1c" />
            {state.error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '48px' }}>
          <WizardProgress />

          <div style={{ flex: 1 }}>
            <div style={{
              backgroundColor: background.surface,
              borderRadius: '20px',
              padding: '48px',
              border: `1px solid ${border.subtle}`,
              minHeight: '500px',
            }}>
              {state.currentStep === 'basics' && <StepBasics />}
              {state.currentStep === 'ai' && <StepAI />}
              {state.currentStep === 'icp' && <StepICP />}
              {state.currentStep === 'personalization' && <StepPersonalization />}
              {state.currentStep === 'review' && <StepReview />}

              <WizardNavigation onSubmit={handleCreate} isSubmitting={state.isLoading} />
            </div>
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
