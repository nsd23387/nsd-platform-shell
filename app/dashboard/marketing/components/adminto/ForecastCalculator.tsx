'use client';

import { useState, useMemo, useCallback } from 'react';
import { useThemeColors } from '../../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../../design/tokens/typography';
import { space, radius } from '../../../../../design/tokens/spacing';

export interface ForecastInput {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
  prefix?: string;
}

export interface ForecastOutput {
  key: string;
  label: string;
  compute: (inputs: Record<string, number>) => number;
  format?: (value: number) => string;
}

export interface ForecastCalculatorProps {
  inputs: ForecastInput[];
  outputs: ForecastOutput[];
  title?: string;
}

function defaultFormat(v: number): string {
  if (Math.abs(v) >= 1000) {
    return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function ForecastCalculator({
  inputs,
  outputs,
  title = 'Forecast Calculator',
}: ForecastCalculatorProps) {
  const tc = useThemeColors();

  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    inputs.forEach((inp) => {
      init[inp.key] = inp.defaultValue;
    });
    return init;
  });

  const handleChange = useCallback((key: string, val: number) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  }, []);

  const computedOutputs = useMemo(
    () =>
      outputs.map((out) => ({
        ...out,
        value: out.compute(values),
      })),
    [outputs, values],
  );

  return (
    <div
      data-testid="forecast-calculator"
      style={{
        backgroundColor: tc.background.surface,
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.lg,
        overflow: 'hidden',
      }}
    >
      {title && (
        <div
          style={{
            padding: `${space['4']} ${space['5']}`,
            borderBottom: `1px solid ${tc.border.default}`,
          }}
        >
          <span
            style={{
              fontFamily: fontFamily.display,
              fontSize: fontSize.lg,
              fontWeight: fontWeight.medium,
              color: tc.text.primary,
            }}
          >
            {title}
          </span>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
        }}
      >
        <div style={{ padding: space['5'], borderRight: `1px solid ${tc.border.default}` }}>
          <div
            style={{
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              color: tc.text.muted,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              marginBottom: space['4'],
            }}
          >
            Inputs
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: space['5'] }}>
            {inputs.map((inp) => (
              <div key={inp.key}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: space['2'],
                    gap: space['2'],
                  }}
                >
                  <label
                    style={{
                      fontFamily: fontFamily.body,
                      fontSize: fontSize.md,
                      fontWeight: fontWeight.medium,
                      color: tc.text.secondary,
                    }}
                  >
                    {inp.label}
                  </label>
                  <span
                    data-testid={`forecast-input-value-${inp.key}`}
                    style={{
                      fontFamily: fontFamily.body,
                      fontSize: fontSize.base,
                      fontWeight: fontWeight.semibold,
                      color: tc.text.primary,
                    }}
                  >
                    {inp.prefix}
                    {values[inp.key].toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    {inp.unit}
                  </span>
                </div>
                <input
                  data-testid={`input-forecast-${inp.key}`}
                  type="range"
                  min={inp.min}
                  max={inp.max}
                  step={inp.step}
                  value={values[inp.key]}
                  onChange={(e) => handleChange(inp.key, Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: tc.chartColors[0],
                    cursor: 'pointer',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: fontFamily.body,
                    fontSize: fontSize.sm,
                    color: tc.text.muted,
                    marginTop: space['0.5'],
                  }}
                >
                  <span>
                    {inp.prefix}
                    {inp.min}
                    {inp.unit}
                  </span>
                  <span>
                    {inp.prefix}
                    {inp.max}
                    {inp.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: space['5'], backgroundColor: tc.background.muted }}>
          <div
            style={{
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              color: tc.text.muted,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              marginBottom: space['4'],
            }}
          >
            Projected Outputs
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: space['4'] }}>
            {computedOutputs.map((out) => (
              <div
                key={out.key}
                data-testid={`forecast-output-${out.key}`}
                style={{
                  padding: space['4'],
                  backgroundColor: tc.background.surface,
                  border: `1px solid ${tc.border.default}`,
                  borderRadius: radius.md,
                }}
              >
                <div
                  style={{
                    fontFamily: fontFamily.body,
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.medium,
                    color: tc.text.muted,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.04em',
                    marginBottom: space['1'],
                  }}
                >
                  {out.label}
                </div>
                <div
                  style={{
                    fontFamily: fontFamily.body,
                    fontSize: fontSize['3xl'],
                    fontWeight: fontWeight.semibold,
                    color: tc.text.primary,
                    lineHeight: lineHeight.tight,
                  }}
                >
                  {(out.format || defaultFormat)(out.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
