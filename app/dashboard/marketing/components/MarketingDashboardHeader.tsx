'use client';

import React, { useState } from 'react';
import { background, text, border, violet, indigo } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius, duration, easing } from '../../../../design/tokens/spacing';
import type { PeriodState, UIPreset } from '../lib/period';

interface Props {
  state: PeriodState;
  onChange: (next: PeriodState) => void;
}

const PRESETS: { value: UIPreset; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: `${space['1.5']} ${space['4']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    backgroundColor: active ? indigo[950] : 'transparent',
    color: active ? '#fff' : text.muted,
    border: 'none',
    borderRadius: radius.full,
    cursor: 'pointer',
    transition: `all ${duration.slow} ${easing.DEFAULT}`,
    whiteSpace: 'nowrap' as const,
  };
}

function toggleStyle(active: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space['2'],
    padding: `${space['1.5']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    backgroundColor: active ? violet[50] : 'transparent',
    color: active ? violet[700] : text.muted,
    border: `1px solid ${active ? violet[200] : border.default}`,
    borderRadius: radius.full,
    cursor: 'pointer',
    transition: `all ${duration.normal} ${easing.DEFAULT}`,
  };
}

function ToggleDot({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      backgroundColor: active ? violet[500] : border.strong,
      transition: `background-color ${duration.normal} ${easing.DEFAULT}`,
    }} />
  );
}

export function MarketingDashboardHeader({ state, onChange }: Props) {
  const [rangeStart, setRangeStart] = useState(state.start);
  const [rangeEnd, setRangeEnd] = useState(state.end);
  const isCustom = state.mode === 'range';

  const selectPreset = (p: UIPreset) => onChange({ ...state, mode: 'preset', preset: p, start: '', end: '' });
  const toggleCustom = () => {
    if (isCustom) {
      onChange({ ...state, mode: 'preset', preset: 'monthly', start: '', end: '' });
    } else {
      onChange({ ...state, mode: 'range' });
    }
  };
  const applyRange = () => {
    if (rangeStart && rangeEnd) onChange({ ...state, mode: 'range', start: rangeStart, end: rangeEnd });
  };

  return (
    <div style={{ marginBottom: space['8'], paddingBottom: space['6'] }} data-testid="header-marketing">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: space['4'] }}>
        <div>
          <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['4xl'], fontWeight: fontWeight.semibold, color: text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }}>
            Marketing
          </h1>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: text.muted, lineHeight: lineHeight.normal }}>
            SEO and inbound performance with period-safe attribution and pipeline value.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: space['3'], flexWrap: 'wrap', marginTop: space['5'] }}>
        <div style={{
          display: 'inline-flex',
          backgroundColor: background.muted,
          borderRadius: radius.full,
          padding: space['0.5'],
          gap: space['0.5'],
        }}>
          {PRESETS.map((p) => (
            <button key={p.value} onClick={() => selectPreset(p.value)} style={pillStyle(!isCustom && state.preset === p.value)} data-testid={`period-${p.value}`}>
              {p.label}
            </button>
          ))}
          <button onClick={toggleCustom} style={pillStyle(isCustom)} data-testid="period-custom">Custom</button>
        </div>

        <div style={{ display: 'flex', gap: space['2'] }}>
          <button onClick={() => onChange({ ...state, compare: !state.compare })} style={toggleStyle(state.compare)} data-testid="toggle-compare">
            <ToggleDot active={state.compare} />
            Compare
          </button>
          <button onClick={() => onChange({ ...state, includeTimeseries: !state.includeTimeseries })} style={toggleStyle(state.includeTimeseries)} data-testid="toggle-timeseries">
            <ToggleDot active={state.includeTimeseries} />
            Timeseries
          </button>
        </div>
      </div>

      {isCustom && (
        <div style={{ display: 'flex', alignItems: 'center', gap: space['3'], marginTop: space['4'] }}>
          <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)}
            style={{ padding: `${space['2']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, border: `1px solid ${border.default}`, borderRadius: radius.lg, color: text.primary, backgroundColor: background.surface }}
            data-testid="input-range-start" />
          <span style={{ color: text.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm }}>to</span>
          <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)}
            style={{ padding: `${space['2']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, border: `1px solid ${border.default}`, borderRadius: radius.lg, color: text.primary, backgroundColor: background.surface }}
            data-testid="input-range-end" />
          <button onClick={applyRange}
            style={{ ...pillStyle(true), padding: `${space['2']} ${space['5']}` }}
            data-testid="button-apply-range">
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
