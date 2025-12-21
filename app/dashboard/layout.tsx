/**
 * Dashboard Layout
 * 
 * Shared layout for all dashboard pages.
 * Provides navigation between dashboards.
 * Read-only - no edit actions.
 */

'use client';

import React from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: '/dashboard/overview', label: 'Overview', icon: '🏠' },
  { href: '/dashboard/executive', label: 'Executive', icon: '📊' },
  { href: '/dashboard/operations', label: 'Operations', icon: '⚙️' },
  { href: '/dashboard/design', label: 'Design', icon: '🎨' },
  { href: '/dashboard/media', label: 'Media', icon: '📸' },
  { href: '/dashboard/sales', label: 'Sales', icon: '💰' },
  { href: '/dashboard/oms', label: 'OMS', icon: '⚡' },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // In a real app, this would use usePathname() from next/navigation
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Sidebar Navigation */}
      <aside
        style={{
          width: '240px',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          padding: '24px 0',
        }}
      >
        <div
          style={{
            padding: '0 24px 24px',
            borderBottom: '1px solid #e5e7eb',
            marginBottom: '16px',
          }}
        >
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#111827',
            }}
          >
            Dashboards
          </h2>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Read-only analytics
          </p>
        </div>

        <nav>
          {navItems.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#111827' : '#6b7280',
                  backgroundColor: isActive ? '#f3f4f6' : 'transparent',
                  textDecoration: 'none',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '0',
            right: '0',
            padding: '0 24px',
          }}
        >
          <div
            style={{
              padding: '12px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#0369a1',
            }}
          >
            <strong>Read-Only Mode</strong>
            <p style={{ marginTop: '4px', opacity: 0.8 }}>
              Data sourced from Activity Spine
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '32px', overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
