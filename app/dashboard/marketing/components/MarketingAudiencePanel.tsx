'use client';

import React from 'react';
import type { MarketingDeviceBreakdown, MarketingCountryBreakdown } from '../../../../types/activity-spine';
import { DashboardGrid, DashboardSection, EmptyStateCard } from '../../../../components/dashboard';
import { SkeletonCard } from '../../../../components/dashboard';
import { DonutChart } from '../../../../components/dashboard/charts';
import type { DonutChartItem } from '../../../../components/dashboard/charts';
import { formatNumber, formatPercent } from '../lib/format';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius, duration } from '../../../../design/tokens/spacing';

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

const COUNTRY_DISPLAY: Record<string, string> = {
  US: 'United States', USA: 'United States', 'UNITED STATES': 'United States',
  CA: 'Canada', CAN: 'Canada', CANADA: 'Canada',
  GB: 'United Kingdom', GBR: 'United Kingdom', 'UNITED KINGDOM': 'United Kingdom',
  AU: 'Australia', AUS: 'Australia', AUSTRALIA: 'Australia',
  DE: 'Germany', DEU: 'Germany', GERMANY: 'Germany',
  FR: 'France', FRA: 'France', FRANCE: 'France',
  NL: 'Netherlands', NLD: 'Netherlands', NETHERLANDS: 'Netherlands',
  ZA: 'South Africa', ZAF: 'South Africa', 'SOUTH AFRICA': 'South Africa',
  IE: 'Ireland', IRL: 'Ireland', IRELAND: 'Ireland',
  VN: 'Vietnam', VNM: 'Vietnam', VIETNAM: 'Vietnam',
  IN: 'India', IND: 'India', INDIA: 'India',
  BR: 'Brazil', BRA: 'Brazil', BRAZIL: 'Brazil',
  MX: 'Mexico', MEX: 'Mexico', MEXICO: 'Mexico',
  ES: 'Spain', ESP: 'Spain', SPAIN: 'Spain',
  IT: 'Italy', ITA: 'Italy', ITALY: 'Italy',
  JP: 'Japan', JPN: 'Japan', JAPAN: 'Japan',
  CN: 'China', CHN: 'China', CHINA: 'China',
  SG: 'Singapore', SGP: 'Singapore', SINGAPORE: 'Singapore',
  PH: 'Philippines', PHL: 'Philippines', PHILIPPINES: 'Philippines',
  KR: 'South Korea', KOR: 'South Korea', 'SOUTH KOREA': 'South Korea',
  TW: 'Taiwan', TWN: 'Taiwan', TAIWAN: 'Taiwan',
};

function formatCountry(raw: string): string {
  const upper = raw.toUpperCase().trim();
  if (COUNTRY_DISPLAY[upper]) return COUNTRY_DISPLAY[upper];
  return raw
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function DeviceCard({ devices }: { devices: MarketingDeviceBreakdown[] }) {
  const tc = useThemeColors();
  const DEVICE_COLORS = [tc.chartColors[0], tc.chartColors[2], tc.chartColors[3]];
  const isGA4 = devices[0]?.source === 'ga4';
  const metricLabel = isGA4 ? 'Sessions' : 'Impressions';
  const total = devices.reduce((sum, d) => sum + (isGA4 ? d.sessions : d.impressions), 0);
  const donutData: DonutChartItem[] = devices.map((d, i) => ({
    name: DEVICE_LABELS[d.device.toUpperCase()] ?? d.device,
    value: isGA4 ? d.sessions : d.impressions,
    color: DEVICE_COLORS[i % DEVICE_COLORS.length],
  }));

  return (
    <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.xl, padding: space['5'] }} data-testid="card-device-breakdown">
      <h3 style={{ fontFamily: fontFamily.display, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['3'] }}>
        Device Breakdown
      </h3>
      <DonutChart
        data={donutData}
        height={180}
        innerRadius={50}
        outerRadius={75}
        formatValue={(v) => `${formatNumber(v)} (${total > 0 ? ((v / total) * 100).toFixed(1) : 0}%)`}
        centerValue={formatNumber(total)}
        centerLabel={metricLabel}
      />
      <div style={{ display: 'flex', justifyContent: 'center', gap: space['4'], marginTop: space['3'] }}>
        {donutData.map((d) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: space['1.5'] }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: d.color, display: 'inline-block' }} />
            <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>{d.name}</span>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: space['2'] }}>
        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
          Source: {isGA4 ? 'Google Analytics' : 'Search Console'}
        </span>
      </div>
    </div>
  );
}

function CountryCard({ countries }: { countries: MarketingCountryBreakdown[] }) {
  const tc = useThemeColors();
  const isGA4 = countries[0]?.source === 'ga4';
  const primaryMetric = isGA4 ? 'Sessions' : 'Impressions';
  const secondaryMetric = isGA4 ? 'Page Views' : 'Clicks';

  return (
    <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.xl, padding: space['5'] }} data-testid="card-country-breakdown">
      <h3 style={{ fontFamily: fontFamily.display, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['3'] }}>
        Top Countries
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${tc.border.default}` }}>
            <th style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left', padding: `${space['2']} 0` }}>Country</th>
            <th style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'right', padding: `${space['2']} 0` }}>{primaryMetric}</th>
            <th style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'right', padding: `${space['2']} 0` }}>{secondaryMetric}</th>
            {!isGA4 && (
              <th style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'right', padding: `${space['2']} 0` }}>CTR</th>
            )}
          </tr>
        </thead>
        <tbody>
          {countries.map((c) => (
            <tr
              key={c.country}
              style={{ borderBottom: `1px solid ${tc.border.subtle}`, transition: `background-color ${duration.fast}` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = tc.background.hover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              data-testid={`row-country-${c.country}`}
            >
              <td style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary, padding: `${space['2.5']} 0` }}>
                {formatCountry(c.country)}
              </td>
              <td style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, textAlign: 'right', padding: `${space['2.5']} 0` }}>
                {formatNumber(isGA4 ? c.sessions : c.impressions)}
              </td>
              <td style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, textAlign: 'right', padding: `${space['2.5']} 0` }}>
                {formatNumber(isGA4 ? c.page_views : c.clicks)}
              </td>
              {!isGA4 && (
                <td style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, textAlign: 'right', padding: `${space['2.5']} 0` }}>
                  {formatPercent(c.ctr)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ textAlign: 'right', marginTop: space['2'] }}>
        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
          Source: {isGA4 ? 'Google Analytics' : 'Search Console'}
        </span>
      </div>
    </div>
  );
}

export function MarketingAudiencePanel({ devices, countries, loading, error }: Props) {
  if (loading) {
    return (
      <DashboardSection title="Audience" description="Audience breakdown by device type and geography.">
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
      <DashboardSection title="Audience" description="Audience breakdown by device type and geography.">
        <EmptyStateCard message="No audience data available." />
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title="Audience" description="Audience breakdown by device type and geography.">
      <DashboardGrid columns={{ sm: 1, md: 2, lg: 2 }}>
        {devices.length > 0 && <DeviceCard devices={devices} />}
        {countries.length > 0 && <CountryCard countries={countries} />}
      </DashboardGrid>
    </DashboardSection>
  );
}
