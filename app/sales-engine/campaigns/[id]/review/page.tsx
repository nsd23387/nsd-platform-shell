'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CampaignDetail } from '../../../types/campaign';
import { getCampaign, approveCampaign } from '../../../lib/api';
import { StatusBadge, ICPEditor, PersonalizationEditor } from '../../../components';

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

  if (campaign.status !== 'PENDING_REVIEW') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', padding: '32px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ padding: '24px', backgroundColor: '#1f1f1f', borderRadius: '12px', border: '1px solid #fbbf24' }}>
            <h2 style={{ color: '#fbbf24', marginBottom: '12px' }}>Not Pending Review</h2>
            <p style={{ color: '#9ca3af' }}>
              This campaign is in {campaign.status} state. Only campaigns in PENDING_REVIEW can be reviewed here.
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href={`/sales-engine/campaigns/${campaignId}`} style={{ color: '#e879f9', textDecoration: 'none', fontSize: '14px' }}>
            ← Back to Campaign
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#fff' }}>Review Campaign</h1>
              <StatusBadge status={campaign.status} />
            </div>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#d1d5db' }}>{campaign.name}</h2>
            {campaign.submittedBy && (
              <p style={{ margin: '8px 0 0 0', color: '#9ca3af', fontSize: '14px' }}>
                Submitted by {campaign.submittedBy} {campaign.submittedAt && `on ${new Date(campaign.submittedAt).toLocaleDateString()}`}
              </p>
            )}
          </div>

          {campaign.canApprove && (
            <button
              onClick={() => setShowConfirm(true)}
              style={{
                padding: '14px 32px',
                fontSize: '16px',
                fontWeight: 600,
                backgroundColor: '#22c55e',
                color: '#fff',
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
          <div style={{ padding: '16px', backgroundColor: '#7f1d1d', borderRadius: '8px', marginBottom: '24px', color: '#fecaca' }}>
            {error}
          </div>
        )}

        {showConfirm && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}>
            <div style={{
              backgroundColor: '#1a1a1a',
              padding: '32px',
              borderRadius: '16px',
              maxWidth: '500px',
              border: '1px solid #22c55e',
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '20px' }}>Confirm Approval</h3>
              <p style={{ margin: '0 0 24px 0', color: '#9ca3af' }}>
                Are you sure you want to approve this campaign? Once approved, it will transition to RUNNABLE state.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={approving}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'transparent',
                    color: '#9ca3af',
                    border: '1px solid #333',
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
                    backgroundColor: '#22c55e',
                    color: '#fff',
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

        <div style={{ backgroundColor: '#1a1a1a', borderRadius: '16px', padding: '32px', border: '1px solid #333', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '18px' }}>Campaign Details</h3>
          <p style={{ margin: 0, color: '#d1d5db' }}>{campaign.description || 'No description provided'}</p>
        </div>

        <div style={{ backgroundColor: '#1a1a1a', borderRadius: '16px', padding: '32px', border: '1px solid #333', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 24px 0', color: '#fff', fontSize: '18px' }}>ICP & Targeting (Read-Only)</h3>
          <ICPEditor icp={campaign.icp || defaultICP} onChange={() => {}} disabled />
        </div>

        <div style={{ backgroundColor: '#1a1a1a', borderRadius: '16px', padding: '32px', border: '1px solid #333' }}>
          <h3 style={{ margin: '0 0 24px 0', color: '#fff', fontSize: '18px' }}>Personalization (Read-Only)</h3>
          <PersonalizationEditor personalization={campaign.personalization || defaultPersonalization} onChange={() => {}} disabled />
        </div>
      </div>
    </div>
  );
}
