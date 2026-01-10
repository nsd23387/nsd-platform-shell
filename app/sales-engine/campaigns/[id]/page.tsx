'use client';

/**
 * Campaign Detail Page
 * 
 * Displays campaign details, metrics, and action buttons.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
  type ExecutionEvent,
  type ApprovalAwarenessState,
} from '../../components/observability';
import { 
  isTestCampaign, 
  getTestCampaignDetail, 
  getTestCampaignThroughput,
} from '../../lib/test-campaign';

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
  // Polling interval ref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

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
   * On 202 Accepted:
   * - UI shows "Execution requested"
   * - UI immediately begins polling /observability/status and /runs
   * 
   * This is NOT a mock or no-op - execution is delegated to Sales Engine.
   */
  const handleRunCampaign = useCallback(async () => {
    if (isRunRequesting) return;

    setIsRunRequesting(true);
    setRunRequestMessage(null);

    try {
      const response = await requestCampaignRun(campaignId);
      
      if (response.status === 'run_requested') {
        // Show "Execution requested" message
        setRunRequestMessage('Execution requested — Awaiting events from backend');
        
        // Immediately refresh observability data
        await refreshObservabilityData();

        // Start polling for status updates (every 5 seconds for 2 minutes)
        let pollCount = 0;
        const maxPolls = 24; // 2 minutes at 5 second intervals
        
        pollingIntervalRef.current = setInterval(async () => {
          pollCount++;
          await refreshObservabilityData();
          
          // Stop polling after max time or when status changes from run_requested
          if (pollCount >= maxPolls) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        }, 5000);
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

function OverviewTab({
  campaign,
  governanceState,
  runsCount,
}: {
  campaign: CampaignDetail;
  governanceState: CampaignGovernanceState;
  runsCount: number;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Campaign Details */}
        <SectionCard title="Campaign Details" icon="campaigns" iconColor={NSD_COLORS.primary}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</label>
              <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.primary }}>{campaign.name}</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
              <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.primary }}>{campaign.description || 'No description'}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created</label>
                <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.primary }}>{new Date(campaign.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Updated</label>
                <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.primary }}>{new Date(campaign.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
            {campaign.approved_at && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approved</label>
                <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.primary }}>
                  {new Date(campaign.approved_at).toLocaleString()}
                  {campaign.approved_by && ` by ${campaign.approved_by}`}
                </p>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ICP Configuration */}
        <SectionCard title="ICP Configuration" icon="target" iconColor={NSD_COLORS.secondary}>
          {campaign.icp ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {campaign.icp.industries && campaign.icp.industries.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '6px' }}>Industries</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {campaign.icp.industries.map((ind, i) => (
                      <span key={i} style={{ padding: '4px 10px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.sm, fontSize: '12px', color: NSD_COLORS.text.secondary }}>{ind}</span>
                    ))}
                  </div>
                </div>
              )}
              {campaign.icp.roles && campaign.icp.roles.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '6px' }}>Target Roles</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {campaign.icp.roles.map((role, i) => (
                      <span key={i} style={{ padding: '4px 10px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.sm, fontSize: '12px', color: NSD_COLORS.text.secondary }}>{role}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: NSD_COLORS.text.muted, fontSize: '14px' }}>No ICP configured</p>
          )}
        </SectionCard>
      </div>

      {/* Governance Actions Panel */}
      <div>
        <GovernanceActionsPanel
          campaignId={campaign.id}
          governanceState={governanceState}
          canSubmit={campaign.canSubmit}
          canApprove={campaign.canApprove}
          runsCount={runsCount}
        />
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
  
  // Build mock execution events from run data for timeline display
  // In production, these would come from a dedicated events endpoint
  const executionEvents: ExecutionEvent[] = runsDetailed.flatMap((run) => {
    const events: ExecutionEvent[] = [];
    
    // Run started event
    events.push({
      id: `${run.id}-started`,
      event_type: 'campaign.run.started',
      run_id: run.id,
      campaign_id: campaign.id,
      occurred_at: run.started_at,
      outcome: 'success',
    });
    
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

      {/* Section A: Approval Awareness Panel */}
      {/* Shows campaign approval state with explanatory copy (read-only) */}
      <ApprovalAwarenessPanel approvalState={approvalState} />

      {/* Section B: Execution Status - Always visible */}
      {/* Source of truth: /observability/status endpoint */}
      <CampaignExecutionStatusCard
        status={executionStatus}
        activeRunId={activeRunId}
        currentStage={currentStage}
        lastObservedAt={lastObservedAt}
        leadsAwaitingApproval={leadsAwaitingApproval}
        onRunCampaign={onRunCampaign}
        canRun={canRun}
        isRunning={isRunRequesting}
      />

      {/* Section C: Pipeline Funnel (CORE) */}
      {/* Source of truth: /observability/funnel endpoint */}
      <PipelineFunnelTable
        stages={pipelineStages}
        loading={!observabilityFunnel && !observability}
      />

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
      {/* Groups events by runId, ordered by occurred_at */}
      <ExecutionTimelineFeed
        events={executionEvents}
        loading={false}
      />

      {/* Section F: Send Metrics (Scoped) - Post-Approval only 
          IMPORTANT: Only show actual metrics from API, never fabricated.
          If no send metrics exist, show "Not Observed Yet" state.
      */}
      <SendMetricsPanel
        emailsSent={observability?.send_metrics?.emails_sent ?? metrics?.emails_sent}
        emailsOpened={observability?.send_metrics?.emails_opened ?? metrics?.emails_opened}
        emailsReplied={observability?.send_metrics?.emails_replied ?? metrics?.emails_replied}
        openRate={observability?.send_metrics?.open_rate ?? metrics?.open_rate}
        replyRate={observability?.send_metrics?.reply_rate ?? metrics?.reply_rate}
        confidence={observability?.send_metrics?.confidence ?? 'conditional'}
        lastUpdated={observability?.last_observed_at ?? metrics?.last_updated}
        hasReachedSendStage={
          // Check if pipeline has email_sent stage with count > 0
          pipelineStages.some(s => s.stage === 'emails_sent' && s.count > 0) ||
          (observability?.send_metrics?.emails_sent ?? 0) > 0
        }
      />
    </div>
  );
}

function LearningTab({ campaignId }: { campaignId: string }) {
  // Learning signals must come from the backend API.
  // Do NOT use placeholder data - show empty state when data is not available.
  // This ensures no mock/fake data appears in the UI.
  
  return (
    <LearningSignalsPanel
      signals={undefined} // Will show "No Learning Signals Configured" state
      autonomyLevel="L1"
      campaignId={campaignId}
    />
  );
}

// RunStatusBadge moved to CampaignRunHistoryTable component
