'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Campaign, CampaignStatus } from './types/campaign';
import { listCampaigns } from './lib/api';
import { StatusBadge } from './components';

const statusFilters: { value: CampaignStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'RUNNABLE', label: 'Runnable' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function SalesEnginePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'ALL'>('ALL');

  useEffect(() => {
    async function loadCampaigns() {
      setLoading(true);
      setError(null);
      try {
        const status = statusFilter === 'ALL' ? undefined : statusFilter;
        const data = await listCampaigns(status);
        setCampaigns(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaigns');
      } finally {
        setLoading(false);
      }
    }
    loadCampaigns();
  }, [statusFilter]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', padding: '32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 700, color: '#fff' }}>
              Sales Engine
            </h1>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#9ca3af' }}>
              Campaign Lifecycle Management
            </p>
          </div>
          <Link
            href="/sales-engine/campaigns/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: '#e879f9',
              color: '#0f0f0f',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            + New Campaign
          </Link>
        </div>

        <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                backgroundColor: statusFilter === filter.value ? '#e879f9' : 'transparent',
                color: statusFilter === filter.value ? '#0f0f0f' : '#d1d5db',
                border: `1px solid ${statusFilter === filter.value ? '#e879f9' : '#333'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ color: '#9ca3af' }}>Loading campaigns...</p>
          </div>
        )}

        {error && (
          <div style={{ padding: '16px', backgroundColor: '#7f1d1d', borderRadius: '8px', color: '#fecaca', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {!loading && !error && campaigns.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '48px',
            backgroundColor: '#1a1a1a',
            borderRadius: '12px',
            border: '1px solid #333',
          }}>
            <p style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#9ca3af' }}>
              No campaigns found.
            </p>
            <Link
              href="/sales-engine/campaigns/new"
              style={{
                display: 'inline-flex',
                padding: '12px 24px',
                backgroundColor: '#e879f9',
                color: '#0f0f0f',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              Create Your First Campaign
            </Link>
          </div>
        )}

        {!loading && !error && campaigns.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {campaigns.map((campaign) => (
              <CampaignListItem key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}

        <div style={{
          marginTop: '32px',
          padding: '16px 20px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          border: '1px solid #333',
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
            Sales Engine UI (M67) operates independently using M60 Campaign Management APIs. 
            No execution capability. Command Center integration in M68.
          </p>
        </div>
      </div>
    </div>
  );
}

function CampaignListItem({ campaign }: { campaign: Campaign }) {
  return (
    <Link
      href={`/sales-engine/campaigns/${campaign.id}`}
      style={{
        display: 'block',
        padding: '20px 24px',
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        border: '1px solid #333',
        textDecoration: 'none',
        transition: 'border-color 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#fff' }}>
              {campaign.name}
            </h3>
            <StatusBadge status={campaign.status} />
          </div>
          {campaign.description && (
            <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>
              {campaign.description}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {campaign.canEdit && <GovernanceIcon label="Edit" color="#22c55e" />}
            {campaign.canSubmit && <GovernanceIcon label="Submit" color="#3b82f6" />}
            {campaign.canApprove && <GovernanceIcon label="Approve" color="#f59e0b" />}
            {campaign.isRunnable && <GovernanceIcon label="Runnable" color="#e879f9" />}
          </div>
          <span style={{ color: '#e879f9', fontSize: '20px' }}>→</span>
        </div>
      </div>
    </Link>
  );
}

function GovernanceIcon({ label, color }: { label: string; color: string }) {
  return (
    <span
      title={label}
      style={{
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: color,
      }}
    />
  );
}
