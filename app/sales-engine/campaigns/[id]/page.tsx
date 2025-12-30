'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CampaignDetail } from '../../types/campaign';
import { getCampaign, submitCampaign } from '../../lib/api';
import { StatusBadge } from '../../components';
import { background, text, border, violet, magenta, semantic } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';

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
      <div style={{ minHeight: '100vh', backgroundColor: background.page, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fontFamily.body }}>
        <p style={{ color: text.muted }}>Loading campaign...</p>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: background.page, padding: '32px', fontFamily: fontFamily.body }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ padding: '24px', backgroundColor: semantic.danger.light, borderRadius: '8px', marginBottom: '24px', border: '1px solid #fecaca' }}>
            <p style={{ margin: 0, color: semantic.danger.dark }}>{error || 'Campaign not found'}</p>
          </div>
          <Link href="/sales-engine" style={{ color: violet[500], textDecoration: 'none' }}>
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
    <div style={{ minHeight: '100vh', backgroundColor: background.page, fontFamily: fontFamily.body }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href="/sales-engine" style={{ fontSize: fontSize.sm, color: violet[500], textDecoration: 'none' }}>
            ← Back to Campaigns
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{ margin: 0, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: text.primary, fontFamily: fontFamily.heading }}>
                {campaign.name}
              </h1>
              <StatusBadge status={campaign.status} />
            </div>
            {campaign.description && (
              <p style={{ margin: 0, fontSize: fontSize.base, color: text.secondary, maxWidth: '600px' }}>
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
                  color: violet[500],
                  border: `2px solid ${violet[500]}`,
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: fontWeight.medium,
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
                  backgroundColor: magenta[500],
                  color: text.inverse,
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: fontWeight.semibold,
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
            backgroundColor: semantic.success.light,
            borderRadius: '12px',
            border: `2px solid ${semantic.success.base}`,
            marginBottom: '32px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>✅</span>
              <div>
                <p style={{ margin: 0, color: semantic.success.dark, fontWeight: fontWeight.semibold, fontSize: fontSize.base }}>
                  This campaign is runnable but NOT executing.
                </p>
                <p style={{ margin: '4px 0 0 0', color: semantic.success.dark, fontSize: fontSize.sm }}>
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
              border: `1px solid ${border.default}`,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: text.primary, fontSize: fontSize.xl }}>Submit for Review?</h3>
              <p style={{ margin: '0 0 24px 0', color: text.secondary }}>
                Once submitted, the campaign will move to PENDING_REVIEW and cannot be edited until rejected.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  disabled={submitting}
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
                  onClick={handleSubmitForReview}
                  disabled={submitting}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: magenta[500],
                    color: text.inverse,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                    fontWeight: fontWeight.semibold,
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
                backgroundColor: background.surface,
                borderRadius: '12px',
                border: `1px solid ${border.default}`,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'border-color 0.2s',
              }}
            >
              <span style={{ fontSize: '24px' }}>{link.icon}</span>
              <span style={{ color: text.primary, fontWeight: fontWeight.medium }}>{link.label}</span>
            </Link>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{
            padding: '24px',
            backgroundColor: background.surface,
            borderRadius: '16px',
            border: `1px solid ${border.default}`,
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: text.primary, fontSize: fontSize.lg }}>Campaign Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ margin: 0, fontSize: fontSize.xs, color: text.muted }}>Created</p>
                <p style={{ margin: '4px 0 0 0', color: text.secondary }}>
                  {new Date(campaign.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: fontSize.xs, color: text.muted }}>Last Updated</p>
                <p style={{ margin: '4px 0 0 0', color: text.secondary }}>
                  {new Date(campaign.updated_at).toLocaleString()}
                </p>
              </div>
              {campaign.submittedBy && (
                <div>
                  <p style={{ margin: 0, fontSize: fontSize.xs, color: text.muted }}>Submitted By</p>
                  <p style={{ margin: '4px 0 0 0', color: text.secondary }}>
                    {campaign.submittedBy}
                    {campaign.submittedAt && ` on ${new Date(campaign.submittedAt).toLocaleDateString()}`}
                  </p>
                </div>
              )}
              {campaign.approvedBy && (
                <div>
                  <p style={{ margin: 0, fontSize: fontSize.xs, color: text.muted }}>Approved By</p>
                  <p style={{ margin: '4px 0 0 0', color: text.secondary }}>
                    {campaign.approvedBy}
                    {campaign.approvedAt && ` on ${new Date(campaign.approvedAt).toLocaleDateString()}`}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div style={{
            padding: '24px',
            backgroundColor: background.surface,
            borderRadius: '16px',
            border: `1px solid ${border.default}`,
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: text.primary, fontSize: fontSize.lg }}>Governance</h3>
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
            backgroundColor: background.surface,
            borderRadius: '16px',
            border: `1px solid ${border.default}`,
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: text.primary, fontSize: fontSize.lg }}>ICP Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div>
                <p style={{ margin: 0, fontSize: fontSize.xs, color: text.muted }}>Industries</p>
                <p style={{ margin: '4px 0 0 0', color: text.secondary }}>
                  {campaign.icp.industries.join(', ') || 'Not specified'}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: fontSize.xs, color: text.muted }}>Company Size</p>
                <p style={{ margin: '4px 0 0 0', color: text.secondary }}>
                  {campaign.icp.employeeSize.min} - {campaign.icp.employeeSize.max} employees
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: fontSize.xs, color: text.muted }}>Target Roles</p>
                <p style={{ margin: '4px 0 0 0', color: text.secondary }}>
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
        backgroundColor: value ? '#10b981' : '#d4d4d4',
      }} />
      <span style={{ color: value ? '#1e1e4a' : '#737373', fontSize: '14px' }}>{label}</span>
    </div>
  );
}
