'use client';

import React from 'react';
import { space } from '../../design/tokens/spacing';

export interface DashboardGridProps {
  columns?: number | { sm?: number; md?: number; lg?: number };
  children: React.ReactNode;
  gap?: string;
}

export function DashboardGrid({ columns = 3, children, gap = space['6'] }: DashboardGridProps) {
  const isResponsive = typeof columns === 'object';
  const sm = isResponsive ? (columns.sm ?? 1) : 1;
  const md = isResponsive ? (columns.md ?? 2) : Math.min(typeof columns === 'number' ? columns : 2, 2);
  const lg = isResponsive ? (columns.lg ?? 3) : (typeof columns === 'number' ? columns : 3);

  const gridId = `dg-${sm}-${md}-${lg}`;

  return (
    <>
      <style>{`
        .${gridId} {
          display: grid;
          grid-template-columns: repeat(${sm}, 1fr);
          gap: ${gap};
          margin-bottom: ${space['6']};
        }
        @media (min-width: 640px) {
          .${gridId} { grid-template-columns: repeat(${md}, 1fr); }
        }
        @media (min-width: 1024px) {
          .${gridId} { grid-template-columns: repeat(${lg}, 1fr); }
        }
      `}</style>
      <div className={gridId}>
        {children}
      </div>
    </>
  );
}
