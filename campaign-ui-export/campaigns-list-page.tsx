'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Campaign, CampaignStatus, DashboardThroughput, NeedsAttentionItem } from './types/campaign';
import { listCampaigns, getDashboardThroughput, getNeedsAttention, revertCampaignToDraft } from './lib/api';
import { PageHeader, StatusChip, Button, DataTable, CampaignListHeader, MiniPipelineIndicator, SkeletonTable, EmptyState } from './components/ui';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SHADOWS, NSD_GRADIENTS, NSD_TRANSITIONS, NSD_SPACING, NSD_GLOW } from './lib/design-tokens';
import { Icon } from '../../design/components/Icon';
import { getTestCampaigns, shouldShowTestCampaigns, isTestCampaign } from './lib/test-campaign';

type FilterOption = 'ALL' | CampaignStatus;

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: 'ALL', label: 'All Campaigns' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'RUNNABLE', label: 'Ready' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
];

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * OBSERVATIONS-FIRST ARCHITECTURE NOTE:
 * 
 * campaign.status is GOVERNANCE state, NOT execution state.
 * Execution state must come from execution-state endpoint.
 * 
 * DO NOT derive execution state from campaign.status.
 * The campaign list shows governance status only.
 */

export default function SalesEnginePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get('filter') as FilterOption) || 'ALL';

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterOption>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');

  const [throughput, setThroughput] = useState<DashboardThroughput | null>(null);
  const [attention, setAttention] = useState<NeedsAttentionItem[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  
  // Edit configuration state (revert to draft)
  const [revertingCampaignId, setRevertingCampaignId] = useState<string | null>(null);
  const [revertError, setRevertError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSummary() {
      setSummaryLoading(true);
      try {
        const [throughputData, attentionData] = await Promise.all([
          getDashboardThroughput(),
          getNeedsAttention(),
        ]);
        setThroughput(throughputData);
        setAttention(attentionData);
      } catch (err) {
        console.error('Failed to load summary:', err);
      } finally {
        setSummaryLoading(false);
      }
    }
    loadSummary();
  }, []);

  useEffect(() => {
    async function loadCampaigns() {
      setLoading(true);
      setError(null);
      try {
        const status = statusFilter === 'ALL' ? undefined : (statusFilter as CampaignStatus);
        const data = await listCampaigns(status);

        const testCampaigns = getTestCampaigns();
        const allCampaigns = [...testCampaigns, ...data];

        setCampaigns(allCampaigns);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaigns');

        if (shouldShowTestCampaigns()) {
          setCampaigns(getTestCampaigns());
        }
      } finally {
        setLoading(false);
      }
    }
    loadCampaigns();
  }, [statusFilter]);

  const filteredCampaigns = campaigns.filter((c) =>
    searchQuery === '' || c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCampaigns = campaigns.filter(
    (c) => c.status === 'RUNNING' || c.status === 'RUNNABLE' || c.status === 'PENDING_REVIEW'
  ).length;

  // Handle edit configuration (revert to draft and navigate to edit)
  const handleEditConfiguration = async (campaign: Campaign) => {
    setRevertError(null);
    
    // If already draft, go directly to edit
    if (campaign.status === 'DRAFT') {
      router.push(`/sales-engine/campaigns/${campaign.id}/edit`);
      return;
    }
    
    // If archived, show error
    if (campaign.status === 'ARCHIVED') {
      setRevertError('Cannot edit archived campaigns');
      return;
    }
    
    // Otherwise, revert to draft first
    setRevertingCampaignId(campaign.id);
    try {
      const result = await revertCampaignToDraft(campaign.id);
      
      if (result.reverted || result.status === 'DRAFT') {
        // Navigate to edit page
        router.push(`/sales-engine/campaigns/${campaign.id}/edit`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to prepare campaign for editing';
      setRevertError(message);
      console.error('Failed to revert campaign:', err);
    } finally {
      setRevertingCampaignId(null);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Campaign',
      render: (campaign: Campaign) => (
        <div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: NSD_COLORS.text.primary,
              marginBottom: '2px',
            }}
          >
            {campaign.name}
          </div>
          {campaign.description && (
            <div
              style={{
                fontSize: '12px',
                color: NSD_COLORS.text.muted,
                maxWidth: '250px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {campaign.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Governance',
      width: '150px',
      render: (campaign: Campaign) => <StatusChip status={campaign.status} size="sm" />,
    },
    {
      key: 'pipeline',
      header: 'Pipeline',
      width: '180px',
      hideOnMobile: true,
      render: (campaign: Campaign) => (
        <MiniPipelineIndicator
          orgs={(campaign as any).pipeline?.orgs ?? null}
          contacts={(campaign as any).pipeline?.contacts ?? null}
          leads={(campaign as any).pipeline?.leads ?? null}
        />
      ),
    },
    {
      key: 'updated_at',
      header: 'Last Activity',
      width: '100px',
      hideOnMobile: true,
      render: (campaign: Campaign) => (
        <span
          style={{
            fontSize: '12px',
            color: NSD_COLORS.text.muted,
          }}
          title={new Date(campaign.updated_at).toLocaleString()}
        >
          {getRelativeTime(campaign.updated_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '160px',
      align: 'right' as const,
      hideOnMobile: true,
      render: (campaign: Campaign) => {
        const canEditConfig = campaign.status !== 'DRAFT' && campaign.status !== 'ARCHIVED';
        const isReverting = revertingCampaignId === campaign.id;
        
        return (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {canEditConfig && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditConfiguration(campaign);
                }}
                disabled={isReverting}
              >
                {isReverting ? 'Preparing...' : 'Edit Config'}
              </Button>
            )}
            <Link
              href={`/sales-engine/campaigns/${campaign.id}`}
              style={{ textDecoration: 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="ghost" size="sm">
                View
              </Button>
            </Link>
          </div>
        );
      },
    },
  ];

  const handleFilterChange = (filter: FilterOption) => {
    setStatusFilter(filter);
    const url = new URL(window.location.href);
    if (filter === 'ALL') {
      url.searchParams.delete('filter');
    } else {
      url.searchParams.set('filter', filter);
    }
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: NSD_COLORS.background }}>
      <style>{`
        .campaign-list-header {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 16px;
        }
        @media (min-width: 640px) {
          .campaign-list-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
          }
        }
        .campaign-list-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
      `}</style>
      <div
        style={{
          height: '4px',
          background: NSD_GRADIENTS.accentBar,
        }}
      />
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(16px, 4vw, 48px) clamp(16px, 4vw, 32px)' }}>
        <div style={{ marginBottom: NSD_SPACING.xxl }}>
          <div className="campaign-list-header">
            <div>
              <h1
                style={{
                  fontSize: 'clamp(22px, 5vw, 28px)',
                  fontWeight: 600,
                  color: NSD_COLORS.text.primary,
                  fontFamily: NSD_TYPOGRAPHY.fontDisplay,
                  margin: 0,
                }}
              >
                Campaigns
              </h1>
              <p
                style={{
                  ...NSD_TYPOGRAPHY.body,
                  color: NSD_COLORS.text.secondary,
                  marginTop: NSD_SPACING.sm,
                  marginBottom: 0,
                }}
              >
                Observe and manage your sales campaigns
              </p>
            </div>
            <div className="campaign-list-actions">
              <Link href="/sales-engine/home" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" icon="chart">
                  Dashboard
                </Button>
              </Link>
              <Link href="/sales-engine/campaigns/new" style={{ textDecoration: 'none' }}>
                <Button variant="cta" icon="plus">
                  New Campaign
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <CampaignListHeader
          activeCampaigns={activeCampaigns}
          needsAttentionCount={attention.length}
          dailyUsed={throughput?.usedToday ?? 0}
          dailyLimit={throughput?.dailyLimit ?? 100}
          isLoading={summaryLoading}
        />

        {/* Revert Error Message */}
        {revertError && (
          <div style={{
            padding: '12px 16px',
            marginBottom: NSD_SPACING.lg,
            backgroundColor: NSD_COLORS.semantic.critical.bg,
            borderRadius: NSD_RADIUS.md,
            border: `1px solid ${NSD_COLORS.semantic.critical.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.semantic.critical.text }}>
              {revertError}
            </p>
            <button
              onClick={() => setRevertError(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <Icon name="close" size={16} color={NSD_COLORS.semantic.critical.text} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: NSD_SPACING.lg, alignItems: 'center' }}>
          <div style={{ flex: '1 1 200px', position: 'relative', maxWidth: '400px', minWidth: '200px' }}>
            <div
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            >
              <Icon name="target" size={18} color={NSD_COLORS.text.muted} />
            </div>
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 18px 14px 48px',
                fontSize: '15px',
                fontFamily: NSD_TYPOGRAPHY.fontBody,
                backgroundColor: NSD_COLORS.background,
                border: `1px solid ${NSD_COLORS.border.light}`,
                borderRadius: NSD_RADIUS.xl,
                outline: 'none',
                boxShadow: NSD_SHADOWS.input,
                transition: NSD_TRANSITIONS.default,
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = NSD_SHADOWS.inputFocus;
                e.currentTarget.style.borderColor = NSD_COLORS.magenta.base;
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = NSD_SHADOWS.input;
                e.currentTarget.style.borderColor = NSD_COLORS.border.light;
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: NSD_SPACING.sm,
            flexWrap: 'wrap',
            marginBottom: NSD_SPACING.xl,
          }}
        >
          {FILTER_OPTIONS.map((filter) => {
            const isActive = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                onClick={() => handleFilterChange(filter.value)}
                style={{
                  padding: '8px 18px',
                  fontSize: '14px',
                  fontWeight: 500,
                  fontFamily: NSD_TYPOGRAPHY.fontBody,
                  background: isActive ? NSD_GRADIENTS.brand : 'transparent',
                  color: isActive ? NSD_COLORS.text.inverse : NSD_COLORS.text.secondary,
                  border: isActive ? 'none' : `1px solid ${NSD_COLORS.border.light}`,
                  borderRadius: NSD_RADIUS.full,
                  cursor: 'pointer',
                  transition: NSD_TRANSITIONS.glow,
                  boxShadow: isActive ? NSD_GLOW.magentaSubtle : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = NSD_COLORS.magenta.base;
                    e.currentTarget.style.color = NSD_COLORS.magenta.base;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = NSD_COLORS.border.light;
                    e.currentTarget.style.color = NSD_COLORS.text.secondary;
                  }
                }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {loading && <SkeletonTable rows={5} columns={5} />}

        {error && (
          <div
            style={{
              padding: NSD_SPACING.lg,
              backgroundColor: NSD_COLORS.semantic.critical.bg,
              borderRadius: NSD_RADIUS.xl,
              color: NSD_COLORS.semantic.critical.text,
              border: `1px solid ${NSD_COLORS.semantic.critical.border}`,
              marginBottom: NSD_SPACING.lg,
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && filteredCampaigns.length === 0 && (
          searchQuery || statusFilter !== 'ALL' ? (
            <EmptyState
              title={searchQuery ? 'No matches found' : `No ${FILTER_OPTIONS.find((f) => f.value === statusFilter)?.label.toLowerCase()} campaigns`}
              description={searchQuery ? 'Try adjusting your search terms' : 'Try a different filter or create a new campaign'}
              actionLabel={statusFilter !== 'ALL' ? 'View All Campaigns' : undefined}
              onAction={statusFilter !== 'ALL' ? () => handleFilterChange('ALL') : undefined}
            />
          ) : (
            <EmptyState
              title="No campaigns yet"
              description="Create your first campaign to start generating leads for your neon sign business"
              actionLabel="Create Your First Campaign"
              actionHref="/sales-engine/campaigns/new"
            />
          )
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
