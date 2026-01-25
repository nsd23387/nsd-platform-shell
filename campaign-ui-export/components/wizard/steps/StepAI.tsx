'use client';

import { useState } from 'react';
import { useWizard } from '../WizardContext';
import { Icon } from '../../../../../design/components/Icon';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../../lib/design-tokens';

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
          color: NSD_COLORS.primary,
          fontFamily: NSD_TYPOGRAPHY.fontDisplay,
        }}
      >
        AI Campaign Draft Generator
      </h2>
      <p
        style={{
          margin: '0 0 24px 0',
          fontSize: '14px',
          color: NSD_COLORS.text.secondary,
          fontFamily: NSD_TYPOGRAPHY.fontBody,
        }}
      >
        Let AI analyze your campaign and generate targeting criteria and personalization settings.
      </p>

      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#eff6ff',
          borderRadius: NSD_RADIUS.md,
          border: '1px solid #bfdbfe',
          marginBottom: '24px',
          display: 'flex',
          gap: '12px',
        }}
      >
        <Icon name="info" size={20} color={NSD_COLORS.info} />
        <p style={{ margin: 0, fontSize: '13px', color: '#1e40af' }}>
          AI suggestions are advisory only. Human review is required before proceeding. You can edit all generated settings in subsequent steps.
        </p>
      </div>

      <div
        style={{
          padding: '32px',
          backgroundColor: NSD_COLORS.surface,
          borderRadius: NSD_RADIUS.lg,
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
                backgroundColor: NSD_COLORS.secondary,
                borderRadius: NSD_RADIUS.lg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="ai" size={36} color={NSD_COLORS.text.inverse} />
            </div>

            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '20px',
                fontWeight: 600,
                color: NSD_COLORS.primary,
                fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              }}
            >
              Generate Draft with AI
            </h3>
            <p
              style={{
                margin: '0 0 24px 0',
                fontSize: '14px',
                color: NSD_COLORS.text.secondary,
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
                backgroundColor: NSD_COLORS.secondary,
                color: NSD_COLORS.text.inverse,
                border: 'none',
                borderRadius: NSD_RADIUS.md,
                fontSize: '15px',
                fontWeight: 600,
                cursor: isGenerating ? 'wait' : 'pointer',
                fontFamily: NSD_TYPOGRAPHY.fontBody,
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
                      border: `2px solid ${NSD_COLORS.text.inverse}`,
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  Analyzing campaign...
                </>
              ) : (
                <>
                  <Icon name="ai" size={18} color={NSD_COLORS.text.inverse} />
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
                backgroundColor: NSD_COLORS.semantic.positive.text,
                borderRadius: NSD_RADIUS.lg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="check" size={36} color={NSD_COLORS.text.inverse} />
            </div>

            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '20px',
                fontWeight: 600,
                color: NSD_COLORS.primary,
                fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              }}
            >
              Campaign Draft Generated
            </h3>
            <p
              style={{
                margin: '0 0 20px 0',
                fontSize: '14px',
                color: NSD_COLORS.text.secondary,
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
                  backgroundColor: NSD_COLORS.background,
                  color: NSD_COLORS.secondary,
                  border: `1px solid ${NSD_COLORS.secondary}`,
                  borderRadius: NSD_RADIUS.md,
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: NSD_TYPOGRAPHY.fontBody,
                }}
              >
                <Icon name="info" size={16} color={NSD_COLORS.secondary} />
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
                  color: NSD_COLORS.text.secondary,
                  border: `1px solid ${NSD_COLORS.border.default}`,
                  borderRadius: NSD_RADIUS.md,
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: NSD_TYPOGRAPHY.fontBody,
                }}
              >
                <Icon name="refresh" size={16} color={NSD_COLORS.text.secondary} />
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
              color: NSD_COLORS.primary,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
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
              color: NSD_COLORS.primary,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
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
          color: NSD_COLORS.text.muted,
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
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.md,
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <Icon name={icon as any} size={16} color={NSD_COLORS.secondary} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: NSD_COLORS.primary }}>{title}</span>
      </div>
      <p style={{ margin: 0, fontSize: '13px', color: NSD_COLORS.text.secondary, lineHeight: 1.6 }}>{content}</p>
    </div>
  );
}

function PreviewCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.md,
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}
    >
      <h5 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 600, color: NSD_COLORS.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h5>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {items.slice(0, 4).map((item, i) => (
          <span
            key={i}
            style={{
              padding: '4px 10px',
              backgroundColor: NSD_COLORS.surface,
              borderRadius: NSD_RADIUS.sm,
              fontSize: '12px',
              color: NSD_COLORS.text.primary,
            }}
          >
            {item}
          </span>
        ))}
        {items.length > 4 && (
          <span style={{ fontSize: '12px', color: NSD_COLORS.text.muted, alignSelf: 'center' }}>+{items.length - 4} more</span>
        )}
      </div>
    </div>
  );
}
