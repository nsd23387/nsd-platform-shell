'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CampaignDetail, ICP, PersonalizationStrategy } from '../../../types/campaign';
import { getCampaign, updateCampaign } from '../../../lib/api';
import { StatusBadge, AICampaignGenerator, ICPEditor, PersonalizationEditor } from '../../../components';
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
      <div style={{ minHeight: '100vh', backgroundColor: background.page, padding: '32px', fontFamily: fontFamily.body }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: semantic.danger.base }}>{error || 'Campaign not found'}</p>
          <Link href="/sales-engine" style={{ color: violet[500] }}>← Back</Link>
        </div>
      </div>
    );
  }

  if (!campaign.canEdit) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: background.page, padding: '32px', fontFamily: fontFamily.body }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ padding: '24px', backgroundColor: semantic.warning.light, borderRadius: '12px', border: `1px solid ${semantic.warning.base}` }}>
            <h2 style={{ color: semantic.warning.dark, marginBottom: '12px' }}>Cannot Edit</h2>
            <p style={{ color: text.secondary }}>
              This campaign is in {campaign.status} state and cannot be edited.
            </p>
            <Link
              href={`/sales-engine/campaigns/${campaignId}`}
              style={{ display: 'inline-block', marginTop: '16px', color: violet[500] }}
            >
              ← Back to Campaign
            </Link>
          </div>
        </div>
      </div>
    );
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
          <Link href={`/sales-engine/campaigns/${campaignId}`} style={{ color: violet[500], textDecoration: 'none', fontSize: fontSize.sm }}>
            ← Back to Campaign
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ margin: 0, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: text.primary, fontFamily: fontFamily.heading }}>Edit Campaign</h1>
              <StatusBadge status={campaign.status} />
            </div>
            <p style={{ margin: '8px 0 0 0', color: text.secondary, fontSize: fontSize.sm }}>Configure your campaign targeting and personalization</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 32px',
              fontSize: fontSize.base,
              fontWeight: fontWeight.semibold,
              backgroundColor: magenta[500],
              color: text.inverse,
              border: 'none',
              borderRadius: '8px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {error && (
          <div style={{ padding: '16px', backgroundColor: semantic.danger.light, border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '24px', color: semantic.danger.dark }}>
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
