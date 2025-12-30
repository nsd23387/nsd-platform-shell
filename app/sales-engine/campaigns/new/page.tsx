'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ICP, PersonalizationStrategy } from '../../types/campaign';
import { createCampaign } from '../../lib/api';
import { AICampaignGenerator, ICPEditor, PersonalizationEditor } from '../../components';
import { background, text, border, violet, magenta } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';

const defaultICP: ICP = {
  keywords: [],
  locations: [],
  industries: [],
  employeeSize: { min: 1, max: 1000 },
  roles: [],
  painPoints: [],
  valuePropositions: [],
};

const defaultPersonalization: PersonalizationStrategy = {
  toneOfVoice: 'professional',
  primaryCTA: '',
  uniqueSellingPoints: [],
  customFields: {},
};

export default function NewCampaignPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icp, setIcp] = useState<ICP>(defaultICP);
  const [personalization, setPersonalization] = useState<PersonalizationStrategy>(defaultPersonalization);
  const [activeSection, setActiveSection] = useState<'basics' | 'ai' | 'icp' | 'personalization'>('basics');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) {
      setError('Campaign name is required');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const campaign = await createCampaign({ name, description, icp, personalization });
      router.push(`/sales-engine/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
      setIsLoading(false);
    }
  }

  function handleAIGenerate(generatedICP: ICP, generatedPersonalization: PersonalizationStrategy) {
    setIcp(generatedICP);
    setPersonalization(generatedPersonalization);
    setActiveSection('icp');
  }

  const sections = [
    { id: 'basics', label: 'Basics', icon: '📝' },
    { id: 'ai', label: 'AI Generator', icon: '✨' },
    { id: 'icp', label: 'ICP & Targeting', icon: '🎯' },
    { id: 'personalization', label: 'Personalization', icon: '💬' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: background.page, fontFamily: fontFamily.body }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href="/sales-engine" style={{ color: violet[500], textDecoration: 'none', fontSize: fontSize.sm }}>
            ← Back to Campaigns
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: text.primary, fontFamily: fontFamily.heading }}>
              Create New Campaign
            </h1>
            <p style={{ margin: '8px 0 0 0', color: text.secondary, fontSize: fontSize.sm }}>
              New campaigns are created in DRAFT state. Configure targeting and personalization.
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={isLoading || !name.trim()}
            style={{
              padding: '12px 32px',
              fontSize: fontSize.base,
              fontWeight: fontWeight.semibold,
              backgroundColor: name.trim() && !isLoading ? magenta[500] : border.default,
              color: name.trim() && !isLoading ? text.inverse : text.muted,
              border: 'none',
              borderRadius: '8px',
              cursor: name.trim() && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading ? 'Creating...' : 'Create Campaign'}
          </button>
        </div>

        {error && (
          <div style={{ padding: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '24px', color: '#b91c1c' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: `1px solid ${border.default}`, paddingBottom: '16px' }}>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as typeof activeSection)}
              style={{
                padding: '12px 24px',
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                backgroundColor: activeSection === section.id ? violet[500] : 'transparent',
                color: activeSection === section.id ? text.inverse : text.secondary,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>

        <div style={{ backgroundColor: background.surface, borderRadius: '16px', padding: '32px', border: `1px solid ${border.default}` }}>
          {activeSection === 'basics' && (
            <div>
              <h2 style={{ margin: '0 0 24px 0', color: text.primary, fontSize: fontSize.xl }}>Campaign Basics</h2>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: text.secondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Q1 Retail Outreach"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: fontSize.base,
                    backgroundColor: background.surface,
                    border: `1px solid ${border.default}`,
                    borderRadius: '8px',
                    color: text.primary,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: text.secondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the campaign goals and target audience..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: fontSize.base,
                    backgroundColor: background.surface,
                    border: `1px solid ${border.default}`,
                    borderRadius: '8px',
                    color: text.primary,
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {activeSection === 'ai' && (
            <div>
              <h2 style={{ margin: '0 0 24px 0', color: text.primary, fontSize: fontSize.xl }}>AI Campaign Generator</h2>
              <AICampaignGenerator onGenerate={handleAIGenerate} />
            </div>
          )}

          {activeSection === 'icp' && (
            <div>
              <h2 style={{ margin: '0 0 8px 0', color: text.primary, fontSize: fontSize.xl }}>ICP & Targeting</h2>
              <p style={{ margin: '0 0 24px 0', color: text.secondary, fontSize: fontSize.sm }}>
                Define your Ideal Customer Profile to target the right prospects
              </p>
              <ICPEditor icp={icp} onChange={setIcp} />
            </div>
          )}

          {activeSection === 'personalization' && (
            <div>
              <h2 style={{ margin: '0 0 8px 0', color: text.primary, fontSize: fontSize.xl }}>Personalization Strategy</h2>
              <p style={{ margin: '0 0 24px 0', color: text.secondary, fontSize: fontSize.sm }}>
                Customize how your outreach communicates with prospects
              </p>
              <PersonalizationEditor personalization={personalization} onChange={setPersonalization} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
