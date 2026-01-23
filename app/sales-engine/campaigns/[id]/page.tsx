'use client';

/**
 * Campaign Detail Page
 * 
 * EXECUTION-STATE DRIVEN UI CONTRACT
 * 
 * This page is execution-state driven.
 * If execution-state is empty, the UI must be empty.
 * Consistency follows truth, not the other way around.
 * 
 * CANONICAL RULE (NON-NEGOTIABLE):
 * /api/v1/campaigns/:id/execution-state is the ONLY source of execution truth.
 * If execution-state does not explicitly provide something:
 * - the UI must not infer it
 * - the UI must not reconstruct it
 * - the UI must not show it
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader, SectionCard } from '../../components/ui';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import type { CampaignDetail, MarketScope, OperationalWorkingSet } from '../../types/campaign';
import { getCampaign, requestCampaignRun, duplicateCampaign, type RunIntent } from '../../lib/api';
import { mapToGovernanceState, type CampaignGovernanceState } from '../../lib/campaign-state';
import { LearningSignalsPanel, GovernanceActionsPanel } from '../../components/governance';
import { CampaignScopeSummary } from '../../components/observability';
import { formatEt, formatEtDate } from '../../lib/time';
import { isTestCampaign, getTestCampaignDetail } from '../../lib/test-campaign';
import { PlanningOnlyToggle } from '../../components/PlanningOnlyToggle';
import { 
  useExecutionState, 
  getExecutionStatusText, 
  shouldShowSendMetrics,
  hasFunnelActivity,
  type ExecutionState,
  type ExecutionRun,
  type ExecutionFunnel,
} from '../../hooks/useExecutionState';

type TabType = 'overview' | 'monitoring' | 'learning';

const TAB_CONFIG: { id: TabType; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'campaigns' },
  { id: 'monitoring', label: 'Observability', icon: 'metrics' },
  { id: 'learning', label: 'Learning Signals', icon: 'chart' },
];

export default function CampaignDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const initialTab = (searchParams.get('tab') as TabType) || 'overview';

  // Campaign metadata (non-execution)
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  
  // Action states
  const [isRunRequesting, setIsRunRequesting] = useState(false);
  const [runRequestMessage, setRunRequestMessage] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  
  // OBSERVATIONS-FIRST: Run intent selector
  const [runIntent, setRunIntent] = useState<RunIntent>('HARVEST_ONLY');
  
  // Market scope and operational data (separate from execution state)
  const [marketScope, setMarketScope] = useState<MarketScope | null>(null);
  const [operationalSet, setOperationalSet] = useState<OperationalWorkingSet | null>(null);

  const isTest = isTestCampaign(campaignId);

  // ============================================
  // CANONICAL EXECUTION STATE
  // This is the ONLY source of execution truth
  // ============================================
  const { 
    state: executionState, 
    loading: executionLoading, 
    refreshing: executionRefreshing,
    error: executionError,
    refresh: refreshExecution,
    lastFetchedAt,
  } = useExecutionState({
    campaignId,
    enabled: !loading && !isTest,
    pollingIntervalMs: 7000, // Poll only when running
  });

  // Derive governance state
  const governanceState: CampaignGovernanceState = campaign
    ? mapToGovernanceState(campaign.status, campaign.isRunnable)
    : 'BLOCKED';

  // Load campaign metadata only (NOT execution data)
  useEffect(() => {
    async function loadCampaign() {
      setLoading(true);
      setError(null);
      try {
        if (isTestCampaign(campaignId)) {
          const testCampaign = getTestCampaignDetail(campaignId);
          if (testCampaign) {
            setCampaign(testCampaign);
          } else {
            setError('Test campaign not found');
          }
          setLoading(false);
          return;
        }

        const campaignData = await getCampaign(campaignId);
        setCampaign(campaignData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    }
    loadCampaign();
  }, [campaignId]);

  // OBSERVATIONS-FIRST: Load market scope and operational data separately
  useEffect(() => {
    async function loadScopeData() {
      if (isTest || !campaignId) return;
      
      try {
        // Fetch market scope (from observations.*)
        const marketResponse = await fetch(`/api/proxy/market-scope?campaignId=${campaignId}`);
        if (marketResponse.ok) {
          const data = await marketResponse.json();
          setMarketScope({
            observedOrganizations: data.observedOrganizations || 0,
            observedContacts: data.observedContacts || 0,
            estimatedReachable: data.estimatedReachable || 0,
            observedAt: data.observedAt || new Date().toISOString(),
          });
        }
        
        // Fetch operational working set (from public.*)
        const harvestResponse = await fetch(`/api/proxy/harvest-metrics?campaignId=${campaignId}`);
        if (harvestResponse.ok) {
          const data = await harvestResponse.json();
          setOperationalSet(data.operationalSet || {
            organizations: 0,
            contacts: 0,
            leads: 0,
            emailsSent: 0,
          });
        }
      } catch (err) {
        console.warn('[CampaignDetail] Failed to load scope data:', err);
        // Non-fatal - continue without scope data
      }
    }
    loadScopeData();
  }, [campaignId, isTest]);

  // Handle Run Campaign with runIntent
  const handleRunCampaign = useCallback(async () => {
    if (isRunRequesting) return;
    setIsRunRequesting(true);
    setRunRequestMessage(null);

    try {
      const response = await requestCampaignRun(campaignId, runIntent);
      if (response.status === 'run_requested' || response.status === 'queued') {
        const intentLabel = runIntent === 'HARVEST_ONLY' ? 'Harvest' : 'Activation';
        setRunRequestMessage(`${intentLabel} requested`);
        await refreshExecution();
      } else {
        setRunRequestMessage('Execution request failed');
      }
    } catch (err) {
      setRunRequestMessage(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRunRequesting(false);
    }
  }, [campaignId, isRunRequesting, refreshExecution, runIntent]);

  // Handle Duplicate
  const handleDuplicateCampaign = useCallback(async () => {
    if (isDuplicating) return;
    setIsDuplicating(true);
    try {
      const result = await duplicateCampaign(campaignId);
      if (result.success && result.data) {
        router.push(`/sales-engine/campaigns/${result.data.campaign.id}/edit`);
      }
    } catch (err) {
      alert(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDuplicating(false);
    }
  }, [campaignId, isDuplicating, router]);

  // Handle Edit
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

  const isPlanningOnly = campaign.sourcing_config?.benchmarks_only === true;
  const canRun = campaign.isRunnable && campaign.status === 'RUNNABLE' && !isPlanningOnly;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: NSD_COLORS.surface }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
        <PageHeader
          title={campaign.name}
          description={campaign.description}
          backHref="/sales-engine"
          backLabel="Back to Campaigns"
        />

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: `1px solid ${NSD_COLORS.border.light}` }}>
          {TAB_CONFIG.map((tab) => (
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
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? NSD_COLORS.primary : NSD_COLORS.text.secondary,
                border: 'none',
                borderBottom: activeTab === tab.id ? `2px solid ${NSD_COLORS.primary}` : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: '-1px',
              }}
            >
              <Icon name={tab.icon as any} size={16} color={activeTab === tab.id ? NSD_COLORS.primary : NSD_COLORS.text.secondary} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab
            campaign={campaign}
            governanceState={governanceState}
            executionState={executionState}
            executionLoading={executionLoading}
            lastFetchedAt={lastFetchedAt}
            onRefresh={refreshExecution}
            onRunCampaign={handleRunCampaign}
            canRun={canRun && executionState?.run === null}
            isRunRequesting={isRunRequesting}
            runRequestMessage={runRequestMessage}
            isPlanningOnly={isPlanningOnly}
            onDuplicate={handleDuplicateCampaign}
            isDuplicating={isDuplicating}
            onEdit={handleEditCampaign}
            onPlanningOnlyChange={(newState) => {
              setCampaign((prev) => prev ? {
                ...prev,
                sourcing_config: { ...prev.sourcing_config, benchmarks_only: newState },
              } : prev);
            }}
            runIntent={runIntent}
            onRunIntentChange={setRunIntent}
            marketScope={marketScope}
            operationalSet={operationalSet}
          />
        )}

        {activeTab === 'monitoring' && (
          <MonitoringTab
            campaign={campaign}
            executionState={executionState}
            executionLoading={executionLoading}
            lastFetchedAt={lastFetchedAt}
            onRefresh={refreshExecution}
            onRunCampaign={handleRunCampaign}
            canRun={canRun && executionState?.run === null}
            isRunRequesting={isRunRequesting}
            runRequestMessage={runRequestMessage}
            runIntent={runIntent}
            onRunIntentChange={setRunIntent}
            marketScope={marketScope}
            operationalSet={operationalSet}
          />
        )}

        {activeTab === 'learning' && (
          <LearningTab campaignId={campaignId} />
        )}
      </div>
    </div>
  );
}

// ============================================
// OVERVIEW TAB
// ============================================
function OverviewTab({
  campaign,
  governanceState,
  executionState,
  executionLoading,
  lastFetchedAt,
  onRefresh,
  onRunCampaign,
  canRun,
  isRunRequesting,
  runRequestMessage,
  isPlanningOnly,
  onDuplicate,
  isDuplicating,
  onEdit,
  onPlanningOnlyChange,
  runIntent,
  onRunIntentChange,
  marketScope,
  operationalSet,
}: {
  campaign: CampaignDetail;
  governanceState: CampaignGovernanceState;
  executionState: ExecutionState | null;
  executionLoading: boolean;
  lastFetchedAt: string | null;
  onRefresh: () => void;
  onRunCampaign: () => void;
  canRun: boolean;
  isRunRequesting: boolean;
  runRequestMessage: string | null;
  isPlanningOnly: boolean;
  onDuplicate: () => void;
  isDuplicating: boolean;
  onEdit: () => void;
  onPlanningOnlyChange: (newState: boolean) => void;
  runIntent: RunIntent;
  onRunIntentChange: (intent: RunIntent) => void;
  marketScope: MarketScope | null;
  operationalSet: OperationalWorkingSet | null;
}) {
  const canModifyConfig = campaign.canEdit !== false && campaign.status !== 'COMPLETED' && campaign.status !== 'ARCHIVED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Execution Status Banner */}
      <ExecutionStatusBanner
        run={executionState?.run ?? null}
        loading={executionLoading}
        onRunCampaign={onRunCampaign}
        canRun={canRun}
        isRunRequesting={isRunRequesting}
        isPlanningOnly={isPlanningOnly}
      />

      {runRequestMessage && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: NSD_COLORS.semantic.info.bg,
          borderRadius: NSD_RADIUS.md,
          border: `1px solid ${NSD_COLORS.semantic.info.border}`,
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.semantic.info.text }}>
            {runRequestMessage}
          </p>
        </div>
      )}

      {/* OBSERVATIONS-FIRST: Market Scope vs Operational Working Set */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <MarketScopeCard marketScope={marketScope} />
        <OperationalSetCard operationalSet={operationalSet} />
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left: Campaign Scope */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <CampaignScopeSummary icp={campaign.icp} />
          
          {/* Pipeline Funnel Summary */}
          <PipelineFunnelCard
            run={executionState?.run ?? null}
            funnel={executionState?.funnel ?? null}
            loading={executionLoading}
          />
        </div>

        {/* Right: Execution & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Run Intent Selector */}
          <RunIntentSelector
            runIntent={runIntent}
            onChange={onRunIntentChange}
            disabled={executionState?.run !== null}
          />

          {/* Current Stage (only if running) */}
          <CurrentStageCard run={executionState?.run ?? null} />

          {/* Campaign Details */}
          <SectionCard title="Campaign Details" icon="campaigns" iconColor={NSD_COLORS.primary}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase' }}>Description</label>
                <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.primary }}>{campaign.description || 'No description'}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase' }}>Created</label>
                  <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.primary }}>{formatEtDate(campaign.created_at)}</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase' }}>Updated</label>
                  <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.primary }}>{formatEtDate(campaign.updated_at)}</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <GovernanceActionsPanel
            campaignId={campaign.id}
            governanceState={governanceState}
            canSubmit={campaign.canSubmit}
            canApprove={campaign.canApprove}
            runsCount={executionState?.run ? 1 : 0}
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

      {/* Last Fetched */}
      {lastFetchedAt && (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onRefresh}
            style={{
              fontSize: '12px',
              color: NSD_COLORS.text.muted,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Last updated: {formatEt(lastFetchedAt)} · Refresh
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// MONITORING TAB
// ============================================
function MonitoringTab({
  campaign,
  executionState,
  executionLoading,
  lastFetchedAt,
  onRefresh,
  onRunCampaign,
  canRun,
  isRunRequesting,
  runRequestMessage,
  runIntent,
  onRunIntentChange,
  marketScope,
  operationalSet,
}: {
  campaign: CampaignDetail;
  executionState: ExecutionState | null;
  executionLoading: boolean;
  lastFetchedAt: string | null;
  onRefresh: () => void;
  onRunCampaign: () => void;
  canRun: boolean;
  isRunRequesting: boolean;
  runRequestMessage: string | null;
  runIntent: RunIntent;
  onRunIntentChange: (intent: RunIntent) => void;
  marketScope: MarketScope | null;
  operationalSet: OperationalWorkingSet | null;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {runRequestMessage && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: NSD_COLORS.semantic.info.bg,
          borderRadius: NSD_RADIUS.md,
          border: `1px solid ${NSD_COLORS.semantic.info.border}`,
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.semantic.info.text }}>
            {runRequestMessage}
          </p>
        </div>
      )}

      {/* OBSERVATIONS-FIRST: Market Scope vs Operational Working Set */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <MarketScopeCard marketScope={marketScope} />
        <OperationalSetCard operationalSet={operationalSet} />
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Run Intent Selector */}
          <RunIntentSelector
            runIntent={runIntent}
            onChange={onRunIntentChange}
            disabled={executionState?.run !== null}
          />

          {/* Execution Status */}
          <ExecutionStatusBanner
            run={executionState?.run ?? null}
            loading={executionLoading}
            onRunCampaign={onRunCampaign}
            canRun={canRun}
            isRunRequesting={isRunRequesting}
            isPlanningOnly={campaign.sourcing_config?.benchmarks_only === true}
          />

          {/* Current Stage */}
          <CurrentStageCard run={executionState?.run ?? null} />
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Pipeline Funnel */}
          <PipelineFunnelCard
            run={executionState?.run ?? null}
            funnel={executionState?.funnel ?? null}
            loading={executionLoading}
          />

          {/* Send Metrics */}
          <SendMetricsCard
            executionState={executionState}
            loading={executionLoading}
          />
        </div>
      </div>

      {/* Run History - ALWAYS shows empty per contract */}
      <RunHistoryCard />

      {/* Execution Timeline - Hidden if run === null */}
      <ExecutionTimelineCard run={executionState?.run ?? null} />

      {/* Last Fetched */}
      {lastFetchedAt && (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onRefresh}
            style={{
              fontSize: '12px',
              color: NSD_COLORS.text.muted,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Last updated: {formatEt(lastFetchedAt)} · Refresh
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// LEARNING TAB
// ============================================
function LearningTab({ campaignId }: { campaignId: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <SectionCard title="About Learning Signals" icon="chart" iconColor={NSD_COLORS.secondary}>
          <div style={{ fontSize: '14px', color: NSD_COLORS.text.secondary }}>
            <p style={{ margin: '0 0 12px 0' }}>
              Learning signals capture patterns from campaign execution to improve future performance.
            </p>
            <div style={{ padding: '12px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.sm }}>
              <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase' }}>
                Autonomy Level
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: NSD_COLORS.text.primary }}>
                L1 — Human-in-the-loop
              </div>
            </div>
          </div>
        </SectionCard>
        <LearningSignalsPanel signals={undefined} autonomyLevel="L1" campaignId={campaignId} />
      </div>
    </div>
  );
}

// ============================================
// EXECUTION STATUS BANNER
// Contract: Section 1️⃣
// OBSERVATIONS-FIRST: Show outcomeType for semantic meaning
// ============================================
function ExecutionStatusBanner({
  run,
  loading,
  onRunCampaign,
  canRun,
  isRunRequesting,
  isPlanningOnly,
}: {
  run: ExecutionRun | null;
  loading: boolean;
  onRunCampaign: () => void;
  canRun: boolean;
  isRunRequesting: boolean;
  isPlanningOnly: boolean;
}) {
  const statusText = getExecutionStatusText(run);
  
  // OBSERVATIONS-FIRST: Get outcomeType styling and messaging
  // outcomeType provides semantic meaning - do not collapse to boolean
  const outcomeType = run?.outcomeType;
  const outcomeReason = run?.outcomeReason;
  
  // Determine styling based on status AND outcomeType
  // Type explicitly to allow any semantic color assignment
  let style: { bg: string; text: string; border: string } = NSD_COLORS.semantic.muted;
  let icon: 'clock' | 'refresh' | 'check' | 'warning' | 'target' = 'clock';
  let outcomeMessage = '';
  
  if (run) {
    switch (run.status) {
      case 'queued':
        style = NSD_COLORS.semantic.info;
        icon = 'clock';
        break;
      case 'running':
        style = NSD_COLORS.semantic.active;
        icon = 'refresh';
        break;
      case 'completed':
        // OBSERVATIONS-FIRST: Check outcomeType for semantic styling
        if (outcomeType === 'VALID_EMPTY_OBSERVATION') {
          // Valid empty observation is NOT a failure - neutral/informational
          style = NSD_COLORS.semantic.info;
          icon = 'target';
          outcomeMessage = 'Market observed successfully. Zero qualifying results is a valid outcome.';
        } else {
          style = NSD_COLORS.semantic.positive;
          icon = 'check';
        }
        break;
      case 'failed':
        // OBSERVATIONS-FIRST: Distinguish failure types
        if (outcomeType === 'CONFIG_INCOMPLETE') {
          // User-fixable - show as attention, not critical
          style = NSD_COLORS.semantic.attention;
          icon = 'warning';
          outcomeMessage = 'Configuration incomplete. Please review campaign settings.';
        } else if (outcomeType === 'INFRA_ERROR') {
          // Infrastructure error - critical
          style = NSD_COLORS.semantic.critical;
          icon = 'warning';
          outcomeMessage = 'Infrastructure error occurred. Engineering team has been notified.';
        } else if (outcomeType === 'EXECUTION_ERROR') {
          // Execution error - critical
          style = NSD_COLORS.semantic.critical;
          icon = 'warning';
          outcomeMessage = 'Execution error. Please review the details below.';
        } else {
          style = NSD_COLORS.semantic.critical;
          icon = 'warning';
        }
        break;
    }
  }

  if (loading) {
    return (
      <div style={{
        padding: '20px 24px',
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.muted }}>
          Loading execution state...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px 24px',
      backgroundColor: style.bg,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${style.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Icon name={icon} size={20} color={style.text} />
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: style.text,
            }}>
              Execution Status
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: style.text }}>
              {statusText}
            </p>
            {/* OBSERVATIONS-FIRST: Show outcomeType badge */}
            {outcomeType && (
              <span style={{
                display: 'inline-block',
                marginTop: '8px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                backgroundColor: style.bg,
                color: style.text,
                borderRadius: NSD_RADIUS.sm,
                border: `1px solid ${style.border}`,
              }}>
                {outcomeType.replace(/_/g, ' ')}
              </span>
            )}
            {/* OBSERVATIONS-FIRST: Show outcome message for context */}
            {outcomeMessage && (
              <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: style.text }}>
                {outcomeMessage}
              </p>
            )}
            {/* Show outcome reason if exists */}
            {outcomeReason && (
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: style.text, fontStyle: 'italic' }}>
                {outcomeReason}
              </p>
            )}
            {/* Show termination reason if exists (contract requirement) */}
            {run?.terminationReason && !outcomeReason && (
              <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: style.text, fontStyle: 'italic' }}>
                Reason: {run.terminationReason}
              </p>
            )}
          </div>
        </div>

        {/* Run Campaign button - only when run === null */}
        {run === null && (
          <button
            onClick={onRunCampaign}
            disabled={!canRun || isRunRequesting}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: canRun && !isRunRequesting ? NSD_COLORS.primary : NSD_COLORS.text.muted,
              color: '#fff',
              border: 'none',
              borderRadius: NSD_RADIUS.md,
              cursor: canRun && !isRunRequesting ? 'pointer' : 'not-allowed',
              opacity: canRun && !isRunRequesting ? 1 : 0.6,
            }}
          >
            {isRunRequesting ? 'Requesting...' : 'Run Campaign'}
          </button>
        )}
      </div>

      {isPlanningOnly && run === null && (
        <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: style.text, fontStyle: 'italic' }}>
          Planning-only campaign — execution disabled
        </p>
      )}
    </div>
  );
}

