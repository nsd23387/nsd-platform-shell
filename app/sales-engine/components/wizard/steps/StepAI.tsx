'use client';

import { useState } from 'react';
import { useWizard } from '../WizardContext';
import { Icon } from '../../../../../design/components/Icon';

interface AIGeneratedContent {
  icp: {
    keywords: string[];
    industries: string[];
    roles: string[];
    painPoints: string[];
    valuePropositions: string[];
    employeeSize: { min: number; max: number };
  };
  personalization: {
    toneOfVoice: string;
    cta: string;
    usp: string;
  };
  rationale: {
    targeting: string;
    messaging: string;
    keywordStrategy: string;
  };
}

export function StepAI() {
  const { data, updateICP, updatePersonalization } = useWizard();
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<AIGeneratedContent | null>(null);
  const [showRationale, setShowRationale] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const content: AIGeneratedContent = {
      icp: {
        keywords: ['custom neon signs', 'led signage', 'business signs', 'storefront lighting'],
        industries: ['Retail', 'Hospitality', 'Entertainment', 'Food & Beverage'],
        roles: ['Business Owner', 'Marketing Manager', 'Store Manager', 'Brand Director'],
        painPoints: ['Low storefront visibility', 'Outdated signage', 'Brand differentiation', 'Customer attraction'],
        valuePropositions: ['Eye-catching custom designs', 'Energy-efficient LED technology', 'Quick turnaround time', 'Premium quality at competitive prices'],
        employeeSize: { min: 1, max: 500 },
      },
      personalization: {
        toneOfVoice: 'professional',
        cta: 'Get a free custom design mockup',
        usp: 'Transform your storefront with stunning custom neon signs that attract customers and elevate your brand',
      },
      rationale: {
        targeting: 'Based on the campaign name, we identified businesses likely to benefit from custom signage solutions. The selected industries (Retail, Hospitality, Entertainment) have high storefront visibility needs and regularly invest in branding.',
        messaging: 'The messaging emphasizes visual impact and brand differentiation, key concerns for businesses in competitive retail environments. The CTA offers immediate value without commitment.',
        keywordStrategy: 'Keywords focus on commercial intent terms that indicate active search for signage solutions. Location-based modifiers can be added for local targeting.',
      },
    };
    
    updateICP(content.icp);
    updatePersonalization(content.personalization);
    setGeneratedContent(content);
    
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
        AI Campaign Draft Generator
      </h2>
      <p
        style={{
          margin: '0 0 24px 0',
          fontSize: '14px',
          color: '#6b7280',
          fontFamily: 'var(--font-body, Inter, sans-serif)',
        }}
      >
        Let AI analyze your campaign and generate targeting criteria and personalization settings.
      </p>

      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#eff6ff',
          borderRadius: '10px',
          border: '1px solid #bfdbfe',
          marginBottom: '24px',
          display: 'flex',
          gap: '12px',
        }}
      >
        <Icon name="info" size={20} color="#2563eb" />
        <p style={{ margin: 0, fontSize: '13px', color: '#1e40af' }}>
          AI suggestions are advisory only. Human review is required before proceeding. You can edit all generated settings in subsequent steps.
        </p>
      </div>

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
                width: '72px',
                height: '72px',
                margin: '0 auto 24px',
                backgroundColor: '#8b5cf6',
                borderRadius: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="ai" size={36} color="#ffffff" />
            </div>

            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '20px',
                fontWeight: 600,
                color: '#1e1e4a',
                fontFamily: 'var(--font-display, Poppins, sans-serif)',
              }}
            >
              Generate Draft with AI
            </h3>
            <p
              style={{
                margin: '0 0 24px 0',
                fontSize: '14px',
                color: '#6b7280',
                maxWidth: '420px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              Based on &quot;{data.name || 'your campaign'}&quot;, AI will generate ICP targeting, keyword suggestions, and personalization settings with explanations.
            </p>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '16px 32px',
                backgroundColor: '#8b5cf6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: isGenerating ? 'wait' : 'pointer',
                fontFamily: 'var(--font-body, Inter, sans-serif)',
                transition: 'background-color 0.2s ease',
              }}
            >
              {isGenerating ? (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '18px',
                      height: '18px',
                      border: '2px solid #ffffff',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  Analyzing campaign...
                </>
              ) : (
                <>
                  <Icon name="ai" size={18} color="#fff" />
                  Generate Draft with AI
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                width: '72px',
                height: '72px',
                margin: '0 auto 24px',
                backgroundColor: '#10b981',
                borderRadius: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="check" size={36} color="#ffffff" />
            </div>

            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '20px',
                fontWeight: 600,
                color: '#1e1e4a',
                fontFamily: 'var(--font-display, Poppins, sans-serif)',
              }}
            >
              Campaign Draft Generated
            </h3>
            <p
              style={{
                margin: '0 0 20px 0',
                fontSize: '14px',
                color: '#6b7280',
              }}
            >
              ICP and personalization settings have been populated. Review and edit them in the next steps.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowRationale(!showRationale)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  backgroundColor: '#ffffff',
                  color: '#4f46e5',
                  border: '1px solid #4f46e5',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body, Inter, sans-serif)',
                }}
              >
                <Icon name="info" size={16} color="#4f46e5" />
                {showRationale ? 'Hide Rationale' : 'View AI Rationale'}
              </button>
              
              <button
                onClick={handleGenerate}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body, Inter, sans-serif)',
                }}
              >
                <Icon name="refresh" size={16} color="#6b7280" />
                Regenerate
              </button>
            </div>
          </>
        )}
      </div>

      {hasGenerated && showRationale && generatedContent && (
        <div style={{ marginTop: '24px' }}>
          <h4
            style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: 600,
              color: '#1e1e4a',
              fontFamily: 'var(--font-display, Poppins, sans-serif)',
            }}
          >
            AI Rationale
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <RationaleCard title="Targeting Strategy" content={generatedContent.rationale.targeting} icon="target" />
            <RationaleCard title="Messaging Approach" content={generatedContent.rationale.messaging} icon="message" />
            <RationaleCard title="Keyword Strategy" content={generatedContent.rationale.keywordStrategy} icon="ai" />
          </div>
        </div>
      )}

      {hasGenerated && (
        <div style={{ marginTop: '24px' }}>
          <h4
            style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: 600,
              color: '#1e1e4a',
              fontFamily: 'var(--font-display, Poppins, sans-serif)',
            }}
          >
            Generated Preview
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <PreviewCard title="Keywords" items={data.icp.keywords} />
            <PreviewCard title="Target Industries" items={data.icp.industries} />
            <PreviewCard title="Target Roles" items={data.icp.roles} />
            <PreviewCard title="Pain Points" items={data.icp.painPoints} />
          </div>
        </div>
      )}

      <p
        style={{
          marginTop: '20px',
          fontSize: '12px',
          color: '#9ca3af',
          textAlign: 'center',
        }}
      >
        You can skip this step and configure all settings manually in the following steps.
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

function RationaleCard({ title, content, icon }: { title: string; content: string; icon: string }) {
  return (
    <div
      style={{
        padding: '16px 20px',
        backgroundColor: '#f9fafb',
        borderRadius: '10px',
        border: '1px solid #e5e7eb',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <Icon name={icon as any} size={16} color="#8b5cf6" />
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e1e4a' }}>{title}</span>
      </div>
      <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>{content}</p>
    </div>
  );
}

function PreviewCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e5e7eb',
      }}
    >
      <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h5>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {items.slice(0, 4).map((item, i) => (
          <span
            key={i}
            style={{
              padding: '4px 10px',
              backgroundColor: '#f3f4f6',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#374151',
            }}
          >
            {item}
          </span>
        ))}
        {items.length > 4 && (
          <span style={{ fontSize: '12px', color: '#9ca3af', alignSelf: 'center' }}>+{items.length - 4} more</span>
        )}
      </div>
    </div>
  );
}
