'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NSD_COLORS } from '../lib/design-tokens';

export default function MonitoringPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/sales-engine?filter=RUNNING');
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: NSD_COLORS.surface,
      }}
    >
      <p style={{ color: NSD_COLORS.text.secondary, fontSize: '14px' }}>Redirecting to campaigns...</p>
    </div>
  );
}
