'use client';

/**
 * Campaign Detail Page
 * 
 * Displays campaign details, metrics, and action buttons.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
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
  ObservabilityStatus,
  ObservabilityFunnel,
  CampaignExecutionStatus,
} from '../../types/campaign';
import {
  getCampaign,
  getCampaignMetrics,
  getCampaignMetricsHistory,
  getCampaignRuns,
  getCampaignRunsDetailed,
  getLatestRun,
  getCampaignVariants,
  getCampaignThroughput,
  getCampaignObservability,
  getCampaignObservabilityStatus,
  getCampaignObservabilityFunnel,
  requestCampaignRun,
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
  ForwardMomentumCallout,
  ExecutionStageTracker,
  ActiveStageFocusPanel,
  ExecutionHealthIndicator,
  ResultsBreakdownCards,
  AdvisoryCallout,
  PollingStatusIndicator,
  type ExecutionEvent,
  type ApprovalAwarenessState,
} from '../../components/observability';
import { deriveExecutionState } from '../../lib/execution-state-mapping';
import { formatEt, formatEtDate } from '../../lib/time';
import { 
  isTestCampaign, 
  getTestCampaignDetail, 
  getTestCampaignThroughput,
} from '../../lib/test-campaign';
import { PlanningOnlyToggle } from '../../components/PlanningOnlyToggle';
import { useExecutionPolling } from '../../hooks/useExecutionPolling';
import { LastUpdatedIndicator } from '../../components/observability/LastUpdatedIndicator';

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
  const [latestRun, setLatestRun] = useState<CampaignRun | null>(null);
  const [variants, setVariants] = useState<CampaignVariant[]>([]);
  const [throughput, setThroughput] = useState<ThroughputConfig | null>(null);
  const [observability, setObservability] = useState<CampaignObservability | null>(null);
  // Observability status - source of truth for execution state
  const [observabilityStatus, setObservabilityStatus] = useState<ObservabilityStatus | null>(null);
  // Observability funnel - source of truth for pipeline counts
  const [observabilityFunnel, setObservabilityFunnel] = useState<ObservabilityFunnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  // Run request state
  const [isRunRequesting, setIsRunRequesting] = useState(false);
  const [runRequestMessage, setRunRequestMessage] = useState<string | null>(null);

  // Derive governance state from backend data
  const governanceState: CampaignGovernanceState = campaign
    ? mapToGovernanceState(campaign.status, campaign.isRunnable)
    : 'BLOCKED';

  // Check if this is a test campaign
  const isTest = isTestCampaign(campaignId);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        // M68-03: Handle test campaigns separately - no API calls
        if (isTestCampaign(campaignId)) {
          const testCampaign = getTestCampaignDetail(campaignId);
          if (testCampaign) {
            setCampaign(testCampaign);
            // M68-04.1: Get mock throughput for test campaigns
            setThroughput(getTestCampaignThroughput(campaignId));
            // Test campaigns don't have real metrics/runs/variants
            setMetrics(null);
            setMetricsHistory([]);
            setRuns([]);
            setLatestRun(null);
            setVariants([]);
          } else {
            setError('Test campaign not found or not available in this environment');
          }
          setLoading(false);
          return;
        }

        const campaignData = await getCampaign(campaignId);
        setCampaign(campaignData);

        const [
          metricsData,
          historyData,
          runsData,
          runsDetailedData,
          latestRunData,
          variantsData,
          throughputData,
          observabilityData,
          observabilityStatusData,
          observabilityFunnelData,
        ] = await Promise.allSettled([
          getCampaignMetrics(campaignId),
          getCampaignMetricsHistory(campaignId),
          getCampaignRuns(campaignId),
          getCampaignRunsDetailed(campaignId),
          getLatestRun(campaignId),
          getCampaignVariants(campaignId),
          getCampaignThroughput(campaignId),
          getCampaignObservability(campaignId),
          // Source of truth for execution state
          getCampaignObservabilityStatus(campaignId),
          // Source of truth for pipeline counts
          getCampaignObservabilityFunnel(campaignId),
        ]);

        if (metricsData.status === 'fulfilled') setMetrics(metricsData.value);
        if (historyData.status === 'fulfilled') setMetricsHistory(historyData.value);
        if (runsData.status === 'fulfilled') setRuns(runsData.value);
        if (runsDetailedData.status === 'fulfilled') setRunsDetailed(runsDetailedData.value);
        if (latestRunData.status === 'fulfilled') setLatestRun(latestRunData.value);
        if (variantsData.status === 'fulfilled') setVariants(variantsData.value);
        if (throughputData.status === 'fulfilled') setThroughput(throughputData.value);
        if (observabilityData.status === 'fulfilled') setObservability(observabilityData.value);
        // Set observability status (source of truth for execution state)
        if (observabilityStatusData.status === 'fulfilled') setObservabilityStatus(observabilityStatusData.value);
        // Set observability funnel (source of truth for pipeline counts)
        if (observabilityFunnelData.status === 'fulfilled') setObservabilityFunnel(observabilityFunnelData.value);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [campaignId]);


  // Live execution polling for active runs
  const {
    latestRun: polledLatestRun,
    funnel: polledFunnel,
    lastUpdatedAt,
    isPolling,
    isRefreshing,
    refreshNow,
  } = useExecutionPolling({
    campaignId,
    initialLatestRun: latestRun,
    initialFunnel: observabilityFunnel,
    pollingIntervalMs: 7000,
    enabled: !loading && !isTest,
  });

  // Use polled data when available, otherwise fall back to initial data
  const effectiveLatestRun = polledLatestRun || latestRun;
  const effectiveFunnel = polledFunnel || observabilityFunnel;

  /**
   * Refresh observability data (status, funnel, runs).
   * Called after run request and during polling.
   */
  const refreshObservabilityData = useCallback(async () => {
    try {
      const [statusData, funnelData, runsData] = await Promise.allSettled([
        getCampaignObservabilityStatus(campaignId),
        getCampaignObservabilityFunnel(campaignId),
        getCampaignRunsDetailed(campaignId),
      ]);

      if (statusData.status === 'fulfilled') setObservabilityStatus(statusData.value);
      if (funnelData.status === 'fulfilled') setObservabilityFunnel(funnelData.value);
      if (runsData.status === 'fulfilled') setRunsDetailed(runsData.value);
    } catch (err) {
      console.error('[CampaignDetail] Failed to refresh observability:', err);
    }
  }, [campaignId]);

  /**
   * Handle Run Campaign button click.
   * 
   * NOTE:
   * Campaign execution is owned by nsd-sales-engine.
   * platform-shell must never execute or simulate runs.
   * This call submits execution intent only.
   * 
   * On 202 Accepted:
   * - A campaign_run is created in nsd-ods
   * - Sales Engine cron automatically executes the run
   * - UI shows "Execution requested"
   * - UI immediately begins polling /observability/status and /runs
   * 
   * platform-shell emits NO execution events and creates NO run IDs.
   */
  const handleRunCampaign = useCallback(async () => {
    if (isRunRequesting) return;

    setIsRunRequesting(true);
    setRunRequestMessage(null);

    try {
      const response = await requestCampaignRun(campaignId);
      
      // Runtime safety: execution intent may be acknowledged as "run_requested" or "queued"
      // depending on the upstream contract/version. Treat both as success signals.
      if (response.status === 'run_requested' || response.status === 'queued') {
        // Show "Execution requested" message
        setRunRequestMessage('Execution requested — Awaiting events from backend');
        
        // Immediately refresh observability data
        await refreshObservabilityData();
        
        // NOTE: Live polling is handled by useExecutionPolling hook
        // The hook will automatically poll while status is queued/running/in_progress
        // and stop when a terminal state is reached
        
        // Trigger immediate refresh via the polling hook
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
  }, [campaignId, isRunRequesting, refreshObservabilityData]);

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
          <div style={{ padding: '24px', backgroundColor: '#fef2f2', borderRadius: NSD_RADIUS.md, marginBottom: '24px' }}>
            <p style={{ margin: 0, color: '#b91c1c' }}>{error || 'Campaign not found'}</p>
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
            latestRun={effectiveLatestRun}
            observabilityFunnel={effectiveFunnel}
            lastUpdatedAt={lastUpdatedAt}
            isPolling={isPolling}
            isRefreshing={isRefreshing}
            onRefresh={refreshNow}
            onPlanningOnlyChange={(newState) => {
              // Update local campaign state when planning-only changes
              // This ensures the UI reflects the new state immediately
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
          />
        )}

        {activeTab === 'monitoring' && (
          <MonitoringTab
            campaign={campaign}
            metrics={metrics}
            metricsHistory={metricsHistory}
            runs={runs}
            runsDetailed={runsDetailed}
            latestRun={latestRun}
            observability={observability}
            observabilityStatus={observabilityStatus}
            observabilityFunnel={observabilityFunnel}
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
 * EXECUTION CONTRACT NOTE:
 * platform-shell does NOT execute campaigns.
 * This UI only mutates configuration via nsd-sales-engine.
 *
 * The OverviewTab includes a PlanningOnlyToggle that allows
 * modifying the benchmarks_only flag. All changes are persisted
 * via nsd-sales-engine, NOT directly to the database.
 * 
 * UX ENHANCEMENTS (M67-UX):
 * - CampaignStatusHeader: Above-the-fold status and execution confidence
 * - CampaignScopeSummary: Full ICP criteria display (read-only)
 * - FunnelSummaryWidget: Compact funnel snapshot for quick understanding
 * - ForwardMomentumCallout: Advisory guidance based on state
 */
function OverviewTab({
  campaign,
  governanceState,
  runsCount,
  latestRun,
  observabilityFunnel,
  lastUpdatedAt,
  isPolling,
  isRefreshing,
  onRefresh,
  onPlanningOnlyChange,
}: {
  campaign: CampaignDetail;
  governanceState: CampaignGovernanceState;
  runsCount: number;
  latestRun: CampaignRun | null;
  observabilityFunnel: ObservabilityFunnel | null;
  lastUpdatedAt: string | null;
  isPolling: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  /** Callback when planning-only state changes (to update parent state) */
  onPlanningOnlyChange?: (newState: boolean) => void;
}) {
  // Determine if campaign can be modified
  // Campaign cannot be modified if it's completed, archived, executed, or has runs
  // Note: Use campaign.status (legacy) to check for COMPLETED/ARCHIVED
  const canModifyConfig =
    campaign.canEdit !== false &&
    campaign.status !== 'COMPLETED' &&
    campaign.status !== 'ARCHIVED' &&
    governanceState !== 'EXECUTED' &&
    runsCount === 0;

  // Derive execution state from latest run
  const executionState = deriveExecutionState(
    latestRun ? {
      run_id: latestRun.id,
      status: latestRun.status?.toLowerCase(),
      created_at: latestRun.started_at,
      updated_at: latestRun.completed_at,
    } : null,
    runsCount === 0
  );

  // Check if funnel has any activity
  const hasFunnelActivity = observabilityFunnel?.stages?.some(s => s.count > 0) ?? false;

  const isPlanningOnly = campaign.sourcing_config?.benchmarks_only === true;

  const runStatus = latestRun?.status?.toLowerCase() || null;
  const runPhase = (latestRun as any)?.phase?.toLowerCase() || null;
  const noRuns = runsCount === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ============================================
          ABOVE THE FOLD: Side-by-Side Layout
          Left: Campaign Scope (context)
          Right: Execution Status (what's happening)
          ============================================ */}
      
      {/* Two-column layout: Scope + Execution Status
          Responsive: stacks to single column on screens < 900px (see globals.css) */}
      <div className="overview-two-column-grid">
        {/* LEFT COLUMN: Campaign Scope & Context (40%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Campaign Scope Summary - Full ICP display */}
          <CampaignScopeSummary icp={campaign.icp} />
          
          {/* Pipeline Funnel Summary - Quick visibility */}
          <FunnelSummaryWidget funnel={observabilityFunnel} />
        </div>

        {/* RIGHT COLUMN: Execution Status (60%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Execution Health Indicator - Single sentence visible without scrolling */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <ExecutionHealthIndicator
              runStatus={runStatus}
              runPhase={runPhase}
              funnel={observabilityFunnel}
              noRuns={noRuns}
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

          {/* Polling Status - Shows "Auto-refreshing every 7s" or "Execution idle" */}
          <PollingStatusIndicator
            isPolling={isPolling}
            isRefreshing={isRefreshing}
            lastUpdatedAt={lastUpdatedAt}
            pollingInterval={7000}
            onRefresh={onRefresh}
          />

          {/* Active Stage Focus Panel - What is the system doing right now? */}
          <ActiveStageFocusPanel
            runStatus={runStatus}
            runPhase={runPhase}
            funnel={observabilityFunnel}
            noRuns={noRuns}
            isPolling={isPolling}
          />

          {/* Execution Stage Tracker - Vertical stage tracker */}
          <ExecutionStageTracker
            runStatus={runStatus}
            runPhase={runPhase}
            funnel={observabilityFunnel}
            noRuns={noRuns}
          />
        </div>
      </div>

      {/* Results Breakdown Cards - Post-stage completion details (full width) */}
      <ResultsBreakdownCards
        funnel={observabilityFunnel}
        runStatus={runStatus}
      />

      {/* Advisory Callout - Non-blocking guidance (full width) */}
      <AdvisoryCallout
        runStatus={runStatus}
        funnel={observabilityFunnel}
        noRuns={noRuns}
      />

      {/* ============================================
          BELOW THE FOLD: Campaign Details & Actions
          ============================================ */}

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Campaign Details */}
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

        {/* Right Column: Actions and Configuration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Governance Actions Panel */}
          <GovernanceActionsPanel
            campaignId={campaign.id}
            governanceState={governanceState}
            canSubmit={campaign.canSubmit}
            canApprove={campaign.canApprove}
            runsCount={runsCount}
            isPlanningOnly={isPlanningOnly}
          />

          {/* Planning-Only Toggle
           * EXECUTION CONTRACT NOTE:
           * This toggle persists via nsd-sales-engine, NOT directly to the database.
           * platform-shell must NEVER write to ODS directly.
           */}
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
 * MonitoringTab - Redesigned Observability Tab
 * 
 * Provides full pipeline visibility with stacked sections:
 * A) Approval Awareness - Shows campaign approval state
 * B) Execution Status - Source of truth: /observability/status
 * C) Pipeline Funnel (CORE) - Source of truth: /observability/funnel
 * D) Run History - Source of truth: /runs
 * E) Execution Timeline - Activity feed of events
 * F) Send Metrics (Scoped)
 * 
 * OBSERVABILITY GOVERNANCE:
 * - Read-only display
 * - Run Campaign button delegates to backend (returns 202 Accepted)
 * - On 202: UI shows "Execution requested" and begins polling
 * - No retries or overrides
 * - No mock data - all from backend observability endpoints
 * - Counts match backend exactly
 * - Approval gating is visually obvious
 * - Blocked/skipped states are explicitly explained
 * 
 * Observability reflects pipeline state; execution is delegated.
 */
