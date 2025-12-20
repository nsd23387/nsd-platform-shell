/**
 * DashboardSection Component
 * 
 * Groups related cards with a section title.
 */

import React from 'react';

export interface DashboardSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function DashboardSection({ title, description, children }: DashboardSectionProps) {
  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '4px',
          }}
        >
          {title}
        </h2>
        {description && (
          <p style={{ fontSize: '14px', color: '#6b7280' }}>{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
