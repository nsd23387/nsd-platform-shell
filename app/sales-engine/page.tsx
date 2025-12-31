'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Campaign, CampaignStatus } from './types/campaign';
import { listCampaigns } from './lib/api';
import { STATUS_FILTER_OPTIONS } from './lib/statusLabels';
import { PageHeader, SectionCard, StatusChip, Button, DataTable } from './components/ui';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from './lib/design-tokens';
import { Icon } from '../../design/components/Icon';

export default function SalesEnginePage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredCampaigns = campaigns.filter(c => 
    searchQuery === '' || c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      header: 'Campaign',
      render: (campaign: Campaign) => (
        <div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: NSD_COLORS.text.primary, marginBottom: '2px' }}>
            {campaign.name}
          </div>
          {campaign.description && (
            <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {campaign.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '150px',
      render: (campaign: Campaign) => <StatusChip status={campaign.status} size="sm" />,
    },
    {
      key: 'updated_at',
      header: 'Last Updated',
      width: '150px',
      render: (campaign: Campaign) => (
        <span style={{ fontSize: '13px', color: NSD_COLORS.text.secondary }}>
          {new Date(campaign.updated_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      align: 'right' as const,
      render: (campaign: Campaign) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {campaign.canEdit && (
            <Link href={`/sales-engine/campaigns/${campaign.id}?tab=setup`} style={{ textDecoration: 'none' }}>
              <Button variant="ghost" size="sm">Edit</Button>
            </Link>
          )}
          {campaign.canApprove && (
            <Link href={`/sales-engine/campaigns/${campaign.id}?tab=approvals`} style={{ textDecoration: 'none' }}>
              <Button variant="secondary" size="sm">Review</Button>
            </Link>
          )}
          {campaign.isRunnable && (
            <Link href={`/sales-engine/campaigns/${campaign.id}?tab=execution`} style={{ textDecoration: 'none' }}>
              <Button variant="cta" size="sm">Start</Button>
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: NSD_COLORS.surface }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
        <PageHeader
          title="Campaigns"
          description="Manage your sales campaigns"
          actions={
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link href="/sales-engine/home" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" icon="chart">Dashboard</Button>
              </Link>
              <Link href="/sales-engine/campaigns/new" style={{ textDecoration: 'none' }}>
                <Button variant="cta" icon="plus">New Campaign</Button>
              </Link>
            </div>
          }
        />

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ position: 'relative' }}>
              <Icon 
                name="target" 
                size={18} 
                color={NSD_COLORS.text.muted} 
              />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 44px',
                  fontSize: '14px',
                  fontFamily: NSD_TYPOGRAPHY.fontBody,
                  backgroundColor: NSD_COLORS.background,
                  border: `1px solid ${NSD_COLORS.border.default}`,
                  borderRadius: NSD_RADIUS.md,
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: NSD_COLORS.background,
            borderRadius: NSD_RADIUS.lg,
            border: `1px solid ${NSD_COLORS.border.light}`,
          }}
        >
          {STATUS_FILTER_OPTIONS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                fontFamily: NSD_TYPOGRAPHY.fontBody,
                backgroundColor: statusFilter === filter.value ? NSD_COLORS.primary : NSD_COLORS.background,
                color: statusFilter === filter.value ? NSD_COLORS.text.inverse : NSD_COLORS.text.primary,
                border: `1px solid ${statusFilter === filter.value ? NSD_COLORS.primary : NSD_COLORS.border.default}`,
                borderRadius: NSD_RADIUS.md,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ color: NSD_COLORS.text.secondary }}>Loading campaigns...</p>
          </div>
        )}

        {error && (
          <div style={{ padding: '16px', backgroundColor: '#fef2f2', borderRadius: NSD_RADIUS.lg, color: '#b91c1c', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {!loading && !error && filteredCampaigns.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', backgroundColor: NSD_COLORS.background, borderRadius: NSD_RADIUS.lg, border: `1px solid ${NSD_COLORS.border.light}` }}>
            <p style={{ margin: '0 0 16px 0', fontSize: '16px', color: NSD_COLORS.text.secondary }}>
              {searchQuery ? 'No campaigns match your search.' : 'No campaigns found.'}
            </p>
            {!searchQuery && (
              <Link href="/sales-engine/campaigns/new" style={{ textDecoration: 'none' }}>
                <Button variant="primary">Create Your First Campaign</Button>
              </Link>
            )}
          </div>
        )}

        {!loading && !error && filteredCampaigns.length > 0 && (
          <DataTable
            columns={columns}
            data={filteredCampaigns}
            keyExtractor={(c) => c.id}
            onRowClick={(c) => router.push(`/sales-engine/campaigns/${c.id}`)}
          />
        )}
      </div>
    </div>
  );
}
