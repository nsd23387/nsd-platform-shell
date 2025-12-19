/**
 * SLACard Component
 * 
 * Specialized card for displaying SLA compliance metrics.
 * Read-only with visual compliance indicator.
 */

import React from 'react';
import { DashboardCard, DashboardCardProps } from './DashboardCard';

export interface SLACardProps extends Omit<DashboardCardProps, 'value' | 'children'> {
  complianceRate: number;
  breaches: number;
  total: number;
  targetLabel?: string;
}

function getComplianceColor(rate: number): string {
  if (rate >= 0.95) return '#22c55e'; // green
  if (rate >= 0.85) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

function getComplianceVariant(rate: number): 'success' | 'warning' | 'danger' {
  if (rate >= 0.95) return 'success';
  if (rate >= 0.85) return 'warning';
  return 'danger';
}

export function SLACard({
  complianceRate,
  breaches,
  total,
  targetLabel = 'SLA Target',
  ...props
}: SLACardProps) {
  const percentageDisplay = `${(complianceRate * 100).toFixed(1)}%`;
  const color = getComplianceColor(complianceRate);
  const variant = getComplianceVariant(complianceRate);

  return (
    <DashboardCard {...props} variant={variant}>
      <div
        style={{
          fontSize: '36px',
          fontWeight: 700,
          color: color,
          marginBottom: '8px',
        }}
      >
        {percentageDisplay}
      </div>
      
      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
        {targetLabel}
      </div>

      {/* Compliance bar */}
      <div
        style={{
          height: '8px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${complianceRate * 100}%`,
            backgroundColor: color,
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '13px',
          color: '#6b7280',
        }}
      >
        <span>
          <strong style={{ color: '#374151' }}>{total - breaches}</strong> compliant
        </span>
        <span>
          <strong style={{ color: '#ef4444' }}>{breaches}</strong> breaches
        </span>
      </div>
    </DashboardCard>
  );
}
