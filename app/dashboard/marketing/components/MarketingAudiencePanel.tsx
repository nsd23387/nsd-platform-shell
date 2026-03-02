'use client';

import React from 'react';
import type { MarketingDeviceBreakdown, MarketingCountryBreakdown } from '../../../../types/activity-spine';
import { DashboardGrid, DashboardSection, EmptyStateCard } from '../../../../components/dashboard';
import { SkeletonCard } from '../../../../components/dashboard';
import { DonutChart } from '../../../../components/dashboard/charts';
import type { DonutChartItem } from '../../../../components/dashboard/charts';
import { formatNumber, formatPercent } from '../lib/format';
import { text, border, background, chartColors } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius, duration, easing } from '../../../../design/tokens/spacing';

interface Props {
  devices: MarketingDeviceBreakdown[];
  countries: MarketingCountryBreakdown[];
  loading: boolean;
  error: string | null;
}

const DEVICE_LABELS: Record<string, string> = {
  DESKTOP: 'Desktop',
  MOBILE: 'Mobile',
  TABLET: 'Tablet',
};

const DEVICE_COLORS = [chartColors[0], chartColors[2], chartColors[3]];

const COUNTRY_NAMES: Record<string, string> = {
  USA: 'United States', CAN: 'Canada', GBR: 'United Kingdom', AUS: 'Australia',
  DEU: 'Germany', FRA: 'France', NLD: 'Netherlands', ZAF: 'South Africa',
  IRL: 'Ireland', VNM: 'Vietnam', IND: 'India', BRA: 'Brazil',
  MEX: 'Mexico', ESP: 'Spain', ITA: 'Italy', JPN: 'Japan',
};

function DeviceCard({ devices }: { devices: MarketingDeviceBreakdown[] }) {
  const total = devices.reduce((sum, d) => sum + d.impressions, 0);
  const donutData: DonutChartItem[] = devices.map((d, i) => ({
    name: DEVICE_LABELS[d.device] ?? d.device,
    value: d.impressions,
    color: DEVICE_COLORS[i % DEVICE_COLORS.length],
  }));

  return (
    <div style={{ backgroundColor: background.surface, border: `1px solid ${border.default}`, borderRadius: radius.xl, padding: space['5'] }} data-testid="card-device-breakdown">
      <h3 style={{ fontFamily: fontFamily.display, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: text.primary, marginBottom: space['3'] }}>
        Device Breakdown
      </h3>
      <DonutChart
        data={donutData}
        height={180}
        innerRadius={50}
        outerRadius={75}
        formatValue={(v) => `${formatNumber(v)} (${total > 0 ? ((v / total) * 100).toFixed(1) : 0}%)`}
        centerValue={formatNumber(total)}
        centerLabel="Impressions"
      />
      <div style={{ display: 'flex', justifyContent: 'center', gap: space['4'], marginTop: space['3'] }}>
        {donutData.map((d) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: space['1.5'] }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: d.color, display: 'inline-block' }} />
            <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: text.muted }}>{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CountryCard({ countries }: { countries: MarketingCountryBreakdown[] }) {
  return (
    <div style={{ backgroundColor: background.surface, border: `1px solid ${border.default}`, borderRadius: radius.xl, padding: space['5'] }} data-testid="card-country-breakdown">
      <h3 style={{ fontFamily: fontFamily.display, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: text.primary, marginBottom: space['3'] }}>
        Top Countries
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${border.default}` }}>
            <th style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: text.muted, textAlign: 'left', padding: `${space['2']} 0` }}>Country</th>
            <th style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: text.muted, textAlign: 'right', padding: `${space['2']} 0` }}>Impressions</th>
            <th style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: text.muted, textAlign: 'right', padding: `${space['2']} 0` }}>Clicks</th>
            <th style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: text.muted, textAlign: 'right', padding: `${space['2']} 0` }}>CTR</th>
          </tr>
        </thead>
        <tbody>
          {countries.map((c) => (
            <tr
              key={c.country}
              style={{ borderBottom: `1px solid ${border.subtle}`, transition: `background-color ${duration.fast}` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = background.hover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              data-testid={`row-country-${c.country}`}
            >
              <td style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.primary, padding: `${space['2.5']} 0` }}>
                {COUNTRY_NAMES[c.country] ?? c.country}
              </td>
              <td style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.secondary, textAlign: 'right', padding: `${space['2.5']} 0` }}>
                {formatNumber(c.impressions)}
              </td>
              <td style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.secondary, textAlign: 'right', padding: `${space['2.5']} 0` }}>
                {formatNumber(c.clicks)}
              </td>
              <td style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.secondary, textAlign: 'right', padding: `${space['2.5']} 0` }}>
                {formatPercent(c.ctr)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MarketingAudiencePanel({ devices, countries, loading, error }: Props) {
  if (loading) {
    return (
      <DashboardSection title="Audience" description="Search audience by device type and geography.">
        <DashboardGrid columns={{ sm: 1, md: 2, lg: 2 }}>
          <SkeletonCard height={280} />
          <SkeletonCard height={280} />
        </DashboardGrid>
      </DashboardSection>
    );
  }
  if (error) return null;
  if (devices.length === 0 && countries.length === 0) {
    return (
      <DashboardSection title="Audience" description="Search audience by device type and geography.">
        <EmptyStateCard message="No audience data available." />
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title="Audience" description="Search audience by device type and geography.">
      <DashboardGrid columns={{ sm: 1, md: 2, lg: 2 }}>
        {devices.length > 0 && <DeviceCard devices={devices} />}
        {countries.length > 0 && <CountryCard countries={countries} />}
      </DashboardGrid>
    </DashboardSection>
  );
}