// ============================================
// MARKET SCOPE CARD
// OBSERVATIONS-FIRST: Shows TRUE market scope from observations.*
// ============================================
function MarketScopeCard({ marketScope }: { marketScope: MarketScope | null }) {
  return (
    <SectionCard 
      title="Market Scope" 
      icon="target" 
      iconColor={NSD_COLORS.secondary}
      subtitle="Observed market reality (observations.*)"
    >
      {!marketScope ? (
        <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.muted }}>
          Market scope data not available yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase' }}>
                Organizations
              </label>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                {marketScope.observedOrganizations.toLocaleString()}
              </p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase' }}>
                Contacts
              </label>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                {marketScope.observedContacts.toLocaleString()}
              </p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase' }}>
                Est. Reachable
              </label>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                {marketScope.estimatedReachable.toLocaleString()}
              </p>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: NSD_COLORS.text.muted }}>
            Last observed: {new Date(marketScope.observedAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </SectionCard>
  );
}

// ============================================
// OPERATIONAL SET CARD
// OBSERVATIONS-FIRST: Shows operational working set from public.*
// This is NOT market scope - it's what has been processed.
// ============================================
function OperationalSetCard({ operationalSet }: { operationalSet: OperationalWorkingSet | null }) {
  return (
    <SectionCard 
      title="Operational Working Set" 
      icon="metrics" 
      iconColor={NSD_COLORS.primary}
      subtitle="Processed data (public.*)"
    >
      {!operationalSet ? (
        <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.muted }}>
          No operational data yet. Run a harvest to populate.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase' }}>
                Orgs
              </label>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                {operationalSet.organizations.toLocaleString()}
              </p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase' }}>
                Contacts
              </label>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                {operationalSet.contacts.toLocaleString()}
              </p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase' }}>
                Leads
              </label>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                {operationalSet.leads.toLocaleString()}
              </p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase' }}>
                Emails
              </label>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                {operationalSet.emailsSent.toLocaleString()}
              </p>
            </div>
          </div>
          {operationalSet.lastActivityAt && (
            <p style={{ margin: 0, fontSize: '11px', color: NSD_COLORS.text.muted }}>
              Last activity: {new Date(operationalSet.lastActivityAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ============================================
// RUN INTENT SELECTOR
// OBSERVATIONS-FIRST: Select HARVEST_ONLY vs ACTIVATE
// ============================================
function RunIntentSelector({
  runIntent,
  onChange,
  disabled,
}: {
  runIntent: RunIntent;
  onChange: (intent: RunIntent) => void;
  disabled: boolean;
}) {
  return (
    <SectionCard 
      title="Run Intent" 
      icon="campaigns" 
      iconColor={NSD_COLORS.magenta.base}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onChange('HARVEST_ONLY')}
            disabled={disabled}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: runIntent === 'HARVEST_ONLY' ? NSD_COLORS.secondary : NSD_COLORS.background,
              color: runIntent === 'HARVEST_ONLY' ? '#fff' : NSD_COLORS.text.secondary,
              border: `1px solid ${runIntent === 'HARVEST_ONLY' ? NSD_COLORS.secondary : NSD_COLORS.border.light}`,
              borderRadius: NSD_RADIUS.md,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              textAlign: 'left',
            }}
          >
            <strong style={{ display: 'block', marginBottom: '4px' }}>Harvest Only</strong>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>
              Observe market, collect data, no emails
            </span>
          </button>
          <button
            onClick={() => onChange('ACTIVATE')}
            disabled={disabled}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: runIntent === 'ACTIVATE' ? NSD_COLORS.primary : NSD_COLORS.background,
              color: runIntent === 'ACTIVATE' ? '#fff' : NSD_COLORS.text.secondary,
              border: `1px solid ${runIntent === 'ACTIVATE' ? NSD_COLORS.primary : NSD_COLORS.border.light}`,
              borderRadius: NSD_RADIUS.md,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              textAlign: 'left',
            }}
          >
            <strong style={{ display: 'block', marginBottom: '4px' }}>Activate</strong>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>
              Full execution with email dispatch
            </span>
          </button>
        </div>
        {disabled && (
          <p style={{ margin: 0, fontSize: '12px', color: NSD_COLORS.text.muted, fontStyle: 'italic' }}>
            Cannot change intent while a run is active
          </p>
        )}
      </div>
    </SectionCard>
  );
}

// ============================================
// CURRENT STAGE INDICATOR
// Contract: Section 2️⃣
// Show only if run.status === "running"
// ============================================
function CurrentStageCard({ run }: { run: ExecutionRun | null }) {
  // Per contract: Show only if run.status === "running"
  if (!run || run.status !== 'running') {
    return null;
  }

  const stageName = run.stage || 'Processing';
  const startedAt = run.startedAt;
  
  // Calculate relative time
  let relativeTime = '';
  if (startedAt) {
    const startMs = new Date(startedAt).getTime();
    const nowMs = Date.now();
    const diffSeconds = Math.floor((nowMs - startMs) / 1000);
    if (diffSeconds < 60) {
      relativeTime = `Started ${diffSeconds}s ago`;
    } else {
      const diffMinutes = Math.floor(diffSeconds / 60);
      relativeTime = `Started ${diffMinutes}m ago`;
    }
  }

  return (
    <div style={{
      padding: '16px 20px',
      backgroundColor: NSD_COLORS.semantic.active.bg,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${NSD_COLORS.semantic.active.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: NSD_COLORS.semantic.active.text,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
        <span style={{ fontSize: '12px', fontWeight: 500, color: NSD_COLORS.semantic.active.text, textTransform: 'uppercase' }}>
          Current Stage
        </span>
      </div>
      <p style={{
        margin: 0,
        fontSize: '16px',
        fontWeight: 600,
        color: NSD_COLORS.semantic.active.text,
      }}>
        {stageName}
      </p>
      {relativeTime && (
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: NSD_COLORS.semantic.active.text, opacity: 0.8 }}>
          {relativeTime}
        </p>
      )}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ============================================
// PIPELINE FUNNEL CARD
// Contract: Section 3️⃣
// ============================================
function PipelineFunnelCard({
  run,
  funnel,
  loading,
}: {
  run: ExecutionRun | null;
  funnel: ExecutionFunnel | null;
  loading: boolean;
}) {
  // Per contract:
  // - run === null → "No activity observed yet"
  // - run.status === "failed" → show counts only if non-zero, otherwise empty state
  
  if (loading) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.muted }}>
          Loading pipeline data...
        </p>
      </div>
    );
  }

  // No run = no activity
  if (run === null) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Icon name="chart" size={18} color={NSD_COLORS.secondary} />
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: NSD_COLORS.primary }}>
            Pipeline Funnel
          </h4>
        </div>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Icon name="chart" size={32} color={NSD_COLORS.text.muted} />
          <p style={{ margin: '12px 0 0 0', fontSize: '14px', color: NSD_COLORS.text.secondary }}>
            No activity observed yet
          </p>
        </div>
      </div>
    );
  }

  const hasActivity = funnel && hasFunnelActivity(funnel);

  // Failed run with no activity
  if (run.status === 'failed' && !hasActivity) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Icon name="chart" size={18} color={NSD_COLORS.secondary} />
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: NSD_COLORS.primary }}>
            Pipeline Funnel
          </h4>
        </div>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Icon name="warning" size={32} color={NSD_COLORS.semantic.critical.text} />
          <p style={{ margin: '12px 0 0 0', fontSize: '14px', color: NSD_COLORS.text.secondary }}>
            Execution failed before pipeline activity
          </p>
        </div>
      </div>
    );
  }

  // Show counts
  return (
    <div style={{
      padding: '20px',
      backgroundColor: NSD_COLORS.background,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${NSD_COLORS.border.light}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon name="chart" size={18} color={NSD_COLORS.secondary} />
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: NSD_COLORS.primary }}>
            Pipeline Funnel
          </h4>
        </div>
        <span style={{ fontSize: '11px', color: NSD_COLORS.text.muted, fontStyle: 'italic' }}>
          {run.status === 'running' ? 'Live' : 'Final'}
        </span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <FunnelMetric label="Organizations" value={funnel?.organizations.total ?? 0} />
        <FunnelMetric label="Contacts" value={funnel?.contacts.total ?? 0} />
        <FunnelMetric label="Leads" value={funnel?.leads.total ?? 0} />
        <FunnelMetric label="Emails Sent" value={funnel?.emailsSent ?? 0} />
      </div>
    </div>
  );
}

