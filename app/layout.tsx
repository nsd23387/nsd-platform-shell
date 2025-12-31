/**
 * Root Layout
 * 
 * Provides global context and styles for the application.
 * Bootstrap context is initialized here via Providers.
 * 
 * M67.9-01: Includes VercelReadOnlyBanner for read-only mode indication.
 * SECURITY NOTE: No authentication - access controlled via Vercel Password Protection.
 */

import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { VercelReadOnlyBanner } from './sales-engine/components/VercelReadOnlyBanner';

export const metadata: Metadata = {
  title: 'NSD Command Center',
  description: 'Read-only analytics dashboards powered by Activity Spine',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <VercelReadOnlyBanner />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
