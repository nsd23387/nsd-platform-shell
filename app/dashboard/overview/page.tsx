/**
 * Overview Dashboard (Milestone 7)
 * 
 * Read-only executive dashboard answering:
 * "Is the system alive, healthy, and moving?"
 * 
 * GOVERNANCE:
 * - Read-only: No mutations, no admin actions
 * - No client-side calculations: All metrics from API
 * - Safe empty states: Zero is valid, errors are explicit
 * - RBAC enforced: Section visibility based on role
 * 
 * Sections:
 * 1. System Pulse - Vital signs (all roles)
 * 2. Throughput - Events over time (admin/exec/operator only)
 * 3. Latency/SLA - Time to action (admin/exec/operator only)
 * 4. Trends - 7-day activity (admin/exec/operator only)
 */

'use client';

import React from 'react';
import { useOverviewDashboard } from '../../../hooks/useActivitySpine';
import { 
  DashboardGuard, 
  OverviewSectionGuard,
  useOverviewSectionAccess,
} from '../../../hooks/useRBAC';
import {
  DashboardSection,
  DashboardGrid,
  DashboardCard,
  MetricCard,
} from '../../../components/dashboard';

// ============================================
// Main Component
// ============================================

export default function OverviewDashboard() {
  const { data, loading, error, refetch } = useOverviewDashboard();
  const { canViewThroughput, canViewLatency, canViewTrend } = useOverviewSectionAccess();
  
  // Compute last updated from any available timestamp
  const lastUpdated = data?.systemPulse?.computedAt 
    ? formatLastUpdated(data.systemPulse.computedAt)
    : undefined;

  return (
    <DashboardGuard dashboard="overview" fallback={<AccessDenied />}>
      <div>
        {/* Header - Simple, no period selector per spec */}
        <OverviewHeader lastUpdated={lastUpdated} onRefresh={refetch} />

        {/* System Pulse - Always visible (all roles) */}
        <OverviewSectionGuard section="systemPulse">
          <SystemPulseSection
            data={data?.systemPulse}
            loading={loading}
            error={error}
            onRetry={refetch}
          />
        </OverviewSectionGuard>

        {/* Throughput - Admin/Executive/Operator only */}
        {canViewThroughput && (
          <OverviewSectionGuard section="throughput">
            <ThroughputSection
              data={data?.throughput}
              loading={loading}
              error={error}
              onRetry={refetch}
            />
          </OverviewSectionGuard>
        )}

        {/* Latency / SLA - Admin/Executive/Operator only */}
        {canViewLatency && (
          <OverviewSectionGuard section="latency">
            <LatencySection
              data={data?.latency}
              loading={loading}
              error={error}
              onRetry={refetch}
            />
          </OverviewSectionGuard>
        )}

        {/* Trends - Admin/Executive/Operator only */}
        {canViewTrend && (
          <OverviewSectionGuard section="trend">
            <TrendSection
              data={data?.trend}
              loading={loading}
              error={error}
              onRetry={refetch}
            />
          </OverviewSectionGuard>
        )}

        {/* Empty State - Show when system is live but no activity */}
        {!loading && !error && data && isSystemEmpty(data) && (
          <EmptySystemState />
        )}
      </div>
    </DashboardGuard>
  );
}

// ============================================
// Header Component
// ============================================

interface OverviewHeaderProps {
  lastUpdated?: string;
  onRefresh: () => void;
}

function OverviewHeader({ lastUpdated, onRefresh }: OverviewHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '32px',
        paddingBottom: '24px',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <div>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '4px',
          }}
        >
          NSD Platform — Overview
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Is the system alive, healthy, and moving?
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {lastUpdated && (
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
            Last updated: {lastUpdated}
          </span>
        )}
        <button
          onClick={onRefresh}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: '#ffffff',
            color: '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

// ============================================
// System Pulse Section
// ============================================

