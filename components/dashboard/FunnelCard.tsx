/**
 * FunnelCard Component
 * 
 * Card for displaying funnel conversion data.
 * Read-only visualization of conversion stages.
 */

import React from 'react';
import { DashboardCard, DashboardCardProps } from './DashboardCard';
import type { FunnelStage } from '../../types/activity-spine';

export interface FunnelCardProps extends Omit<DashboardCardProps, 'value' | 'children'> {
  stages: FunnelStage[];
  overallConversion?: number;
}

export function FunnelCard({
  stages,
  overallConversion,
  ...props
}: FunnelCardProps) {
  const maxCount = Math.max(...stages.map((s) => s.count));

  return (
    <DashboardCard {...props}>
      {overallConversion !== undefined && (
        <div
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '16px',
          }}
        >
          {(overallConversion * 100).toFixed(1)}%
          <span
            style={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#6b7280',
              marginLeft: '8px',
            }}
          >
            overall conversion
          </span>
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {stages.map((stage, index) => {
          const widthPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
          const isLast = index === stages.length - 1;

          return (
            <div key={stage.stage}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                  fontSize: '13px',
                }}
              >
                <span style={{ color: '#374151', fontWeight: 500 }}>
                  {stage.stage}
                </span>
                <span style={{ color: '#6b7280' }}>
                  {stage.count.toLocaleString()}
                  {!isLast && stage.dropOffRate > 0 && (
                    <span style={{ color: '#ef4444', marginLeft: '8px' }}>
                      ↓ {(stage.dropOffRate * 100).toFixed(1)}%
                    </span>
                  )}
                </span>
              </div>
              <div
                style={{
                  height: '24px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${widthPercent}%`,
                    backgroundColor: '#3b82f6',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '8px',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 500,
                    minWidth: widthPercent > 20 ? 'auto' : '0',
                  }}
                >
                  {widthPercent > 20 && `${(stage.conversionRate * 100).toFixed(0)}%`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
