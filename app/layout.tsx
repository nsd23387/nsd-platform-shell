/**
 * Root Layout
 * 
 * Provides global context and styles for the application.
 * Bootstrap context is initialized here via Providers.
 */

import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';

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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
