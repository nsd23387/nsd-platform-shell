'use client';

/**
 * AppCard Component
 * 
 * Displays an application in the app launcher.
 */

import Link from 'next/link';
import { AppConfig } from '@/config/apps';
import { ExternalLink } from 'lucide-react';

interface AppCardProps {
  app: AppConfig;
}

export function AppCard({ app }: AppCardProps) {
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
      className={`group relative p-6 bg-white rounded-xl border border-gray-200 transition-all duration-200 ${
        isDisabled
          ? 'opacity-60 cursor-not-allowed'
          : 'hover:shadow-lg hover:border-blue-300 cursor-pointer'
      }`}
    >
      {/* Status Badge */}
      {app.status !== 'active' && (
        <span
          className={`absolute top-4 right-4 text-xs font-medium px-2 py-1 rounded-full ${
            statusColors[app.status]
          }`}
        >
          {statusLabels[app.status]}
        </span>
      )}

      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
          isDisabled
            ? 'bg-gray-100 text-gray-400'
            : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
        }`}
      >
        <Icon className="w-6 h-6" />
      </div>

      {/* Content */}
      <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
        {app.display_name}
        {app.is_external && <ExternalLink className="w-4 h-4 text-gray-400" />}
      </h3>
      <p className="text-sm text-gray-500 line-clamp-2">{app.description}</p>
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

  return <Link href={app.route}>{content}</Link>;
}
