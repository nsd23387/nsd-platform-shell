'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { CampaignDetail } from '../../types/campaign';
import { getCampaign, submitCampaign } from '../../lib/api';
import { StatusBadge } from '../../components';
import { Icon, IconName } from '../../../../design/components/Icon';
import { background, text, border, violet, magenta, semantic } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';

export default function CampaignDetailPage() {
  const params = useParams();
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
      <div style={{
        minHeight: '100vh',
        backgroundColor: background.page,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fontFamily.body,
      }}>
        <p style={{ color: text.muted, fontSize: fontSize.base }}>Loading campaign...</p>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: background.page, padding: '48px 32px', fontFamily: fontFamily.body }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            padding: '24px',
            backgroundColor: semantic.danger.light,
            borderRadius: '12px',
            marginBottom: '24px',
            border: '1px solid #fecaca',
          }}>
            <p style={{ margin: 0, color: semantic.danger.dark }}>{error || 'Campaign not found'}</p>
          </div>
          <Link
            href="/sales-engine"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: violet[500],
              textDecoration: 'none',
              fontSize: fontSize.sm,
            }}
          >
            <Icon name="arrow-left" size={16} color={violet[500]} />
            Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  const navLinks: { href: string; label: string; icon: IconName; show: boolean }[] = [
    { href: `/sales-engine/campaigns/${campaignId}/edit`, label: 'Edit Campaign', icon: 'edit', show: campaign.canEdit },
    { href: `/sales-engine/campaigns/${campaignId}/review`, label: 'Review & Approve', icon: 'review', show: campaign.status === 'PENDING_REVIEW' },
    { href: `/sales-engine/campaigns/${campaignId}/metrics`, label: 'Metrics', icon: 'metrics', show: true },
    { href: `/sales-engine/campaigns/${campaignId}/runs`, label: 'Run History', icon: 'runs', show: true },
    { href: `/sales-engine/campaigns/${campaignId}/variants`, label: 'Variants', icon: 'variants', show: true },
    { href: `/sales-engine/campaigns/${campaignId}/safety`, label: 'Safety', icon: 'shield', show: true },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: background.page, fontFamily: fontFamily.body }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 32px' }}>
        <div style={{ marginBottom: '32px' }}>
          <Link
            href="/sales-engine"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: fontSize.sm,
              color: text.secondary,
              textDecoration: 'none',
              fontFamily: fontFamily.body,
            }}
          >
            <Icon name="arrow-left" size={16} color={text.secondary} />
            Back to Campaigns
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <h1 style={{
                margin: 0,
                fontSize: fontSize['4xl'],
                fontWeight: fontWeight.semibold,
                color: text.primary,
                fontFamily: fontFamily.display,
              }}>
                {campaign.name}
              </h1>
              <StatusBadge status={campaign.status} />
            </div>
            {campaign.description && (
              <p style={{
                margin: 0,
                fontSize: fontSize.base,
                color: text.secondary,
                maxWidth: '600px',
                lineHeight: 1.6,
                fontFamily: fontFamily.body,
              }}>
                {campaign.description}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {campaign.canEdit && (
              <Link
                href={`/sales-engine/campaigns/${campaignId}/edit`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: violet[600],
                  border: `1px solid ${violet[300]}`,
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: fontWeight.medium,
                  fontSize: fontSize.sm,
                  fontFamily: fontFamily.body,
                }}
              >
                <Icon name="edit" size={16} color={violet[600]} />
                Edit Campaign
              </Link>
            )}
            {campaign.canSubmit && (
              <button
                onClick={() => setShowSubmitConfirm(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: magenta[500],
                  color: text.inverse,
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: fontWeight.semibold,
                  fontSize: fontSize.sm,
                  fontFamily: fontFamily.body,
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
            padding: '24px',
            backgroundColor: semantic.success.light,
            borderRadius: '14px',
            border: `1px solid ${semantic.success.base}`,
            marginBottom: '40px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: semantic.success.base,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon name="check" size={20} color="#fff" />
              </div>
              <div>
                <p style={{
                  margin: 0,
                  color: semantic.success.dark,
                  fontWeight: fontWeight.semibold,
                  fontSize: fontSize.base,
                  fontFamily: fontFamily.body,
                }}>
                  This campaign is runnable but NOT executing
                </p>
                <p style={{
                  margin: '4px 0 0 0',
                  color: semantic.success.dark,
                  fontSize: fontSize.sm,
                  fontFamily: fontFamily.body,
                }}>
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
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}>
            <div style={{
              backgroundColor: background.surface,
              padding: '32px',
              borderRadius: '20px',
              maxWidth: '480px',
              border: `1px solid ${border.subtle}`,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}>
              <h3 style={{
                margin: '0 0 16px 0',
                color: text.primary,
                fontSize: fontSize.xl,
                fontFamily: fontFamily.display,
                fontWeight: fontWeight.semibold,
              }}>
                Submit for Review?
              </h3>
              <p style={{
                margin: '0 0 24px 0',
                color: text.secondary,
                fontSize: fontSize.base,
                lineHeight: 1.6,
                fontFamily: fontFamily.body,
              }}>
                Once submitted, the campaign will move to PENDING_REVIEW and cannot be edited until rejected.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  disabled={submitting}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'transparent',
                    color: text.secondary,
                    border: `1px solid ${border.default}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: fontSize.sm,
                    fontFamily: fontFamily.body,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitForReview}
                  disabled={submitting}
                  style={{
                    padding: '12px 28px',
                    backgroundColor: magenta[500],
                    color: text.inverse,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                    fontWeight: fontWeight.semibold,
                    fontSize: fontSize.sm,
                    fontFamily: fontFamily.body,
                  }}
                >
                  {submitting ? 'Submitting...' : 'Yes, Submit'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' }}>
          {navLinks.filter(link => link.show).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: '24px',
                backgroundColor: background.surface,
                borderRadius: '14px',
                border: `1px solid ${border.subtle}`,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: violet[50],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon name={link.icon} size={22} color={violet[600]} />
              </div>
              <span style={{
                color: text.primary,
                fontWeight: fontWeight.medium,
                fontSize: fontSize.base,
                fontFamily: fontFamily.body,
              }}>
                {link.label}
              </span>
            </Link>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{
            padding: '28px',
            backgroundColor: background.surface,
            borderRadius: '16px',
            border: `1px solid ${border.subtle}`,
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              color: text.primary,
              fontSize: fontSize.lg,
              fontFamily: fontFamily.display,
              fontWeight: fontWeight.medium,
            }}>
              Campaign Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <DetailRow label="Created" value={new Date(campaign.created_at).toLocaleString()} />
              <DetailRow label="Last Updated" value={new Date(campaign.updated_at).toLocaleString()} />
              {campaign.submittedBy && (
                <DetailRow
                  label="Submitted By"
                  value={`${campaign.submittedBy}${campaign.submittedAt ? ` on ${new Date(campaign.submittedAt).toLocaleDateString()}` : ''}`}
                />
              )}
              {campaign.approvedBy && (
                <DetailRow
                  label="Approved By"
                  value={`${campaign.approvedBy}${campaign.approvedAt ? ` on ${new Date(campaign.approvedAt).toLocaleDateString()}` : ''}`}
                />
              )}
            </div>
          </div>

          <div style={{
            padding: '28px',
            backgroundColor: background.surface,
            borderRadius: '16px',
            border: `1px solid ${border.subtle}`,
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              color: text.primary,
              fontSize: fontSize.lg,
              fontFamily: fontFamily.display,
              fontWeight: fontWeight.medium,
            }}>
              Governance
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
            padding: '28px',
            backgroundColor: background.surface,
            borderRadius: '16px',
            border: `1px solid ${border.subtle}`,
          }}>
            <h3 style={{
              margin: '0 0 24px 0',
              color: text.primary,
              fontSize: fontSize.lg,
              fontFamily: fontFamily.display,
              fontWeight: fontWeight.medium,
            }}>
              ICP Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              <DetailRow label="Industries" value={campaign.icp.industries.join(', ') || 'Not specified'} />
              <DetailRow label="Company Size" value={`${campaign.icp.employeeSize.min} - ${campaign.icp.employeeSize.max} employees`} />
              <DetailRow label="Target Roles" value={campaign.icp.roles.join(', ') || 'Not specified'} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{
        margin: 0,
        fontSize: fontSize.xs,
        color: text.muted,
        fontFamily: fontFamily.body,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {label}
      </p>
      <p style={{
        margin: '6px 0 0 0',
        color: text.secondary,
        fontSize: fontSize.sm,
        fontFamily: fontFamily.body,
      }}>
        {value}
      </p>
    </div>
  );
}

function GovernanceFlag({ label, value }: { label: string; value: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        borderRadius: '6px',
        backgroundColor: value ? semantic.success.light : background.muted,
      }}>
        {value ? (
          <Icon name="check" size={14} color={semantic.success.base} />
        ) : (
          <Icon name="close" size={14} color={text.muted} />
        )}
      </span>
      <span style={{
        color: value ? text.primary : text.muted,
        fontSize: fontSize.sm,
        fontFamily: fontFamily.body,
      }}>
        {label}
      </span>
    </div>
  );
}
