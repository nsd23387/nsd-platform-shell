'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Campaign, CampaignStatus } from './types/campaign';
import { listCampaigns } from './lib/api';
import { CampaignCard, StatusBadge, SalesEngineDashboard } from './components';

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
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        padding: '32px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#111827' }}>
              Sales Engine
            </h1>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
              Campaign Management (M67 - Standalone UI)
            </p>
          </div>
          <Link
            href="/sales-engine/campaigns/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#4f46e5',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '6px',
              textDecoration: 'none',
            }}
          >
            + New Campaign
          </Link>
        </div>

        <SalesEngineDashboard
          onStatusFilter={(status) => {
            if (status === null) {
              setStatusFilter('ALL');
            } else {
              setStatusFilter(status as CampaignStatus);
            }
          }}
        />

        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  backgroundColor: statusFilter === filter.value ? '#4f46e5' : '#fff',
                  color: statusFilter === filter.value ? '#fff' : '#374151',
                  border: `1px solid ${statusFilter === filter.value ? '#4f46e5' : '#d1d5db'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ color: '#6b7280' }}>Loading campaigns...</p>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              color: '#b91c1c',
              marginBottom: '24px',
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && campaigns.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '48px',
              backgroundColor: '#fff',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <p style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#6b7280' }}>
              No campaigns found.
            </p>
            <Link
              href="/sales-engine/campaigns/new"
              style={{
                display: 'inline-flex',
                padding: '10px 20px',
                backgroundColor: '#4f46e5',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '6px',
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
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: '32px',
            padding: '16px',
            backgroundColor: '#fffbeb',
            borderRadius: '8px',
            border: '1px solid #fcd34d',
          }}
        >
          <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
            <strong>Note:</strong> This is the Sales Engine UI (M67). It operates independently and consumes only M60 Campaign Management APIs.
            Platform Shell integration will be added in M68.
          </p>
        </div>
      </div>
    </div>
  );
}
