'use client';

/**
 * Approvals Page - Target-State Architecture
 * 
 * This page displays campaigns pending approval in read-only mode.
 * Per target-state constraints, approvals are managed by backend governance systems.
 * The UI only displays status; it does not execute approval actions.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '../../../design/components/Icon';
import { StatusBadge } from '../components/StatusBadge';
import { ReadOnlyBanner, CampaignStateBadge } from '../components/governance';
import { NavBar, PageHeader } from '../components/ui';
import { listCampaigns } from '../lib/api';
import { mapToGovernanceState } from '../lib/campaign-state';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../lib/design-tokens';
import type { Campaign } from '../types/campaign';

export default function ApprovalsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadCampaigns() {
    setLoading(true);
    try {
      const data = await listCampaigns('PENDING_REVIEW');
      setCampaigns(data);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 32px' }}>
        {/* Read-only banner */}
        <div style={{ marginBottom: '24px' }}>
          <ReadOnlyBanner
            variant="info"
            message="Approvals are managed by backend governance systems. This UI displays pending campaigns for review only."
          />
        </div>

        <PageHeader
          title="Pending Approvals"
          description="Review campaigns awaiting governance authorization"
        />

        <NavBar active="approvals" />

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ color: '#6b7280' }}>Loading pending approvals...</p>
          </div>
        )}

        {!loading && campaigns.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
            <Icon name="check" size={48} color="#10b981" />
            <h3 style={{ margin: '16px 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
              All caught up!
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              No campaigns are pending approval.
            </p>
          </div>
        )}

        {!loading && campaigns.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {campaigns.map((campaign) => {
              const governanceState = mapToGovernanceState(
                campaign.status,
                [],
                campaign.isRunnable
              );

              return (
                <div
                  key={campaign.id}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    padding: '20px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                      {campaign.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <CampaignStateBadge state={governanceState} size="sm" />
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>
                        Created {new Date(campaign.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Link
                      href={`/sales-engine/campaigns/${campaign.id}`}
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: 500,
                        backgroundColor: NSD_COLORS.secondary,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Icon name="review" size={14} color="#fff" />
                      Review Campaign
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Governance notice */}
        <div
          style={{
            marginTop: '32px',
            padding: '16px 20px',
            backgroundColor: '#EFF6FF',
            borderRadius: NSD_RADIUS.md,
            fontSize: '13px',
            color: '#1E40AF',
          }}
        >
          <strong>Note:</strong> Campaign approvals are processed by the governance backend.
          Review campaign details and readiness status by clicking &quot;Review Campaign&quot;.
          Approval decisions are recorded in the canonical ODS.
        </div>
      </div>
    </div>
  );
}
