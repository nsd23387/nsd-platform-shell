/**
 * NSD Shared SDK Wrapper
 * 
 * This module provides the interface to the nsd-shared-sdk.
 * ALL data access in this platform shell MUST go through this wrapper.
 * 
 * NO DIRECT DATABASE ACCESS is allowed.
 * NO DOMAIN-SPECIFIC BUSINESS LOGIC should be implemented here.
 * 
 * This wrapper provides:
 * - Type-safe API calls
 * - Automatic authentication header injection
 * - Error handling and retry logic
 * - Response transformation
 */

import { getAuthToken } from './auth';

// Base configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.nsd-platform.internal';

// ============================================================================
// Types
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    per_page: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Search Types
export interface SearchResult {
  id: string;
  type: 'account' | 'contact' | 'quote' | 'order' | 'production_job' | 'media_asset';
  title: string;
  subtitle: string;
  url: string;
  metadata: Record<string, unknown>;
}

export interface SearchParams {
  query: string;
  types?: string[];
  limit?: number;
  offset?: number;
}

// Activity Types
export interface Activity {
  id: string;
  type: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  action: string;
  description: string;
  user_id: string;
  user_name: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  is_sla_warning?: boolean;
}

// Dashboard Types
export interface OrdersByStatus {
  status: string;
  count: number;
  value: number;
}

export interface RevenueSummary {
  period: string;
  revenue: number;
  target: number;
  variance_percent: number;
}

export interface ProductionThroughput {
  date: string;
  jobs_completed: number;
  jobs_in_progress: number;
  average_cycle_time_hours: number;
}

export interface MediaInventory {
  category: string;
  total_assets: number;
  active_assets: number;
  storage_used_gb: number;
}

export interface SalesPipeline {
  stage: string;
  count: number;
  value: number;
}

export interface DashboardData {
  orders_by_status: OrdersByStatus[];
  revenue_summary: RevenueSummary[];
  production_throughput: ProductionThroughput[];
  media_inventory: MediaInventory[];
  sales_pipeline: SalesPipeline[];
}

// ============================================================================
// HTTP Client
// ============================================================================

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      code: 'UNKNOWN_ERROR',
      message: response.statusText,
    }));
    throw error;
  }

  return response.json();
}

// ============================================================================
// Search API
// ============================================================================

/**
 * Universal search across all entity types
 * This is a READ-ONLY operation
 */
export async function universalSearch(params: SearchParams): Promise<ApiResponse<SearchResult[]>> {
  const queryParams = new URLSearchParams({
    q: params.query,
    ...(params.limit && { limit: params.limit.toString() }),
    ...(params.offset && { offset: params.offset.toString() }),
    ...(params.types && { types: params.types.join(',') }),
  });

  return request<ApiResponse<SearchResult[]>>(`/search?${queryParams}`);
}

// ============================================================================
// Activity Feed API
// ============================================================================

/**
 * Get recent activities for the notification center
 * This is a READ-ONLY operation
 */
export async function getActivities(
  limit: number = 50,
  offset: number = 0
): Promise<ApiResponse<Activity[]>> {
  return request<ApiResponse<Activity[]>>(`/activities?limit=${limit}&offset=${offset}`);
}

/**
 * Get activities with SLA warnings
 * This is a READ-ONLY operation
 */
export async function getSlaWarnings(): Promise<ApiResponse<Activity[]>> {
  return request<ApiResponse<Activity[]>>('/activities/sla-warnings');
}

// ============================================================================
// Dashboard API
// ============================================================================

/**
 * Get executive dashboard data
 * This is a READ-ONLY operation
 */
export async function getDashboardData(): Promise<ApiResponse<DashboardData>> {
  return request<ApiResponse<DashboardData>>('/dashboard/executive');
}

/**
 * Get orders by status summary
 * This is a READ-ONLY operation
 */
export async function getOrdersByStatus(): Promise<ApiResponse<OrdersByStatus[]>> {
  return request<ApiResponse<OrdersByStatus[]>>('/dashboard/orders-by-status');
}

/**
 * Get revenue summary
 * This is a READ-ONLY operation
 */
export async function getRevenueSummary(
  period: 'daily' | 'weekly' | 'monthly' = 'monthly'
): Promise<ApiResponse<RevenueSummary[]>> {
  return request<ApiResponse<RevenueSummary[]>>(`/dashboard/revenue?period=${period}`);
}

/**
 * Get production throughput metrics
 * This is a READ-ONLY operation
 */
export async function getProductionThroughput(): Promise<ApiResponse<ProductionThroughput[]>> {
  return request<ApiResponse<ProductionThroughput[]>>('/dashboard/production-throughput');
}

/**
 * Get media inventory counts
 * This is a READ-ONLY operation
 */
export async function getMediaInventory(): Promise<ApiResponse<MediaInventory[]>> {
  return request<ApiResponse<MediaInventory[]>>('/dashboard/media-inventory');
}

/**
 * Get sales pipeline snapshot
 * This is a READ-ONLY operation
 */
export async function getSalesPipeline(): Promise<ApiResponse<SalesPipeline[]>> {
  return request<ApiResponse<SalesPipeline[]>>('/dashboard/sales-pipeline');
}

// ============================================================================
// Authentication API
// ============================================================================

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    avatar_url?: string;
  };
  expires_at: string;
}

/**
 * Authenticate user and get JWT token
 */
export async function authenticate(credentials: AuthCredentials): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

/**
 * Validate current token
 */
export async function validateToken(): Promise<AuthResponse['user']> {
  return request<AuthResponse['user']>('/auth/validate');
}

/**
 * Logout and invalidate token
 */
