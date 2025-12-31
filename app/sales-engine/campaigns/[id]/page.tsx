'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
} from '../../lib/api';
import {
  StatusBadge,
  CampaignForm,
  GovernanceActions,
  ReadinessDisplay,
  MetricsDisplay,
  RunsDisplay,
  VariantsDisplay,
} from '../../components';

type TabType = 'overview' | 'edit' | 'monitoring';

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<MetricsHistoryEntry[]>([]);
  const [runs, setRuns] = useState<CampaignRun[]>([]);
  const [latestRun, setLatestRun] = useState<CampaignRun | null>(null);
  const [variants, setVariants] = useState<CampaignVariant[]>([]);
  const [throughput, setThroughput] = useState<ThroughputConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isUpdating, setIsUpdating] = useState(false);

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

  async function handleUpdate(data: { name?: string; description?: string }) {
    if (!campaign?.canEdit) return;
    setIsUpdating(true);
    try {
      const updated = await updateCampaign(campaignId, data);
      setCampaign({ ...campaign, ...updated });
      setActiveTab('overview');
    } catch (err) {
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleSubmit() {
    if (!campaign?.canSubmit) return;
    const updated = await submitCampaign(campaignId);
    setCampaign({ ...campaign, ...updated, canEdit: false, canSubmit: false });
  }

  async function handleApprove() {
    if (!campaign?.canApprove) return;
    const updated = await approveCampaign(campaignId);
    setCampaign({ ...campaign, ...updated, canApprove: false, isRunnable: true });
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280' }}>Loading campaign...</p>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '32px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ padding: '24px', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '24px' }}>
            <p style={{ margin: 0, color: '#b91c1c' }}>{error || 'Campaign not found'}</p>
          </div>
          <Link href="/sales-engine" style={{ color: '#4f46e5', textDecoration: 'none' }}>
            ← Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href="/sales-engine" style={{ fontSize: '14px', color: '#4f46e5', textDecoration: 'none' }}>
            ← Back to Campaigns
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#111827' }}>
                {campaign.name}
              </h1>
              <StatusBadge status={campaign.status} />
            </div>
            {campaign.description && (
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>{campaign.description}</p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
          {(['overview', 'edit', 'monitoring'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              disabled={tab === 'edit' && !campaign.canEdit}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                backgroundColor: activeTab === tab ? '#4f46e5' : 'transparent',
                color: activeTab === tab ? '#fff' : tab === 'edit' && !campaign.canEdit ? '#9ca3af' : '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: tab === 'edit' && !campaign.canEdit ? 'not-allowed' : 'pointer',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <GovernanceActions campaign={campaign} onSubmit={handleSubmit} onApprove={handleApprove} />
            <ReadinessDisplay campaign={campaign} throughput={throughput || undefined} />
          </div>
        )}

        {activeTab === 'edit' && (
          <div style={{ maxWidth: '600px', backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
              Edit Campaign
            </h2>
            {campaign.status !== 'DRAFT' && (
              <div style={{ padding: '12px 16px', backgroundColor: '#fef3c7', borderRadius: '6px', marginBottom: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
                  Only DRAFT campaigns can be edited. This campaign is in {campaign.status} state.
                </p>
              </div>
            )}
            <CampaignForm
              campaign={campaign}
              onSubmit={handleUpdate}
              onCancel={() => setActiveTab('overview')}
              isLoading={isUpdating}
            />
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {metrics && <MetricsDisplay metrics={metrics} history={metricsHistory} />}
            <RunsDisplay runs={runs} latestRun={latestRun} />
            <VariantsDisplay variants={variants} />
          </div>
        )}
      </div>
    </div>
  );
}
