'use client';

import { createContext } from 'react';
import type { PeriodState } from './period';
import type { ComparisonMode } from '../components/GlobalFilters';
import { DEFAULT_STATE } from './period';

export const MarketingContext = createContext<{
  periodState: PeriodState;
  comparisonMode: ComparisonMode;
  channel: string;
  queryParams: Record<string, string>;
}>({
  periodState: DEFAULT_STATE,
  comparisonMode: 'prev',
  channel: '',
  queryParams: {},
});
