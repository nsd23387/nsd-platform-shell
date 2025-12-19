'use client';

/**
 * Header Component
 * 
 * Top header bar with breadcrumbs and quick actions.
 */

import { usePathname } from 'next/navigation';
import { Search, Bell } from 'lucide-react';
import Link from 'next/link';

const pathLabels: Record<string, string> = {
  dashboard: 'Executive Dashboard',
  apps: 'Applications',
  search: 'Universal Search',
  notifications: 'Notifications',
  auth: 'Authentication',
};

export function Header() {
  const pathname = usePathname();

  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => ({
      label: pathLabels[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      href: '/' + segments.slice(0, index + 1).join('/'),
      isLast: index === segments.length - 1,
    }));
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
          Home
        </Link>
        {breadcrumbs.map((crumb) => (
          <div key={crumb.href} className="flex items-center gap-2">
            <span className="text-gray-300">/</span>
            {crumb.isLast ? (
              <span className="text-gray-900 font-medium">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-gray-500 hover:text-gray-700">
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <Link
          href="/search"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Search"
        >
          <Search className="w-5 h-5" />
        </Link>
        <Link
          href="/notifications"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Link>
      </div>
    </header>
  );
}
