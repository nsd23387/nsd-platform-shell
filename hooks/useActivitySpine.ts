/**
 * Activity Spine Data Fetching Hooks
 * 
 * These hooks provide React components with access to Activity Spine metrics.
 * All data is fetched read-only from the Activity Spine API.
 * 
 * GOVERNANCE:
 * - No local calculations or transformations of metrics
 * - Activity Spine is the single source of truth
 * - Hooks handle loading, error, and empty states
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  OrderMetrics,
  MediaMetrics,
  MockupMetrics,
  OrderFunnel,
  SLAMetrics,
  MockupSLAMetrics,
  MarketingOverviewResponse,
  TimePeriod,
  AsyncState,
} from '../types/activity-spine';
import {
  getOrderMetrics,
  getMediaMetrics,
  getMockupMetrics,
  getOrderFunnel,
  getSLAMetrics,
  getMockupSLAMetrics,
  getExecutiveDashboardData,
  getOperationsDashboardData,
  getDesignDashboardData,
  getMediaDashboardData,
  getSalesDashboardData,
  getMarketingDashboardData,
} from '../lib/sdk';

// ============================================
// Generic Async Hook
// ============================================

function useAsyncData<T>(
  fetcher: () => Promise<{ data: T }>,
  deps: unknown[] = []
): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetcher();
      setState({ data: response.data, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data';
      setState({ data: null, loading: false, error: message });
    }
  }, deps);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

// ============================================
// Individual Metric Hooks
// ============================================

/**
 * Fetch order metrics from Activity Spine
 */
export function useOrderMetrics(period: TimePeriod = '30d') {
  return useAsyncData<OrderMetrics>(
    () => getOrderMetrics(period),
    [period]
  );
}

/**
 * Fetch media metrics from Activity Spine
 */
export function useMediaMetrics(period: TimePeriod = '30d') {
  return useAsyncData<MediaMetrics>(
    () => getMediaMetrics(period),
    [period]
  );
}

/**
 * Fetch mockup metrics from Activity Spine
 */
export function useMockupMetrics(period: TimePeriod = '30d') {
  return useAsyncData<MockupMetrics>(
    () => getMockupMetrics(period),
    [period]
  );
}

/**
 * Fetch order funnel data from Activity Spine
 */
export function useOrderFunnel(period: TimePeriod = '30d') {
  return useAsyncData<OrderFunnel>(
    () => getOrderFunnel(period),
    [period]
  );
}

/**
 * Fetch SLA metrics from Activity Spine
 */
export function useSLAMetrics(period: TimePeriod = '30d') {
  return useAsyncData<SLAMetrics>(
    () => getSLAMetrics(period),
    [period]
  );
}

/**
 * Fetch mockup SLA metrics from Activity Spine
 */
export function useMockupSLAMetrics(period: TimePeriod = '30d') {
  return useAsyncData<MockupSLAMetrics>(
    () => getMockupSLAMetrics(period),
    [period]
  );
}

// ============================================
// Dashboard-Specific Hooks
// ============================================

interface ExecutiveDashboardData {
  orders: OrderMetrics;
  mockups: MockupMetrics;
  slas: SLAMetrics;
  mockupSLAs: MockupSLAMetrics;
}

/**
 * Fetch all data needed for Executive Dashboard
 */
export function useExecutiveDashboard(period: TimePeriod = '30d') {
  const [state, setState] = useState<AsyncState<ExecutiveDashboardData>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { orders, mockups, slas, mockupSLAs } = await getExecutiveDashboardData(period);
      setState({
        data: {
          orders: orders.data,
          mockups: mockups.data,
          slas: slas.data,
          mockupSLAs: mockupSLAs.data,
        },
        loading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setState({ data: null, loading: false, error: message });
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

interface OperationsDashboardData {
  orders: OrderMetrics;
  slas: SLAMetrics;
}

/**
 * Fetch all data needed for Operations Dashboard
 */
export function useOperationsDashboard(period: TimePeriod = '30d') {
  const [state, setState] = useState<AsyncState<OperationsDashboardData>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { orders, slas } = await getOperationsDashboardData(period);
      setState({
        data: {
          orders: orders.data,
          slas: slas.data,
        },
        loading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setState({ data: null, loading: false, error: message });
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

interface DesignDashboardData {
  mockups: MockupMetrics;
  mockupSLAs: MockupSLAMetrics;
}

/**
 * Fetch all data needed for Design Dashboard
 */
export function useDesignDashboard(period: TimePeriod = '30d') {
  const [state, setState] = useState<AsyncState<DesignDashboardData>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { mockups, mockupSLAs } = await getDesignDashboardData(period);
      setState({
        data: {
          mockups: mockups.data,
          mockupSLAs: mockupSLAs.data,
        },
        loading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setState({ data: null, loading: false, error: message });
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

/**
 * Fetch all data needed for Media Dashboard
 */
export function useMediaDashboard(period: TimePeriod = '30d') {
  const [state, setState] = useState<AsyncState<MediaMetrics>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await getMediaDashboardData(period);
      setState({
        data: response.data,
        loading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setState({ data: null, loading: false, error: message });
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

interface SalesDashboardData {
  funnel: OrderFunnel;
  orders: OrderMetrics;
}

/**
 * Fetch all data needed for Sales Dashboard
 */
export function useSalesDashboard(period: TimePeriod = '30d') {
  const [state, setState] = useState<AsyncState<SalesDashboardData>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { funnel, orders } = await getSalesDashboardData(period);
      setState({
        data: {
          funnel: funnel.data,
          orders: orders.data,
        },
        loading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setState({ data: null, loading: false, error: message });
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

/**
 * Fetch all data needed for Marketing Dashboard.
 * Accepts flexible query params (preset, start/end, include_timeseries).
 */
export function useMarketingDashboard(queryParams: Record<string, string> = { period: '30d' }) {
  const [state, setState] = useState<AsyncState<MarketingOverviewResponse>>({
    data: null,
    loading: true,
    error: null,
  });

  const paramsKey = JSON.stringify(queryParams);

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await getMarketingDashboardData(queryParams);
      setState({
        data: response.data,
        loading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setState({ data: null, loading: false, error: message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}
