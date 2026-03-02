'use client';

import React from 'react';
import { useThemeColors } from '../../hooks/useThemeColors';
import { radius, space } from '../../design/tokens/spacing';

interface SkeletonCardProps {
  height?: number;
  lines?: number;
}

export function SkeletonCard({ height, lines = 3 }: SkeletonCardProps) {
  const tc = useThemeColors();

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton-bar {
          background: linear-gradient(90deg, ${tc.background.muted} 25%, ${tc.background.active} 50%, ${tc.background.muted} 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
          border-radius: 0.375rem;
        }
      `}</style>
      <div
        style={{
          backgroundColor: tc.background.surface,
          border: `1px solid ${tc.border.default}`,
          borderRadius: radius.xl,
          padding: space['6'],
          height: height ? `${height}px` : 'auto',
        }}
        data-testid="skeleton-card"
      >
        <div className="skeleton-bar" style={{ width: '40%', height: 16, marginBottom: 16 }} />
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton-bar"
            style={{
              width: `${80 - i * 15}%`,
              height: 12,
              marginBottom: i < lines - 1 ? 10 : 0,
            }}
          />
        ))}
      </div>
    </>
  );
}
