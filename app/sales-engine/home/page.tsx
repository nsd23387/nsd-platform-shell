'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy Sales Engine Home page - now redirects to Executive Dashboard
 * The Executive Dashboard at /sales-engine/executive is the new unified view
 */
export default function SalesEngineHomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/sales-engine/executive');
  }, [router]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#FFFFFF', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: 48, 
          height: 48, 
          border: '3px solid #E5E7EB', 
          borderTopColor: '#020F5A', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite', 
          margin: '0 auto 16px' 
        }} />
        <p style={{ color: '#6B7280', fontSize: '14px' }}>Redirecting to Executive Dashboard...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
