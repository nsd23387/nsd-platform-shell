'use client';

/**
 * Campaign Detail Page
 * 
 * Displays campaign details, metrics, and action buttons.
 */

import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

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

        const [metricsData, historyData, runsData, runsDetailedData, latestRunData, variantsData, throughputData, observabilityData] =
          await Promise.allSettled([
            getCampaignMetrics(campaignId),
            getCampaignMetricsHistory(campaignId),
            getCampaignRuns(campaignId),
            getCampaignRunsDetailed(campaignId),
            getLatestRun(campaignId),
            getCampaignVariants(campaignId),
            getCampaignThroughput(campaignId),
            getCampaignObservability(campaignId),
          ]);

        if (metricsData.status === 'fulfilled') setMetrics(metricsData.value);
        if (historyData.status === 'fulfilled') setMetricsHistory(historyData.value);
        if (runsData.status === 'fulfilled') setRuns(runsData.value);
        if (runsDetailedData.status === 'fulfilled') setRunsDetailed(runsDetailedData.value);
        if (latestRunData.status === 'fulfilled') setLatestRun(latestRunData.value);
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
 * A) Execution Status (Top)
 * B) Pipeline Funnel (CORE)
 * C) Run History (Fixed UX)
 * D) Send Metrics (Scoped)
 * 
 * OBSERVABILITY GOVERNANCE:
 * - Read-only display
 * - No execution control (except Run Campaign when idle)
 * - No retries or overrides
 * - No mock data - all from backend
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
}: {
  campaign: CampaignDetail;
  metrics: CampaignMetrics | null;
  metricsHistory: MetricsHistoryEntry[];
  runs: CampaignRun[];
  runsDetailed: CampaignRunDetailed[];
  latestRun: CampaignRun | null;
  observability: CampaignObservability | null;
}) {
  // Scroll to run history section
  const scrollToRunHistory = () => {
    const element = document.getElementById('run-history');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Get leads awaiting approval count from pipeline
  const leadsAwaitingApproval = observability?.pipeline.find(
    (s) => s.stage === 'leads_awaiting_approval'
  )?.count;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Section A: Execution Status (Top) - Always visible */}
      <CampaignExecutionStatusCard
        status={observability?.status || 'idle'}
        activeRunId={observability?.active_run_id}
        currentStage={observability?.current_stage}
        lastObservedAt={observability?.last_observed_at || new Date().toISOString()}
        leadsAwaitingApproval={leadsAwaitingApproval}
        canRun={campaign.isRunnable && campaign.status === 'RUNNABLE'}
        // Note: onRunCampaign is not provided - execution is delegated to backend
      />

      {/* Section B: Pipeline Funnel (CORE) */}
      <PipelineFunnelTable
        stages={observability?.pipeline || []}
        loading={!observability}
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
