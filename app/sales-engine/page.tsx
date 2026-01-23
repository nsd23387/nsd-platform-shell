'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Campaign, CampaignStatus, DashboardThroughput, NeedsAttentionItem } from './types/campaign';
import { listCampaigns, getDashboardThroughput, getNeedsAttention } from './lib/api';
import { PageHeader, StatusChip, Button, DataTable, CampaignListHeader, MiniPipelineIndicator, ExecutionStatusBadge, SkeletonTable, EmptyState } from './components/ui';
import type { ExecutionState } from './components/ui/ExecutionStatusBadge';
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

function deriveExecutionState(campaign: Campaign): ExecutionState {
  const status = campaign.status?.toLowerCase() || '';
  if (status === 'running' || status === 'in_progress') return 'running';
  if (status === 'completed' || status === 'done') return 'completed';
  if (status === 'failed' || status === 'error') return 'failed';
  if (status === 'blocked') return 'blocked';
  if (status === 'queued' || status === 'run_requested') return 'queued';
  if (status === 'stalled') return 'stalled';
  return 'idle';
}

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
      header: 'Status',
      width: '140px',
      render: (campaign: Campaign) => <StatusChip status={campaign.status} size="sm" />,
    },
    {
      key: 'execution',
      header: 'Execution',
      width: '120px',
      render: (campaign: Campaign) => (
        <ExecutionStatusBadge state={deriveExecutionState(campaign)} size="sm" />
      ),
    },
    {
      key: 'pipeline',
      header: 'Pipeline',
      width: '180px',
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
      width: '80px',
      align: 'right' as const,
      render: (campaign: Campaign) => (
        <Link
          href={`/sales-engine/campaigns/${campaign.id}`}
          style={{ textDecoration: 'none' }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="ghost" size="sm">
            View
          </Button>
        </Link>
      ),
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
    <div style={{ minHeight: '100vh', backgroundColor: NSD_COLORS.surface }}>
      <div
        style={{
          height: '4px',
          background: NSD_GRADIENTS.accentBar,
        }}
      />
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: `${NSD_SPACING.xxl} ${NSD_SPACING.page}` }}>
        <div style={{ marginBottom: NSD_SPACING.xxl }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: NSD_SPACING.md }}>
            <div>
              <h1
                style={{
                  ...NSD_TYPOGRAPHY.pageTitle,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: NSD_SPACING.md }}>
              <Link href="/sales-engine/executive" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" icon="chart">
                  Executive View
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

        <div style={{ display: 'flex', gap: NSD_SPACING.lg, marginBottom: NSD_SPACING.lg, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative', maxWidth: '400px' }}>
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
