'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '../../../design/components/Icon';
import { StatusBadge } from '../components/StatusBadge';
import { listCampaigns, approveCampaign, getCampaign } from '../lib/api';
import type { Campaign } from '../types/campaign';

interface ApprovalModalProps {
  campaign: Campaign;
  onClose: () => void;
  onApprove: () => void;
  isApproving: boolean;
}

function ApprovalModal({ campaign, onClose, onApprove, isApproving }: ApprovalModalProps) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Icon name="shield" size={24} color="#4f46e5" />
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#111827', fontFamily: 'var(--font-display, Poppins, sans-serif)' }}>
              Approve Campaign
            </h2>
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
            Review the campaign details before approving
          </p>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
              Campaign Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Name</span>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{campaign.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Status</span>
                <StatusBadge status={campaign.status} size="sm" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Created</span>
                <span style={{ fontSize: '14px', color: '#111827' }}>{new Date(campaign.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>ICP Hash</span>
                <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#6b7280' }}>
                  {campaign.id.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#fef3c7', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid #fcd34d' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Icon name="warning" size={20} color="#b45309" />
              <div>
                <p style={{ margin: 0, fontSize: '14px', color: '#92400e', fontWeight: 500 }}>
                  Governance Notice
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#92400e' }}>
                  Once approved, this campaign will become ready for execution. Ensure all targeting, personalization, and throughput settings are correct.
                </p>
              </div>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: '#4f46e5' }}
            />
            <span style={{ fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>
              By approving, I confirm this campaign complies with sourcing, budget, and governance rules. I take responsibility for this approval.
            </span>
          </label>
        </div>

        <div style={{ padding: '20px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: '#fff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onApprove}
            disabled={!confirmed || isApproving}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: confirmed && !isApproving ? '#10b981' : '#d1d5db',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: confirmed && !isApproving ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Icon name="check" size={16} color="#fff" />
            {isApproving ? 'Approving...' : 'Approve Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isApproving, setIsApproving] = useState(false);

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

  async function handleApprove() {
    if (!selectedCampaign) return;
    setIsApproving(true);
    try {
      await approveCampaign(selectedCampaign.id);
      setSelectedCampaign(null);
      await loadCampaigns();
    } catch (err) {
      console.error('Failed to approve campaign:', err);
      alert('Failed to approve campaign');
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#111827', fontFamily: 'var(--font-display, Poppins, sans-serif)' }}>
              Approvals
            </h1>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
              Review and approve campaigns pending human authorization
            </p>
          </div>
          <Link
            href="/sales-engine/home"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#fff',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              textDecoration: 'none',
            }}
          >
            <Icon name="arrow-left" size={16} color="#6b7280" />
            Back to Dashboard
          </Link>
        </div>

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
            {campaigns.map((campaign) => (
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
                    <StatusBadge status={campaign.status} size="sm" />
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                      Created {new Date(campaign.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Link
                    href={`/sales-engine/campaigns/${campaign.id}`}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: 500,
                      backgroundColor: '#fff',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      textDecoration: 'none',
                    }}
                  >
                    View Details
                  </Link>
                  {campaign.canApprove && (
                    <button
                      onClick={() => setSelectedCampaign(campaign)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: 500,
                        backgroundColor: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Icon name="check" size={14} color="#fff" />
                      Approve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedCampaign && (
        <ApprovalModal
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
          onApprove={handleApprove}
          isApproving={isApproving}
        />
      )}
    </div>
  );
}
