'use client';

/**
 * Notifications Page
 * 
 * Activity feed showing recent activities across the platform.
 * Highlights SLA warnings and status changes.
 */

import { useState, useEffect } from 'react';
import { ActivityItem } from '@/components/ActivityItem';
import { getMockActivities, Activity } from '@/lib/sdk';
import { Bell, AlertTriangle, Filter } from 'lucide-react';

type FilterType = 'all' | 'sla_warnings' | 'orders' | 'quotes' | 'accounts';

export default function NotificationsPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setActivities(getMockActivities());
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const filteredActivities = activities.filter((activity) => {
    switch (filter) {
      case 'sla_warnings':
        return activity.is_sla_warning;
      case 'orders':
        return activity.entity_type === 'order';
      case 'quotes':
        return activity.entity_type === 'quote';
      case 'accounts':
        return activity.entity_type === 'account';
      default:
        return true;
    }
  });

  const slaWarningsCount = activities.filter((a) => a.is_sla_warning).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1">
            Recent activities and updates across the platform.
          </p>
        </div>
        
        {slaWarningsCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">{slaWarningsCount} SLA Warning{slaWarningsCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          All
        </FilterButton>
        <FilterButton
          active={filter === 'sla_warnings'}
          onClick={() => setFilter('sla_warnings')}
          variant="warning"
        >
          SLA Warnings
        </FilterButton>
        <FilterButton
          active={filter === 'orders'}
          onClick={() => setFilter('orders')}
        >
          Orders
        </FilterButton>
        <FilterButton
          active={filter === 'quotes'}
          onClick={() => setFilter('quotes')}
        >
          Quotes
        </FilterButton>
        <FilterButton
          active={filter === 'accounts'}
          onClick={() => setFilter('accounts')}
        >
          Accounts
        </FilterButton>
      </div>

      {/* Activity Feed */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredActivities.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filteredActivities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No notifications found</p>
          <p className="text-sm text-gray-400 mt-1">
            {filter !== 'all' ? 'Try changing your filter settings.' : 'Check back later for updates.'}
          </p>
        </div>
      )}

      {/* Read-only Notice */}
      <div className="p-4 bg-gray-100 rounded-lg text-center">
        <p className="text-sm text-gray-600">
          This is a <strong>read-only</strong> activity feed. Click on any notification to view details in the respective application.
        </p>
      </div>
    </div>
  );
}

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'warning';
}

function FilterButton({ active, onClick, children, variant = 'default' }: FilterButtonProps) {
  const baseClasses = 'px-3 py-1.5 text-sm rounded-full transition-colors';
  
  const variantClasses = {
    default: active
      ? 'bg-blue-600 text-white'
      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    warning: active
      ? 'bg-red-600 text-white'
      : 'bg-red-50 text-red-600 hover:bg-red-100',
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
}
