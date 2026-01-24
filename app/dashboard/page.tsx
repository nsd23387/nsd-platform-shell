/**
 * Dashboard Index Page
 * 
 * Redirects to Sales Engine Executive Dashboard by default.
 * 
 * Updated: Now redirects to the unified Sales Engine Executive Dashboard.
 */

'use client';

import { useEffect } from 'react';
import { text } from '../../design/tokens/colors';
import { fontFamily, fontSize } from '../../design/tokens/typography';

export default function DashboardIndex() {
  useEffect(() => {
    window.location.href = '/sales-engine/executive';
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        fontFamily: fontFamily.body,
        fontSize: fontSize.base,
        color: text.muted,
      }}
    >
      Redirecting to Executive Dashboard...
    </div>
  );
}
