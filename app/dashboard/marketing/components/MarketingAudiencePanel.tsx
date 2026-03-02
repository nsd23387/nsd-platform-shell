'use client';

import React from 'react';
import type { MarketingDeviceBreakdown, MarketingCountryBreakdown } from '../../../../types/activity-spine';
import { DashboardGrid, DashboardSection, EmptyStateCard } from '../../../../components/dashboard';
import { formatNumber, formatPercent } from '../lib/format';
import { text, border, background, chartColors } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

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

const COUNTRY_NAMES: Record<string, string> = {
  USA: 'United States', CAN: 'Canada', GBR: 'United Kingdom', AUS: 'Australia',
  DEU: 'Germany', FRA: 'France', NLD: 'Netherlands', ZAF: 'South Africa',
  IRL: 'Ireland', VNM: 'Vietnam', IND: 'India', BRA: 'Brazil',
  MEX: 'Mexico', ESP: 'Spain', ITA: 'Italy', JPN: 'Japan',
};

function barStyle(pct: number, color: string): React.CSSProperties {
  return {
    height: '8px',
    width: `${Math.max(pct, 2)}%`,
    backgroundColor: color,
    borderRadius: radius.full,
    transition: 'width 0.3s ease',
  };
}

function DeviceCard({ devices }: { devices: MarketingDeviceBreakdown[] }) {
  const total = devices.reduce((sum, d) => sum + d.impressions, 0);

  return (
    <div style={{ backgroundColor: background.surface, border: `1px solid ${border.default}`, borderRadius: radius.xl, padding: space['5'] }} data-testid="card-device-breakdown">
      <h3 style={{ fontFamily: fontFamily.display, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: text.primary, marginBottom: space['4'] }}>
        Device Breakdown
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: space['3'] }}>
        {devices.map((d, i) => {
          const pct = total > 0 ? (d.impressions / total) * 100 : 0;
          return (
            <div key={d.device} data-testid={`row-device-${d.device}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: space['1'] }}>
                <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.primary }}>
                  {DEVICE_LABELS[d.device] ?? d.device}
                </span>
                <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted }}>
                  {formatNumber(d.impressions)} ({pct.toFixed(1)}%)
                </span>
              </div>
              <div style={{ backgroundColor: border.subtle, borderRadius: radius.full, height: '8px' }}>
                <div style={barStyle(pct, chartColors[i % chartColors.length])} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: space['3'], paddingTop: space['3'], borderTop: `1px solid ${border.subtle}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: text.muted }}>Total Impressions</span>
          <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: text.primary }}>{formatNumber(total)}</span>
        </div>
      </div>
    </div>
  );
}

function CountryCard({ countries }: { countries: MarketingCountryBreakdown[] }) {
  return (
    <div style={{ backgroundColor: background.surface, border: `1px solid ${border.default}`, borderRadius: radius.xl, padding: space['5'] }} data-testid="card-country-breakdown">
      <h3 style={{ fontFamily: fontFamily.display, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: text.primary, marginBottom: space['4'] }}>
        Top Countries
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${border.default}` }}>
            <th style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: text.muted, textAlign: 'left', padding: `${space['2']} 0` }}>Country</th>
            <th style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: text.muted, textAlign: 'right', padding: `${space['2']} 0` }}>Impressions</th>
            <th style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: text.muted, textAlign: 'right', padding: `${space['2']} 0` }}>Clicks</th>
            <th style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: text.muted, textAlign: 'right', padding: `${space['2']} 0` }}>CTR</th>
          </tr>
        </thead>
        <tbody>
          {countries.map((c) => (
            <tr key={c.country} style={{ borderBottom: `1px solid ${border.subtle}` }} data-testid={`row-country-${c.country}`}>
              <td style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.primary, padding: `${space['2']} 0` }}>
                {COUNTRY_NAMES[c.country] ?? c.country}
              </td>
              <td style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.secondary, textAlign: 'right', padding: `${space['2']} 0` }}>
                {formatNumber(c.impressions)}
              </td>
              <td style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.secondary, textAlign: 'right', padding: `${space['2']} 0` }}>
                {formatNumber(c.clicks)}
              </td>
              <td style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.secondary, textAlign: 'right', padding: `${space['2']} 0` }}>
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
  if (loading || error) return null;
  if (devices.length === 0 && countries.length === 0) {
    return (
      <DashboardSection title="Audience" description="Search audience by device type and geography.">
        <EmptyStateCard message="No audience data available." />
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title="Audience" description="Search audience by device type and geography.">
      <DashboardGrid columns={2}>
        <DeviceCard devices={devices} />
        <CountryCard countries={countries} />
      </DashboardGrid>
    </DashboardSection>
  );
}
