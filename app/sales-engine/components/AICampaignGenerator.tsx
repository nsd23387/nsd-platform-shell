'use client';

import { useState } from 'react';
import type { ICP, PersonalizationStrategy } from '../types/campaign';
import { background, text, border, violet, magenta } from '../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../design/tokens/typography';

interface AICampaignGeneratorProps {
  onGenerate: (icp: ICP, personalization: PersonalizationStrategy) => void;
  isLoading?: boolean;
}

export function AICampaignGenerator({ onGenerate, isLoading }: AICampaignGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

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

    onGenerate(generatedICP, generatedPersonalization);
    setGenerating(false);
  }

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: violet[50],
        borderRadius: '12px',
        border: `2px solid ${violet[300]}`,
        fontFamily: fontFamily.body,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '24px' }}>✨</span>
        <h3 style={{ margin: 0, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: violet[700] }}>
          AI Campaign Generator
        </h3>
      </div>

      <p style={{ margin: '0 0 16px 0', fontSize: fontSize.sm, color: violet[600] }}>
        Describe your target audience and campaign goals. AI will generate ICP targeting, 
        keywords, pain points, and personalization strategy.
      </p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Example: Target small to medium retail businesses in major US cities who need eye-catching storefront signage to increase foot traffic..."
        disabled={generating || isLoading}
        rows={4}
        style={{
          width: '100%',
          padding: '12px 14px',
          fontSize: fontSize.sm,
          border: `1px solid ${violet[300]}`,
          borderRadius: '8px',
          outline: 'none',
          resize: 'vertical',
          boxSizing: 'border-box',
          backgroundColor: background.surface,
          color: text.primary,
        }}
      />

      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: fontSize.xs, color: violet[500] }}>
          AI-generated content is editable after generation
        </span>
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || generating || isLoading}
          style={{
            padding: '10px 24px',
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            backgroundColor: prompt.trim() && !generating ? magenta[500] : border.default,
            color: prompt.trim() && !generating ? text.inverse : text.muted,
            border: 'none',
            borderRadius: '8px',
            cursor: prompt.trim() && !generating ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {generating ? (
            <>
              <span style={{ animation: 'spin 1s linear infinite' }}>⚙️</span>
              Generating...
            </>
          ) : (
            <>✨ Generate Campaign</>
          )}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
