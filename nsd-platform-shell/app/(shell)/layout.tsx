/**
 * Shell Layout
 * 
 * Layout for authenticated pages with sidebar and header.
 */

import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="pl-64 transition-all duration-300">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