function FunnelMetric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.md }}>
      <span style={{ display: 'block', fontSize: '11px', color: NSD_COLORS.text.muted, textTransform: 'uppercase', marginBottom: '4px' }}>
        {label}
      </span>
      <span style={{ fontSize: '20px', fontWeight: 600, color: NSD_COLORS.primary }}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

// ============================================
// RUN HISTORY CARD
// Contract: Section 4️⃣
// ALWAYS shows empty state per contract
// ============================================
function RunHistoryCard() {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: NSD_COLORS.background,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${NSD_COLORS.border.light}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Icon name="runs" size={18} color={NSD_COLORS.info} />
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: NSD_COLORS.primary }}>
          Run History
        </h4>
      </div>
      <div style={{ textAlign: 'center', padding: '30px' }}>
        <Icon name="runs" size={32} color={NSD_COLORS.text.muted} />
        <p style={{ margin: '12px 0 4px 0', fontSize: '14px', fontWeight: 500, color: NSD_COLORS.text.secondary }}>
          No execution runs observed
        </p>
        <p style={{ margin: 0, fontSize: '12px', color: NSD_COLORS.text.muted }}>
          Run history is not available until a canonical endpoint exists.
        </p>
      </div>
      <div style={{ paddingTop: '12px', borderTop: `1px solid ${NSD_COLORS.border.light}`, marginTop: '16px' }}>
        <p style={{ margin: 0, fontSize: '11px', color: NSD_COLORS.text.muted, fontStyle: 'italic' }}>
          Read-only. Empty is correct. Fabricated is not.
        </p>
      </div>
    </div>
  );
}

