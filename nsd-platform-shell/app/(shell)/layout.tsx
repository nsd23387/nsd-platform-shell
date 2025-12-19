/**
 * Shell Layout
 * 
 * Layout for authenticated pages with sidebar and header.
 * 
 * ============================================================================
 * GOVERNANCE NOTICE — READ CAREFULLY
 * ============================================================================
 * 
 * This shell is the SINGLE ENTRY POINT for the NSD Unified Business Platform.
 * It provides navigation, authentication, and read-only visibility.
 * 
 * ❌ DO NOT add business logic here
 * ❌ DO NOT add create/update/delete operations for business entities
 * ❌ DO NOT bypass nsd-shared-sdk for data access
 * ❌ DO NOT implement workflows, approvals, or state machines
 * 
 * ✅ All write operations belong in owning applications (OMS, Sales, Quotes, etc.)
 * ✅ The shell is intentionally read-only with respect to business data
 * ✅ New features must be evaluated against governance boundaries in README.md
 * 
 * Why? The shell must remain stable as new apps are added. If it owns business
 * logic, it becomes a bottleneck and single point of failure. See README.md
 * section "Shell Governance & Boundaries" for full policy.
 * ============================================================================
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
