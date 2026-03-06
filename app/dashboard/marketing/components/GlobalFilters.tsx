'use client';

import React, { useState } from 'react';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { indigo, violet } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius, duration, easing } from '../../../../design/tokens/spacing';
import type { PeriodState, UIPreset } from '../lib/period';

export type ComparisonMode = 'prev' | 'wow' | 'mom';

export interface GlobalFilterState {
  period: PeriodState;
  comparisonMode: ComparisonMode;
  channel: string;
}

interface Props {
  state: PeriodState;
  onChange: (next: PeriodState) => void;
  comparisonMode?: ComparisonMode;
  onComparisonModeChange?: (mode: ComparisonMode) => void;
  channel?: string;
  onChannelChange?: (channel: string) => void;
  comparisonLabel?: string;
}

const PRESETS: { value: UIPreset; label: string }[] = [
  { value: 'last_7d', label: '7D' },
  { value: 'last_30d', label: '30D' },
  { value: 'last_90d', label: '90D' },
  { value: 'mtd', label: 'MTD' },
  { value: 'qtd', label: 'QTD' },
  { value: 'ytd', label: 'YTD' },
];

const COMPARISON_MODES: { value: ComparisonMode; label: string }[] = [
  { value: 'prev', label: 'Prev Period' },
  { value: 'wow', label: 'WoW' },
  { value: 'mom', label: 'MoM' },
];

const CHANNELS = [
  { value: '', label: 'All Channels' },
  { value: 'organic', label: 'Organic' },
  { value: 'paid', label: 'Paid' },
  { value: 'direct', label: 'Direct' },
  { value: 'email', label: 'Email' },
  { value: 'referral', label: 'Referral' },
];

export function GlobalFilters({
  state,
  onChange,
  comparisonMode = 'prev',
  onComparisonModeChange,
  channel = '',
  onChannelChange,
  comparisonLabel,
}: Props) {
  const tc = useThemeColors();
  const [rangeStart, setRangeStart] = useState(state.start);
  const [rangeEnd, setRangeEnd] = useState(state.end);
  const isCustom = state.mode === 'range';

  const selectPreset = (p: UIPreset) =>
    onChange({ ...state, mode: 'preset', preset: p, start: '', end: '' });

  const pillBase: React.CSSProperties = {
    padding: `${space['1']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    border: 'none',
    borderRadius: radius.full,
    cursor: 'pointer',
    transition: `all ${duration.normal} ${easing.DEFAULT}`,
    whiteSpace: 'nowrap' as const,
  };

  const pill = (active: boolean): React.CSSProperties => ({
    ...pillBase,
    backgroundColor: active ? indigo[950] : 'transparent',
    color: active ? '#fff' : tc.text.muted,
  });

  const selectStyle: React.CSSProperties = {
    padding: `${space['1']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: tc.text.secondary,
    backgroundColor: tc.background.muted,
    border: `1px solid ${tc.border.default}`,
    borderRadius: radius.md,
    cursor: 'pointer',
    outline: 'none',
  };

  const inputStyle: React.CSSProperties = {
    padding: `${space['1']} ${space['2.5']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    border: `1px solid ${tc.border.default}`,
    borderRadius: radius.md,
    color: tc.text.primary,
    backgroundColor: tc.background.surface,
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: space['3'],
        flexWrap: 'wrap',
        padding: `${space['3']} ${space['4']}`,
        backgroundColor: tc.background.surface,
        borderBottom: `1px solid ${tc.border.default}`,
        transition: `background-color ${duration.slow} ${easing.DEFAULT}`,
      }}
      data-testid="global-filters-bar"
    >
      <div
        style={{
          display: 'inline-flex',
          backgroundColor: tc.background.muted,
          borderRadius: radius.full,
          padding: space['0.5'],
          gap: '2px',
        }}
      >
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => selectPreset(p.value)}
            style={pill(!isCustom && state.preset === p.value)}
            data-testid={`filter-period-${p.value}`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => {
            if (isCustom) {
              onChange({ ...state, mode: 'preset', preset: 'last_30d', start: '', end: '' });
            } else {
              onChange({ ...state, mode: 'range' });
            }
          }}
          style={pill(isCustom)}
          data-testid="filter-period-custom"
        >
          Custom
        </button>
      </div>

      {isCustom && (
        <div style={{ display: 'flex', alignItems: 'center', gap: space['2'] }}>
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            style={inputStyle}
            data-testid="filter-date-start"
          />
          <span style={{ color: tc.text.muted, fontSize: fontSize.sm }}>to</span>
          <input
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            style={inputStyle}
            data-testid="filter-date-end"
          />
          <button
            onClick={() => {
              if (rangeStart && rangeEnd) {
                onChange({ ...state, mode: 'range', start: rangeStart, end: rangeEnd });
              }
            }}
            style={pill(true)}
            data-testid="filter-apply-range"
          >
            Apply
          </button>
        </div>
      )}

      <div style={{ width: 1, height: 20, backgroundColor: tc.border.default }} />

      <div
        style={{
          display: 'inline-flex',
          backgroundColor: tc.background.muted,
          borderRadius: radius.full,
          padding: space['0.5'],
          gap: '2px',
        }}
      >
        {COMPARISON_MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => onComparisonModeChange?.(m.value)}
            style={pill(comparisonMode === m.value)}
            data-testid={`filter-compare-${m.value}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 20, backgroundColor: tc.border.default }} />

      <select
        value={channel}
        onChange={(e) => onChannelChange?.(e.target.value)}
        style={selectStyle}
        data-testid="filter-channel"
      >
        {CHANNELS.map((ch) => (
          <option key={ch.value} value={ch.value}>
            {ch.label}
          </option>
        ))}
      </select>

      {channel && (
        <button
          onClick={() => onChannelChange?.('')}
          style={{
            ...pillBase,
            backgroundColor: violet[100],
            color: violet[700],
            border: `1px solid ${violet[200]}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: space['1'],
          }}
          data-testid="filter-channel-badge"
        >
          {CHANNELS.find(c => c.value === channel)?.label ?? channel}
          <span style={{ fontWeight: fontWeight.semibold, marginLeft: space['0.5'] }}>x</span>
        </button>
      )}

      <button
        onClick={() => onChange({ ...state, compare: !state.compare })}
        style={{
          ...pillBase,
          backgroundColor: state.compare ? violet[50] : 'transparent',
          color: state.compare ? violet[700] : tc.text.muted,
          border: `1px solid ${state.compare ? violet[200] : tc.border.default}`,
        }}
        data-testid="filter-toggle-compare"
      >
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: state.compare ? violet[500] : tc.border.strong,
            marginRight: space['1.5'],
            verticalAlign: 'middle',
          }}
        />
        Compare
      </button>

      {comparisonLabel && (
        <span
          style={{
            fontFamily: fontFamily.body,
            fontSize: fontSize.sm,
            color: indigo[600],
            fontWeight: fontWeight.medium,
          }}
          data-testid="text-comparison-label"
        >
          {comparisonLabel}
        </span>
      )}
    </div>
  );
}