// ============================================
// SEND METRICS CARD
// Contract: Section 5️⃣
// Show only if run.status === "completed" AND emailsSent > 0
// ============================================
function SendMetricsCard({
  executionState,
  loading,
}: {
  executionState: ExecutionState | null;
  loading: boolean;
}) {
  const showMetrics = shouldShowSendMetrics(executionState);

  if (loading) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.muted }}>
          Loading send metrics...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      backgroundColor: NSD_COLORS.background,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${NSD_COLORS.border.light}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Icon name="send" size={18} color={NSD_COLORS.secondary} />
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: NSD_COLORS.primary }}>
          Send Metrics (Post-Approval)
        </h4>
      </div>

      {showMetrics ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <FunnelMetric label="Emails Sent" value={executionState?.funnel.emailsSent ?? 0} />
          <FunnelMetric label="Approved Leads" value={executionState?.funnel.leads.approved ?? 0} />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Icon name="send" size={32} color={NSD_COLORS.text.muted} />
          <p style={{ margin: '12px 0 0 0', fontSize: '14px', color: NSD_COLORS.text.secondary }}>
            Send metrics will appear here after leads are approved and emails are dispatched.
          </p>
        </div>
      )}

      <div style={{ paddingTop: '12px', borderTop: `1px solid ${NSD_COLORS.border.light}`, marginTop: '16px' }}>
        <p style={{ margin: 0, fontSize: '11px', color: NSD_COLORS.text.muted, fontStyle: 'italic' }}>
          Read-only. Metrics shown only after execution completes with send activity.
        </p>
      </div>
    </div>
  );
}

