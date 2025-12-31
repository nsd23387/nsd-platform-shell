import type {
  Campaign,
  CampaignDetail,
  CampaignCreatePayload,
  CampaignUpdatePayload,
  CampaignMetrics,
  MetricsHistoryEntry,
  CampaignRun,
  CampaignVariant,
  ThroughputConfig,
  CampaignStatus,
} from '../types/campaign';

const API_BASE = '/api/v1/campaigns';

function getAuthToken(): string | undefined {
  if (typeof window !== 'undefined') {
    const windowWithToken = window as unknown as { __SALES_ENGINE_TOKEN__?: string };
    if (windowWithToken.__SALES_ENGINE_TOKEN__) {
      return windowWithToken.__SALES_ENGINE_TOKEN__;
    }
  }
  return process.env.NEXT_PUBLIC_SALES_ENGINE_DEV_TOKEN;
}

function buildHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...buildHeaders(),
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error ${response.status}: ${error}`);
  }

  return response.json();
}

export async function listCampaigns(status?: CampaignStatus): Promise<Campaign[]> {
  const params = status ? `?status=${status}` : '';
  return apiRequest<Campaign[]>(params);
}

export async function getCampaign(id: string): Promise<CampaignDetail> {
  return apiRequest<CampaignDetail>(`/${id}`);
}

export async function createCampaign(payload: CampaignCreatePayload): Promise<Campaign> {
  return apiRequest<Campaign>('', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCampaign(
  id: string,
  payload: CampaignUpdatePayload
): Promise<Campaign> {
  return apiRequest<Campaign>(`/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function submitCampaign(id: string): Promise<Campaign> {
  return apiRequest<Campaign>(`/${id}/submit`, {
    method: 'POST',
  });
}

export async function approveCampaign(id: string): Promise<Campaign> {
  return apiRequest<Campaign>(`/${id}/approve`, {
    method: 'POST',
  });
}

export async function getCampaignMetrics(id: string): Promise<CampaignMetrics> {
  return apiRequest<CampaignMetrics>(`/${id}/metrics`);
}

export async function getCampaignMetricsHistory(id: string): Promise<MetricsHistoryEntry[]> {
  return apiRequest<MetricsHistoryEntry[]>(`/${id}/metrics/history`);
}

export async function getCampaignRuns(id: string): Promise<CampaignRun[]> {
  return apiRequest<CampaignRun[]>(`/${id}/runs`);
}

export async function getLatestRun(id: string): Promise<CampaignRun | null> {
  return apiRequest<CampaignRun | null>(`/${id}/runs/latest`);
}

export async function getCampaignVariants(id: string): Promise<CampaignVariant[]> {
  return apiRequest<CampaignVariant[]>(`/${id}/variants`);
}

export async function getCampaignThroughput(id: string): Promise<ThroughputConfig> {
  return apiRequest<ThroughputConfig>(`/${id}/throughput`);
}
