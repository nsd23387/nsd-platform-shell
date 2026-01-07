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
 * Provides full pipeline visibility with four stacked sections:
 * A) Execution Status (Top) - Source of truth: /observability/status
 * B) Pipeline Funnel (CORE) - Source of truth: /observability/funnel
 * C) Run History (Fixed UX) - Source of truth: /runs
 * D) Send Metrics (Scoped)
 * 
 * OBSERVABILITY GOVERNANCE:
 * - Read-only display
 * - Run Campaign button delegates to backend (returns 202 Accepted)
 * - On 202: UI shows "Execution requested" and begins polling
 * - No retries or overrides
 * - No mock data - all from backend observability endpoints
 * - Counts match backend exactly
 * - Approval gating is visually obvious
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* DEV-ONLY: Debug banner showing endpoint status */}
      {showDebugBanner && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FEF3C7',
            borderRadius: NSD_RADIUS.md,
            border: '1px solid #FCD34D',
            fontFamily: 'monospace',
            fontSize: '11px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#92400E' }}>
            🔧 DEV DEBUG: Observability Wiring Status
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', color: '#78350F' }}>
            <div>📊 /observability/status:</div>
            <div>{observabilityStatus ? `✅ status="${observabilityStatus.status}"` : '❌ null/undefined'}</div>
            
            <div>📈 /observability/funnel:</div>
            <div>{observabilityFunnel ? `✅ stages.length=${observabilityFunnel.stages?.length ?? 0}` : '❌ null/undefined'}</div>
            
            <div>🏃 /runs:</div>
            <div>{runsDetailed ? `✅ runs.length=${runsDetailed.length}` : '❌ null/undefined'}</div>
            
            <div>📋 /observability:</div>
            <div>{observability ? `✅ pipeline.length=${observability.pipeline?.length ?? 0}` : '❌ null/undefined'}</div>
          </div>
          <div style={{ marginTop: '8px', fontSize: '10px', color: '#92400E', fontStyle: 'italic' }}>
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

      {/* Section A: Execution Status (Top) - Always visible */}
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

      {/* Section B: Pipeline Funnel (CORE) */}
      {/* Source of truth: /observability/funnel endpoint */}
      <PipelineFunnelTable
        stages={pipelineStages}
        loading={!observabilityFunnel && !observability}
      />

      {/* View Run History Button - scrolls to Section C */}
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

      {/* Section C: Run History (Fixed UX) */}
      <CampaignRunHistoryTable
        runs={runsDetailed.length > 0 ? runsDetailed : runs as CampaignRunDetailed[]}
        id="run-history"
      />

      {/* Section D: Send Metrics (Scoped) - Post-Approval only */}
      {observability?.send_metrics ? (
        <SendMetricsPanel
          emailsSent={observability.send_metrics.emails_sent}
          emailsOpened={observability.send_metrics.emails_opened}
          emailsReplied={observability.send_metrics.emails_replied}
          openRate={observability.send_metrics.open_rate}
          replyRate={observability.send_metrics.reply_rate}
          confidence={observability.send_metrics.confidence}
          lastUpdated={observability.last_observed_at}
        />
      ) : metrics ? (
        <SendMetricsPanel
          emailsSent={metrics.emails_sent}
          emailsOpened={metrics.emails_opened}
          emailsReplied={metrics.emails_replied}
          openRate={metrics.open_rate}
          replyRate={metrics.reply_rate}
          confidence="conditional"
          lastUpdated={metrics.last_updated}
        />
      ) : null}
    </div>
  );
}

function LearningTab({ campaignId }: { campaignId: string }) {
  // Sample learning signals - in production, these would come from the backend
  // NOTE: This is placeholder data for UI demonstration purposes
  const sampleSignals = [
    { id: '1', name: 'Reply Outcome', type: 'reply_outcome' as const, collected: true, eligibleForLearning: true, excludedFromAutomation: false },
    { id: '2', name: 'Bounce Detection', type: 'bounce' as const, collected: true, eligibleForLearning: true, excludedFromAutomation: false },
    { id: '3', name: 'Open Rate Tracking', type: 'open_rate' as const, collected: true, eligibleForLearning: false, excludedFromAutomation: true, reason: 'Privacy compliance' },
    { id: '4', name: 'Engagement Score', type: 'engagement' as const, collected: false, eligibleForLearning: false, excludedFromAutomation: true, reason: 'Not yet implemented' },
  ];

  return (
    <LearningSignalsPanel
      signals={sampleSignals}
      autonomyLevel="L1"
      campaignId={campaignId}
    />
  );
}

// RunStatusBadge moved to CampaignRunHistoryTable component
