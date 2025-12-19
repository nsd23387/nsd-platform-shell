'use client';

/**
 * Dynamic App Page
 * 
 * Placeholder page for embedded apps.
 * In production, this would either:
 * 1. Embed the app via iframe
 * 2. Redirect to an external app
 * 3. Load a micro-frontend module
 */

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { getAppById, hasAppAccess } from '@/config/apps';
import { useAuthStore } from '@/lib/auth';
import { ExternalLink, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';

export default function AppPage() {
  const params = useParams();
  const { user } = useAuthStore();

  const appId = params.appId as string;

  const { app, hasAccess } = useMemo(() => {
    const appConfig = getAppById(appId);
    const access = appConfig && user ? hasAppAccess(appId, user.roles) : false;
    return { app: appConfig || null, hasAccess: access };
  }, [appId, user]);

  // App not found
  if (!app) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ExternalLink className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">App Not Found</h1>
        <p className="text-gray-600 mb-6">
          The application &quot;{appId}&quot; could not be found in the registry.
        </p>
        <Link
          href="/apps"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Apps
        </Link>
      </div>
    );
  }

  // No access
  if (!hasAccess) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">
          You don&apos;t have permission to access {app.display_name}.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Required roles: {app.required_roles.join(', ')}
        </p>
        <Link
          href="/apps"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Apps
        </Link>
      </div>
    );
  }

  // Coming soon
  if (app.status === 'coming_soon') {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <app.icon className="w-8 h-8 text-yellow-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{app.display_name}</h1>
        <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full mb-4">
          Coming Soon
        </span>
        <p className="text-gray-600 mb-6">{app.description}</p>
        <p className="text-sm text-gray-500 mb-6">
          This application is currently under development and will be available soon.
        </p>
        <Link
          href="/apps"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Apps
        </Link>
      </div>
    );
  }

  // Maintenance
  if (app.status === 'maintenance') {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <app.icon className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{app.display_name}</h1>
        <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full mb-4">
          Under Maintenance
        </span>
        <p className="text-gray-600 mb-6">{app.description}</p>
        <p className="text-sm text-gray-500 mb-6">
          This application is currently undergoing maintenance. Please check back later.
        </p>
        <Link
          href="/apps"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Apps
        </Link>
      </div>
    );
  }

  // Active app - show placeholder (in production this would embed the actual app)
  const Icon = app.icon;

  return (
    <div className="space-y-6">
      {/* App Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/apps"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{app.display_name}</h1>
          <p className="text-gray-600">{app.description}</p>
        </div>
      </div>

      {/* App Content Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 min-h-[600px] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Icon className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {app.display_name} Module
          </h2>
          <p className="text-gray-500 mb-6">
            This is a placeholder for the {app.display_name} application module.
            In production, this area would contain the actual embedded application.
          </p>
          <div className="p-4 bg-blue-50 rounded-lg text-left">
            <p className="text-sm text-blue-800">
              <strong>Integration Options:</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• Iframe embedding for existing web apps</li>
              <li>• Module federation for micro-frontends</li>
              <li>• Deep linking to external applications</li>
              <li>• Native SDK integration via nsd-shared-sdk</li>
            </ul>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">App ID</p>
          <p className="font-mono text-gray-900">{app.app_id}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Category</p>
          <p className="text-gray-900 capitalize">{app.category}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Required Roles</p>
          <p className="text-gray-900">{app.required_roles.join(', ')}</p>
        </div>
      </div>
    </div>
  );
}