function MonitoringTab({
  campaign,
  metrics,
  metricsHistory,
  runs,
  runsDetailed,
  latestRun,
  observability,
  observabilityStatus,
  observabilityFunnel,
  onRunCampaign,
  isRunRequesting,
  runRequestMessage,
}: {
  campaign: CampaignDetail;
  metrics: CampaignMetrics | null;
  metricsHistory: MetricsHistoryEntry[];
  runs: CampaignRun[];
  runsDetailed: CampaignRunDetailed[];
  latestRun: CampaignRun | null;
  observability: CampaignObservability | null;
  observabilityStatus: ObservabilityStatus | null;
  observabilityFunnel: ObservabilityFunnel | null;
  onRunCampaign: () => void;
  isRunRequesting: boolean;
  runRequestMessage: string | null;
}) {
  // Scroll to run history section
  const scrollToRunHistory = () => {
    const element = document.getElementById('run-history');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Derive execution status from observabilityStatus (source of truth)
  // Fallback to observability.status for backwards compatibility
  const executionStatus: CampaignExecutionStatus = 
    observabilityStatus?.status || observability?.status || 'idle';
  
  const activeRunId = observabilityStatus?.active_run_id || observability?.active_run_id;
  const currentStage = observabilityStatus?.current_stage || observability?.current_stage;
  const lastObservedAt = observabilityStatus?.last_observed_at || 
    observability?.last_observed_at || new Date().toISOString();

  // Pipeline stages from observabilityFunnel (source of truth)
  // Fallback to observability.pipeline for backwards compatibility
  const pipelineStages = observabilityFunnel?.stages || observability?.pipeline || [];

  // Get leads awaiting approval count from pipeline
  const leadsAwaitingApproval = pipelineStages.find(
    (s) => s.stage === 'leads_awaiting_approval'
  )?.count;

  // Determine if campaign can be run
  // Only allow run when status is 'idle' and campaign is runnable
  const canRun = campaign.isRunnable && 
    campaign.status === 'RUNNABLE' && 
    executionStatus === 'idle';

  // Dev-only debug banner (not shown in production)
  const showDebugBanner = process.env.NODE_ENV !== 'production';
  
  // Derive approval awareness state from campaign and observability data
  const approvalState: ApprovalAwarenessState = {
    isApproved: !!(campaign.approved_at || campaign.status === 'RUNNABLE' || campaign.status === 'RUNNING' || campaign.status === 'COMPLETED'),
    approvedAt: campaign.approved_at,
    approvedBy: campaign.approved_by,
    status: campaign.status,
    hasRuns: runsDetailed.length > 0 || runs.length > 0,
    blockingReason: observabilityStatus?.error_message,
  };
  
  // Build execution events from run data for timeline display
  // In production, these would come from ODS /api/v1/activity/events endpoint
  // Event types follow the queued → cron execution model:
  // - run.queued → campaign.run.started → [pipeline events] → campaign.run.completed/failed
  const executionEvents: ExecutionEvent[] = runsDetailed.flatMap((run) => {
    const events: ExecutionEvent[] = [];
    
    // For RUNNING status runs, add a queued event (derived from run_requested state)
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
    
    // Run started event
    events.push({
      id: `${run.id}-started`,
      event_type: 'campaign.run.started',
      run_id: run.id,
      campaign_id: campaign.id,
      occurred_at: run.started_at,
      outcome: 'success',
    });
    
    // Add pipeline stage events for completed runs
    if (run.completed_at && run.status !== 'FAILED') {
      // Organizations sourced
      if (run.orgs_sourced && run.orgs_sourced > 0) {
        events.push({
          id: `${run.id}-orgs`,
          event_type: 'apollo.org.search.completed',
          run_id: run.id,
          campaign_id: campaign.id,
          occurred_at: run.started_at, // Approximate timing
          outcome: 'success',
          details: { count: run.orgs_sourced },
        });
      }
      
      // Leads promoted
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
    
    // Run completed/failed event
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
  
  // If execution is currently queued, add a pending queued event
  if (isRunRequesting || executionStatus === 'run_requested') {
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
      {/* DEV-ONLY: Debug banner showing endpoint status */}
      {showDebugBanner && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: NSD_COLORS.semantic.attention.bg,
            borderRadius: NSD_RADIUS.md,
            border: `1px solid ${NSD_COLORS.semantic.attention.border}`,
            fontFamily: 'monospace',
            fontSize: '11px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: NSD_COLORS.semantic.attention.text }}>
            DEV DEBUG: Observability Wiring Status
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', color: NSD_COLORS.semantic.attention.text }}>
            <div>/observability/status:</div>
            <div>{observabilityStatus ? `OK status="${observabilityStatus.status}"` : 'null/undefined'}</div>
            
            <div>/observability/funnel:</div>
            <div>{observabilityFunnel ? `OK stages.length=${observabilityFunnel.stages?.length ?? 0}` : 'null/undefined'}</div>
            
            <div>/runs:</div>
            <div>{runsDetailed ? `OK runs.length=${runsDetailed.length}` : 'null/undefined'}</div>
            
            <div>/observability:</div>
            <div>{observability ? `OK pipeline.length=${observability.pipeline?.length ?? 0}` : 'null/undefined'}</div>
          </div>
          <div style={{ marginTop: '8px', fontSize: '10px', color: NSD_COLORS.semantic.attention.text, fontStyle: 'italic' }}>
            This banner is dev-only and will not appear in production.
          </div>
        </div>
      )}

      {/* Run request message (shown after requesting execution) */}
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

      {/* ============================================
          Two-column layout: Status/Context (left) + Metrics/Data (right)
          Responsive: stacks on screens < 900px (see globals.css)
          ============================================ */}
      <div className="overview-two-column-grid">
        {/* LEFT COLUMN: Status & Context (40%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section A: Approval Awareness Panel */}
          <ApprovalAwarenessPanel approvalState={approvalState} />

          {/* Section A.1: Latest Run Status (Canonical Read Model) */}
          <LatestRunStatusCard campaignId={campaign.id} />

          {/* Section A.2: Execution Explainability Panel */}
          <ExecutionExplainabilityPanel campaignId={campaign.id} />
        </div>

        {/* RIGHT COLUMN: Metrics & Data (60%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section B: Execution Status - Always visible */}
          <CampaignExecutionStatusCard
            status={executionStatus}
            activeRunId={activeRunId}
            currentStage={currentStage}
            lastObservedAt={lastObservedAt}
            leadsAwaitingApproval={leadsAwaitingApproval}
            onRunCampaign={onRunCampaign}
            canRun={canRun}
            isRunning={isRunRequesting}
            blockingReason={observabilityStatus?.error_message}
            isPlanningOnly={campaign.sourcing_config?.benchmarks_only === true}
          />

          {/* Section C: Pipeline Funnel (CORE) */}
          <PipelineFunnelTable
            stages={pipelineStages}
            loading={!observabilityFunnel && !observability}
          />

          {/* Section F: Send Metrics (Scoped) */}
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

      {/* ============================================
          Full-width sections: History & Timeline
          ============================================ */}

      {/* View Run History Button - scrolls to Section D */}
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

      {/* Section D: Run History */}
      <CampaignRunHistoryTable
        runs={runsDetailed.length > 0 ? runsDetailed : runs as CampaignRunDetailed[]}
        id="run-history"
      />

      {/* Section E: Execution Timeline / Activity Feed */}
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
      {/* ============================================
          Two-column layout: Context (left) + Learning Signals (right)
          Responsive: stacks on screens < 900px (see globals.css)
          ============================================ */}
      <div className="overview-two-column-grid">
        {/* LEFT COLUMN: Context & Guidance (40%) */}
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

        {/* RIGHT COLUMN: Learning Signals Panel (60%) */}
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

// RunStatusBadge moved to CampaignRunHistoryTable component
