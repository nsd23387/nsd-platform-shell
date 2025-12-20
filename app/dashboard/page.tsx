/**
 * Dashboard Index Page
 * 
 * Redirects to Overview Dashboard by default (Milestone 7).
 */

'use client';

import { useEffect } from 'react';

export default function DashboardIndex() {
  useEffect(() => {
    window.location.href = '/dashboard/overview';
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        color: '#6b7280',
      }}
    >
      Redirecting to Overview Dashboard...
    </div>
  );
}
