/**
 * DashboardGrid Component
 * 
 * Grid layout for dashboard cards.
 * Responsive design for different screen sizes.
 * 
 * Updated to use design system tokens.
 */

import React from 'react';
import { space } from '../../design/tokens/spacing';

export interface DashboardGridProps {
  columns?: 2 | 3 | 4;
  children: React.ReactNode;
}

export function DashboardGrid({ columns = 3, children }: DashboardGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: space['6'],
        marginBottom: space['6'],
      }}
    >
      {children}
    </div>
  );
}
