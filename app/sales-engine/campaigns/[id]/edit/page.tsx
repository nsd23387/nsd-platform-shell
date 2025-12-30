'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CampaignDetail, ICP, PersonalizationStrategy } from '../../../types/campaign';
import { getCampaign, updateCampaign } from '../../../lib/api';
import { StatusBadge, AICampaignGenerator, ICPEditor, PersonalizationEditor } from '../../../components';
import { Icon, IconName } from '../../../../../design/components/Icon';
import { background, text, border, violet, magenta, semantic } from '../../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../../design/tokens/typography';

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

export default function CampaignEditPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icp, setIcp] = useState<ICP>(defaultICP);
  const [personalization, setPersonalization] = useState<PersonalizationStrategy>(defaultPersonalization);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'basics' | 'ai' | 'icp' | 'personalization'>('basics');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getCampaign(campaignId);
        setCampaign(data);
        setName(data.name);
        setDescription(data.description || '');
        setIcp(data.icp || defaultICP);
        setPersonalization(data.personalization || defaultPersonalization);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [campaignId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateCampaign(campaignId, { name, description, icp, personalization });
      router.push(`/sales-engine/campaigns/${campaignId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  }

  function handleAIGenerate(generatedICP: ICP, generatedPersonalization: PersonalizationStrategy) {
    setIcp(generatedICP);
    setPersonalization(generatedPersonalization);
    setActiveSection('icp');
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: background.page, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fontFamily.body }}>
        <p style={{ color: text.muted }}>Loading...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: background.page, padding: '48px 32px', fontFamily: fontFamily.body }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: semantic.danger.base }}>{error || 'Campaign not found'}</p>
          <Link href="/sales-engine" style={{ color: violet[500], display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="arrow-left" size={16} color={violet[500]} />
            Back
          </Link>
        </div>
      </div>
    );
  }

  if (!campaign.canEdit) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: background.page, padding: '48px 32px', fontFamily: fontFamily.body }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ padding: '32px', backgroundColor: semantic.warning.light, borderRadius: '16px', border: `1px solid ${semantic.warning.base}` }}>
            <Icon name="alert" size={32} color={semantic.warning.base} />
            <h2 style={{ color: semantic.warning.dark, marginTop: '16px', marginBottom: '12px', fontFamily: fontFamily.display }}>Cannot Edit</h2>
            <p style={{ color: text.secondary, fontFamily: fontFamily.body }}>
              This campaign is in {campaign.status} state and cannot be edited.
            </p>
            <Link
              href={`/sales-engine/campaigns/${campaignId}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '16px', color: violet[500] }}
            >
              <Icon name="arrow-left" size={16} color={violet[500]} />
              Back to Campaign
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sections: { id: 'basics' | 'ai' | 'icp' | 'personalization'; label: string; icon: IconName }[] = [
    { id: 'basics', label: 'Basics', icon: 'document' },
    { id: 'ai', label: 'AI Generator', icon: 'ai' },
    { id: 'icp', label: 'ICP & Targeting', icon: 'target' },
    { id: 'personalization', label: 'Personalization', icon: 'message' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: background.page, fontFamily: fontFamily.body }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 32px' }}>
        <div style={{ marginBottom: '32px' }}>
          <Link
            href={`/sales-engine/campaigns/${campaignId}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: text.secondary, textDecoration: 'none', fontSize: fontSize.sm }}
          >
            <Icon name="arrow-left" size={16} color={text.secondary} />
            Back to Campaign
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <h1 style={{ margin: 0, fontSize: fontSize['4xl'], fontWeight: fontWeight.semibold, color: text.primary, fontFamily: fontFamily.display }}>
                Edit Campaign
              </h1>
              <StatusBadge status={campaign.status} />
            </div>
            <p style={{ margin: 0, color: text.secondary, fontSize: fontSize.base, fontFamily: fontFamily.body }}>
              Configure your campaign targeting and personalization
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 32px',
              fontSize: fontSize.base,
              fontWeight: fontWeight.semibold,
              fontFamily: fontFamily.body,
              backgroundColor: magenta[500],
              color: text.inverse,
              border: 'none',
              borderRadius: '10px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            backgroundColor: semantic.danger.light,
            border: '1px solid #fecaca',
            borderRadius: '12px',
            marginBottom: '32px',
            color: semantic.danger.dark,
          }}>
            <Icon name="alert" size={20} color={semantic.danger.base} />
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                padding: '14px 24px',
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                fontFamily: fontFamily.body,
                backgroundColor: activeSection === section.id ? violet[500] : 'transparent',
                color: activeSection === section.id ? text.inverse : text.secondary,
                border: `1px solid ${activeSection === section.id ? violet[500] : border.default}`,
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              <Icon name={section.icon} size={18} color={activeSection === section.id ? text.inverse : text.secondary} />
              {section.label}
            </button>
          ))}
        </div>

        <div style={{
          backgroundColor: background.surface,
          borderRadius: '20px',
          padding: '48px',
          border: `1px solid ${border.subtle}`,
          minHeight: '400px',
        }}>
          {activeSection === 'basics' && (
            <div style={{ maxWidth: '560px' }}>
              <h2 style={{ margin: '0 0 32px 0', color: text.primary, fontSize: fontSize['2xl'], fontFamily: fontFamily.display, fontWeight: fontWeight.semibold }}>
                Campaign Basics
              </h2>
              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', marginBottom: '10px', color: text.primary, fontSize: fontSize.sm, fontWeight: fontWeight.medium, fontFamily: fontFamily.body }}>
                  Campaign Name
                  <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    fontSize: fontSize.base,
                    fontFamily: fontFamily.body,
                    backgroundColor: background.surface,
                    border: `1px solid ${border.default}`,
                    borderRadius: '12px',
                    color: text.primary,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '10px', color: text.primary, fontSize: fontSize.sm, fontWeight: fontWeight.medium, fontFamily: fontFamily.body }}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    fontSize: fontSize.base,
                    fontFamily: fontFamily.body,
                    backgroundColor: background.surface,
                    border: `1px solid ${border.default}`,
                    borderRadius: '12px',
                    color: text.primary,
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    lineHeight: 1.6,
                  }}
                />
              </div>
            </div>
          )}

          {activeSection === 'ai' && (
            <div style={{ maxWidth: '640px' }}>
              <h2 style={{ margin: '0 0 32px 0', color: text.primary, fontSize: fontSize['2xl'], fontFamily: fontFamily.display, fontWeight: fontWeight.semibold }}>
                AI Campaign Generator
              </h2>
              <AICampaignGenerator onGenerate={handleAIGenerate} />
            </div>
          )}

          {activeSection === 'icp' && (
            <div>
              <h2 style={{ margin: '0 0 12px 0', color: text.primary, fontSize: fontSize['2xl'], fontFamily: fontFamily.display, fontWeight: fontWeight.semibold }}>
                ICP & Targeting
              </h2>
              <p style={{ margin: '0 0 32px 0', color: text.secondary, fontSize: fontSize.base, fontFamily: fontFamily.body }}>
                Define your Ideal Customer Profile to target the right prospects
              </p>
              <ICPEditor icp={icp} onChange={setIcp} />
            </div>
          )}

          {activeSection === 'personalization' && (
            <div>
              <h2 style={{ margin: '0 0 12px 0', color: text.primary, fontSize: fontSize['2xl'], fontFamily: fontFamily.display, fontWeight: fontWeight.semibold }}>
                Personalization Strategy
              </h2>
              <p style={{ margin: '0 0 32px 0', color: text.secondary, fontSize: fontSize.base, fontFamily: fontFamily.body }}>
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
