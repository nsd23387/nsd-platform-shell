'use client';

/**
 * Executive Dashboard
 * 
 * Read-only observability dashboard designed for executive-level understanding.
 * 
 * Layout:
 * - System Health (top) - Is the system healthy?
 * - Market Reality (left) - How big is the opportunity?
 * - Operational Yield (right) - What have we processed?
 * - Campaign Distribution (bottom) - How are campaigns distributed?
 * 
 * Key Principles:
 * - READ-ONLY: No execution controls
 * - SELF-EXPLANATORY: Clear labels, explicit source attribution
 * - TRUST-BUILDING: Neutral language, no alarming failure states
 * - OBSERVATIONS-FIRST: Market Reality ≠ Operational Yield
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { NSD_COLORS, NSD_TYPOGRAPHY, NSD_RADIUS, NSD_GRADIENTS } from '../lib/design-tokens';
import { SectionHeader, HelperText } from '../components/ui';
import { Icon } from '../../../design/components/Icon';

interface ExecutiveSummary {
  systemHealth: {
    status: 'healthy' | 'degraded' | 'unavailable';
    lastChecked: string;
    activeWorkflows: number;
    errorRate: number;
  };
  marketReality: {
    totalOrganizations: number;
    totalContacts: number;
    geographicCoverage: string[];
    dataFreshness: string;
  };
  operationalYield: {
    processedOrganizations: number;
    qualifiedContacts: number;
    promotedLeads: number;
    conversionRate: number;
  };
  campaignDistribution: {
    draft: number;
    pendingReview: number;
    approved: number;
    completed: number;
    total: number;
  };
}

const MOCK_EXECUTIVE_DATA: ExecutiveSummary = {
  systemHealth: {
    status: 'healthy',
    lastChecked: new Date().toISOString(),
    activeWorkflows: 3,
    errorRate: 0.02,
  },
  marketReality: {
    totalOrganizations: 14523,
    totalContacts: 89421,
    geographicCoverage: ['Northeast US', 'Southeast US', 'Midwest US'],
    dataFreshness: '2 hours ago',
  },
  operationalYield: {
    processedOrganizations: 2341,
    qualifiedContacts: 12456,
    promotedLeads: 847,
    conversionRate: 6.8,
  },
  campaignDistribution: {
    draft: 5,
    pendingReview: 3,
    approved: 8,
    completed: 22,
    total: 38,
  },
};

export default function ExecutiveDashboardPage() {
  const [data, setData] = useState<ExecutiveSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setData(MOCK_EXECUTIVE_DATA);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: NSD_COLORS.surface, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <p style={{ color: NSD_COLORS.text.secondary }}>Loading executive summary...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: NSD_COLORS.surface, padding: '32px' }}>
        <p style={{ color: NSD_COLORS.text.secondary }}>Unable to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: NSD_COLORS.surface }}>
      {/* Gradient accent bar */}
      <div style={{ height: '4px', background: NSD_GRADIENTS.accentBar }} />
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '48px 64px' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <Link 
              href="/sales-engine" 
              style={{ 
                color: NSD_COLORS.text.muted, 
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '14px',
              }}
            >
              <Icon name="arrow-left" size={16} color={NSD_COLORS.text.muted} />
              Back to Campaigns
            </Link>
          </div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '32px', 
            fontWeight: 700, 
            color: NSD_COLORS.text.primary,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
          }}>
            Executive Dashboard
          </h1>
          <p style={{ 
            margin: '8px 0 0 0', 
            fontSize: '16px', 
            color: NSD_COLORS.text.secondary,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
          }}>
            System health, market opportunity, and operational performance at a glance
          </p>
        </div>

        {/* SECTION 1: System Health (Top) */}
        <div style={{ marginBottom: '32px' }}>
          <SectionHeader 
            title="System Health" 
            icon="chart"
            helpText="System Health indicates whether backend services are operating normally. A healthy status means all execution workflows are running without elevated error rates."
          />
          <SystemHealthCard health={data.systemHealth} />
        </div>

        {/* SECTION 2 & 3: Market Reality + Operational Yield (Side by Side) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '32px',
          marginBottom: '32px',
        }}>
          {/* Market Reality (Left) */}
          <div>
            <SectionHeader 
              title="Market Reality" 
              subtitle="Observed, not processed"
              icon="chart"
              helpText="Market Reality represents the total addressable opportunity in your target market. These are raw observations — organizations and contacts that exist regardless of whether we have engaged them."
            />
            <MarketRealityCard market={data.marketReality} />
            <HelperText>
              These numbers reflect what exists in the market, not what we have processed. Gaps between Market Reality and Operational Yield represent untapped opportunity.
            </HelperText>
          </div>

          {/* Operational Yield (Right) */}
          <div>
            <SectionHeader 
              title="Operational Yield" 
              subtitle="Processed subset of observed"
              icon="metrics"
              helpText="Operational Yield represents what we have actively processed from the market. This includes organizations we've evaluated, contacts we've qualified, and leads we've promoted for outreach."
            />
            <OperationalYieldCard yield_data={data.operationalYield} />
            <HelperText>
              A smaller yield than market size is expected. This reflects targeting precision and qualification criteria, not system failure.
            </HelperText>
          </div>
        </div>

        {/* SECTION 4: Campaign Distribution (Bottom) */}
        <div>
          <SectionHeader 
            title="Campaign Distribution" 
            icon="campaigns"
            helpText="Campaign Distribution shows how campaigns are distributed across governance states. This is administrative status (Draft, Pending Review, Approved) — separate from execution outcomes."
          />
          <CampaignDistributionCard distribution={data.campaignDistribution} />
        </div>
      </div>
    </div>
  );
}