interface SystemPulseSectionProps {
  data?: {
    totalEvents24h: number;
    activeOrganizations7d: number;
    activeUsers7d: number;
    errors24h: number;
  };
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function SystemPulseSection({ data, loading, error, onRetry }: SystemPulseSectionProps) {
  return (
    <DashboardSection 
      title="System Pulse" 
      description="At-a-glance vital signs"
    >
      <DashboardGrid columns={4}>
        <MetricCard
          title="Total Events"
          value={data?.totalEvents24h ?? 0}
          subtitle="Last 24 hours"
          loading={loading}
          error={error}
          onRetry={onRetry}
          timeWindow="24h"
        />
        <MetricCard
          title="Active Organizations"
          value={data?.activeOrganizations7d ?? 0}
          subtitle="Last 7 days"
          loading={loading}
          error={error}
          onRetry={onRetry}
          timeWindow="7d"
        />
        <MetricCard
          title="Active Users"
          value={data?.activeUsers7d ?? 0}
          subtitle="Last 7 days"
          loading={loading}
          error={error}
          onRetry={onRetry}
          timeWindow="7d"
        />
        <MetricCard
          title="Errors"
          value={data?.errors24h ?? 0}
          subtitle="Last 24 hours"
          loading={loading}
          error={error}
          onRetry={onRetry}
          timeWindow="24h"
          variant={data?.errors24h && data.errors24h > 0 ? 'danger' : 'success'}
        />
      </DashboardGrid>
    </DashboardSection>
  );
}

// ============================================
// Throughput Section
// ============================================

interface ThroughputSectionProps {
  data?: {
    buckets: Array<{ timestamp: string; count: number }>;
    byEntityType: Record<string, number>;
    totalEvents: number;
    window: '24h' | '7d';
  };
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function ThroughputSection({ data, loading, error, onRetry }: ThroughputSectionProps) {
  return (
    <DashboardSection 
      title="Throughput" 
      description="Volume and distribution of system activity"
    >
      <DashboardGrid columns={2}>
        {/* Events Over Time Chart */}
        <DashboardCard
          title="Events Over Time"
          loading={loading}
          error={error}
          onRetry={onRetry}
          timeWindow="24h"
        >
          {data?.buckets && data.buckets.length > 0 ? (
            <ThroughputChart buckets={data.buckets} />
          ) : (
            <div style={{ 
              height: '120px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: '14px',
            }}>
              No activity yet
            </div>
          )}
        </DashboardCard>

        {/* Entity Type Breakdown */}
        <DashboardCard
          title="Events by Entity Type"
          loading={loading}
          error={error}
          onRetry={onRetry}
          timeWindow="24h"
        >
          {data?.byEntityType && Object.keys(data.byEntityType).length > 0 ? (
            <EntityTypeBreakdown distribution={data.byEntityType} />
          ) : (
            <div style={{ 
              height: '120px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: '14px',
            }}>
              No activity yet
            </div>
          )}
        </DashboardCard>
      </DashboardGrid>
    </DashboardSection>
  );
}

// ============================================
// Latency / SLA Section
// ============================================

interface LatencySectionProps {
  data?: {
    avgTimeToFirstActivityMinutes: number | null;
    p95TimeToFirstActivityMinutes: number | null;
    stalledEntities: number;
    totalEvaluated: number;
  };
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function LatencySection({ data, loading, error, onRetry }: LatencySectionProps) {
  const hasLatencyData = data && data.totalEvaluated > 0;
  
  return (
    <DashboardSection 
      title="Latency / SLA" 
      description="Time to first activity and operational delays"
    >
      <DashboardGrid columns={3}>
        <MetricCard
          title="Avg Time to First Activity"
          value={hasLatencyData && data.avgTimeToFirstActivityMinutes !== null
            ? formatDuration(data.avgTimeToFirstActivityMinutes)
            : '—'}
          subtitle="Mean time to follow-up"
          loading={loading}
          error={error}
          onRetry={onRetry}
          empty={!hasLatencyData}
          emptyMessage="No latency data yet"
        />
        <MetricCard
          title="P95 Latency"
          value={hasLatencyData && data.p95TimeToFirstActivityMinutes !== null
            ? formatDuration(data.p95TimeToFirstActivityMinutes)
            : '—'}
          subtitle="95th percentile"
          loading={loading}
          error={error}
          onRetry={onRetry}
          empty={!hasLatencyData}
          emptyMessage="No latency data yet"
        />
        <MetricCard
          title="Stalled Entities"
          value={data?.stalledEntities ?? 0}
          subtitle="No follow-up within 24h"
          loading={loading}
          error={error}
          onRetry={onRetry}
          variant={data?.stalledEntities && data.stalledEntities > 0 ? 'warning' : 'success'}
        />
      </DashboardGrid>
    </DashboardSection>
  );
}

// ============================================
// Trend Section
// ============================================

interface TrendSectionProps {
  data?: {
    dataPoints: Array<{ date: string; count: number }>;
    direction: 'up' | 'down' | 'flat';
    changePercent: number | null;
  };
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function TrendSection({ data, loading, error, onRetry }: TrendSectionProps) {
  return (
    <DashboardSection 
      title="7-Day Activity Trend" 
      description="Directional movement of system activity"
    >
      <DashboardCard
        title="Daily Event Count"
        loading={loading}
        error={error}
        onRetry={onRetry}
        timeWindow="7d"
        trend={data ? {
          direction: data.direction,
          value: data.changePercent !== null 
            ? `${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(1)}%`
            : 'N/A',
        } : undefined}
      >
        {data?.dataPoints && data.dataPoints.length > 0 ? (
          <TrendChart dataPoints={data.dataPoints} />
        ) : (
          <div style={{ 
            height: '120px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#9ca3af',
            fontSize: '14px',
          }}>
            No activity yet
          </div>
        )}
      </DashboardCard>
    </DashboardSection>
  );
}

// ============================================
// Chart Components (Simple, Read-Only)
// ============================================

interface ThroughputChartProps {
  buckets: Array<{ timestamp: string; count: number }>;
}

function ThroughputChart({ buckets }: ThroughputChartProps) {
  const maxCount = Math.max(...buckets.map(b => b.count), 1);
  
  return (
    <div style={{ height: '120px', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
      {buckets.map((bucket, index) => (
        <div
          key={index}
          style={{
            flex: 1,
            backgroundColor: '#3b82f6',
            borderRadius: '2px 2px 0 0',
            height: `${Math.max((bucket.count / maxCount) * 100, 2)}%`,
            minHeight: '2px',
          }}
          title={`${formatTimestamp(bucket.timestamp)}: ${bucket.count} events`}
        />
      ))}
    </div>
  );
}

interface EntityTypeBreakdownProps {
  distribution: Record<string, number>;
}

function EntityTypeBreakdown({ distribution }: EntityTypeBreakdownProps) {
  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {entries.slice(0, 5).map(([entityType, count], index) => (
        <div key={entityType} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '2px',
              backgroundColor: colors[index % colors.length],
            }}
          />
          <span style={{ flex: 1, fontSize: '13px', color: '#374151' }}>
            {entityType}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
            {count}
          </span>
          <span style={{ fontSize: '12px', color: '#9ca3af', width: '40px', textAlign: 'right' }}>
            {total > 0 ? `${((count / total) * 100).toFixed(0)}%` : '0%'}
          </span>
        </div>
      ))}
      {entries.length > 5 && (
        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
          +{entries.length - 5} more
        </div>
      )}
    </div>
  );
}

interface TrendChartProps {
  dataPoints: Array<{ date: string; count: number }>;
}

function TrendChart({ dataPoints }: TrendChartProps) {
  const maxCount = Math.max(...dataPoints.map(d => d.count), 1);
  
  return (
    <div style={{ height: '120px', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
      {dataPoints.map((point, index) => (
        <div
          key={index}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <div
            style={{
              width: '100%',
              backgroundColor: '#3b82f6',
              borderRadius: '4px 4px 0 0',
              height: `${Math.max((point.count / maxCount) * 80, 4)}px`,
              minHeight: '4px',
            }}
            title={`${point.date}: ${point.count} events`}
          />
          <span style={{ fontSize: '10px', color: '#9ca3af' }}>
            {formatDateShort(point.date)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Empty & Error States
// ============================================

function EmptySystemState() {
  return (
    <div
      style={{
        backgroundColor: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '8px',
        padding: '24px',
        textAlign: 'center',
        marginTop: '32px',
      }}
    >
      <span style={{ fontSize: '32px', marginBottom: '12px', display: 'block' }}>
        ✅
      </span>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0369a1', marginBottom: '8px' }}>
        The system is live, but no activity has occurred yet.
      </h3>
      <p style={{ fontSize: '14px', color: '#0284c7' }}>
        Activity will appear here once events are recorded.
      </p>
    </div>
  );
}

function AccessDenied() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        color: '#6b7280',
      }}
    >
      <span style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</span>
      <h2 style={{ fontSize: '20px', color: '#374151', marginBottom: '8px' }}>
        Access Denied
      </h2>
      <p>You do not have permission to view this dashboard.</p>
    </div>
  );
}

// ============================================
// Utility Functions
// ============================================

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

function formatLastUpdated(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString();
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 2);
}

function isSystemEmpty(data: {
  systemPulse: { totalEvents24h: number };
  throughput: { totalEvents: number };
}): boolean {
  return data.systemPulse.totalEvents24h === 0 && data.throughput.totalEvents === 0;
}
