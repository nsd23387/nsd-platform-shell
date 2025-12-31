'use client';

import { useState } from 'react';
import { useWizard } from '../WizardContext';
import { Icon } from '../../../../../design/components/Icon';

export function StepAI() {
  const { data, updateICP, updatePersonalization } = useWizard();
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    updateICP({
      keywords: ['enterprise software', 'digital transformation', 'automation'],
      industries: ['Technology', 'Financial Services', 'Healthcare'],
      roles: ['CTO', 'VP Engineering', 'Director of IT'],
      painPoints: ['Legacy system integration', 'Scaling challenges', 'Security concerns'],
      valuePropositions: ['Reduce operational costs by 40%', 'Accelerate time to market', 'Enterprise-grade security'],
      employeeSize: { min: 100, max: 5000 },
    });
    
    updatePersonalization({
      toneOfVoice: 'professional',
      cta: 'Schedule a personalized demo',
      usp: 'AI-powered automation that integrates with your existing stack',
    });
    
    setIsGenerating(false);
    setHasGenerated(true);
  };

  return (
    <div>
      <h2
        style={{
          margin: '0 0 8px 0',
          fontSize: '24px',
          fontWeight: 600,
          color: '#1e1e4a',
          fontFamily: 'var(--font-display, Poppins, sans-serif)',
        }}
      >
        AI Campaign Assistant
      </h2>
      <p
        style={{
          margin: '0 0 32px 0',
          fontSize: '14px',
          color: '#6b7280',
          fontFamily: 'var(--font-body, Inter, sans-serif)',
        }}
      >
        Let AI help you define your ideal customer profile and messaging strategy.
      </p>

      <div
        style={{
          padding: '32px',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          textAlign: 'center',
        }}
      >
        {!hasGenerated ? (
          <>
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 24px',
                backgroundColor: '#8b5cf6',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="ai" size={32} color="#ffffff" />
            </div>

            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: '#1e1e4a',
                fontFamily: 'var(--font-display, Poppins, sans-serif)',
              }}
            >
              Generate with AI
            </h3>
            <p
              style={{
                margin: '0 0 24px 0',
                fontSize: '14px',
                color: '#6b7280',
                maxWidth: '400px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              Based on &quot;{data.name || 'your campaign'}&quot;, our AI will suggest targeting
              criteria and personalization settings.
            </p>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                backgroundColor: '#8b5cf6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isGenerating ? 'wait' : 'pointer',
                fontFamily: 'var(--font-body, Inter, sans-serif)',
              }}
            >
              {isGenerating ? (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '16px',
                      height: '16px',
                      border: '2px solid #ffffff',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  Generating...
                </>
              ) : (
                <>
                  <Icon name="ai" size={16} />
                  Generate Campaign Settings
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 24px',
                backgroundColor: '#10b981',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="check" size={32} color="#ffffff" />
            </div>

            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: '#1e1e4a',
                fontFamily: 'var(--font-display, Poppins, sans-serif)',
              }}
            >
              Settings Generated!
            </h3>
            <p
              style={{
                margin: '0 0 24px 0',
                fontSize: '14px',
                color: '#6b7280',
              }}
            >
              Your ICP and personalization settings have been populated. Review and adjust them in
              the next steps.
            </p>

            <button
              onClick={handleGenerate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: 'transparent',
                color: '#8b5cf6',
                border: '1px solid #8b5cf6',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-body, Inter, sans-serif)',
              }}
            >
              <Icon name="refresh" size={16} />
              Regenerate
            </button>
          </>
        )}
      </div>

      <p
        style={{
          marginTop: '16px',
          fontSize: '12px',
          color: '#9ca3af',
          textAlign: 'center',
        }}
      >
        You can skip this step and configure settings manually.
      </p>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
