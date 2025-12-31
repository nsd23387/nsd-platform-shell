'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader, SectionCard, StatusChip, Button } from '../../components/ui';
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
  updateCampaign,
  submitCampaign,
  approveCampaign,
  rejectCampaign,
  startCampaignRun,
} from '../../lib/api';

type TabType = 'setup' | 'review' | 'approvals' | 'execution' | 'monitoring';

const TAB_CONFIG: { id: TabType; label: string; icon: string }[] = [
  { id: 'setup', label: 'Setup', icon: 'edit' },
  { id: 'review', label: 'Review', icon: 'review' },
  { id: 'approvals', label: 'Approvals', icon: 'check' },
  { id: 'execution', label: 'Execution', icon: 'runs' },
  { id: 'monitoring', label: 'Monitoring', icon: 'metrics' },
];

export default function CampaignDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const campaignId = params.id as string;
  const initialTab = (searchParams.get('tab') as TabType) || 'setup';

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
  const [isUpdating, setIsUpdating] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showExecutionModal, setShowExecutionModal] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
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

  async function handleSubmitForReview() {
    if (!campaign?.canSubmit) return;
    setIsUpdating(true);
    try {
      const updated = await submitCampaign(campaignId);
      setCampaign({ ...campaign, ...updated, status: 'PENDING_REVIEW', canEdit: false, canSubmit: false });
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleApprove() {
    if (!campaign?.canApprove) return;
    setIsUpdating(true);
    try {
      const updated = await approveCampaign(campaignId);
      setCampaign({ ...campaign, ...updated, status: 'RUNNABLE', canApprove: false, isRunnable: true });
      setShowApprovalModal(false);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleStartRun() {
    if (!campaign?.isRunnable) return;
    setIsUpdating(true);
    try {
      await startCampaignRun(campaignId);
      setCampaign({ ...campaign, status: 'RUNNING' });
      setShowExecutionModal(false);
      setActiveTab('monitoring');
    } finally {
      setIsUpdating(false);
    }
  }

  function getTabAvailability(tab: TabType): boolean {
    if (!campaign) return false;
    switch (tab) {
      case 'setup': return true;
      case 'review': return campaign.status === 'DRAFT';
      case 'approvals': return campaign.status === 'PENDING_REVIEW' && campaign.canApprove;
      case 'execution': return campaign.status === 'RUNNABLE' && campaign.isRunnable;
      case 'monitoring': return true;
    }
  }

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
        <PageHeader
          title={campaign.name}
          description={campaign.description}
          backHref="/sales-engine"
          backLabel="Back to Campaigns"
          actions={<StatusChip status={campaign.status} />}
        />

        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: `1px solid ${NSD_COLORS.border.light}`, paddingBottom: '0' }}>
          {TAB_CONFIG.map((tab) => {
            const available = getTabAvailability(tab.id);
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => available && setActiveTab(tab.id)}
                disabled={!available}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  fontFamily: NSD_TYPOGRAPHY.fontBody,
                  backgroundColor: 'transparent',
                  color: isActive ? NSD_COLORS.primary : available ? NSD_COLORS.text.secondary : NSD_COLORS.text.muted,
                  border: 'none',
                  borderBottom: isActive ? `2px solid ${NSD_COLORS.primary}` : '2px solid transparent',
                  cursor: available ? 'pointer' : 'not-allowed',
                  opacity: available ? 1 : 0.5,
                  marginBottom: '-1px',
                }}
              >
                <Icon name={tab.icon as any} size={16} color={isActive ? NSD_COLORS.primary : available ? NSD_COLORS.text.secondary : NSD_COLORS.text.muted} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'setup' && (
          <SetupTab campaign={campaign} canEdit={campaign.canEdit && campaign.status === 'DRAFT'} />
        )}

        {activeTab === 'review' && (
          <ReviewTab campaign={campaign} onSubmit={handleSubmitForReview} isLoading={isUpdating} />
        )}

        {activeTab === 'approvals' && (
          <ApprovalsTab 
            campaign={campaign} 
            onApprove={() => setShowApprovalModal(true)} 
            isLoading={isUpdating}
          />
        )}

        {activeTab === 'execution' && (
          <ExecutionTab 
            campaign={campaign} 
            throughput={throughput}
            onStart={() => setShowExecutionModal(true)} 
            isLoading={isUpdating}
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

        {showApprovalModal && (
          <ApprovalModal
            campaign={campaign}
            onConfirm={handleApprove}
            onCancel={() => setShowApprovalModal(false)}
            isLoading={isUpdating}
          />
        )}

        {showExecutionModal && (
          <ExecutionModal
            campaign={campaign}
            throughput={throughput}
            onConfirm={handleStartRun}
            onCancel={() => setShowExecutionModal(false)}
            isLoading={isUpdating}
          />
        )}
      </div>
    </div>
  );
}

function SetupTab({ campaign, canEdit }: { campaign: CampaignDetail; canEdit: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      <SectionCard title="Campaign Details" icon="campaigns" iconColor={NSD_COLORS.primary}>
        {!canEdit && (
          <div style={{ padding: '12px 16px', backgroundColor: '#fef3c7', borderRadius: NSD_RADIUS.sm, marginBottom: '16px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
              This campaign is in {campaign.status === 'RUNNABLE' ? 'Approved & Ready' : campaign.status} state and cannot be edited.
            </p>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</label>
            <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.primary }}>{campaign.name}</p>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
            <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.primary }}>{campaign.description || 'No description'}</p>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created</label>
            <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.primary }}>{new Date(campaign.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </SectionCard>

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
  );
}

function ReviewTab({ campaign, onSubmit, isLoading }: { campaign: CampaignDetail; onSubmit: () => void; isLoading: boolean }) {
  const [confirmed, setConfirmed] = useState(false);

  const checks = [
    { label: 'Campaign name is descriptive', passed: campaign.name.length > 5 },
    { label: 'Description provided', passed: !!campaign.description },
    { label: 'ICP configured', passed: !!(campaign.icp?.industries?.length || campaign.icp?.roles?.length) },
  ];

  const allPassed = checks.every(c => c.passed);

  return (
    <SectionCard title="Submit for Review" icon="review" iconColor={NSD_COLORS.info}>
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '14px', color: NSD_COLORS.text.secondary, marginBottom: '16px' }}>
          Submitting this campaign for review will lock editing. A reviewer will need to approve before it can run.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {checks.map((check, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.sm }}>
              <Icon name={check.passed ? 'check' : 'close'} size={18} color={check.passed ? NSD_COLORS.success : NSD_COLORS.error} />
              <span style={{ fontSize: '14px', color: NSD_COLORS.text.primary }}>{check.label}</span>
            </div>
          ))}
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={confirmed} 
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ marginTop: '2px' }}
          />
          <span style={{ fontSize: '13px', color: NSD_COLORS.text.secondary }}>
            I confirm this campaign is ready for review and understand it will be locked for editing.
          </span>
        </label>
      </div>

      <Button 
        variant="primary" 
        onClick={onSubmit} 
        disabled={!confirmed || !allPassed || !campaign.canSubmit}
        loading={isLoading}
        icon="arrow-right"
        iconPosition="right"
      >
        Submit for Review
      </Button>
    </SectionCard>
  );
}