// ============================================
// EXECUTION TIMELINE CARD
// Contract: Section 6️⃣
// Hidden if run === null
// ============================================
function ExecutionTimelineCard({ run }: { run: ExecutionRun | null }) {
  // Per contract: Hidden if run === null
  if (run === null) {
    return null;
  }

  return (
    <div style={{
      padding: '20px',
      backgroundColor: NSD_COLORS.background,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${NSD_COLORS.border.light}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Icon name="clock" size={18} color={NSD_COLORS.secondary} />
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: NSD_COLORS.primary }}>
          Execution Timeline
        </h4>
        <span style={{
          marginLeft: 'auto',
          padding: '2px 8px',
          fontSize: '10px',
          backgroundColor: NSD_COLORS.semantic.attention.bg,
          color: NSD_COLORS.semantic.attention.text,
          borderRadius: NSD_RADIUS.sm,
        }}>
          Non-authoritative
        </span>
      </div>
      
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.secondary }}>
          Timeline events are informational only and do not drive execution state.
        </p>
        {run.startedAt && (
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: NSD_COLORS.text.muted }}>
            Run started: {formatEt(run.startedAt)}
          </p>
        )}
        {run.completedAt && (
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: NSD_COLORS.text.muted }}>
            Run ended: {formatEt(run.completedAt)}
          </p>
        )}
      </div>

      <div style={{ paddingTop: '12px', borderTop: `1px solid ${NSD_COLORS.border.light}`, marginTop: '16px' }}>
        <p style={{ margin: 0, fontSize: '11px', color: NSD_COLORS.text.muted, fontStyle: 'italic' }}>
          Events are non-authoritative. execution-state is the single source of truth.
        </p>
      </div>
    </div>
  );
}
