import type { MetricKey } from './metricTypes';

export type { MetricKey };

const MONTHLY_TARGETS: Record<string, { value: number; label: string }> = {
  sessions: { value: 10000, label: 'Sessions Target' },
  submissions: { value: 150, label: 'Submissions Target' },
  pipeline_value_usd: { value: 50000, label: 'Pipeline Target' },
  impressions: { value: 200000, label: 'Impressions Target' },
  clicks: { value: 5000, label: 'Clicks Target' },
};

export const GOOGLE_ADS_TARGETS = {
  roas: 3.0,
  monthly_budget_usd: 5000,
  cpc_target_usd: 2.50,
  ctr_target_pct: 5.0,
};

export function getTargetForMetric(
  metric: string,
  daysInPeriod: number = 30
): { daily: number; monthly: number; label: string } | null {
  const entry = MONTHLY_TARGETS[metric];
  if (!entry) return null;
  return {
    daily: entry.value / daysInPeriod,
    monthly: entry.value,
    label: entry.label,
  };
}

export function getDailyBudgetTarget(daysInPeriod: number = 30): number {
  return GOOGLE_ADS_TARGETS.monthly_budget_usd / daysInPeriod;
}
