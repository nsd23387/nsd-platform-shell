'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CampaignDetail, ICP, PersonalizationStrategy } from '../../../types/campaign';
import { getCampaign, updateCampaign } from '../../../lib/api';
import { StatusBadge, AICampaignGenerator, ICPEditor, PersonalizationEditor } from '../../../components';

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
      <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9ca3af' }}>Loading...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', padding: '32px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#ef4444' }}>{error || 'Campaign not found'}</p>
          <Link href="/sales-engine" style={{ color: '#e879f9' }}>← Back</Link>
        </div>
      </div>
    );
  }

  if (!campaign.canEdit) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', padding: '32px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ padding: '24px', backgroundColor: '#1f1f1f', borderRadius: '12px', border: '1px solid #fbbf24' }}>
            <h2 style={{ color: '#fbbf24', marginBottom: '12px' }}>Cannot Edit</h2>
            <p style={{ color: '#9ca3af' }}>
              This campaign is in {campaign.status} state and cannot be edited.
            </p>
            <Link
              href={`/sales-engine/campaigns/${campaignId}`}
              style={{ display: 'inline-block', marginTop: '16px', color: '#e879f9' }}
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
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href={`/sales-engine/campaigns/${campaignId}`} style={{ color: '#e879f9', textDecoration: 'none', fontSize: '14px' }}>
            ← Back to Campaign
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#fff' }}>Edit Campaign</h1>
              <StatusBadge status={campaign.status} />
            </div>
            <p style={{ margin: '8px 0 0 0', color: '#9ca3af' }}>Configure your campaign targeting and personalization</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 32px',
              fontSize: '16px',
              fontWeight: 600,
              backgroundColor: '#e879f9',
              color: '#0f0f0f',
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
          <div style={{ padding: '16px', backgroundColor: '#7f1d1d', borderRadius: '8px', marginBottom: '24px', color: '#fecaca' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: '1px solid #333', paddingBottom: '16px' }}>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as typeof activeSection)}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 500,
                backgroundColor: activeSection === section.id ? '#e879f9' : 'transparent',
                color: activeSection === section.id ? '#0f0f0f' : '#9ca3af',
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

        <div style={{ backgroundColor: '#1a1a1a', borderRadius: '16px', padding: '32px', border: '1px solid #333' }}>
          {activeSection === 'basics' && (
            <div>
              <h2 style={{ margin: '0 0 24px 0', color: '#fff', fontSize: '20px' }}>Campaign Basics</h2>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#d1d5db', fontSize: '14px', fontWeight: 500 }}>
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    backgroundColor: '#0f0f0f',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#d1d5db', fontSize: '14px', fontWeight: 500 }}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    backgroundColor: '#0f0f0f',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff',
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
              <h2 style={{ margin: '0 0 24px 0', color: '#fff', fontSize: '20px' }}>AI Campaign Generator</h2>
              <AICampaignGenerator onGenerate={handleAIGenerate} />
            </div>
          )}

          {activeSection === 'icp' && (
            <div>
              <h2 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '20px' }}>ICP & Targeting</h2>
              <p style={{ margin: '0 0 24px 0', color: '#9ca3af', fontSize: '14px' }}>
                Define your Ideal Customer Profile to target the right prospects
              </p>
              <ICPEditor icp={icp} onChange={setIcp} />
            </div>
          )}

          {activeSection === 'personalization' && (
            <div>
              <h2 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '20px' }}>Personalization Strategy</h2>
              <p style={{ margin: '0 0 24px 0', color: '#9ca3af', fontSize: '14px' }}>
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
