'use client';

import React from 'react';
import { BootstrapProvider, BootstrapGuard } from '../contexts/BootstrapContext';
import { ThemeProvider } from '../contexts/ThemeContext';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <BootstrapProvider>
        <BootstrapGuard>
          {children}
        </BootstrapGuard>
      </BootstrapProvider>
    </ThemeProvider>
  );
}