function ApprovalsTab({ campaign, onApprove, isLoading }: { campaign: CampaignDetail; onApprove: () => void; isLoading: boolean }) {
  return (
    <SectionCard title="Approve Campaign" icon="check" iconColor={NSD_COLORS.success}>
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '14px', color: NSD_COLORS.text.secondary, marginBottom: '16px' }}>
          This campaign is pending your review and approval. Approving will make it eligible for execution.
        </p>
        
        <div style={{ padding: '16px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.md, marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: NSD_COLORS.text.primary }}>Campaign Summary</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
            <div><span style={{ color: NSD_COLORS.text.muted }}>Name:</span> <span style={{ color: NSD_COLORS.text.primary }}>{campaign.name}</span></div>
            <div><span style={{ color: NSD_COLORS.text.muted }}>Created:</span> <span style={{ color: NSD_COLORS.text.primary }}>{new Date(campaign.created_at).toLocaleDateString()}</span></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <Button variant="cta" onClick={onApprove} loading={isLoading} icon="check">
          Approve Campaign
        </Button>
      </div>
    </SectionCard>
  );
}

function ExecutionTab({ campaign, throughput, onStart, isLoading }: { campaign: CampaignDetail; throughput: ThroughputConfig | null; onStart: () => void; isLoading: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionCard title="Safety Gates" icon="shield" iconColor={NSD_COLORS.warning}>
        {throughput ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ padding: '16px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.md }}>
              <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px' }}>Daily Limit</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: NSD_COLORS.text.primary }}>{throughput.daily_limit}</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.md }}>
              <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px' }}>Used Today</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: NSD_COLORS.info }}>{throughput.current_daily_usage}</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.md }}>
              <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px' }}>Remaining</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: NSD_COLORS.success }}>{throughput.daily_limit - throughput.current_daily_usage}</div>
            </div>
          </div>
        ) : (
          <p style={{ color: NSD_COLORS.text.muted, fontSize: '14px' }}>Throughput data not available</p>
        )}
      </SectionCard>

      <SectionCard title="Start Execution" icon="runs" iconColor={NSD_COLORS.secondary}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: NSD_RADIUS.md, marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <Icon name="warning" size={20} color="#92400e" />
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: '#92400e' }}>Important</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
                Starting this campaign will begin sending emails to leads. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <Button variant="cta" onClick={onStart} loading={isLoading} icon="runs">
          Start Campaign Run
        </Button>
      </SectionCard>
    </div>
  );
}

