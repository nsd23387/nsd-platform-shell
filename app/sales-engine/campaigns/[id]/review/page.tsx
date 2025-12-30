'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CampaignDetail } from '../../../types/campaign';
import { getCampaign, approveCampaign } from '../../../lib/api';
import { StatusBadge, ICPEditor, PersonalizationEditor } from '../../../components';
import { background, text, border, violet, semantic } from '../../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../../design/tokens/typography';

const defaultICP = {
  keywords: [],
  locations: [],
  industries: [],
  employeeSize: { min: 1, max: 1000 },
  roles: [],
  painPoints: [],
  valuePropositions: [],
};

const defaultPersonalization = {
  toneOfVoice: 'professional' as const,
  primaryCTA: '',
  uniqueSellingPoints: [],
  customFields: {},
};

export default function CampaignReviewPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getCampaign(campaignId);
        setCampaign(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [campaignId]);

  async function handleApprove() {
    setApproving(true);
    try {
      await approveCampaign(campaignId);
      router.push(`/sales-engine/campaigns/${campaignId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
      setApproving(false);
      setShowConfirm(false);
    }
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

  if (campaign.status !== 'PENDING_REVIEW') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: background.page, padding: '32px', fontFamily: fontFamily.body }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ padding: '24px', backgroundColor: semantic.warning.light, borderRadius: '12px', border: `1px solid ${semantic.warning.base}` }}>
            <h2 style={{ color: semantic.warning.dark, marginBottom: '12px' }}>Not Pending Review</h2>
            <p style={{ color: text.secondary }}>
              This campaign is in {campaign.status} state. Only campaigns in PENDING_REVIEW can be reviewed here.
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: background.page, fontFamily: fontFamily.body }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href={`/sales-engine/campaigns/${campaignId}`} style={{ color: violet[500], textDecoration: 'none', fontSize: fontSize.sm }}>
            ← Back to Campaign
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{ margin: 0, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: text.primary, fontFamily: fontFamily.heading }}>Review Campaign</h1>
              <StatusBadge status={campaign.status} />
            </div>
            <h2 style={{ margin: 0, fontSize: fontSize.xl, color: text.secondary }}>{campaign.name}</h2>
            {campaign.submittedBy && (
              <p style={{ margin: '8px 0 0 0', color: text.muted, fontSize: fontSize.sm }}>
                Submitted by {campaign.submittedBy} {campaign.submittedAt && `on ${new Date(campaign.submittedAt).toLocaleDateString()}`}
              </p>
            )}
          </div>

          {campaign.canApprove && (
            <button
              onClick={() => setShowConfirm(true)}
              style={{
                padding: '14px 32px',
                fontSize: fontSize.base,
                fontWeight: fontWeight.semibold,
                backgroundColor: semantic.success.base,
                color: text.inverse,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              ✓ Approve Campaign
            </button>
          )}
        </div>

        {error && (
          <div style={{ padding: '16px', backgroundColor: semantic.danger.light, border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '24px', color: semantic.danger.dark }}>
            {error}
          </div>
        )}

        {showConfirm && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}>
            <div style={{
              backgroundColor: background.surface,
              padding: '32px',
              borderRadius: '16px',
              maxWidth: '500px',
              border: `1px solid ${semantic.success.base}`,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: text.primary, fontSize: fontSize.xl }}>Confirm Approval</h3>
              <p style={{ margin: '0 0 24px 0', color: text.secondary }}>
                Are you sure you want to approve this campaign? Once approved, it will transition to RUNNABLE state.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={approving}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'transparent',
                    color: text.secondary,
                    border: `1px solid ${border.default}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: semantic.success.base,
                    color: text.inverse,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: approving ? 'not-allowed' : 'pointer',
                    opacity: approving ? 0.7 : 1,
                  }}
                >
                  {approving ? 'Approving...' : 'Yes, Approve'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ backgroundColor: background.surface, borderRadius: '16px', padding: '32px', border: `1px solid ${border.default}`, marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: text.primary, fontSize: fontSize.lg }}>Campaign Details</h3>
          <p style={{ margin: 0, color: text.secondary }}>{campaign.description || 'No description provided'}</p>
        </div>

        <div style={{ backgroundColor: background.surface, borderRadius: '16px', padding: '32px', border: `1px solid ${border.default}`, marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 24px 0', color: text.primary, fontSize: fontSize.lg }}>ICP & Targeting (Read-Only)</h3>
          <ICPEditor icp={campaign.icp || defaultICP} onChange={() => {}} disabled />
        </div>

        <div style={{ backgroundColor: background.surface, borderRadius: '16px', padding: '32px', border: `1px solid ${border.default}` }}>
          <h3 style={{ margin: '0 0 24px 0', color: text.primary, fontSize: fontSize.lg }}>Personalization (Read-Only)</h3>
          <PersonalizationEditor personalization={campaign.personalization || defaultPersonalization} onChange={() => {}} disabled />
        </div>
      </div>
    </div>
  );
}
