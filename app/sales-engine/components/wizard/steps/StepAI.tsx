'use client';

import { useState } from 'react';
import { useWizard } from '../WizardContext';
import { Icon } from '../../../../../design/components/Icon';
import type { ICP, PersonalizationStrategy } from '../../../types/campaign';
import { background, text, border, violet, magenta } from '../../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../../design/tokens/typography';

export function StepAI() {
  const { state, dispatch, nextStep } = useWizard();
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    
    setGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const generatedICP: ICP = {
      keywords: ['neon signs', 'custom signage', 'LED displays', 'business signs', 'storefront signs'],
      locations: [
        { country: 'United States', state: 'California' },
        { country: 'United States', state: 'Texas' },
        { country: 'United States', state: 'Florida' },
      ],
      industries: ['Retail', 'Hospitality', 'Food & Beverage', 'Entertainment', 'Real Estate'],
      employeeSize: { min: 10, max: 500 },
      roles: ['Business Owner', 'Marketing Manager', 'Operations Director', 'Store Manager'],
      painPoints: [
        'Low foot traffic visibility',
        'Outdated storefront signage',
        'Difficulty standing out from competitors',
        'High maintenance costs for existing signs',
      ],
      valuePropositions: [
        'Custom designs that capture brand identity',
        'Energy-efficient LED technology',
        'Quick turnaround times',
        'Professional installation included',
      ],
    };

    const generatedPersonalization: PersonalizationStrategy = {
      toneOfVoice: 'professional',
      primaryCTA: 'Get a Free Quote',
      uniqueSellingPoints: [
        '25+ years of experience',
        'Nationwide installation network',
        'Lifetime warranty on LED components',
      ],
      customFields: {},
    };

    dispatch({ type: 'SET_ICP', icp: generatedICP });
    dispatch({ type: 'SET_PERSONALIZATION', personalization: generatedPersonalization });
    setGenerating(false);
    setGenerated(true);
  }

  return (
    <div>
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{
          margin: 0,
          fontSize: fontSize['2xl'],
          fontWeight: fontWeight.semibold,
          color: text.primary,
          fontFamily: fontFamily.display,
        }}>
          AI-Powered Campaign Setup
        </h2>
        <p style={{
          margin: '12px 0 0 0',
          fontSize: fontSize.base,
          color: text.secondary,
          fontFamily: fontFamily.body,
          lineHeight: 1.6,
        }}>
          Describe your target audience and let AI generate your ICP targeting 
          and personalization strategy. You can edit everything in the next steps.
        </p>
      </div>

      <div style={{ maxWidth: '640px' }}>
        <div style={{
          padding: '32px',
          backgroundColor: violet[50],
          borderRadius: '16px',
          border: `1px solid ${violet[200]}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: violet[100],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon name="ai" size={20} color={violet[600]} />
            </div>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: fontSize.lg,
                fontWeight: fontWeight.semibold,
                color: violet[700],
                fontFamily: fontFamily.display,
              }}>
                AI Campaign Generator
              </h3>
            </div>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Target small to medium retail businesses in major US cities who need eye-catching storefront signage to increase foot traffic and stand out from competitors..."
            disabled={generating}
            rows={5}
            style={{
              width: '100%',
              padding: '16px 20px',
              fontSize: fontSize.base,
              fontFamily: fontFamily.body,
              backgroundColor: background.surface,
              border: `1px solid ${violet[300]}`,
              borderRadius: '12px',
              color: text.primary,
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              lineHeight: 1.6,
            }}
          />

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: fontSize.xs, color: violet[600], fontFamily: fontFamily.body }}>
              AI-generated content is fully editable
            </span>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || generating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                fontFamily: fontFamily.body,
                backgroundColor: prompt.trim() && !generating ? magenta[500] : border.default,
                color: prompt.trim() && !generating ? text.inverse : text.muted,
                border: 'none',
                borderRadius: '8px',
                cursor: prompt.trim() && !generating ? 'pointer' : 'not-allowed',
              }}
            >
              {generating ? (
                <>Generating...</>
              ) : (
                <>
                  <Icon name="sparkle" size={16} color={prompt.trim() ? text.inverse : text.muted} />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>

        {generated && (
          <div style={{
            marginTop: '32px',
            padding: '24px',
            backgroundColor: '#f0fdf4',
            borderRadius: '12px',
            border: '1px solid #86efac',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Icon name="check" size={20} color="#16a34a" />
              <span style={{
                fontSize: fontSize.base,
                fontWeight: fontWeight.medium,
                color: '#166534',
                fontFamily: fontFamily.body,
              }}>
                Campaign targeting generated successfully
              </span>
            </div>
            <p style={{
              margin: 0,
              fontSize: fontSize.sm,
              color: '#166534',
              fontFamily: fontFamily.body,
            }}>
              Your ICP targeting includes {state.icp.keywords.length} keywords, {state.icp.industries.length} industries, 
              and {state.icp.roles.length} target roles. Continue to review and customize.
            </p>
          </div>
        )}

        <div style={{
          marginTop: '32px',
          padding: '24px',
          backgroundColor: background.muted,
          borderRadius: '12px',
          border: `1px solid ${border.subtle}`,
        }}>
          <p style={{
            margin: 0,
            fontSize: fontSize.sm,
            color: text.secondary,
            fontFamily: fontFamily.body,
            lineHeight: 1.6,
          }}>
            <strong>Skip this step?</strong> You can manually configure your ICP and personalization 
            in the next steps without using AI generation.
          </p>
        </div>
      </div>
    </div>
  );
}
