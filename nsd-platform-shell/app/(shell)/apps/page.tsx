'use client';

/**
 * App Launcher Page
 * 
 * Config-driven app registry showing all available applications.
 * Apps are filtered based on user roles (RBAC).
 */

import { useState, useMemo } from 'react';
import { AppCard } from '@/components/AppCard';
import { getAppsByCategory, CATEGORY_LABELS, AppConfig } from '@/config/apps';
import { useAuthStore } from '@/lib/auth';
import { Grid3X3, List } from 'lucide-react';

type ViewMode = 'grid' | 'list';

export default function AppsPage() {
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const appsByCategory = useMemo(() => {
    if (user) {
      return getAppsByCategory(user.roles);
    }
    return {} as Record<string, AppConfig[]>;
  }, [user]);

  const categories = Object.keys(appsByCategory);
  const totalApps = Object.values(appsByCategory).flat().length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-600 mt-1">
            Access your authorized applications ({totalApps} available)
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            title="Grid view"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Apps by Category */}
      {categories.length > 0 ? (
        <div className="space-y-8">
          {categories.map((category) => {
            const apps = appsByCategory[category];
            const categoryLabel = CATEGORY_LABELS[category] || category;

            return (
              <section key={category}>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  {categoryLabel}
                </h2>
                
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {apps.map((app) => (
                      <AppCard key={app.app_id} app={app} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {apps.map((app) => (
                      <AppListItem key={app.app_id} app={app} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Grid3X3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No applications available</p>
          <p className="text-sm text-gray-400 mt-1">
            Contact your administrator to request access.
          </p>
        </div>
      )}

      {/* Info Notice */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Applications shown are based on your assigned roles. 
          Contact your administrator if you need access to additional applications.
        </p>
      </div>
    </div>
  );
}

function AppListItem({ app }: { app: AppConfig }) {
  const Icon = app.icon;
  const isDisabled = app.status !== 'active';

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    coming_soon: 'bg-yellow-100 text-yellow-800',
    maintenance: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    active: 'Active',
    coming_soon: 'Coming Soon',
    maintenance: 'Maintenance',
  };

  const content = (
    <div
      className={`flex items-center gap-4 p-4 transition-colors ${
        isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          isDisabled ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600'
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900">{app.display_name}</h3>
        <p className="text-sm text-gray-500 truncate">{app.description}</p>
      </div>

      <span
        className={`shrink-0 px-2.5 py-1 text-xs font-medium rounded-full ${
          statusColors[app.status]
        }`}
      >
        {statusLabels[app.status]}
      </span>
    </div>
  );

  if (isDisabled) {
    return content;
  }

  if (app.is_external) {
    return (
      <a href={app.route} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return (
    <a href={app.route}>
      {content}
    </a>
  );
}
