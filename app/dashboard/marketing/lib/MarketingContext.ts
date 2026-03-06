'use client';

import { createContext } from 'react';
import type { PeriodState } from './period';
import type { ComparisonMode } from '../components/GlobalFilters';
import type { MarketingOverviewResponse } from '../../../../types/activity-spine';
import { DEFAULT_STATE } from './period';

export interface MarketingContextValue {
  periodState: PeriodState;
  comparisonMode: ComparisonMode;
  channel: string;
  queryParams: Record<string, string>;
  data: MarketingOverviewResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const MarketingContext = createContext<MarketingContextValue>({
  periodState: DEFAULT_STATE,
  comparisonMode: 'prev',
  channel: '',
  queryParams: {},
  data: null,
  loading: true,
  error: null,
  refetch: () => {},
});
