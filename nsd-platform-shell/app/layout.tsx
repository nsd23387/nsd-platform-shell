import type { Metadata } from 'next';
import './globals.css';
import { AuthGuard } from '@/components/AuthGuard';

export const metadata: Metadata = {
  title: 'NSD Platform Shell',
  description: 'Unified internal platform UI for NSD Business Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
