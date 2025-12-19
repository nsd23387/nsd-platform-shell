'use client';

/**
 * ActivityItem Component
 * 
 * Displays a single activity in the notification feed.
 */

import {
  Package,
  FileText,
  User,
  AlertTriangle,
  DollarSign,
  Clock,
} from 'lucide-react';
import { Activity } from '@/lib/sdk';

interface ActivityItemProps {
  activity: Activity;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  order_status_change: Package,
  quote_approved: FileText,
  new_account: User,
  sla_warning: AlertTriangle,
  payment_received: DollarSign,
  default: Clock,
};

const typeColors: Record<string, string> = {
  order_status_change: 'bg-blue-100 text-blue-600',
  quote_approved: 'bg-green-100 text-green-600',
  new_account: 'bg-purple-100 text-purple-600',
  sla_warning: 'bg-red-100 text-red-600',
  payment_received: 'bg-emerald-100 text-emerald-600',
  default: 'bg-gray-100 text-gray-600',
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const Icon = typeIcons[activity.type] || typeIcons.default;
  const colorClass = typeColors[activity.type] || typeColors.default;

  return (
    <div
      className={`flex gap-4 p-4 rounded-lg transition-colors hover:bg-gray-50 ${
        activity.is_sla_warning ? 'bg-red-50 border border-red-200' : ''
      }`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-gray-900">{activity.entity_name}</p>
            <p className="text-sm text-gray-600">{activity.description}</p>
          </div>
          <span className="text-xs text-gray-400 shrink-0">
            {formatTimestamp(activity.timestamp)}
          </span>
        </div>

        {/* Actor */}
        <p className="text-xs text-gray-400 mt-1">by {activity.user_name}</p>

        {/* SLA Warning Badge */}
        {activity.is_sla_warning && (
          <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            <AlertTriangle className="w-3 h-3" />
            SLA At Risk
          </span>
        )}
      </div>
    </div>
  );
}