function SystemHealthCard({ health }: { health: ExecutiveSummary['systemHealth'] }) {
  const statusColors = {
    healthy: { bg: NSD_COLORS.semantic.positive.bg, text: NSD_COLORS.semantic.positive.text, label: 'All Systems Operational' },
    degraded: { bg: NSD_COLORS.semantic.attention.bg, text: NSD_COLORS.semantic.attention.text, label: 'Partial Degradation' },
    unavailable: { bg: NSD_COLORS.semantic.critical.bg, text: NSD_COLORS.semantic.critical.text, label: 'Service Unavailable' },
  };
  
  const status = statusColors[health.status];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
      padding: '20px 24px',
      backgroundColor: NSD_COLORS.background,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${NSD_COLORS.border.light}`,
    }}>
      <div style={{
        padding: '8px 16px',
        backgroundColor: status.bg,
        borderRadius: NSD_RADIUS.md,
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: status.text }}>
          {status.label}
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', gap: '32px' }}>
        <MetricItem label="Active Workflows" value={health.activeWorkflows.toString()} />
        <MetricItem label="Error Rate" value={`${(health.errorRate * 100).toFixed(1)}%`} />
        <MetricItem label="Last Checked" value={formatTimeAgo(health.lastChecked)} />
      </div>
    </div>
  );
}

function MarketRealityCard({ market }: { market: ExecutiveSummary['marketReality'] }) {
  return (
    <div style={{
      padding: '24px',
      backgroundColor: NSD_COLORS.background,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${NSD_COLORS.border.light}`,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <LargeMetric label="Organizations" value={market.totalOrganizations.toLocaleString()} sublabel="Total in market" />
        <LargeMetric label="Contacts" value={market.totalContacts.toLocaleString()} sublabel="Total identified" />
      </div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <MetricItem label="Geographic Coverage" value={market.geographicCoverage.join(', ')} />
        <MetricItem label="Data Freshness" value={market.dataFreshness} />
      </div>
    </div>
  );
}

function OperationalYieldCard({ yield_data }: { yield_data: ExecutiveSummary['operationalYield'] }) {
  return (
    <div style={{
      padding: '24px',
      backgroundColor: NSD_COLORS.background,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${NSD_COLORS.border.light}`,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <LargeMetric label="Organizations" value={yield_data.processedOrganizations.toLocaleString()} sublabel="Processed" />
        <LargeMetric label="Contacts" value={yield_data.qualifiedContacts.toLocaleString()} sublabel="Qualified" />
      </div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <LargeMetric label="Promoted Leads" value={yield_data.promotedLeads.toLocaleString()} sublabel="Ready for outreach" />
        <LargeMetric label="Conversion Rate" value={`${yield_data.conversionRate.toFixed(1)}%`} sublabel="Contacts to leads" />
      </div>
    </div>
  );
}

function CampaignDistributionCard({ distribution }: { distribution: ExecutiveSummary['campaignDistribution'] }) {
  const segments = [
    { label: 'Draft', count: distribution.draft, color: NSD_COLORS.indigo.light },
    { label: 'Pending Review', count: distribution.pendingReview, color: NSD_COLORS.magenta.light },
    { label: 'Approved', count: distribution.approved, color: NSD_COLORS.violet.light },
    { label: 'Completed', count: distribution.completed, color: NSD_COLORS.violet.base },
  ];

  return (
    <div style={{
      padding: '24px',
      backgroundColor: NSD_COLORS.background,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${NSD_COLORS.border.light}`,
    }}>
      <div style={{ marginBottom: '20px' }}>
        <span style={{ fontSize: '32px', fontWeight: 700, color: NSD_COLORS.text.primary }}>
          {distribution.total}
        </span>
        <span style={{ fontSize: '14px', color: NSD_COLORS.text.muted, marginLeft: '8px' }}>
          Total Campaigns
        </span>
      </div>
      
      {/* Horizontal bar chart */}
      <div style={{ display: 'flex', height: '24px', borderRadius: NSD_RADIUS.md, overflow: 'hidden', marginBottom: '16px' }}>
        {segments.map((seg) => (
          <div 
            key={seg.label}
            style={{ 
              flex: seg.count / distribution.total, 
              backgroundColor: seg.color,
              minWidth: seg.count > 0 ? '4px' : '0',
            }} 
          />
        ))}
      </div>
      
      {/* Legend */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {segments.map((seg) => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: seg.color }} />
            <span style={{ fontSize: '13px', color: NSD_COLORS.text.secondary }}>
              {seg.label}: <strong>{seg.count}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', color: NSD_COLORS.text.primary, fontWeight: 500 }}>
        {value}
      </div>
    </div>
  );
}

function LargeMetric({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: NSD_COLORS.text.primary, lineHeight: 1.2 }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, marginTop: '2px' }}>
        {sublabel}
      </div>
    </div>
  );
}

function formatTimeAgo(isoString: string): string {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}
