'use client';

import React from 'react';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { indigo } from '../../../../design/tokens/colors';
import { space, radius } from '../../../../design/tokens/spacing';

const shimmerKeyframes = `
@keyframes nsd-shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
}
`;

function ShimmerBlock({ width = '100%', height = 16, style }: { width?: string | number; height?: number; style?: React.CSSProperties }) {
  const tc = useThemeColors();
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius.md,
        background: `linear-gradient(90deg, ${tc.background.muted} 0%, ${indigo[50]} 50%, ${tc.background.muted} 100%)`,
        backgroundSize: '400px 100%',
        animation: 'nsd-shimmer 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

export function KPISkeleton({ count = 4 }: { count?: number }) {
  const tc = useThemeColors();
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`, gap: space['4'], marginBottom: space['6'] }}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              backgroundColor: tc.background.surface,
              border: `1px solid ${tc.border.default}`,
              borderRadius: radius.xl,
              padding: space['5'],
            }}
          >
            <ShimmerBlock width="40%" height={14} style={{ marginBottom: space['3'] }} />
            <ShimmerBlock width="60%" height={28} />
          </div>
        ))}
      </div>
    </>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  const tc = useThemeColors();
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div
        style={{
          backgroundColor: tc.background.surface,
          border: `1px solid ${tc.border.default}`,
          borderRadius: radius.xl,
          padding: space['5'],
          marginBottom: space['6'],
        }}
      >
        <ShimmerBlock width="30%" height={18} style={{ marginBottom: space['4'] }} />
        <ShimmerBlock width="100%" height={height} />
      </div>
    </>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  const tc = useThemeColors();
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div
        style={{
          backgroundColor: tc.background.surface,
          border: `1px solid ${tc.border.default}`,
          borderRadius: radius.xl,
          padding: space['5'],
          marginBottom: space['6'],
        }}
      >
        <ShimmerBlock width="25%" height={18} style={{ marginBottom: space['4'] }} />
        <div style={{ display: 'flex', gap: space['4'], marginBottom: space['3'] }}>
          <ShimmerBlock width="20%" height={14} />
          <ShimmerBlock width="15%" height={14} />
          <ShimmerBlock width="15%" height={14} />
          <ShimmerBlock width="20%" height={14} />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: space['4'], marginBottom: space['2'] }}>
            <ShimmerBlock width="20%" height={16} />
            <ShimmerBlock width="15%" height={16} />
            <ShimmerBlock width="15%" height={16} />
            <ShimmerBlock width="20%" height={16} />
          </div>
        ))}
      </div>
    </>
  );
}

export function DashboardSkeleton({ variant = 'executive' }: { variant?: 'executive' | 'operator' | 'engine' }) {
  if (variant === 'executive') {
    return (
      <>
        <KPISkeleton count={6} />
        <ChartSkeleton />
        <TableSkeleton />
      </>
    );
  }
  if (variant === 'operator') {
    return (
      <>
        <KPISkeleton count={8} />
        <ChartSkeleton />
        <ChartSkeleton height={200} />
        <TableSkeleton rows={8} />
      </>
    );
  }
  return (
    <>
      <KPISkeleton count={4} />
      <ChartSkeleton height={200} />
      <TableSkeleton rows={6} />
    </>
  );
}
