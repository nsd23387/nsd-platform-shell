/**
 * FunnelCard Component
 * 
 * Card for displaying funnel conversion data.
 * Read-only visualization of conversion stages.
 * 
 * Updated to use design system tokens.
 */

import React from 'react';
import { DashboardCard, DashboardCardProps } from './DashboardCard';
import type { FunnelStage } from '../../types/activity-spine';
import { text, background, semantic, violet } from '../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../design/tokens/typography';
import { space, radius, duration, easing, componentSpacing } from '../../design/tokens/spacing';

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
            fontFamily: fontFamily.body,
            fontSize: fontSize['3xl'],
            fontWeight: fontWeight.semibold,
            color: text.primary,
            marginBottom: space['4'],
          }}
        >
          {(overallConversion * 100).toFixed(1)}%
          <span
            style={{
              fontSize: fontSize.base,
              fontWeight: fontWeight.normal,
              color: text.muted,
              marginLeft: space['2'],
            }}
          >
            overall conversion
          </span>
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: space['2'] }}>
        {stages.map((stage, index) => {
          const widthPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
          const isLast = index === stages.length - 1;

          return (
            <div key={stage.stage}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: space['1'],
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.md,
                }}
              >
                <span style={{ color: text.secondary, fontWeight: fontWeight.medium }}>
                  {stage.stage}
                </span>
                <span style={{ color: text.muted }}>
                  {stage.count.toLocaleString()}
                  {!isLast && stage.dropOffRate > 0 && (
                    <span style={{ color: semantic.danger.base, marginLeft: space['2'] }}>
                      ↓ {(stage.dropOffRate * 100).toFixed(1)}%
                    </span>
                  )}
                </span>
              </div>
              {/* Funnel bar - normalized height */}
              <div
                style={{
                  height: componentSpacing.progressBarHeightLg,
                  backgroundColor: background.muted,
                  borderRadius: radius.DEFAULT,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${widthPercent}%`,
                    backgroundColor: violet[500],
                    borderRadius: radius.DEFAULT,
                    transition: `width ${duration.slow} ${easing.DEFAULT}`,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: space['2'],
                    color: text.inverse,
                    fontFamily: fontFamily.body,
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.medium,
                    minWidth: widthPercent > 20 ? 'auto' : '0',
                    opacity: 0.9,
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
