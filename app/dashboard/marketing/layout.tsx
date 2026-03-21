'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MarketingNav, NAV_GROUPS } from './components/MarketingNav';
import { GlobalFilters } from './components/GlobalFilters';
import type { ComparisonMode } from './components/GlobalFilters';
import { parsePeriodState, updateUrl } from './lib/period';
import type { PeriodState } from './lib/period';
import { MarketingContext } from './lib/MarketingContext';
import { useMarketingDashboard } from '../../../hooks/useActivitySpine';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../design/tokens/typography';
import { space, duration, easing } from '../../../design/tokens/spacing';
import { Icon } from '../../../design/components/Icon';
import Link from 'next/link';
import { violet } from '../../../design/tokens/colors';

const STORAGE_KEY = 'marketing-nav-collapsed';
const COLLAPSE_BREAKPOINT = 1024;
const MOBILE_BREAKPOINT = 768;

function computeComparisonLabel(periodState: PeriodState, comparisonMode: ComparisonMode): string {
  const modeLabels: Record<ComparisonMode, string> = { prev: 'vs previous period', wow: 'vs last week', mom: 'vs last month' };
  return modeLabels[comparisonMode] ?? '';
}

interface LayoutProps {
  children: React.ReactNode;
}

export default function MarketingLayout({ children }: LayoutProps) {
  const tc = useThemeColors();
  const currentPath = usePathname() ?? '';
  const [periodState, setPeriodState] = useState<PeriodState>(() => parsePeriodState());
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('prev');
  const [channel, setChannel] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSubNavOpen, setMobileSubNavOpen] = useState(false);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'true';
    return window.innerWidth < COLLAPSE_BREAKPOINT;
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < MOBILE_BREAKPOINT);
      if (width < COLLAPSE_BREAKPOINT) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMobileSubNavOpen(false);
  }, [currentPath]);

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

  const currentLabel = NAV_GROUPS.flatMap(g => g.items).find(i => i.href === currentPath)?.label || 'Command Center';

  return (
    <MarketingContext.Provider value={contextValue}>
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          height: '100%',
          minHeight: 0,
          transition: `background-color ${duration.slow} ${easing.DEFAULT}`,
        }}
      >
        <MarketingNav collapsed={collapsed} onToggleCollapse={handleToggleCollapse} isMobile={isMobile} />

        {isMobile && (
          <>
            <button
              onClick={() => setMobileSubNavOpen(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${space['2.5']} ${space['4']}`,
                backgroundColor: tc.background.surface,
                borderBottom: `1px solid ${tc.border.default}`,
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: tc.text.primary,
                border: 'none',
                borderBottomWidth: '1px',
                borderBottomStyle: 'solid',
                borderBottomColor: tc.border.default,
                cursor: 'pointer',
                width: '100%',
              }}
              data-testid="button-toggle-marketing-subnav-mobile"
            >
              <span>{currentLabel}</span>
              {mobileSubNavOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {mobileSubNavOpen && (
              <div
                style={{
                  backgroundColor: tc.background.surface,
                  borderBottom: `1px solid ${tc.border.default}`,
                  padding: `${space['2']} 0`,
                  maxHeight: '60vh',
                  overflowY: 'auto',
                }}
              >
                {NAV_GROUPS.map((group) => (
                  <div key={group.title} style={{ marginBottom: space['1'] }}>
                    <div
                      style={{
                        padding: `${space['1']} ${space['4']}`,
                        fontFamily: fontFamily.body,
                        fontSize: '11px',
                        fontWeight: fontWeight.medium,
                        color: tc.text.placeholder,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.05em',
                      }}
                    >
                      {group.title}
                    </div>
                    {group.items.map((item) => {
                      const isActive = currentPath === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: space['2.5'],
                            padding: `${space['2']} ${space['4']}`,
                            fontFamily: fontFamily.body,
                            fontSize: fontSize.sm,
                            fontWeight: isActive ? fontWeight.semibold : fontWeight.normal,
                            color: isActive ? tc.text.primary : tc.text.muted,
                            backgroundColor: isActive ? tc.background.muted : 'transparent',
                            textDecoration: 'none',
                            borderLeft: isActive ? `3px solid ${violet[500]}` : '3px solid transparent',
                          }}
                          data-testid={`nav-marketing-mobile-${item.href.split('/').pop()}`}
                        >
                          <Icon name={item.icon as any} size={16} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

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
