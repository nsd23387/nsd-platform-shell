/**
 * DashboardGrid Component
 * 
 * Grid layout for dashboard cards.
 * Responsive design for different screen sizes.
 */

import React from 'react';

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
        gap: '24px',
        marginBottom: '24px',
      }}
    >
      {children}
    </div>
  );
}
