/**
 * ThroughputIndicator Component
 * 
 * Displays observed average throughput from recent runs.
 * Helps operators build intuition about processing speed.
 * 
 * GOVERNANCE:
 * - Informational only, no guarantees implied
 * - Derived from completed runs only
 * - Clearly labeled as "observed average"
 * - No SLA or promises about completion time
 */

'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

export interface ThroughputStats {
  /** Average contacts processed per run */
  avgContactsPerRun: number;
  /** Average leads promoted per run */
  avgLeadsPerRun: number;
  /** Average run duration in seconds */
  avgDurationSeconds: number;
  /** Number of completed runs used for calculation */
  sampleSize: number;
}

export interface ThroughputIndicatorProps {
  /** Throughput statistics */
  stats: ThroughputStats | null;
  /** Estimated remaining runs (optional) */
  estimatedRemainingRuns?: number;
  /** Compact mode */
  compact?: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `~${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes < 60) return `~${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  return `~${hours}h ${minutes % 60}m`;
}

export function ThroughputIndicator({
  stats,
  estimatedRemainingRuns,
  compact = false,
}: ThroughputIndicatorProps) {
  // Don't render if no stats or insufficient sample
  if (!stats || stats.sampleSize < 1) {
    return null;
  }
  
  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.md,
        border: `1px solid ${NSD_COLORS.border.light}`,
        padding: compact ? '10px 12px' : '12px 16px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '10px',
        }}
      >
        <Icon name="chart" size={14} color={NSD_COLORS.text.muted} />
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: NSD_COLORS.text.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Observed Average
        </span>
        <span
          style={{
            fontSize: '10px',
            color: NSD_COLORS.text.muted,
            fontStyle: 'italic',
          }}
        >
          (from {stats.sampleSize} run{stats.sampleSize !== 1 ? 's' : ''})
        </span>
      </div>
      
      {/* Stats Grid */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: compact ? '12px' : '16px',
        }}
      >
        {stats.avgContactsPerRun > 0 && (
          <StatItem
            label="contacts/run"
            value={`~${Math.round(stats.avgContactsPerRun).toLocaleString()}`}
            compact={compact}
          />
        )}
        
        {stats.avgLeadsPerRun > 0 && (
          <StatItem
            label="leads/run"
            value={`~${Math.round(stats.avgLeadsPerRun).toLocaleString()}`}
            compact={compact}
          />
        )}
        
        {stats.avgDurationSeconds > 0 && (
          <StatItem
            label="runtime"
            value={formatDuration(stats.avgDurationSeconds)}
            compact={compact}
          />
        )}
      </div>
      
      {/* Estimated Remaining Runs */}
      {estimatedRemainingRuns !== undefined && estimatedRemainingRuns > 0 && (
        <div
          style={{
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: `1px solid ${NSD_COLORS.border.light}`,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: NSD_COLORS.text.secondary,
            }}
          >
            <span style={{ fontStyle: 'italic' }}>Estimated:</span>{' '}
            <span style={{ fontWeight: 500 }}>
              ~{estimatedRemainingRuns} more run{estimatedRemainingRuns !== 1 ? 's' : ''}
            </span>{' '}
            to complete processing
          </p>
        </div>
      )}
      
      {/* Disclaimer */}
      <p
        style={{
          margin: '8px 0 0 0',
          fontSize: '10px',
          color: NSD_COLORS.text.muted,
          fontStyle: 'italic',
        }}
      >
        Estimates based on recent activity. Actual results may vary.
      </p>
    </div>
  );
}

function StatItem({ 
  label, 
  value, 
  compact 
}: { 
  label: string; 
  value: string; 
  compact: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
      <span
        style={{
          fontSize: compact ? '13px' : '14px',
          fontWeight: 600,
          color: NSD_COLORS.primary,
          fontFamily: NSD_TYPOGRAPHY.fontDisplay,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: compact ? '11px' : '12px',
          color: NSD_COLORS.text.muted,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default ThroughputIndicator;
