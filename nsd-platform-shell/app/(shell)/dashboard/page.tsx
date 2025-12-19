'use client';

/**
 * Executive Command Center
 * 
 * Read-only dashboards showing key business metrics.
 * NO EDITING allowed - this is purely for visibility.
 */

import { useState, useEffect } from 'react';
import { DashboardCard } from '@/components/DashboardCard';
import {
  getMockDashboardData,
  DashboardData,
  OrdersByStatus,
  RevenueSummary,
  ProductionThroughput,
  SalesPipeline,
} from '@/lib/sdk';
import {
  Package,
  DollarSign,
  Factory,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setData(getMockDashboardData());
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Executive Command Center</h1>
        <p className="text-gray-600 mt-1">
          Read-only overview of key business metrics across the platform.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStatCard
          title="Active Orders"
          value={data.orders_by_status.reduce((sum, o) => sum + o.count, 0)}
          subtitle="Across all statuses"
          icon={Package}
          color="blue"
        />
        <QuickStatCard
          title="Total Revenue"
          value={formatCurrency(data.orders_by_status.reduce((sum, o) => sum + o.value, 0))}
          subtitle="Current orders value"
          icon={DollarSign}
          color="green"
        />
        <QuickStatCard
          title="Production Jobs"
          value={data.production_throughput.reduce((sum, p) => sum + p.jobs_in_progress, 0)}
          subtitle="Currently in progress"
          icon={Factory}
          color="purple"
        />
        <QuickStatCard
          title="Pipeline Value"
          value={formatCurrency(data.sales_pipeline.reduce((sum, s) => sum + s.value, 0))}
          subtitle="Total sales pipeline"
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <DashboardCard title="Orders by Status">
          <div className="space-y-4">
            {data.orders_by_status.map((order) => (
              <OrderStatusRow key={order.status} order={order} />
            ))}
          </div>
        </DashboardCard>

        {/* Revenue Summary */}
        <DashboardCard title="Revenue Summary">
          <div className="space-y-4">
            {data.revenue_summary.map((revenue) => (
              <RevenueRow key={revenue.period} revenue={revenue} />
            ))}
          </div>
        </DashboardCard>

        {/* Sales Pipeline */}
        <DashboardCard title="Sales Pipeline">
          <div className="space-y-3">
            {data.sales_pipeline.map((stage) => (
              <PipelineRow key={stage.stage} stage={stage} />
            ))}
          </div>
        </DashboardCard>

        {/* Production Throughput */}
        <DashboardCard title="Production Throughput (Last 4 Days)">
          <div className="space-y-4">
            {data.production_throughput.map((day) => (
              <ProductionRow key={day.date} data={day} />
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* Media Inventory */}
      <DashboardCard title="Media Inventory">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {data.media_inventory.map((category) => (
            <div key={category.category} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{category.category}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {category.total_assets.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {category.active_assets.toLocaleString()} active • {category.storage_used_gb} GB
              </p>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Read-only Notice */}
      <div className="p-4 bg-gray-100 rounded-lg text-center">
        <p className="text-sm text-gray-600">
          This dashboard is <strong>read-only</strong>. To make changes, use the respective application modules.
        </p>
      </div>
    </div>
  );
}

// Helper Components

interface QuickStatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function QuickStatCard({ title, value, subtitle, icon: Icon, color }: QuickStatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function OrderStatusRow({ order }: { order: OrdersByStatus }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_production: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span
          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
            statusColors[order.status] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {order.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>
        <span className="font-medium text-gray-900">{order.count} orders</span>
      </div>
      <span className="text-gray-600">{formatCurrency(order.value)}</span>
    </div>
  );
}

function RevenueRow({ revenue }: { revenue: RevenueSummary }) {
  const isPositive = revenue.variance_percent >= 0;

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900">{revenue.period}</p>
        <p className="text-sm text-gray-500">
          Target: {formatCurrency(revenue.target)}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-gray-900">{formatCurrency(revenue.revenue)}</p>
        <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{Math.abs(revenue.variance_percent)}%</span>
        </div>
      </div>
    </div>
  );
}

function PipelineRow({ stage }: { stage: SalesPipeline }) {
  const maxValue = 2340000; // For percentage calculation
  const percentage = (stage.value / maxValue) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
        <span className="text-sm text-gray-500">
          {stage.count} deals • {formatCurrency(stage.value)}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ProductionRow({ data }: { data: ProductionThroughput }) {
  const date = new Date(data.date);
  const formattedDate = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900">{formattedDate}</p>
        <p className="text-sm text-gray-500">
          Avg cycle: {data.average_cycle_time_hours}h
        </p>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-green-600">
          <span className="font-medium">{data.jobs_completed}</span> completed
        </span>
        <span className="text-blue-600">
          <span className="font-medium">{data.jobs_in_progress}</span> in progress
        </span>
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