export async function logout(): Promise<void> {
  return request<void>('/auth/logout', {
    method: 'POST',
  });
}

// ============================================================================
// Mock Data (for development)
// ============================================================================

export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

export function getMockSearchResults(query: string): SearchResult[] {
  if (!query) return [];
  
  const results: SearchResult[] = [
    {
      id: '1',
      type: 'account',
      title: `Acme Corporation`,
      subtitle: 'Enterprise Account • Active',
      url: '/apps/sales-engine/accounts/1',
      metadata: { status: 'active', industry: 'Manufacturing' },
    },
    {
      id: '2',
      type: 'contact',
      title: `John Smith`,
      subtitle: 'john.smith@acme.com • Acme Corporation',
      url: '/apps/sales-engine/contacts/2',
      metadata: { role: 'Purchasing Manager' },
    },
    {
      id: '3',
      type: 'quote',
      title: `Quote #QT-2024-0123`,
      subtitle: '$15,500 • Pending Approval',
      url: '/apps/custom-quotes/quotes/3',
      metadata: { amount: 15500, status: 'pending' },
    },
    {
      id: '4',
      type: 'order',
      title: `Order #ORD-2024-0456`,
      subtitle: '$12,300 • In Production',
      url: '/apps/oms/orders/4',
      metadata: { amount: 12300, status: 'in_production' },
    },
    {
      id: '5',
      type: 'production_job',
      title: `Job #PJ-2024-0789`,
      subtitle: 'Channel Letters • 3 days remaining',
      url: '/apps/production/jobs/5',
      metadata: { type: 'channel_letters', days_remaining: 3 },
    },
  ];
  
  return results.filter(r => 
    r.title.toLowerCase().includes(query.toLowerCase()) ||
    r.subtitle.toLowerCase().includes(query.toLowerCase()) ||
    r.type.includes(query.toLowerCase())
  );
}

export function getMockActivities(): Activity[] {
  return [
    {
      id: '1',
      type: 'order_status_change',
      entity_type: 'order',
      entity_id: 'ORD-2024-0456',
      entity_name: 'Order #ORD-2024-0456',
      action: 'status_changed',
      description: 'Order moved to In Production',
      user_id: 'user-1',
      user_name: 'Jane Doe',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
      id: '2',
      type: 'quote_approved',
      entity_type: 'quote',
      entity_id: 'QT-2024-0123',
      entity_name: 'Quote #QT-2024-0123',
      action: 'approved',
      description: 'Quote approved by customer',
      user_id: 'user-2',
      user_name: 'John Smith',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: '3',
      type: 'sla_warning',
      entity_type: 'production_job',
      entity_id: 'PJ-2024-0789',
      entity_name: 'Job #PJ-2024-0789',
      action: 'sla_warning',
      description: 'Production job at risk of missing SLA',
      user_id: 'system',
      user_name: 'System',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      is_sla_warning: true,
    },
    {
      id: '4',
      type: 'new_account',
      entity_type: 'account',
      entity_id: 'ACC-2024-0234',
      entity_name: 'XYZ Industries',
      action: 'created',
      description: 'New account created',
      user_id: 'user-1',
      user_name: 'Jane Doe',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: '5',
      type: 'payment_received',
      entity_type: 'invoice',
      entity_id: 'INV-2024-0567',
      entity_name: 'Invoice #INV-2024-0567',
      action: 'payment_received',
      description: 'Payment of $8,500 received',
      user_id: 'user-3',
      user_name: 'Mike Johnson',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    },
  ];
}

export function getMockDashboardData(): DashboardData {
  return {
    orders_by_status: [
      { status: 'pending', count: 24, value: 156000 },
      { status: 'in_production', count: 18, value: 234000 },
      { status: 'shipped', count: 12, value: 89000 },
      { status: 'completed', count: 156, value: 1250000 },
    ],
    revenue_summary: [
      { period: 'Jan 2024', revenue: 485000, target: 500000, variance_percent: -3.0 },
      { period: 'Feb 2024', revenue: 520000, target: 500000, variance_percent: 4.0 },
      { period: 'Mar 2024', revenue: 498000, target: 520000, variance_percent: -4.2 },
      { period: 'Apr 2024', revenue: 567000, target: 550000, variance_percent: 3.1 },
    ],
    production_throughput: [
      { date: '2024-04-01', jobs_completed: 12, jobs_in_progress: 8, average_cycle_time_hours: 48 },
      { date: '2024-04-02', jobs_completed: 15, jobs_in_progress: 6, average_cycle_time_hours: 42 },
      { date: '2024-04-03', jobs_completed: 11, jobs_in_progress: 10, average_cycle_time_hours: 52 },
      { date: '2024-04-04', jobs_completed: 14, jobs_in_progress: 7, average_cycle_time_hours: 45 },
    ],
    media_inventory: [
      { category: 'Images', total_assets: 15234, active_assets: 12456, storage_used_gb: 234 },
      { category: 'Videos', total_assets: 1245, active_assets: 890, storage_used_gb: 567 },
      { category: 'Documents', total_assets: 8976, active_assets: 7654, storage_used_gb: 45 },
      { category: 'Templates', total_assets: 234, active_assets: 198, storage_used_gb: 12 },
    ],
    sales_pipeline: [
      { stage: 'Prospect', count: 145, value: 2340000 },
      { stage: 'Qualified', count: 89, value: 1560000 },
      { stage: 'Proposal', count: 45, value: 890000 },
      { stage: 'Negotiation', count: 23, value: 456000 },
      { stage: 'Closed Won', count: 12, value: 234000 },
    ],
  };
}
