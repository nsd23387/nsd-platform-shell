'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { MarketingNav } from './components/MarketingNav';
import { GlobalFilters } from './components/GlobalFilters';
import type { ComparisonMode } from './components/GlobalFilters';
import { parsePeriodState, updateUrl } from './lib/period';
import type { PeriodState } from './lib/period';
import { MarketingContext } from './lib/MarketingContext';
import { useMarketingDashboard } from '../../../hooks/useActivitySpine';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { duration, easing } from '../../../design/tokens/spacing';

const STORAGE_KEY = 'marketing-nav-collapsed';
const COLLAPSE_BREAKPOINT = 1024;

function computeComparisonLabel(periodState: PeriodState, comparisonMode: ComparisonMode): string {
  const modeLabels: Record<ComparisonMode, string> = { prev: 'vs previous period', wow: 'vs last week', mom: 'vs last month' };
  return modeLabels[comparisonMode] ?? '';
}

interface LayoutProps {
  children: React.ReactNode;
}

export default function MarketingLayout({ children }: LayoutProps) {
  const tc = useThemeColors();
  const [periodState, setPeriodState] = useState<PeriodState>(() => parsePeriodState());
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('prev');
  const [channel, setChannel] = useState('');

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'true';
    return window.innerWidth < COLLAPSE_BREAKPOINT;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < COLLAPSE_BREAKPOINT) {
        setCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const handlePeriodChange = useCallback((next: PeriodState) => {
    setPeriodState(next);
    updateUrl(next);
  }, []);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (periodState.mode === 'range' && periodState.start && periodState.end) {
      params.start = periodState.start;
      params.end = periodState.end;
    } else {
      const BACKEND_PRESET_MAP: Record<string, string> = {
        daily: 'last_7d', weekly: 'last_7d', monthly: 'mtd', quarterly: 'qtd', yearly: 'ytd',
        last_7d: 'last_7d', last_30d: 'last_30d', last_90d: 'last_90d', mtd: 'mtd', qtd: 'qtd', ytd: 'ytd',
      };
      params.preset = BACKEND_PRESET_MAP[periodState.preset] ?? 'last_30d';
    }
    params.include_timeseries = 'true';
    if (channel) params.channel = channel;
    const COMPARISON_MAP: Record<ComparisonMode, string> = { prev: 'prev_period', wow: 'wow', mom: 'mom' };
    params.comparison = COMPARISON_MAP[comparisonMode];
    return params;
  }, [periodState, channel, comparisonMode]);

  const { data, loading, error, refetch } = useMarketingDashboard(queryParams);

  const contextValue = useMemo(() => ({
    periodState,
    comparisonMode,
    channel,
    queryParams,
    data,
    loading,
    error,
    refetch,
  }), [periodState, comparisonMode, channel, queryParams, data, loading, error, refetch]);

  return (
    <MarketingContext.Provider value={contextValue}>
      <div
        style={{
          display: 'flex',
          height: '100%',
          minHeight: 0,
          transition: `background-color ${duration.slow} ${easing.DEFAULT}`,
        }}
      >
        <MarketingNav collapsed={collapsed} onToggleCollapse={handleToggleCollapse} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <GlobalFilters
            state={periodState}
            onChange={handlePeriodChange}
            comparisonMode={comparisonMode}
            onComparisonModeChange={setComparisonMode}
            channel={channel}
            onChannelChange={setChannel}
            comparisonLabel={computeComparisonLabel(periodState, comparisonMode)}
          />
          <div style={{ flex: 1, overflow: 'auto' }}>
            {children}
          </div>
        </div>
      </div>
    </MarketingContext.Provider>
  );
}
