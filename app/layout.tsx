/**
 * Root Layout
 * 
 * Provides global context and styles for the application.
 */

import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NSD Platform Shell - Dashboards',
  description: 'Read-only analytics dashboards powered by Activity Spine',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
