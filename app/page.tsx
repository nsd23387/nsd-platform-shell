/**
 * Home Page
 * 
 * Landing page for the platform shell.
 * Provides navigation to dashboards.
 */

import Link from 'next/link';

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        backgroundColor: '#f9fafb',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: '600px',
        }}
      >
        <h1
          style={{
            fontSize: '36px',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '16px',
          }}
        >
          NSD Platform Shell
        </h1>
        <p
          style={{
            fontSize: '18px',
            color: '#6b7280',
            marginBottom: '32px',
          }}
        >
          Unified internal platform for the NSD Business Platform.
          Access read-only analytics dashboards powered by Activity Spine.
        </p>

        <Link
          href="/dashboard"
          style={{
            display: 'inline-block',
            padding: '14px 32px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: 600,
            borderRadius: '8px',
            textDecoration: 'none',
            transition: 'background-color 0.2s',
          }}
        >
          View Dashboards →
        </Link>
      </div>

      <div
        style={{
          marginTop: '48px',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px',
          maxWidth: '800px',
        }}
      >
        {[
          { name: 'Executive', icon: '📊', href: '/dashboard/executive' },
          { name: 'Operations', icon: '⚙️', href: '/dashboard/operations' },
          { name: 'Design', icon: '🎨', href: '/dashboard/design' },
          { name: 'Media', icon: '📸', href: '/dashboard/media' },
          { name: 'Sales', icon: '💰', href: '/dashboard/sales' },
        ].map((dashboard) => (
          <Link
            key={dashboard.name}
            href={dashboard.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px 16px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              textDecoration: 'none',
              transition: 'box-shadow 0.2s, transform 0.2s',
            }}
          >
            <span style={{ fontSize: '32px', marginBottom: '8px' }}>
              {dashboard.icon}
            </span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
              }}
            >
              {dashboard.name}
            </span>
          </Link>
        ))}
      </div>

      <div
        style={{
          marginTop: '48px',
          padding: '16px 24px',
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#92400e',
        }}
      >
        <strong>Read-Only Mode:</strong> All dashboards display analytics from
        Activity Spine. No edit capabilities.
      </div>
    </main>
  );
}
