/**
 * Root Layout
 * 
 * Provides global context and styles for the application.
 * Bootstrap context is initialized here via Providers.
 * 
 * Font System:
 * - Poppins: Primary font for headings and display text
 * - Inter: Secondary font for body text, labels, and UI elements
 */

import './globals.css';
import type { Metadata } from 'next';
import { Poppins, Inter } from 'next/font/google';
import { Providers } from './providers';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-poppins',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

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
    <html lang="en" className={`${poppins.variable} ${inter.variable}`}>
      <body style={{ fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
