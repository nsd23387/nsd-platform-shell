'use client';

import React, { useState } from 'react';
import { background, text, border, semantic } from '../../../../design/tokens/colors';
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

function segBtn(active: boolean, isLast: boolean): React.CSSProperties {
  return {
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    backgroundColor: active ? text.primary : background.surface,
    color: active ? text.inverse : text.secondary,
    border: 'none',
    borderRight: isLast ? 'none' : `1px solid ${border.default}`,
    cursor: 'pointer',
    transition: `all ${duration.normal} ${easing.DEFAULT}`,
  };
}

function pillBtn(active: boolean): React.CSSProperties {
  return {
    padding: `${space['1.5']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    backgroundColor: active ? semantic.info.light : background.surface,
    color: active ? semantic.info.dark : text.muted,
    border: `1px solid ${active ? semantic.info.base : border.default}`,
    borderRadius: radius.full,
    cursor: 'pointer',
    transition: `all ${duration.normal} ${easing.DEFAULT}`,
  };
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
    <div style={{ marginBottom: space['8'], paddingBottom: space['6'], borderBottom: `1px solid ${border.default}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: space['4'] }}>
        <div>
          <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['4xl'], fontWeight: fontWeight.semibold, color: text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }}>
            Marketing
          </h1>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: text.muted, lineHeight: lineHeight.normal }}>
            SEO and inbound performance with period-safe attribution and pipeline value.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: space['3'], flexWrap: 'wrap' }}>
          {/* Preset selector */}
          <div style={{ display: 'inline-flex', border: `1px solid ${border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
            {PRESETS.map((p, i) => (
              <button key={p.value} onClick={() => selectPreset(p.value)} style={segBtn(!isCustom && state.preset === p.value, false)}>
                {p.label}
              </button>
            ))}
            <button onClick={toggleCustom} style={segBtn(isCustom, true)}>Custom</button>
          </div>

          {/* Toggles */}
          <button onClick={() => onChange({ ...state, compare: !state.compare })} style={pillBtn(state.compare)}>
            Compare
          </button>
          <button onClick={() => onChange({ ...state, includeTimeseries: !state.includeTimeseries })} style={pillBtn(state.includeTimeseries)}>
            Timeseries
          </button>
        </div>
      </div>

      {/* Custom range inputs */}
      {isCustom && (
        <div style={{ display: 'flex', alignItems: 'center', gap: space['3'], marginTop: space['4'] }}>
          <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)}
            style={{ padding: `${space['1.5']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, border: `1px solid ${border.default}`, borderRadius: radius.md, color: text.primary }} />
          <span style={{ color: text.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm }}>to</span>
          <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)}
            style={{ padding: `${space['1.5']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, border: `1px solid ${border.default}`, borderRadius: radius.md, color: text.primary }} />
          <button onClick={applyRange}
            style={{ ...pillBtn(true), backgroundColor: text.primary, color: text.inverse, borderColor: text.primary }}>
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
