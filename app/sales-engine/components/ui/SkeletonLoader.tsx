'use client';

import { NSD_COLORS, NSD_RADIUS, NSD_GRADIENTS, NSD_SPACING } from '../../lib/design-tokens';

interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export function SkeletonLoader({
  width = '100%',
  height = '20px',
  borderRadius = NSD_RADIUS.md,
  style,
}: SkeletonLoaderProps) {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: NSD_COLORS.border.light,
        borderRadius,
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: NSD_GRADIENTS.shimmer,
          animation: 'shimmer 1.5s infinite',
        }}
      />
      <style>{`
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}

export function SkeletonRow({ columns = 4 }: { columns?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: NSD_SPACING.md,
        padding: NSD_SPACING.md,
        borderBottom: `1px solid ${NSD_COLORS.border.light}`,
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonLoader key={i} height="16px" width={i === 0 ? '80%' : '60%'} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.xl,
        border: `1px solid ${NSD_COLORS.border.light}`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: NSD_SPACING.md,
          padding: NSD_SPACING.md,
          backgroundColor: NSD_COLORS.surface,
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLoader key={i} height="12px" width="50%" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} columns={columns} />
      ))}
    </div>
  );
}

export default SkeletonLoader;
