'use client';

import { NSD_COLORS, NSD_RADIUS, NSD_SHADOWS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: string;
  color?: string;
  trend?: { value: number; direction: 'up' | 'down' };
  size?: 'sm' | 'md' | 'lg';
}

export function StatCard({ label, value, icon, color, trend, size = 'md' }: StatCardProps) {
  const sizeStyles = {
    sm: { padding: '16px', valueSize: '24px', labelSize: '11px' },
    md: { padding: '20px', valueSize: '32px', labelSize: '12px' },
    lg: { padding: '24px', valueSize: '40px', labelSize: '13px' },
  };
  
  const styles = sizeStyles[size];
  const displayColor = color || NSD_COLORS.primary;
  
  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        padding: styles.padding,
        boxShadow: NSD_SHADOWS.sm,
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        {icon && <Icon name={icon as any} size={16} color={displayColor} />}
        <span
          style={{
            fontSize: styles.labelSize,
            color: NSD_COLORS.text.secondary,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span
          style={{
            fontSize: styles.valueSize,
            fontWeight: 700,
            color: displayColor,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
          }}
        >
          {value}
        </span>
        {trend && (
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: trend.direction === 'up' ? NSD_COLORS.success : NSD_COLORS.error,
            }}
          >
            {trend.direction === 'up' ? '+' : '-'}{Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </div>
  );
}
