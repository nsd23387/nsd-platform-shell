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
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    // In production, this would fetch from /api/proxy/executive-summary
    // For now, using mock data to demonstrate the layout
    setData(MOCK_EXECUTIVE_DATA);
    setLoading(false);
  }, []);

  const handleRefresh = () => {
    setLastRefresh(new Date());
    // In production, this would refetch data
  };

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: NSD_COLORS.text.muted }}>
                Last refresh: {formatTimeAgo(lastRefresh.toISOString())}
              </span>
              <button
                onClick={handleRefresh}
                style={{
                  padding: '8px 16px',
                  backgroundColor: NSD_COLORS.background,
                  border: `1px solid ${NSD_COLORS.border.default}`,
                  borderRadius: NSD_RADIUS.md,
                  fontSize: '14px',
                  color: NSD_COLORS.text.primary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Icon name="refresh" size={14} color={NSD_COLORS.text.secondary} />
                Refresh
              </button>
            </div>
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
            fontSize: '15px', 
            color: NSD_COLORS.text.secondary 
          }}>
            Read-only metrics overview • No execution controls
          </p>
        </div>

        {/* System Health Banner */}
        <SystemHealthBanner health={data.systemHealth} />

        {/* Main Grid: Market Reality + Operational Yield */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '24px', 
          marginBottom: '24px' 
        }}>
          {/* Market Reality */}
          <div>
            <SectionLabel>Market Reality</SectionLabel>
            <p style={{ fontSize: '13px', color: NSD_COLORS.text.muted, margin: '4px 0 16px 0' }}>
              What exists in the market (observed, not processed)
            </p>
            <MarketRealityCard market={data.marketReality} />
          </div>

          {/* Operational Yield */}
          <div>
            <SectionLabel>Operational Yield</SectionLabel>
            <p style={{ fontSize: '13px', color: NSD_COLORS.text.muted, margin: '4px 0 16px 0' }}>
              What we have processed and converted
            </p>
            <OperationalYieldCard yield_data={data.operationalYield} />
          </div>
        </div>

        {/* Campaign Distribution */}
        <div>
          <SectionLabel>Campaign Distribution</SectionLabel>
          <p style={{ fontSize: '13px', color: NSD_COLORS.text.muted, margin: '4px 0 16px 0' }}>
            Current state of all campaigns by governance status
          </p>
          <CampaignDistributionCard distribution={data.campaignDistribution} />
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      margin: 0,
      fontSize: '18px',
      fontWeight: 600,
      color: NSD_COLORS.text.primary,
    }}>
      {children}
    </h2>
  );
}

function SystemHealthBanner({ health }: { health: ExecutiveSummary['systemHealth'] }) {
  const statusConfig = {
    healthy: { 
      bg: NSD_COLORS.background, 
      border: NSD_COLORS.violet.base,
      text: NSD_COLORS.violet.dark,
      label: 'System Healthy',
      icon: 'check' as const,
    },
    degraded: { 
      bg: NSD_COLORS.background, 
      border: NSD_COLORS.magenta.base,
      text: NSD_COLORS.magenta.dark,
      label: 'System Degraded',
      icon: 'warning' as const,
    },
    unavailable: { 
      bg: NSD_COLORS.background, 
      border: NSD_COLORS.magenta.dark,
      text: NSD_COLORS.magenta.dark,
      label: 'System Unavailable',
      icon: 'warning' as const,
    },
  };

  const config = statusConfig[health.status];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 24px',
      backgroundColor: config.bg,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${NSD_COLORS.border.light}`,
      borderLeft: `4px solid ${config.border}`,
      marginBottom: '32px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: `${config.border}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon name={config.icon} size={18} color={config.border} />
        </div>
        <div>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            color: config.text,
          }}>
            {config.label}
          </div>
          <div style={{ fontSize: '13px', color: NSD_COLORS.text.muted }}>
            Last checked: {formatTimeAgo(health.lastChecked)}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '32px' }}>
        <MetricItem label="Active Workflows" value={health.activeWorkflows.toString()} />
        <MetricItem label="Error Rate (24h)" value={`${(health.errorRate * 100).toFixed(1)}%`} />
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
      <div style={{ 
        display: 'flex', 
        gap: '24px', 
        paddingTop: '16px',
        borderTop: `1px solid ${NSD_COLORS.border.light}`,
      }}>
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
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '20px',
        paddingTop: '16px',
        borderTop: `1px solid ${NSD_COLORS.border.light}`,
      }}>
        <LargeMetric label="Promoted Leads" value={yield_data.promotedLeads.toLocaleString()} sublabel="Ready for outreach" />
        <LargeMetric label="Conversion Rate" value={`${yield_data.conversionRate.toFixed(1)}%`} sublabel="Contacts → Leads" />
      </div>
    </div>
  );
}

function CampaignDistributionCard({ distribution }: { distribution: ExecutiveSummary['campaignDistribution'] }) {
  const segments = [
    { label: 'Draft', count: distribution.draft, color: NSD_COLORS.indigo.base },
    { label: 'Pending Review', count: distribution.pendingReview, color: NSD_COLORS.magenta.base },
    { label: 'Approved', count: distribution.approved, color: NSD_COLORS.violet.base },
    { label: 'Completed', count: distribution.completed, color: NSD_COLORS.violet.dark },
  ];

  return (
    <div style={{
      padding: '24px',
      backgroundColor: NSD_COLORS.background,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${NSD_COLORS.border.light}`,
    }}>
      {/* Total */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', color: NSD_COLORS.text.muted, marginBottom: '4px' }}>
          Total Campaigns
        </div>
        <div style={{ fontSize: '36px', fontWeight: 700, color: NSD_COLORS.text.primary }}>
          {distribution.total}
        </div>
      </div>

      {/* Distribution Bar */}
      <div style={{
        height: '12px',
        borderRadius: '6px',
        overflow: 'hidden',
        display: 'flex',
        backgroundColor: NSD_COLORS.border.light,
        marginBottom: '16px',
      }}>
        {segments.map((seg, idx) => (
          <div
            key={seg.label}
            style={{
              width: distribution.total > 0 ? `${(seg.count / distribution.total) * 100}%` : '0%',
              height: '100%',
              backgroundColor: seg.color,
              transition: 'width 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {segments.map((seg) => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              backgroundColor: seg.color,
            }} />
            <span style={{ fontSize: '14px', color: NSD_COLORS.text.secondary }}>
              {seg.label}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
              {seg.count}
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
