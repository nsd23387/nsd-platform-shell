/**
 * Dashboard Index Page
 * 
 * Redirects to Executive Dashboard by default.
 */

'use client';

import { useEffect } from 'react';

export default function DashboardIndex() {
  useEffect(() => {
    window.location.href = '/dashboard/executive';
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
      Redirecting to Executive Dashboard...
    </div>
  );
}