function MonitoringTab({ campaign, metrics, metricsHistory, runs, latestRun }: { campaign: CampaignDetail; metrics: CampaignMetrics | null; metricsHistory: MetricsHistoryEntry[]; runs: CampaignRun[]; latestRun: CampaignRun | null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {metrics && (
        <SectionCard title="Performance Metrics" icon="metrics" iconColor={NSD_COLORS.secondary}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ padding: '16px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.md }}>
              <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px' }}>Emails Sent</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: NSD_COLORS.primary }}>{metrics.emails_sent}</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.md }}>
              <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px' }}>Open Rate</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: NSD_COLORS.success }}>{(metrics.open_rate * 100).toFixed(1)}%</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.md }}>
              <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px' }}>Reply Rate</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: NSD_COLORS.secondary }}>{(metrics.reply_rate * 100).toFixed(1)}%</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.md }}>
              <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px' }}>Total Leads</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: NSD_COLORS.text.primary }}>{metrics.total_leads}</div>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Run History" icon="runs" iconColor={NSD_COLORS.info}>
        {runs.length === 0 ? (
          <p style={{ color: NSD_COLORS.text.muted, fontSize: '14px', textAlign: 'center', padding: '24px' }}>No runs recorded yet</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${NSD_COLORS.border.light}` }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Started</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Processed</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Sent</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Errors</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} style={{ borderBottom: `1px solid ${NSD_COLORS.border.light}` }}>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: NSD_COLORS.text.primary }}>{new Date(run.started_at).toLocaleString()}</td>
                  <td style={{ padding: '14px 16px' }}><StatusChip status={run.status} size="sm" /></td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: NSD_COLORS.text.primary }}>{run.leads_processed}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: NSD_COLORS.success }}>{run.emails_sent}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: run.errors > 0 ? NSD_COLORS.error : NSD_COLORS.text.muted }}>{run.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}

function ApprovalModal({ campaign, onConfirm, onCancel, isLoading }: { campaign: CampaignDetail; onConfirm: () => void; onCancel: () => void; isLoading: boolean }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: NSD_COLORS.background, borderRadius: NSD_RADIUS.lg, padding: '32px', maxWidth: '500px', width: '100%' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600, color: NSD_COLORS.primary, fontFamily: NSD_TYPOGRAPHY.fontDisplay }}>
          Confirm Approval
        </h2>
        
        <div style={{ padding: '16px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.md, marginBottom: '20px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: NSD_COLORS.text.primary }}>{campaign.name}</p>
          <p style={{ margin: 0, fontSize: '12px', color: NSD_COLORS.text.muted }}>
            ICP Hash: {campaign.icp ? btoa(JSON.stringify(campaign.icp)).slice(0, 12) : 'N/A'}
          </p>
        </div>

        <div style={{ padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: NSD_RADIUS.sm, marginBottom: '20px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#1e40af' }}>
            By approving this campaign, you authorize it to run according to the configured ICP and personalization settings.
          </p>
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '24px', cursor: 'pointer' }}>
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} style={{ marginTop: '2px' }} />
          <span style={{ fontSize: '13px', color: NSD_COLORS.text.secondary }}>
            I take responsibility for approving this campaign and confirm it meets our quality standards.
          </span>
        </label>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="cta" onClick={onConfirm} disabled={!confirmed} loading={isLoading} icon="check">
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExecutionModal({ campaign, throughput, onConfirm, onCancel, isLoading }: { campaign: CampaignDetail; throughput: ThroughputConfig | null; onConfirm: () => void; onCancel: () => void; isLoading: boolean }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: NSD_COLORS.background, borderRadius: NSD_RADIUS.lg, padding: '32px', maxWidth: '500px', width: '100%' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600, color: NSD_COLORS.primary, fontFamily: NSD_TYPOGRAPHY.fontDisplay }}>
          Start Campaign Run
        </h2>

        <div style={{ padding: '12px 16px', backgroundColor: '#fef3c7', borderRadius: NSD_RADIUS.sm, marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <Icon name="warning" size={18} color="#92400e" />
          <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
            This will start sending emails. Ensure all settings are correct before proceeding.
          </p>
        </div>

        {throughput && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ padding: '12px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.sm, textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: NSD_COLORS.text.muted, marginBottom: '4px' }}>Daily Limit</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: NSD_COLORS.text.primary }}>{throughput.daily_limit}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.sm, textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: NSD_COLORS.text.muted, marginBottom: '4px' }}>Used</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: NSD_COLORS.info }}>{throughput.current_daily_usage}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.sm, textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: NSD_COLORS.text.muted, marginBottom: '4px' }}>Remaining</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: NSD_COLORS.success }}>{throughput.daily_limit - throughput.current_daily_usage}</div>
            </div>
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '24px', cursor: 'pointer' }}>
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} style={{ marginTop: '2px' }} />
          <span style={{ fontSize: '13px', color: NSD_COLORS.text.secondary }}>
            I understand this will send emails and take responsibility for this execution.
          </span>
        </label>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="cta" onClick={onConfirm} disabled={!confirmed} loading={isLoading} icon="runs">
            Start Run
          </Button>
        </div>
      </div>
    </div>
  );
}
