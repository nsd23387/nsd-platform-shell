'use client';

/**
 * Campaign Detail Page - Decision-First UX Refactor (M68)
 * 
 * This page implements the decision-first UX principles:
 * 
 * 1. Is this campaign healthy and safe to run?
 * 2. What state is it in, and why?
 * 3. What has it produced (or what will it produce)?
 * 4. What action, if any, should I take next?
 * 
 * NON-NEGOTIABLE UX PRINCIPLES:
 * - Decision-first: UI exists to support decisions, not explain implementation
 * - Single source of truth per concept: no duplicated status, no redundant indicators
 * - Progressive disclosure: only show information relevant at current campaign phase
 * - Read-only posture: this UI does not mutate state directly
 * - No backend jargon exposed to operators
 * 
 * STRUCTURAL LAYOUT:
 * 1. Primary Campaign Status Banner (single canonical state)
 * 2. Decision Summary Panel (should I act right now?)
 * 3. Campaign Intent & Scope (why does this exist?)
 * 4. Execution Timeline (sequence, not metrics)
 * 5. Results Section (only after execution starts)
 * 6. Learning Signals (collapsed, post-execution)
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader, SectionCard } from '../../components/ui';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import type { CampaignDetail, MarketScope, OperationalWorkingSet } from '../../types/campaign';
import { getCampaign, requestCampaignRun, duplicateCampaign, revertCampaignToDraft, type RunIntent } from '../../lib/api';
import { mapToGovernanceState, type CampaignGovernanceState } from '../../lib/campaign-state';
import { formatEt, formatEtDate } from '../../lib/time';
import { isTestCampaign, getTestCampaignDetail } from '../../lib/test-campaign';
import { 
  useExecutionState, 
  hasFunnelActivity,
  type ExecutionState,
  type ExecutionRun,
  type ExecutionFunnel,
} from '../../hooks/useExecutionState';

// Decision-First UX Components
import {
  PrimaryCampaignStatusBanner,
  DecisionSummaryPanel,
  CampaignIntentScope,
  ExecutionTimeline,
  ResultsSection,
  CollapsibleLearningSignals,
  deriveCampaignPhase,
  type CampaignPhase,
  type ExecutionStage,
} from '../../components/campaign-details';

export default function CampaignDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const campaignId = params.id as string;
  
  // Debug mode (hidden behind query param)
  const isDebugMode = searchParams.get('debug') === 'true';

  // Campaign metadata (non-execution)
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Action states
  const [isRunRequesting, setIsRunRequesting] = useState(false);
  const [runRequestMessage, setRunRequestMessage] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [revertError, setRevertError] = useState<string | null>(null);
  
  // Run intent
  const [runIntent, setRunIntent] = useState<RunIntent>('HARVEST_ONLY');
  
  // Market scope and operational data
  const [marketScope, setMarketScope] = useState<MarketScope | null>(null);
  const [operationalSet, setOperationalSet] = useState<OperationalWorkingSet | null>(null);

  const isTest = isTestCampaign(campaignId);

  // Canonical Execution State
  const { 
    state: executionState, 
    loading: executionLoading, 
    refreshing: executionRefreshing,
    error: executionError,
    isTerminalError: executionTerminalError,
    refresh: refreshExecution,
    lastFetchedAt,
  } = useExecutionState({
    campaignId,
    enabled: !loading && !isTest,
    pollingIntervalMs: 7000,
  });

  // Derive governance state
  const governanceState: CampaignGovernanceState = campaign
    ? mapToGovernanceState(campaign.status, campaign.isRunnable)
    : 'DRAFT';

  // Derive campaign phase for unified status display
  const campaignPhase: CampaignPhase = deriveCampaignPhase(
    campaign?.status || 'DRAFT',
    executionState?.run !== null,
    executionState?.run?.status
  );

  // Fetch campaign details
  useEffect(() => {
    async function fetchCampaign() {
      if (!campaignId) return;

      // Handle test campaign
      if (isTest) {
        const testDetail = getTestCampaignDetail(campaignId);
        if (testDetail) {
          setCampaign(testDetail);
        }
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const detail = await getCampaign(campaignId);
        setCampaign(detail);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    }

    fetchCampaign();
  }, [campaignId, isTest]);

  // Fetch market scope
  useEffect(() => {
    async function fetchMarketScope() {
      if (!campaignId || isTest) return;
      try {
        const res = await fetch(`/api/proxy/market-scope?campaignId=${campaignId}`);
        if (res.ok) {
          const data = await res.json();
          setMarketScope(data);
        }
      } catch {
        // Market scope optional
      }
    }
    fetchMarketScope();
  }, [campaignId, isTest]);

  // Fetch operational set
  useEffect(() => {
    async function fetchOperationalSet() {
      if (!campaignId || isTest) return;
      try {
        const res = await fetch(`/api/proxy/harvest-metrics?campaignId=${campaignId}`);
        if (res.ok) {
          const data = await res.json();
          setOperationalSet(data);
        }
      } catch {
        // Operational set optional
      }
    }
    fetchOperationalSet();
  }, [campaignId, isTest]);

  // Handle run campaign
  const handleRunCampaign = useCallback(async () => {
    if (!campaignId) return;
    setIsRunRequesting(true);
    setRunRequestMessage(null);

    try {
      await requestCampaignRun(campaignId, runIntent);
      setRunRequestMessage('Campaign run started successfully');
      refreshExecution();
    } catch (err) {
      setRunRequestMessage(err instanceof Error ? err.message : 'Failed to start campaign run');
    } finally {
      setIsRunRequesting(false);
    }
  }, [campaignId, runIntent, refreshExecution]);

  // Handle duplicate
  const handleDuplicateCampaign = useCallback(async () => {
    if (!campaign) return;
    setIsDuplicating(true);
    try {
      const response = await duplicateCampaign(campaign.id, `${campaign.name} (Copy)`);
      if (response.success && response.data?.campaign?.id) {
        router.push(`/sales-engine/campaigns/${response.data.campaign.id}`);
      }
    } catch (err) {
      console.error('Failed to duplicate campaign:', err);
    } finally {
      setIsDuplicating(false);
    }
  }, [campaign, router]);

  // Handle edit - for draft campaigns, go directly to edit
  // For non-draft campaigns, revert to draft first
  const handleEditCampaign = useCallback(async () => {
    if (!campaign) return;
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
    setIsReverting(true);
    try {
      const result = await revertCampaignToDraft(campaign.id);
      
      if (result.reverted || result.status === 'DRAFT') {
        // Refresh campaign data with new draft status
        const updatedCampaign = await getCampaign(campaign.id);
        setCampaign(updatedCampaign);
        // Navigate to edit page
        router.push(`/sales-engine/campaigns/${campaign.id}/edit`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to prepare campaign for editing';
      setRevertError(message);
      console.error('Failed to revert campaign:', err);
    } finally {
      setIsReverting(false);
    }
  }, [campaign, router]);

  // Loading state
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: NSD_COLORS.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Icon name="refresh" size={32} color={NSD_COLORS.text.muted} />
          <p style={{ 
            marginTop: '16px', 
            fontSize: '14px', 
            color: NSD_COLORS.text.secondary,
          }}>
            Loading campaign...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !campaign) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: NSD_COLORS.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ 
          textAlign: 'center',
          padding: '40px',
          backgroundColor: NSD_COLORS.background,
          borderRadius: NSD_RADIUS.lg,
          maxWidth: '400px',
        }}>
          <Icon name="warning" size={32} color={NSD_COLORS.semantic.critical.text} />
          <h2 style={{ 
            margin: '16px 0 8px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: NSD_COLORS.text.primary,
          }}>
            Unable to Load Campaign
          </h2>
          <p style={{ 
            margin: '0 0 20px 0',
            fontSize: '14px',
            color: NSD_COLORS.text.secondary,
          }}>
            {error || 'Campaign not found'}
          </p>
          <Link
            href="/sales-engine"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: NSD_COLORS.primary,
              color: '#fff',
              borderRadius: NSD_RADIUS.md,
              textDecoration: 'none',
            }}
          >
            <Icon name="arrow-left" size={16} color="#fff" />
            Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  // Derived state
  const isPlanningOnly = campaign.sourcing_config?.benchmarks_only === true;
  const isApproved = campaign.status === 'RUNNABLE';
  const hasRun = executionState?.run !== null;
  const isRunning = executionState?.run?.status === 'running';
  const isExecutionComplete = executionState?.run?.status === 'completed';
  const canRun = campaign.isRunnable && isApproved && !isPlanningOnly && !hasRun;

  // Extract scope data from campaign ICP
  const industries = campaign.icp?.industries || [];
  const roles = campaign.icp?.roles || [];
  const keywords = campaign.icp?.keywords || [];
  const companySizes: string[] = [];  // Not in current schema
  const regions: string[] = [];        // Not in current schema

  // Build execution stages from funnel data
  const executionStages: ExecutionStage[] = buildExecutionStages(
    executionState,
    isApproved,
    hasRun
  );

  // Build metrics for results section
  const metrics = {
    organizations: executionState?.funnel?.organizations?.total || 0,
    contacts: executionState?.funnel?.contacts?.total || 0,
    leads: executionState?.funnel?.leads?.total || 0,
    emailsSent: executionState?.funnel?.emailsSent || 0,
    opens: 0,    // Not in current schema
    replies: 0,  // Not in current schema
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: NSD_COLORS.background }}>
      {/* Gradient accent bar at top */}
      <div style={{ height: '4px', background: `linear-gradient(90deg, ${NSD_COLORS.magenta.base} 0%, ${NSD_COLORS.violet.base} 100%)` }} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(16px, 4vw, 32px)' }}>
        {/* Page Header */}
        <PageHeader
          title={campaign.name}
          description={campaign.description}
          backHref="/sales-engine"
          backLabel="Back to Campaigns"
        />

        {/* 1. Primary Campaign Status Banner - Single canonical state */}
        <PrimaryCampaignStatusBanner
          phase={campaignPhase}
          createdAt={campaign.created_at}
          updatedAt={campaign.updated_at}
          currentStage={executionState?.run?.stage}
        />

        {/* Revert Error Message */}
        {revertError && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            backgroundColor: NSD_COLORS.semantic.critical.bg,
            borderRadius: NSD_RADIUS.md,
            border: `1px solid ${NSD_COLORS.semantic.critical.border}`,
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.semantic.critical.text }}>
              {revertError}
            </p>
          </div>
        )}

        {/* 2. Decision Summary Panel - Should I act right now? */}
        <DecisionSummaryPanel
          phase={campaignPhase}
          isApproved={isApproved}
          isExecutionReady={campaign.isRunnable && !isPlanningOnly}
          safetyChecksPassed={true}
          isPlanningOnly={isPlanningOnly}
          isRunning={isRunning}
          hasRun={hasRun}
          runIntent={runIntent}
          onRunCampaign={canRun ? handleRunCampaign : undefined}
          onEdit={campaign.status !== 'ARCHIVED' ? handleEditCampaign : undefined}
          onDuplicate={handleDuplicateCampaign}
          isRunRequesting={isRunRequesting}
          isDuplicating={isDuplicating}
          isReverting={isReverting}
          runRequestMessage={runRequestMessage}
          showEditConfiguration={campaign.status !== 'DRAFT' && campaign.status !== 'ARCHIVED'}
        />

        {/* Run Intent Selector - Only show if can run */}
        {canRun && (
          <RunIntentCard
            runIntent={runIntent}
            onChange={setRunIntent}
          />
        )}

        {/* 3. Campaign Intent & Scope - Why this campaign exists */}
        <CampaignIntentScope
          industries={industries}
          roles={roles}
          keywords={keywords}
          objective="lead_generation"
          learningMode="L1"
          companySizes={companySizes}
          regions={regions}
          marketSize={marketScope?.observedOrganizations}
        />

        {/* 4. Execution Timeline - Sequence view */}
        <ExecutionTimeline
          hasStartedExecution={hasRun}
          stages={executionStages}
          currentStageId={executionState?.run?.stage?.toLowerCase().replace(/\s+/g, '_')}
        />

        {/* 5. Results Section - Only after execution starts */}
        <ResultsSection
          hasExecutionStarted={hasRun}
          isExecutionComplete={isExecutionComplete}
          metrics={metrics}
          outcomeType={executionState?.run?.outcomeType}
          outcomeDescription={executionState?.run?.outcomeReason}
        />

        {/* 6. Learning Signals - Collapsed by default */}
        <CollapsibleLearningSignals
          hasExecutionCompleted={isExecutionComplete}
          signals={[]}
        />

        {/* Last updated timestamp (subtle) */}
        {lastFetchedAt && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              onClick={refreshExecution}
              disabled={executionRefreshing}
              style={{
                fontSize: '12px',
                color: NSD_COLORS.text.muted,
                background: 'none',
                border: 'none',
                cursor: executionRefreshing ? 'not-allowed' : 'pointer',
              }}
            >
              Last updated: {formatEt(lastFetchedAt)} {executionRefreshing ? '• Refreshing...' : '• Refresh'}
            </button>
          </div>
        )}

        {/* Debug Panel - Hidden behind ?debug=true */}
        {isDebugMode && (
          <DebugPanel
            campaign={campaign}
            executionState={executionState}
            executionError={executionError}
            executionTerminalError={executionTerminalError}
            marketScope={marketScope}
            operationalSet={operationalSet}
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// RUN INTENT CARD
// Simplified version for pre-execution state
// ============================================
function RunIntentCard({
  runIntent,
  onChange,
}: {
  runIntent: RunIntent;
  onChange: (intent: RunIntent) => void;
}) {
  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: NSD_RADIUS.lg,
      border: '1px solid #E5E7EB',
      borderLeft: `4px solid ${NSD_COLORS.magenta.base}`,
      padding: '24px',
      marginBottom: '24px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <Icon name="target" size={18} color={NSD_COLORS.magenta.base} />
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 600,
          color: NSD_COLORS.text.primary,
        }}>
          Execution Mode
        </h3>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => onChange('HARVEST_ONLY')}
          style={{
            flex: 1,
            padding: '16px',
            textAlign: 'left',
            backgroundColor: runIntent === 'HARVEST_ONLY' 
              ? NSD_COLORS.semantic.info.bg 
              : NSD_COLORS.surface,
            border: `2px solid ${runIntent === 'HARVEST_ONLY' 
              ? NSD_COLORS.semantic.info.border 
              : NSD_COLORS.border.light}`,
            borderRadius: NSD_RADIUS.md,
            cursor: 'pointer',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}>
            <Icon 
              name="eye" 
              size={16} 
              color={runIntent === 'HARVEST_ONLY' 
                ? NSD_COLORS.semantic.info.text 
                : NSD_COLORS.text.secondary} 
            />
            <span style={{
              fontSize: '14px',
              fontWeight: 600,
              color: runIntent === 'HARVEST_ONLY' 
                ? NSD_COLORS.semantic.info.text 
                : NSD_COLORS.text.primary,
            }}>
              Harvest Only
            </span>
            {runIntent === 'HARVEST_ONLY' && (
              <span style={{
                fontSize: '10px',
                fontWeight: 500,
                padding: '2px 6px',
                backgroundColor: NSD_COLORS.semantic.positive.bg,
                color: NSD_COLORS.semantic.positive.text,
                borderRadius: NSD_RADIUS.full,
              }}>
                SAFE
              </span>
            )}
          </div>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: NSD_COLORS.text.secondary,
          }}>
            Observe the market and collect data. No emails will be sent.
          </p>
        </button>
        <button
          onClick={() => onChange('ACTIVATE')}
          style={{
            flex: 1,
            padding: '16px',
            textAlign: 'left',
            backgroundColor: runIntent === 'ACTIVATE' 
              ? NSD_COLORS.semantic.attention.bg 
              : NSD_COLORS.surface,
            border: `2px solid ${runIntent === 'ACTIVATE' 
              ? NSD_COLORS.semantic.attention.border 
              : NSD_COLORS.border.light}`,
            borderRadius: NSD_RADIUS.md,
            cursor: 'pointer',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}>
            <Icon 
              name="mail" 
              size={16} 
              color={runIntent === 'ACTIVATE' 
                ? NSD_COLORS.semantic.attention.text 
                : NSD_COLORS.text.secondary} 
            />
            <span style={{
              fontSize: '14px',
              fontWeight: 600,
              color: runIntent === 'ACTIVATE' 
                ? NSD_COLORS.semantic.attention.text 
                : NSD_COLORS.text.primary,
            }}>
              Full Activation
            </span>
          </div>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: NSD_COLORS.text.secondary,
          }}>
            Execute the full pipeline including email outreach.
          </p>
        </button>
      </div>
    </div>
  );
}

