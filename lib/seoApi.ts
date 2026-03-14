'use client';

export interface SeoCluster {
  id: string;
  cluster_topic: string;
  keyword_count: number;
  total_impressions: number;
  avg_position: number;
  avg_ctr: number;
  primary_keyword: string;
}

export interface SeoClusterMember {
  keyword: string;
  impressions: number;
  clicks: number;
  position: number;
  ctr: number;
}

export interface SeoClusterDetail extends SeoCluster {
  members: SeoClusterMember[];
}

export interface SeoOpportunity {
  id: string;
  cluster_id: string;
  cluster_topic: string;
  opportunity_type: 'optimize_existing_page' | 'create_new_page' | 'expand_content';
  total_impressions: number;
  avg_position: number;
  suggested_action: string;
}

export interface SeoRecommendation {
  id: string;
  cluster_id: string;
  cluster_topic: string;
  primary_keyword: string;
  recommended_action: string;
  recommended_url: string;
  recommended_title?: string;
  recommended_meta_description?: string;
  target_url?: string;
  opportunity_type: string;
  estimated_impact?: string;
  status: 'pending_review' | 'approved' | 'rejected';
  feedback?: string;
  created_at: string;
}

export interface SeoOutcome {
  id: string;
  cluster_topic: string;
  keyword: string;
  page_url: string;
  old_position: number;
  new_position: number;
  ctr_change: number;
  traffic_change: number;
  execution_date: string;
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const windowWithToken = window as any;
    const token =
      windowWithToken.__NSD_AUTH_TOKEN__ ||
      windowWithToken.__SALES_ENGINE_TOKEN__ ||
      process.env.NEXT_PUBLIC_NSD_DEV_JWT;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

async function seoFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`SEO API error ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export async function getClusters(): Promise<SeoCluster[]> {
  const data = await seoFetch<{ data: SeoCluster[] }>('/api/proxy/seo/clusters');
  return data.data ?? [];
}

export async function getClusterMembers(clusterId: string): Promise<SeoClusterDetail> {
  const data = await seoFetch<{ data: SeoClusterDetail }>(`/api/proxy/seo/clusters?id=${clusterId}`);
  return data.data;
}

export async function getClusterOpportunities(): Promise<SeoOpportunity[]> {
  const data = await seoFetch<{ data: SeoOpportunity[] }>('/api/proxy/seo/cluster-opportunities');
  return data.data ?? [];
}

export async function getRecommendations(): Promise<SeoRecommendation[]> {
  const data = await seoFetch<{ data: SeoRecommendation[] }>('/api/proxy/seo/recommendations');
  return data.data ?? [];
}

export async function approveRecommendation(id: string): Promise<void> {
  await seoFetch(`/api/proxy/seo/recommendations`, {
    method: 'POST',
    body: JSON.stringify({ id, action: 'approve' }),
  });
}

export async function rejectRecommendation(id: string): Promise<void> {
  await seoFetch(`/api/proxy/seo/recommendations`, {
    method: 'POST',
    body: JSON.stringify({ id, action: 'reject' }),
  });
}

export async function submitFeedback(id: string, feedbackText: string): Promise<void> {
  await seoFetch(`/api/proxy/seo/recommendations`, {
    method: 'POST',
    body: JSON.stringify({ id, action: 'feedback', feedback_text: feedbackText }),
  });
}

export async function getOutcomes(): Promise<SeoOutcome[]> {
  const data = await seoFetch<{ data: SeoOutcome[] }>('/api/proxy/seo/outcomes');
  return data.data ?? [];
}
