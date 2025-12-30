'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CampaignDetail } from '../../types/campaign';
import { getCampaign, submitCampaign } from '../../lib/api';
import { StatusBadge } from '../../components';

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const campaignData = await getCampaign(campaignId);
        setCampaign(campaignData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [campaignId]);

  async function handleSubmitForReview() {
    if (!campaign?.canSubmit) return;
    setSubmitting(true);
    try {
      const updated = await submitCampaign(campaignId);
      setCampaign({ ...campaign, ...updated, status: 'PENDING_REVIEW', canEdit: false, canSubmit: false, canApprove: true });
      setShowSubmitConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9ca3af' }}>Loading campaign...</p>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', padding: '32px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ padding: '24px', backgroundColor: '#7f1d1d', borderRadius: '8px', marginBottom: '24px' }}>
            <p style={{ margin: 0, color: '#fecaca' }}>{error || 'Campaign not found'}</p>
          </div>
          <Link href="/sales-engine" style={{ color: '#e879f9', textDecoration: 'none' }}>
            ← Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  const navLinks = [
    { href: `/sales-engine/campaigns/${campaignId}/edit`, label: 'Edit Campaign', icon: '✏️', show: campaign.canEdit },
    { href: `/sales-engine/campaigns/${campaignId}/review`, label: 'Review & Approve', icon: '✓', show: campaign.status === 'PENDING_REVIEW' },
    { href: `/sales-engine/campaigns/${campaignId}/metrics`, label: 'Metrics', icon: '📊', show: true },
    { href: `/sales-engine/campaigns/${campaignId}/runs`, label: 'Run History', icon: '📜', show: true },
    { href: `/sales-engine/campaigns/${campaignId}/variants`, label: 'Variants', icon: '🎨', show: true },
    { href: `/sales-engine/campaigns/${campaignId}/safety`, label: 'Safety', icon: '🛡️', show: true },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href="/sales-engine" style={{ fontSize: '14px', color: '#e879f9', textDecoration: 'none' }}>
            ← Back to Campaigns
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 600, color: '#fff' }}>
                {campaign.name}
              </h1>
              <StatusBadge status={campaign.status} />
            </div>
            {campaign.description && (
              <p style={{ margin: 0, fontSize: '16px', color: '#9ca3af', maxWidth: '600px' }}>
                {campaign.description}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {campaign.canEdit && (
              <Link
                href={`/sales-engine/campaigns/${campaignId}/edit`}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: '#e879f9',
                  border: '2px solid #e879f9',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Edit Campaign
              </Link>
            )}
            {campaign.canSubmit && (
              <button
                onClick={() => setShowSubmitConfirm(true)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#e879f9',
                  color: '#0f0f0f',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Submit for Review
              </button>
            )}
          </div>
        </div>

        {campaign.isRunnable && (
          <div style={{
            padding: '20px',
            backgroundColor: '#14532d',
            borderRadius: '12px',
            border: '2px solid #22c55e',
            marginBottom: '32px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>✅</span>
              <div>
                <p style={{ margin: 0, color: '#86efac', fontWeight: 600, fontSize: '16px' }}>
                  This campaign is runnable but NOT executing.
                </p>
                <p style={{ margin: '4px 0 0 0', color: '#bbf7d0', fontSize: '14px' }}>
                  Execution is managed externally via NSD Command Center (M68).
                </p>
              </div>
            </div>
          </div>
        )}

        {showSubmitConfirm && (
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
              border: '1px solid #e879f9',
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '20px' }}>Submit for Review?</h3>
              <p style={{ margin: '0 0 24px 0', color: '#9ca3af' }}>
                Once submitted, the campaign will move to PENDING_REVIEW and cannot be edited until rejected.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  disabled={submitting}
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
                  onClick={handleSubmitForReview}
                  disabled={submitting}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#e879f9',
                    color: '#0f0f0f',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                    fontWeight: 600,
                  }}
                >
                  {submitting ? 'Submitting...' : 'Yes, Submit'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {navLinks.filter(link => link.show).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: '20px',
                backgroundColor: '#1a1a1a',
                borderRadius: '12px',
                border: '1px solid #333',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'border-color 0.2s',
              }}
            >
              <span style={{ fontSize: '24px' }}>{link.icon}</span>
              <span style={{ color: '#fff', fontWeight: 500 }}>{link.label}</span>
            </Link>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{
            padding: '24px',
            backgroundColor: '#1a1a1a',
            borderRadius: '16px',
            border: '1px solid #333',
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '18px' }}>Campaign Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Created</p>
                <p style={{ margin: '4px 0 0 0', color: '#d1d5db' }}>
                  {new Date(campaign.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Last Updated</p>
                <p style={{ margin: '4px 0 0 0', color: '#d1d5db' }}>
                  {new Date(campaign.updated_at).toLocaleString()}
                </p>
              </div>
              {campaign.submittedBy && (
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Submitted By</p>
                  <p style={{ margin: '4px 0 0 0', color: '#d1d5db' }}>
                    {campaign.submittedBy}
                    {campaign.submittedAt && ` on ${new Date(campaign.submittedAt).toLocaleDateString()}`}
                  </p>
                </div>
              )}
              {campaign.approvedBy && (
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Approved By</p>
                  <p style={{ margin: '4px 0 0 0', color: '#d1d5db' }}>
                    {campaign.approvedBy}
                    {campaign.approvedAt && ` on ${new Date(campaign.approvedAt).toLocaleDateString()}`}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div style={{
            padding: '24px',
            backgroundColor: '#1a1a1a',
            borderRadius: '16px',
            border: '1px solid #333',
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '18px' }}>Governance</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <GovernanceFlag label="Can Edit" value={campaign.canEdit} />
              <GovernanceFlag label="Can Submit" value={campaign.canSubmit} />
              <GovernanceFlag label="Can Approve" value={campaign.canApprove} />
              <GovernanceFlag label="Is Runnable" value={campaign.isRunnable} />
            </div>
          </div>
        </div>

        {campaign.icp && (
          <div style={{
            marginTop: '24px',
            padding: '24px',
            backgroundColor: '#1a1a1a',
            borderRadius: '16px',
            border: '1px solid #333',
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '18px' }}>ICP Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Industries</p>
                <p style={{ margin: '4px 0 0 0', color: '#d1d5db' }}>
                  {campaign.icp.industries.join(', ') || 'Not specified'}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Company Size</p>
                <p style={{ margin: '4px 0 0 0', color: '#d1d5db' }}>
                  {campaign.icp.employeeSize.min} - {campaign.icp.employeeSize.max} employees
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Target Roles</p>
                <p style={{ margin: '4px 0 0 0', color: '#d1d5db' }}>
                  {campaign.icp.roles.join(', ') || 'Not specified'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GovernanceFlag({ label, value }: { label: string; value: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: value ? '#22c55e' : '#6b7280',
      }} />
      <span style={{ color: value ? '#d1d5db' : '#6b7280', fontSize: '14px' }}>{label}</span>
    </div>
  );
}