// ============================================
// DEBUG PANEL
// Hidden behind ?debug=true query param
// ============================================
function DebugPanel({
  campaign,
  executionState,
  executionError,
  executionTerminalError,
  marketScope,
  operationalSet,
}: {
  campaign: CampaignDetail;
  executionState: ExecutionState | null;
  executionError: string | null;
  executionTerminalError: boolean;
  marketScope: MarketScope | null;
  operationalSet: OperationalWorkingSet | null;
}) {
  return (
    <div style={{
      marginTop: '32px',
      padding: '24px',
      backgroundColor: '#1a1a2e',
      borderRadius: NSD_RADIUS.lg,
      border: '1px solid #333',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
      }}>
        <Icon name="code" size={16} color="#888" />
        <span style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#888',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Debug Panel (hidden in production)
        </span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
      }}>
        <DebugSection title="Campaign" data={campaign} />
        <DebugSection title="Execution State" data={executionState} />
        <DebugSection title="Execution Error" data={{ error: executionError, isTerminal: executionTerminalError }} />
        <DebugSection title="Market Scope" data={marketScope} />
        <DebugSection title="Operational Set" data={operationalSet} />
      </div>
    </div>
  );
}

function DebugSection({ title, data }: { title: string; data: unknown }) {
  return (
    <div>
      <h4 style={{
        margin: '0 0 8px 0',
        fontSize: '11px',
        fontWeight: 600,
        color: '#666',
        textTransform: 'uppercase',
      }}>
        {title}
      </h4>
      <pre style={{
        margin: 0,
        padding: '12px',
        fontSize: '11px',
        color: '#aaa',
        backgroundColor: '#0d0d1a',
        borderRadius: NSD_RADIUS.sm,
        overflow: 'auto',
        maxHeight: '200px',
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function buildExecutionStages(
  executionState: ExecutionState | null,
  isApproved: boolean,
  hasRun: boolean
): ExecutionStage[] {
  const stages: ExecutionStage[] = [
    {
      id: 'approval',
      label: 'Approval',
      description: 'Governance approval for campaign execution',
      icon: 'check',
      status: isApproved ? 'completed' : 'not_started',
    },
    {
      id: 'sourcing',
      label: 'Organization Sourcing',
      description: 'Identifying target organizations from market',
      icon: 'building',
      status: 'not_started',
      count: executionState?.funnel?.organizations?.total,
    },
    {
      id: 'discovery',
      label: 'Contact Discovery',
      description: 'Finding contacts within target organizations',
      icon: 'users',
      status: 'not_started',
      count: executionState?.funnel?.contacts?.total,
    },
    {
      id: 'promotion',
      label: 'Lead Promotion',
      description: 'Qualifying contacts as actionable leads',
      icon: 'trending',
      status: 'not_started',
      count: executionState?.funnel?.leads?.total,
    },
    {
      id: 'outreach',
      label: 'Outreach',
      description: 'Engaging leads with personalized messaging',
      icon: 'mail',
      status: 'not_started',
      count: executionState?.funnel?.emailsSent,
    },
    {
      id: 'outcomes',
      label: 'Outcomes',
      description: 'Tracking responses and conversions',
      icon: 'chart',
      status: 'not_started',
      count: undefined,
    },
  ];

  // Update stages based on execution state
  if (hasRun && executionState?.run) {
    const run = executionState.run;
    const currentStage = run.stage?.toLowerCase().replace(/\s+/g, '_') || '';
    
    const stageOrder = ['approval', 'sourcing', 'discovery', 'promotion', 'outreach', 'outcomes'];
    const currentIndex = stageOrder.indexOf(currentStage);
    
    stages.forEach((stage, index) => {
      if (run.status === 'completed') {
        stage.status = 'completed';
      } else if (run.status === 'running') {
        if (index <= currentIndex || index === 0) {
          stage.status = index === currentIndex ? 'in_progress' : 'completed';
        }
      } else if (run.status === 'failed') {
        if (index <= currentIndex) {
          stage.status = index === currentIndex ? 'in_progress' : 'completed';
        }
      }
    });
  }

  return stages;
}
