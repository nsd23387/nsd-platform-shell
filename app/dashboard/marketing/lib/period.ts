/**
 * URL-driven period state for the Marketing dashboard.
 * Parses/serializes query params and maps UI presets to backend params.
 */

export type UIMode = 'preset' | 'range';

export type UIPreset =
  | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  | 'last_7d' | 'last_30d' | 'last_90d' | 'mtd' | 'qtd' | 'ytd';

export interface PeriodState {
  mode: UIMode;
  preset: UIPreset;
  start: string;
  end: string;
  includeTimeseries: boolean;
  compare: boolean;
}

const LEGACY_MAP: Record<string, UIPreset> = {
  '7d': 'last_7d',
  '30d': 'last_30d',
  '90d': 'last_90d',
};

const BACKEND_PRESET_MAP: Record<string, string> = {
  daily: 'last_7d',
  weekly: 'last_7d',
  monthly: 'mtd',
  quarterly: 'qtd',
  yearly: 'ytd',
  last_7d: 'last_7d',
  last_30d: 'last_30d',
  last_90d: 'last_90d',
  mtd: 'mtd',
  qtd: 'qtd',
  ytd: 'ytd',
};

export const DEFAULT_STATE: PeriodState = {
  mode: 'preset',
  preset: 'monthly',
  start: '',
  end: '',
  includeTimeseries: false,
  compare: true,
};

export function parsePeriodState(): PeriodState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  const sp = new URLSearchParams(window.location.search);

  const start = sp.get('start') ?? '';
  const end = sp.get('end') ?? '';
  const presetParam = sp.get('preset');
  const legacyPeriod = sp.get('period');
  const includeTimeseries = sp.get('include_timeseries') === 'true';
  const compare = sp.get('compare') !== 'false';

  if (start && end) {
    return { mode: 'range', preset: 'monthly', start, end, includeTimeseries, compare };
  }

  if (presetParam && presetParam in BACKEND_PRESET_MAP) {
    return { mode: 'preset', preset: presetParam as UIPreset, start: '', end: '', includeTimeseries, compare };
  }

  if (legacyPeriod && legacyPeriod in LEGACY_MAP) {
    return { mode: 'preset', preset: LEGACY_MAP[legacyPeriod], start: '', end: '', includeTimeseries, compare };
  }

  return { ...DEFAULT_STATE, includeTimeseries, compare };
}

export function toBackendParams(state: PeriodState): Record<string, string> {
  const params: Record<string, string> = {};

  if (state.mode === 'range' && state.start && state.end) {
    params.start = state.start;
    params.end = state.end;
  } else {
    params.preset = BACKEND_PRESET_MAP[state.preset] ?? 'last_30d';
  }

  if (state.includeTimeseries) {
    params.include_timeseries = 'true';
  }

  return params;
}

export function updateUrl(state: PeriodState): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.search = '';

  if (state.mode === 'range' && state.start && state.end) {
    url.searchParams.set('start', state.start);
    url.searchParams.set('end', state.end);
  } else {
    url.searchParams.set('preset', state.preset);
  }

  if (state.includeTimeseries) url.searchParams.set('include_timeseries', 'true');
  if (!state.compare) url.searchParams.set('compare', 'false');

  window.history.replaceState({}, '', url.toString());
}
