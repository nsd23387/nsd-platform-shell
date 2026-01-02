'use client';

/**
 * Campaign Detail Page - Target-State Architecture
 * 
 * IMPORTANT ARCHITECTURAL NOTES:
 * 1. This page is READ-ONLY. No mutations are performed.
 * 2. Governance State and Readiness Level are ORTHOGONAL:
 *    - Governance: approval workflow stage
 *    - Readiness: system capability (from backend readiness check)
 * 3. Missing data is shown as UNKNOWN, never inferred as READY/SAFE.
 * 4. Confidence is derived from actual backend metadata, not hardcoded.
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
  CampaignVariant,
  ThroughputConfig,
} from '../../types/campaign';
import {
  getCampaign,
  getCampaignMetrics,
  getCampaignMetricsHistory,
  getCampaignRuns,
  getLatestRun,
  getCampaignVariants,
  getCampaignThroughput,
} from '../../lib/api';
import {
  mapToGovernanceState,
  computeReadinessLevel,
  deriveConfidence,
  type CampaignGovernanceState,
  type ReadinessLevel,
} from '../../lib/campaign-state';
import { resolveReadiness } from '../../lib/readiness-resolver';
import { ReadinessResolutionPanel } from '../../components/ReadinessResolutionPanel';
import {
  CampaignStateBadge,
  ReadOnlyBanner,
  ExecutionReadinessPanel,
  LearningSignalsPanel,
  GovernanceActionsPanel,
} from '../../components/governance';
import { MetricsDisplay } from '../../components/MetricsDisplay';
import { 
  isTestCampaign, 
  getTestCampaignDetail, 
  getTestCampaignThroughput,
  TEST_CAMPAIGN_BANNER,
  shouldShowTestCampaigns,
} from '../../lib/test-campaign';

type TabType = 'overview' | 'readiness' | 'monitoring' | 'learning';

const TAB_CONFIG: { id: TabType; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'campaigns' },
  { id: 'readiness', label: 'Readiness', icon: 'shield' },
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
  const [latestRun, setLatestRun] = useState<CampaignRun | null>(null);
  const [variants, setVariants] = useState<CampaignVariant[]>([]);
  const [throughput, setThroughput] = useState<ThroughputConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Derive governance state from backend data
  // NOTE: This is INDEPENDENT of readiness level
  const governanceState: CampaignGovernanceState = campaign
    ? mapToGovernanceState(
        campaign.status,
        campaign.readiness?.blocking_reasons || [],
        campaign.isRunnable
      )
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

        const [metricsData, historyData, runsData, latestRunData, variantsData, throughputData] =
          await Promise.allSettled([
            getCampaignMetrics(campaignId),
            getCampaignMetricsHistory(campaignId),
            getCampaignRuns(campaignId),
            getLatestRun(campaignId),
            getCampaignVariants(campaignId),
            getCampaignThroughput(campaignId),
          ]);

        if (metricsData.status === 'fulfilled') setMetrics(metricsData.value);
        if (historyData.status === 'fulfilled') setMetricsHistory(historyData.value);
        if (runsData.status === 'fulfilled') setRuns(runsData.value);
        if (latestRunData.status === 'fulfilled') setLatestRun(latestRunData.value);
        if (variantsData.status === 'fulfilled') setVariants(variantsData.value);
        if (throughputData.status === 'fulfilled') setThroughput(throughputData.value);
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
        {/* M68-03: Test campaign banner */}
        {isTest && (
          <div style={{ 
            marginBottom: '16px', 
            padding: '12px 16px', 
            backgroundColor: '#FEF3C7', 
            borderRadius: NSD_RADIUS.md,
            border: '2px dashed #F59E0B',
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#92400E', fontWeight: 500 }}>
              {TEST_CAMPAIGN_BANNER}
            </p>
          </div>
        )}

        {/* Read-only banner */}
        <div style={{ marginBottom: '24px' }}>
          <ReadOnlyBanner variant="info" compact />
        </div>

        {/* Header with governance state badge */}
        <PageHeader
          title={campaign.name}
          description={campaign.description}
          backHref="/sales-engine"
          backLabel="Back to Campaigns"
          actions={<CampaignStateBadge state={governanceState} size="lg" />}
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

        {activeTab === 'readiness' && (
          <ReadinessTab
            campaign={campaign}
            throughput={throughput}
          />
        )}

        {activeTab === 'monitoring' && (
          <MonitoringTab
            campaign={campaign}
            metrics={metrics}
            metricsHistory={metricsHistory}
            runs={runs}
            latestRun={latestRun}
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
 * ReadinessTab - Displays execution readiness status
 * 
 * CRITICAL: Readiness is computed from backend readiness payload ONLY.
 * It is NOT derived from governance state. A campaign can be APPROVED_READY
 * but still have readiness UNKNOWN if backend has not validated readiness.
 * 
 * M68-04.1: Now uses ReadinessResolver for comprehensive evaluation.
 */
function ReadinessTab({
  campaign,
  throughput,
}: {
  campaign: CampaignDetail;
  throughput: ThroughputConfig | null;
}) {
  // M68-04.1: Use readiness resolver for comprehensive evaluation
  const resolution = resolveReadiness(campaign.readiness, throughput);

  // Legacy: Also compute readiness level for backward compatibility
  const readinessLevel: ReadinessLevel = computeReadinessLevel(campaign.readiness);

  // Build readiness data from ACTUAL backend fields only
  // No hardcoding or inference - if data is missing, show UNKNOWN
  const readinessData = {
    // Use actual backend mailbox_healthy field, default to undefined (unknown)
    mailboxHealthy: campaign.readiness?.mailbox_healthy,
    mailboxHealthStatus: campaign.readiness?.mailbox_healthy === undefined
      ? 'Unknown (Not Validated)'
      : campaign.readiness.mailbox_healthy
        ? 'Healthy'
        : 'Unhealthy',
    
    // Use actual backend deliverability_score - NO HARDCODING
    deliverabilityScore: campaign.readiness?.deliverability_score,
    deliverabilityThreshold: 95,
    
    // Throughput from actual backend data
    currentThroughput: throughput?.current_daily_usage,
    maxThroughput: throughput?.daily_limit,
    
    // Use actual backend kill_switch_enabled field
    killSwitchEnabled: campaign.readiness?.kill_switch_enabled ?? false,
    
    // Use actual last_checked timestamp from backend
    lastReadinessCheck: campaign.readiness?.last_checked,
    
    // Readiness level computed from backend data, not governance state
    readinessLevel,
    
    // Blocking reasons from backend
    blockingReasons: campaign.readiness?.blocking_reasons?.map(r => r.replace(/_/g, ' ')) || [],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Readiness vs Governance State explanation */}
      <div style={{ padding: '14px 20px', backgroundColor: '#FEF3C7', borderRadius: NSD_RADIUS.md }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#92400E' }}>
          <strong>Note:</strong> Readiness status is determined by backend validation checks and is independent
          of governance approval state. A campaign may be approved but still show &quot;Unknown&quot; readiness if
          validation has not been performed.
        </p>
      </div>

      {/* M68-04.1: New Readiness Resolution Panel */}
      <ReadinessResolutionPanel resolution={resolution} />

      {/* Legacy: Keep ExecutionReadinessPanel for additional details */}
      <ExecutionReadinessPanel data={readinessData} />

      {/* Throughput details */}
      {throughput && (
        <SectionCard title="Throughput Configuration" icon="clock" iconColor={NSD_COLORS.info}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ padding: '16px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.md }}>
              <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px' }}>Daily Limit</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: NSD_COLORS.text.primary }}>{throughput.daily_limit}</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.md }}>
              <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px' }}>Daily Used</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: NSD_COLORS.info }}>{throughput.current_daily_usage}</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.md }}>
              <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px' }}>Hourly Limit</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: NSD_COLORS.text.primary }}>{throughput.hourly_limit}</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.md }}>
              <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px' }}>Mailbox Limit</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: NSD_COLORS.text.primary }}>{throughput.mailbox_limit}</div>
            </div>
          </div>

          {throughput.is_blocked && (
            <div style={{ marginTop: '16px', padding: '14px 16px', backgroundColor: '#FEE2E2', borderRadius: NSD_RADIUS.md }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#991B1B' }}>
                <strong>Throughput Blocked:</strong> {throughput.block_reason?.replace(/_/g, ' ') || 'Unknown reason'}
              </p>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}

/**
 * MonitoringTab - Displays metrics and run history
 * 
 * CRITICAL: Confidence is derived from ACTUAL backend metadata only.
 * No hardcoded confidence values. If metadata is missing, metrics are
 * shown as "Observed (Unclassified)" with CONDITIONAL confidence.
 */
function MonitoringTab({
  campaign,
  metrics,
  metricsHistory,
  runs,
  latestRun,
}: {
  campaign: CampaignDetail;
  metrics: CampaignMetrics | null;
  metricsHistory: MetricsHistoryEntry[];
  runs: CampaignRun[];
  latestRun: CampaignRun | null;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Read-only observability notice */}
      <div style={{ padding: '14px 20px', backgroundColor: '#EFF6FF', borderRadius: NSD_RADIUS.md }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#1E40AF' }}>
          <strong>Observability Mode:</strong> This view displays execution outcomes observed from backend systems.
          The UI does not trigger or control execution. Metrics confidence is determined by backend validation status.
        </p>
      </div>

      {/* Metrics using MetricsDisplay component with actual backend data */}
      {metrics ? (
        <MetricsDisplay metrics={metrics} history={metricsHistory} />
      ) : (
        <SectionCard title="Performance Metrics" icon="metrics" iconColor={NSD_COLORS.secondary}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.muted }}>
              No metrics data available. Metrics will appear once execution has been observed.
            </p>
          </div>
        </SectionCard>
      )}

      {/* Run History (observability) */}
      <SectionCard title="Run History (Observed)" icon="runs" iconColor={NSD_COLORS.info}>
        {runs.length === 0 ? (
          <p style={{ color: NSD_COLORS.text.muted, fontSize: '14px', textAlign: 'center', padding: '24px' }}>
            No execution runs recorded yet
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${NSD_COLORS.border.light}` }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Observed At</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Qualified Leads Processed</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Emails Sent</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Errors</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} style={{ borderBottom: `1px solid ${NSD_COLORS.border.light}` }}>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: NSD_COLORS.text.primary }}>
                    {new Date(run.started_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <RunStatusBadge status={run.status} />
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: NSD_COLORS.text.primary }}>
                    {run.leads_processed}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: NSD_COLORS.success }}>
                    {run.emails_sent}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: run.errors > 0 ? NSD_COLORS.error : NSD_COLORS.text.muted }}>
                    {run.errors}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
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

function RunStatusBadge({ status }: { status: 'COMPLETED' | 'FAILED' | 'PARTIAL' }) {
  const styles = {
    COMPLETED: { bg: '#D1FAE5', text: '#065F46', label: 'Completed' },
    FAILED: { bg: '#FEE2E2', text: '#991B1B', label: 'Failed' },
    PARTIAL: { bg: '#FEF3C7', text: '#92400E', label: 'Partial' },
  };

  const style = styles[status];

  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '4px 8px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: style.bg,
        color: style.text,
        borderRadius: NSD_RADIUS.sm,
      }}
    >
      {style.label}
    </span>
  );
}
