'use client';

/**
 * Client-side Providers
 * 
 * Wraps the application with necessary context providers.
 * Bootstrap is initialized here and called exactly once on app load.
 */

import React from 'react';
import { BootstrapProvider, BootstrapGuard } from '../contexts/BootstrapContext';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <BootstrapProvider>
      <BootstrapGuard>
        {children}
      </BootstrapGuard>
    </BootstrapProvider>
  );
}
