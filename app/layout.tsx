/**
 * Root Layout
 * 
 * Provides global context and styles for the application.
 * Bootstrap context is initialized here via Providers.
 */

import './globals.css';
import type { Metadata } from 'next';
import { Fira_Code, Fira_Sans, Inter } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const firaSans = Fira_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fira-sans',
  display: 'swap',
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-fira-code',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NSD Command Center',
  description: 'Sales Engine Campaign Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${firaSans.variable} ${firaCode.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
