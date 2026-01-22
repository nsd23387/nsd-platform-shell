'use client';

/**
 * Campaign Detail Page
 * 
 * Displays campaign details, metrics, and action buttons.
 * 
 * EXECUTION DATA AUTHORITY:
 * All execution-related data flows through useRealTimeStatus,
 * which polls /execution-status (the single source of truth).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader, SectionCard } from '../../components/ui';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import type {
  CampaignDetail,
  CampaignMetrics,
  MetricsHistoryEntry,
  CampaignRun,
  CampaignRunDetailed,
  CampaignVariant,
  ThroughputConfig,
  CampaignObservability,
  ObservabilityFunnel,
  CampaignExecutionStatus,
} from '../../types/campaign';
import {
  getCampaign,
  getCampaignMetrics,
  getCampaignMetricsHistory,
  getCampaignRuns,
  getCampaignRunsDetailed,
  getCampaignVariants,
  getCampaignThroughput,
  getCampaignObservability,
  requestCampaignRun,
  duplicateCampaign,
  type RealTimeExecutionStatus,
} from '../../lib/api';
import {
  mapToGovernanceState,
  type CampaignGovernanceState,
} from '../../lib/campaign-state';
import {
  LearningSignalsPanel,
  GovernanceActionsPanel,
} from '../../components/governance';
import { MetricsDisplay } from '../../components/MetricsDisplay';
import {
  CampaignExecutionStatusCard,
  PipelineFunnelTable,
  CampaignRunHistoryTable,
  SendMetricsPanel,
  ExecutionTimelineFeed,
  ApprovalAwarenessPanel,
  LatestRunStatusCard,
  ExecutionExplainabilityPanel,
  CampaignScopeSummary,
  CampaignStatusHeader,
  FunnelSummaryWidget,
  ExecutionStageTracker,
  ActiveStageFocusPanel,
  ExecutionHealthIndicator,
  ResultsBreakdownCards,
  AdvisoryCallout,
  PollingStatusIndicator,
  LastExecutionSummaryCard,
  ExecutionHealthBanner,
  ExecutionDataSourceBadge,
  CurrentStageIndicator,
  type ExecutionEvent,
  type ApprovalAwarenessState,
} from '../../components/observability';
import { deriveExecutionState } from '../../lib/execution-state-mapping';
import { isRunStale } from '../../lib/resolveActiveRun';
import { formatEt, formatEtDate } from '../../lib/time';
import { 
  isTestCampaign, 
  getTestCampaignDetail, 
  getTestCampaignThroughput,
} from '../../lib/test-campaign';
import { PlanningOnlyToggle } from '../../components/PlanningOnlyToggle';
import { useRealTimeStatus } from '../../hooks/useRealTimeStatus';

type TabType = 'overview' | 'monitoring' | 'learning';

const TAB_CONFIG: { id: TabType; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'campaigns' },
  { id: 'monitoring', label: 'Observability', icon: 'metrics' },
  { id: 'learning', label: 'Learning Signals', icon: 'chart' },
];

export default function CampaignDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const campaignId = params.id as string;
  const initialTab = (searchParams.get('tab') as TabType) || 'overview';

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<MetricsHistoryEntry[]>([]);
  const [runs, setRuns] = useState<CampaignRun[]>([]);
  const [runsDetailed, setRunsDetailed] = useState<CampaignRunDetailed[]>([]);
  const [variants, setVariants] = useState<CampaignVariant[]>([]);
  const [throughput, setThroughput] = useState<ThroughputConfig | null>(null);
  const [observability, setObservability] = useState<CampaignObservability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  // Run request state
  const [isRunRequesting, setIsRunRequesting] = useState(false);
  const [runRequestMessage, setRunRequestMessage] = useState<string | null>(null);
  // Duplicate campaign state
  const [isDuplicating, setIsDuplicating] = useState(false);
  const router = useRouter();

  // Derive governance state from backend data
  const governanceState: CampaignGovernanceState = campaign
    ? mapToGovernanceState(campaign.status, campaign.isRunnable)
    : 'BLOCKED';

  // Check if this is a test campaign
  const isTest = isTestCampaign(campaignId);

  // ============================================
  // SINGLE EXECUTION DATA SOURCE
  // useRealTimeStatus polls /execution-status
  // This is the ONLY source for execution state
  // ============================================
  const {
    realTimeStatus: executionStatus,
    isPolling,
    isRefreshing,
    lastUpdatedAt,
    refreshNow,
    isLoading: isExecutionLoading,
  } = useRealTimeStatus({
    campaignId,
    enabled: !loading && !isTest,
    cacheTtlMs: 7000,
    pollingIntervalMs: 7000,
  });

  // Derive execution run from the single source
  const executionRun = executionStatus?.latestRun ?? null;

  // Convert execution status funnel to ObservabilityFunnel format for component compatibility
  const executionFunnel: ObservabilityFunnel | null = useMemo(() => {
    if (!executionStatus || !executionStatus.funnel) return null;
    
    const { organizations, contacts, leads } = executionStatus.funnel;
    const stages: Array<{ stage: string; label: string; count: number; confidence: 'observed' | 'conditional' }> = [];
    
    // Only include stages with actual data (count > 0)
    if (organizations.total > 0) {
      stages.push({
        stage: 'orgs_sourced',
        label: 'Organizations sourced',
        count: organizations.total,
        confidence: 'observed',
      });
    }
    if (contacts.total > 0) {
      stages.push({
        stage: 'contacts_discovered',
        label: 'Contacts discovered',
        count: contacts.total,
        confidence: 'observed',
      });
    }
    if (leads.total > 0) {
      stages.push({
        stage: 'leads_promoted',
        label: 'Leads promoted',
        count: leads.total,
        confidence: 'observed',
      });
    }
    
    return {
      campaign_id: executionStatus.campaignId,
      stages,
      last_updated_at: executionStatus._meta?.fetchedAt || new Date().toISOString(),
    };
  }, [executionStatus]);

  // Derive run status from execution state
  const runStatus = executionRun?.status?.toLowerCase() || null;
  const runPhase = executionRun?.phase?.toLowerCase() || null;

  // Check if run is stale (>30 min with no progress)
  const isStale = useMemo(() => {
    if (!executionRun) return false;
    return isRunStale({
      id: executionRun.id,
      status: executionRun.status,
      started_at: executionRun.startedAt,
      created_at: executionRun.startedAt,
    });
  }, [executionRun]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        // Handle test campaigns separately - no API calls
        if (isTestCampaign(campaignId)) {
          const testCampaign = getTestCampaignDetail(campaignId);
          if (testCampaign) {
            setCampaign(testCampaign);
            setThroughput(getTestCampaignThroughput(campaignId));
            setMetrics(null);
            setMetricsHistory([]);
            setRuns([]);
            setVariants([]);
          } else {
            setError('Test campaign not found or not available in this environment');
          }
          setLoading(false);
          return;
        }

        const campaignData = await getCampaign(campaignId);
        setCampaign(campaignData);

        // Load non-execution data in parallel
        // NOTE: Execution data comes from useRealTimeStatus exclusively
        const [
          metricsData,
          historyData,
          runsData,
          runsDetailedData,
          variantsData,
          throughputData,
          observabilityData,
        ] = await Promise.allSettled([
          getCampaignMetrics(campaignId),
          getCampaignMetricsHistory(campaignId),
          getCampaignRuns(campaignId),
          getCampaignRunsDetailed(campaignId),
          getCampaignVariants(campaignId),
          getCampaignThroughput(campaignId),
          getCampaignObservability(campaignId),
        ]);

        if (metricsData.status === 'fulfilled') setMetrics(metricsData.value);
        if (historyData.status === 'fulfilled') setMetricsHistory(historyData.value);
        if (runsData.status === 'fulfilled') setRuns(runsData.value);
        if (runsDetailedData.status === 'fulfilled') setRunsDetailed(runsDetailedData.value);
        if (variantsData.status === 'fulfilled') setVariants(variantsData.value);
        if (throughputData.status === 'fulfilled') setThroughput(throughputData.value);
        if (observabilityData.status === 'fulfilled') setObservability(observabilityData.value);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [campaignId]);

  /**
   * Handle Run Campaign button click.
   * 
   * NOTE:
   * Campaign execution is owned by nsd-sales-engine.
   * platform-shell must never execute or simulate runs.
   * This call submits execution intent only.
   */
  const handleRunCampaign = useCallback(async () => {
    if (isRunRequesting) return;

    setIsRunRequesting(true);
    setRunRequestMessage(null);

    try {
      const response = await requestCampaignRun(campaignId);
      
      if (response.status === 'run_requested' || response.status === 'queued') {
        setRunRequestMessage('Execution requested — Awaiting events from backend');
        // Trigger immediate refresh via useRealTimeStatus
        await refreshNow();
      } else {
        setRunRequestMessage('Execution request failed — See console for details');
      }
    } catch (err) {
      console.error('[CampaignDetail] Run request failed:', err);
      setRunRequestMessage(
        `Execution request failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setIsRunRequesting(false);
    }
  }, [campaignId, isRunRequesting, refreshNow]);

  /**
   * Handle Duplicate Campaign button click.
   */
  const handleDuplicateCampaign = useCallback(async () => {
    if (isDuplicating) return;

    setIsDuplicating(true);

    try {
      const result = await duplicateCampaign(campaignId);

      if (result.success && result.data) {
        await new Promise(resolve => setTimeout(resolve, 500));
        router.push(`/sales-engine/campaigns/${result.data.campaign.id}/edit`);
      } else {
        console.error('[CampaignDetail] Duplicate failed:', result.error);
        alert(`Failed to duplicate campaign: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('[CampaignDetail] Duplicate request failed:', err);
      alert(`Failed to duplicate campaign: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDuplicating(false);
    }
  }, [campaignId, isDuplicating, router]);

  /**
   * Handle Edit Campaign button click.
   */
  const handleEditCampaign = useCallback(() => {
    router.push(`/sales-engine/campaigns/${campaignId}/edit`);
  }, [campaignId, router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: NSD_COLORS.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: NSD_COLORS.text.secondary }}>Loading campaign...</p>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: NSD_COLORS.surface, padding: '32px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ padding: '24px', backgroundColor: NSD_COLORS.semantic.critical.bg, borderRadius: NSD_RADIUS.md, marginBottom: '24px' }}>
            <p style={{ margin: 0, color: NSD_COLORS.semantic.critical.text }}>{error || 'Campaign not found'}</p>
          </div>
          <Link href="/sales-engine" style={{ color: NSD_COLORS.secondary, textDecoration: 'none' }}>
            Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: NSD_COLORS.surface }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
        {/* Header */}
        <PageHeader
          title={campaign.name}
          description={campaign.description}
          backHref="/sales-engine"
          backLabel="Back to Campaigns"
        />

        {/* Navigation tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: `1px solid ${NSD_COLORS.border.light}`, paddingBottom: '0' }}>
          {TAB_CONFIG.map((tab) => {
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  fontFamily: NSD_TYPOGRAPHY.fontBody,
                  backgroundColor: 'transparent',
                  color: isActive ? NSD_COLORS.primary : NSD_COLORS.text.secondary,
                  border: 'none',
                  borderBottom: isActive ? `2px solid ${NSD_COLORS.primary}` : '2px solid transparent',
                  cursor: 'pointer',
                  marginBottom: '-1px',
                }}
              >
                <Icon name={tab.icon as any} size={16} color={isActive ? NSD_COLORS.primary : NSD_COLORS.text.secondary} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <OverviewTab
            campaign={campaign}
            governanceState={governanceState}
            runsCount={runs.length}
            executionStatus={executionStatus}
            executionFunnel={executionFunnel}
            executionRun={executionRun}
            runStatus={runStatus}
            runPhase={runPhase}
            isStale={isStale}
            lastUpdatedAt={lastUpdatedAt}
            isPolling={isPolling}
            isRefreshing={isRefreshing}
            onRefresh={refreshNow}
            onPlanningOnlyChange={(newState) => {
              setCampaign((prev) =>
                prev
                  ? {
                      ...prev,
                      sourcing_config: {
                        ...prev.sourcing_config,
                        benchmarks_only: newState,
                      },
                    }
                  : prev
              );
            }}
            onDuplicate={handleDuplicateCampaign}
            isDuplicating={isDuplicating}
            onEdit={handleEditCampaign}
          />
        )}

        {activeTab === 'monitoring' && (
          <MonitoringTab
            campaign={campaign}
            metrics={metrics}
            runs={runs}
            runsDetailed={runsDetailed}
            observability={observability}
            executionStatus={executionStatus}
            executionFunnel={executionFunnel}
            executionRun={executionRun}
            onRunCampaign={handleRunCampaign}
            isRunRequesting={isRunRequesting}
            runRequestMessage={runRequestMessage}
          />
        )}

        {activeTab === 'learning' && (
          <LearningTab campaignId={campaignId} />
        )}
      </div>
    </div>
  );
}

/**
 * OverviewTab
 * 
 * All execution data flows from executionStatus (via useRealTimeStatus).
 * No secondary polling or fallback logic.
 */
function OverviewTab({
  campaign,
  governanceState,
  runsCount,
  executionStatus,
  executionFunnel,
  executionRun,
  runStatus,
  runPhase,
  isStale,
  lastUpdatedAt,
  isPolling,
  isRefreshing,
  onRefresh,
  onPlanningOnlyChange,
  onDuplicate,
  isDuplicating,
  onEdit,
}: {
  campaign: CampaignDetail;
  governanceState: CampaignGovernanceState;
  runsCount: number;
  executionStatus: RealTimeExecutionStatus | null;
  executionFunnel: ObservabilityFunnel | null;
  executionRun: RealTimeExecutionStatus['latestRun'] | null;
  runStatus: string | null;
  runPhase: string | null;
  isStale: boolean;
  lastUpdatedAt: string | null;
  isPolling: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onPlanningOnlyChange?: (newState: boolean) => void;
  onDuplicate?: () => void;
  isDuplicating?: boolean;
  onEdit?: () => void;
}) {
  const canModifyConfig =
    campaign.canEdit !== false &&
    campaign.status !== 'COMPLETED' &&
    campaign.status !== 'ARCHIVED' &&
    governanceState !== 'EXECUTED' &&
    runsCount === 0;

  // Derive execution state from execution run
  const executionState = deriveExecutionState(
    executionRun ? {
      run_id: executionRun.id,
      status: executionRun.status?.toLowerCase(),
      created_at: executionRun.startedAt,
      updated_at: executionRun.completedAt,
    } : null,
    runsCount === 0
  );

  const isPlanningOnly = campaign.sourcing_config?.benchmarks_only === true;
  const noRuns = runsCount === 0 && !executionRun;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* EXECUTION HEALTH BANNER (Primary Status) */}
      <ExecutionHealthBanner
        realTimeStatus={executionStatus}
        isPolling={isPolling}
      />

      {/* Two-column layout: Scope + Execution Status */}
      <div className="overview-two-column-grid">
        {/* LEFT COLUMN: Campaign Scope & Context (40%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <CampaignScopeSummary icp={campaign.icp} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <FunnelSummaryWidget funnel={executionFunnel} />
            <ExecutionDataSourceBadge
              lastUpdatedAt={lastUpdatedAt}
              isRealTime={!!executionStatus?.funnel}
              compact={true}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Execution Status (60%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <ExecutionHealthIndicator
              runStatus={runStatus}
              runPhase={runPhase}
              funnel={executionFunnel}
              noRuns={noRuns}
              isStale={isStale}
            />
            <CampaignStatusHeader
              campaignName={campaign.name}
              governanceState={governanceState}
              executionConfidence={executionState.confidence}
              isPlanningOnly={isPlanningOnly}
              lastUpdatedAt={lastUpdatedAt}
              isPolling={isPolling}
            />
          </div>

          <PollingStatusIndicator
            isPolling={isPolling}
            isRefreshing={isRefreshing}
            lastUpdatedAt={lastUpdatedAt}
            pollingInterval={7000}
            onRefresh={onRefresh}
          />

          {/* Current Stage Indicator - Execution-state driven */}
          <CurrentStageIndicator
            stage={executionRun?.stage}
            startedAt={executionRun?.startedAt}
            isRunning={runStatus === 'running' || runStatus === 'in_progress' || runStatus === 'queued'}
          />

          <ActiveStageFocusPanel
            runStatus={runStatus}
            runPhase={runPhase}
            funnel={executionFunnel}
            noRuns={noRuns}
            isPolling={isPolling}
            isStale={isStale}
          />

          <ExecutionStageTracker
            runStatus={runStatus}
            runPhase={runPhase}
            funnel={executionFunnel}
            noRuns={noRuns}
            isStale={isStale}
          />

          <LastExecutionSummaryCard
            campaignId={campaign.id}
            run={executionRun ? {
              run_id: executionRun.id,
              status: executionRun.status?.toLowerCase(),
              created_at: executionRun.startedAt,
              updated_at: executionRun.completedAt,
              error_message: executionRun.errorMessage ?? null,
              failure_reason: executionRun.terminationReason ?? null,
              reason: executionRun.terminationReason ?? null,
            } : null}
            funnel={executionFunnel}
            noRuns={noRuns}
            realTimeStatus={executionStatus}
          />
        </div>
      </div>

      {/* Results Breakdown Cards */}
      <ResultsBreakdownCards
        funnel={executionFunnel}
        runStatus={runStatus}
        failureReason={executionRun?.terminationReason}
      />

      {/* Advisory Callout */}
      <AdvisoryCallout
        runStatus={runStatus}
        funnel={executionFunnel}
        noRuns={noRuns}
      />

      {/* Campaign Details & Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <SectionCard title="Campaign Details" icon="campaigns" iconColor={NSD_COLORS.primary}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.primary }}>{campaign.description || 'No description'}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created</label>
                  <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.primary }}>{formatEtDate(campaign.created_at)}</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Updated</label>
                  <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.primary }}>{formatEtDate(campaign.updated_at)}</p>
                </div>
              </div>
              {campaign.approved_at && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approved</label>
                  <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.primary }}>
                    {formatEt(campaign.approved_at)}
                    {campaign.approved_by && ` by ${campaign.approved_by}`}
                  </p>
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <GovernanceActionsPanel
            campaignId={campaign.id}
            governanceState={governanceState}
            canSubmit={campaign.canSubmit}
            canApprove={campaign.canApprove}
            runsCount={runsCount}
            isPlanningOnly={isPlanningOnly}
            onDuplicate={onDuplicate}
            duplicating={isDuplicating}
            onEdit={onEdit}
          />

          <PlanningOnlyToggle
            campaignId={campaign.id}
            isPlanningOnly={isPlanningOnly}
            onStateChange={onPlanningOnlyChange}
            canModify={canModifyConfig}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * MonitoringTab
 * 
 * All execution data flows from executionStatus (via useRealTimeStatus).
 * No legacy /observability/status, /observability/funnel, or /runs/latest calls.
 */
function MonitoringTab({
  campaign,
  metrics,
  runs,
  runsDetailed,
  observability,
  executionStatus,
  executionFunnel,
  executionRun,
  onRunCampaign,
  isRunRequesting,
  runRequestMessage,
}: {
  campaign: CampaignDetail;
  metrics: CampaignMetrics | null;
  runs: CampaignRun[];
  runsDetailed: CampaignRunDetailed[];
  observability: CampaignObservability | null;
  executionStatus: RealTimeExecutionStatus | null;
  executionFunnel: ObservabilityFunnel | null;
  executionRun: RealTimeExecutionStatus['latestRun'] | null;
  onRunCampaign: () => void;
  isRunRequesting: boolean;
  runRequestMessage: string | null;
}) {
  const scrollToRunHistory = () => {
    const element = document.getElementById('run-history');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Derive execution status from executionRun (single source)
  const currentStatus: CampaignExecutionStatus = 
    (executionRun?.status?.toLowerCase() as CampaignExecutionStatus) || 'idle';
  
  const activeRunId = executionRun?.id;
  const currentStage = executionRun?.stage;
  const lastObservedAt = executionStatus?._meta?.fetchedAt || new Date().toISOString();

  // Pipeline stages from execution funnel (single source)
  const pipelineStages = executionFunnel?.stages || [];

  // Get leads awaiting approval count from pipeline
  const leadsAwaitingApproval = pipelineStages.find(
    (s) => s.stage === 'leads_awaiting_approval'
  )?.count;

  // Determine if campaign can be run
  const canRun = campaign.isRunnable && 
    campaign.status === 'RUNNABLE' && 
    currentStatus === 'idle';

  // Derive approval awareness state
  const approvalState: ApprovalAwarenessState = {
    isApproved: !!(campaign.approved_at || campaign.status === 'RUNNABLE' || campaign.status === 'RUNNING' || campaign.status === 'COMPLETED'),
    approvedAt: campaign.approved_at,
    approvedBy: campaign.approved_by,
    status: campaign.status,
    hasRuns: runsDetailed.length > 0 || runs.length > 0 || !!executionRun,
    blockingReason: executionRun?.errorMessage,
  };
  
  // Build execution events from run data for timeline display
  const executionEvents: ExecutionEvent[] = runsDetailed.flatMap((run) => {
    const events: ExecutionEvent[] = [];
    
    if (run.status === 'RUNNING' as any) {
      events.push({
        id: `${run.id}-queued`,
        event_type: 'run.queued',
        run_id: run.id,
        campaign_id: campaign.id,
        occurred_at: run.started_at,
        outcome: 'success',
      });
    }
    
    events.push({
      id: `${run.id}-started`,
      event_type: 'campaign.run.started',
      run_id: run.id,
      campaign_id: campaign.id,
      occurred_at: run.started_at,
      outcome: 'success',
    });
    
    if (run.completed_at && run.status !== 'FAILED') {
      if (run.orgs_sourced && run.orgs_sourced > 0) {
        events.push({
          id: `${run.id}-orgs`,
          event_type: 'apollo.org.search.completed',
          run_id: run.id,
          campaign_id: campaign.id,
          occurred_at: run.started_at,
          outcome: 'success',
          details: { count: run.orgs_sourced },
        });
      }
      
      if (run.leads_promoted && run.leads_promoted > 0) {
        events.push({
          id: `${run.id}-leads`,
          event_type: 'lead.promoted',
          run_id: run.id,
          campaign_id: campaign.id,
          occurred_at: run.started_at,
          outcome: 'success',
          details: { count: run.leads_promoted },
        });
      }
    }
    
    if (run.completed_at) {
      events.push({
        id: `${run.id}-completed`,
        event_type: run.status === 'FAILED' ? 'campaign.run.failed' : 
                    run.status === 'PARTIAL' ? 'campaign.run.partial' : 'campaign.run.completed',
        run_id: run.id,
        campaign_id: campaign.id,
        occurred_at: run.completed_at,
        outcome: run.status === 'FAILED' ? 'failed' : 
                 run.status === 'PARTIAL' ? 'partial' : 'success',
        reason: run.error_details?.[0],
      });
    }
    
    return events;
  });
  
  if (isRunRequesting || currentStatus === 'run_requested') {
    executionEvents.unshift({
      id: 'pending-queued',
      event_type: 'run.queued',
      run_id: activeRunId,
      campaign_id: campaign.id,
      occurred_at: lastObservedAt,
      outcome: 'success',
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Run request message */}
      {runRequestMessage && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#DBEAFE',
            borderRadius: NSD_RADIUS.md,
            border: '1px solid #93C5FD',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Icon name="info" size={16} color="#1E40AF" />
          <span style={{ fontSize: '14px', color: '#1E40AF' }}>
            {runRequestMessage}
          </span>
        </div>
      )}

      {/* Two-column layout: Status/Context (left) + Metrics/Data (right) */}
      <div className="overview-two-column-grid">
        {/* LEFT COLUMN: Status & Context (40%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <ApprovalAwarenessPanel approvalState={approvalState} />
          <LatestRunStatusCard 
            campaignId={campaign.id}
            run={executionRun ? {
              id: executionRun.id,
              status: executionRun.status,
              stage: executionRun.stage,
              startedAt: executionRun.startedAt,
              completedAt: executionRun.completedAt,
              errorMessage: executionRun.errorMessage,
              terminationReason: executionRun.terminationReason,
              phase: executionRun.phase,
            } : null}
            noRuns={!executionRun && runs.length === 0}
          />
          <ExecutionExplainabilityPanel 
            campaignId={campaign.id}
            run={executionRun ? {
              id: executionRun.id,
              status: executionRun.status,
              stage: executionRun.stage,
              startedAt: executionRun.startedAt,
              completedAt: executionRun.completedAt,
              errorMessage: executionRun.errorMessage,
              terminationReason: executionRun.terminationReason,
              phase: executionRun.phase,
            } : null}
            noRuns={!executionRun && runs.length === 0}
          />
        </div>

        {/* RIGHT COLUMN: Metrics & Data (60%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <CampaignExecutionStatusCard
            status={currentStatus}
            activeRunId={activeRunId}
            currentStage={currentStage}
            lastObservedAt={lastObservedAt}
            leadsAwaitingApproval={leadsAwaitingApproval}
            onRunCampaign={onRunCampaign}
            canRun={canRun}
            isRunning={isRunRequesting}
            blockingReason={executionRun?.errorMessage}
            isPlanningOnly={campaign.sourcing_config?.benchmarks_only === true}
          />

          <PipelineFunnelTable
            stages={pipelineStages}
            loading={!executionFunnel && !observability}
          />

          <SendMetricsPanel
            emailsSent={observability?.send_metrics?.emails_sent ?? metrics?.emails_sent}
            emailsOpened={observability?.send_metrics?.emails_opened ?? metrics?.emails_opened}
            emailsReplied={observability?.send_metrics?.emails_replied ?? metrics?.emails_replied}
            openRate={observability?.send_metrics?.open_rate ?? metrics?.open_rate}
            replyRate={observability?.send_metrics?.reply_rate ?? metrics?.reply_rate}
            confidence={observability?.send_metrics?.confidence ?? 'conditional'}
            lastUpdated={observability?.last_observed_at ?? metrics?.last_updated}
            hasReachedSendStage={
              pipelineStages.some(s => s.stage === 'emails_sent' && s.count > 0) ||
              (observability?.send_metrics?.emails_sent ?? 0) > 0
            }
          />
        </div>
      </div>

      {/* View Run History Button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={scrollToRunHistory}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 500,
            color: NSD_COLORS.secondary,
            backgroundColor: 'transparent',
            border: `1px solid ${NSD_COLORS.secondary}`,
            borderRadius: NSD_RADIUS.md,
            cursor: 'pointer',
          }}
        >
          <Icon name="runs" size={16} color={NSD_COLORS.secondary} />
          View Run History
        </button>
      </div>

      {/* Run History */}
      <CampaignRunHistoryTable
        runs={runsDetailed.length > 0 ? runsDetailed : runs as CampaignRunDetailed[]}
        id="run-history"
      />

      {/* Execution Timeline / Activity Feed */}
      <ExecutionTimelineFeed
        events={executionEvents}
        loading={false}
      />
    </div>
  );
}

function LearningTab({ campaignId }: { campaignId: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="overview-two-column-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SectionCard title="About Learning Signals" icon="chart" iconColor={NSD_COLORS.secondary}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: NSD_COLORS.text.secondary }}>
              <p style={{ margin: 0 }}>
                Learning signals capture patterns and insights from campaign execution to improve future performance.
              </p>
              <p style={{ margin: 0 }}>
                Signals are generated automatically based on execution outcomes and require no manual configuration.
              </p>
              <div style={{ 
                padding: '12px', 
                backgroundColor: NSD_COLORS.surface, 
                borderRadius: NSD_RADIUS.sm,
                border: `1px solid ${NSD_COLORS.border.light}`,
              }}>
                <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Autonomy Level
                </div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: NSD_COLORS.text.primary }}>
                  L1 — Human-in-the-loop
                </div>
                <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, marginTop: '4px' }}>
                  All decisions require operator approval
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <LearningSignalsPanel
            signals={undefined}
            autonomyLevel="L1"
            campaignId={campaignId}
          />
        </div>
      </div>
    </div>
  );
}
