'use client';

import React, { useState, useMemo, useContext } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { DashboardGrid } from '../../../../components/dashboard/DashboardGrid';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { MarketingContext } from '../lib/MarketingContext';
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';

function fmt(n: number, prefix = '') {
  if (!isFinite(n) || isNaN(n)) return '—';
  return prefix + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtCurrency(n: number) {
  if (!isFinite(n) || isNaN(n)) return '—';
  return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function ForecastingPage() {
  const tc = useThemeColors();
  const { data } = useContext(MarketingContext);

  const adsOverview = data?.google_ads_overview;
  const defaultCpc = adsOverview?.cpc ?? 3.5;

  const [budgetPerDay, setBudgetPerDay] = useState(100);
  const [cpc, setCpc] = useState(defaultCpc);
  const [clickToQuoteRate, setClickToQuoteRate] = useState(5);
  const [quoteCloseRate, setQuoteCloseRate] = useState(20);
  const [avgDealSize, setAvgDealSize] = useState(2500);
  const [marginPct, setMarginPct] = useState(40);

  const outputs = useMemo(() => {
    const clicksPerDay = cpc > 0 ? budgetPerDay / cpc : 0;
    const quotesPerDay = clicksPerDay * (clickToQuoteRate / 100);
    const salesPerDay = quotesPerDay * (quoteCloseRate / 100);
    const revenuePerMonth = salesPerDay * avgDealSize * 30;
    const grossProfitPerMonth = revenuePerMonth * (marginPct / 100);
    const spendPerMonth = budgetPerDay * 30;
    const breakEvenCpa = avgDealSize * (marginPct / 100);
    const recommendedBudgetLow = Math.round(breakEvenCpa * 0.5);
    const recommendedBudgetHigh = Math.round(breakEvenCpa * 1.5);
    return {
      clicksPerDay,
      quotesPerDay,
      salesPerDay,
      revenuePerMonth,
      grossProfitPerMonth,
      spendPerMonth,
      breakEvenCpa,
      recommendedBudgetLow,
      recommendedBudgetHigh,
    };
  }, [budgetPerDay, cpc, clickToQuoteRate, quoteCloseRate, avgDealSize, marginPct]);

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: tc.text.muted,
    marginBottom: space['1'],
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    border: `1px solid ${tc.border.default}`,
    borderRadius: radius.md,
    color: tc.text.primary,
    backgroundColor: tc.background.surface,
    outline: 'none',
  };

  const outputCard = (label: string, value: string, testId: string) => (
    <div
      style={{
        padding: space['4'],
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.lg,
        backgroundColor: tc.background.surface,
      }}
    >
      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary }} data-testid={testId}>
        {value}
      </p>
      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted, marginTop: space['1'] }}>{label}</p>
    </div>
  );

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <DrilldownBreadcrumb items={[{label:'Marketing', href:'/dashboard/marketing'}, {label:'System'}, {label:'Forecasting'}]} />
        <div style={{ marginBottom: space['6'] }}>
          <h1
            style={{
              fontFamily: fontFamily.display,
              fontSize: fontSize['3xl'],
              fontWeight: fontWeight.semibold,
              color: tc.text.primary,
              marginBottom: space['1'],
              lineHeight: lineHeight.snug,
            }}
            data-testid="text-page-title"
          >
            Forecasting & Targets
          </h1>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
            What-if calculator for budget planning and revenue targets.
          </p>
        </div>

        <DashboardSection title="Inputs" description="Adjust parameters to model different scenarios.">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: space['4'],
              padding: space['5'],
              border: `1px solid ${tc.border.default}`,
              borderRadius: radius.lg,
              backgroundColor: tc.background.surface,
              marginBottom: space['6'],
            }}
            data-testid="forecast-inputs"
          >
            <div>
              <label style={labelStyle}>Budget / Day ($)</label>
              <input type="number" style={inputStyle} value={budgetPerDay} onChange={(e) => setBudgetPerDay(Number(e.target.value))} data-testid="input-budget-day" />
            </div>
            <div>
              <label style={labelStyle}>CPC ($)</label>
              <input type="number" step="0.1" style={inputStyle} value={cpc} onChange={(e) => setCpc(Number(e.target.value))} data-testid="input-cpc" />
            </div>
            <div>
              <label style={labelStyle}>Click-to-Quote Rate (%)</label>
              <input type="number" step="0.5" style={inputStyle} value={clickToQuoteRate} onChange={(e) => setClickToQuoteRate(Number(e.target.value))} data-testid="input-click-quote-rate" />
            </div>
            <div>
              <label style={labelStyle}>Quote Close Rate (%)</label>
              <input type="number" step="1" style={inputStyle} value={quoteCloseRate} onChange={(e) => setQuoteCloseRate(Number(e.target.value))} data-testid="input-quote-close-rate" />
            </div>
            <div>
              <label style={labelStyle}>Avg Deal Size ($)</label>
              <input type="number" style={inputStyle} value={avgDealSize} onChange={(e) => setAvgDealSize(Number(e.target.value))} data-testid="input-avg-deal" />
            </div>
            <div>
              <label style={labelStyle}>Margin (%)</label>
              <input type="number" step="1" style={inputStyle} value={marginPct} onChange={(e) => setMarginPct(Number(e.target.value))} data-testid="input-margin" />
            </div>
          </div>
        </DashboardSection>

        <DashboardSection title="Projected Outputs" description="Computed from your inputs above.">
          <DashboardGrid columns={{ sm: 2, md: 3, lg: 4 }}>
            {outputCard('Clicks / Day', fmt(outputs.clicksPerDay), 'text-clicks-day')}
            {outputCard('Quotes / Day', fmt(outputs.quotesPerDay), 'text-quotes-day')}
            {outputCard('Sales / Day', fmt(outputs.salesPerDay), 'text-sales-day')}
            {outputCard('Revenue / Month', fmtCurrency(outputs.revenuePerMonth), 'text-revenue-month')}
            {outputCard('Gross Profit / Month', fmtCurrency(outputs.grossProfitPerMonth), 'text-profit-month')}
            {outputCard('Ad Spend / Month', fmtCurrency(outputs.spendPerMonth), 'text-spend-month')}
            {outputCard('Break-Even CPA', fmtCurrency(outputs.breakEvenCpa), 'text-breakeven-cpa')}
            {outputCard('Recommended Budget Band', `${fmtCurrency(outputs.recommendedBudgetLow)} - ${fmtCurrency(outputs.recommendedBudgetHigh)}`, 'text-budget-band')}
          </DashboardGrid>
        </DashboardSection>
      </div>
    </DashboardGuard>
  );
}
