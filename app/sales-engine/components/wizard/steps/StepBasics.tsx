'use client';

import { useWizard } from '../WizardContext';
import { background, text, border } from '../../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../../design/tokens/typography';

export function StepBasics() {
  const { state, dispatch } = useWizard();

  return (
    <div>
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{
          margin: 0,
          fontSize: fontSize['2xl'],
          fontWeight: fontWeight.semibold,
          color: text.primary,
          fontFamily: fontFamily.display,
        }}>
          Campaign Details
        </h2>
        <p style={{
          margin: '12px 0 0 0',
          fontSize: fontSize.base,
          color: text.secondary,
          fontFamily: fontFamily.body,
          lineHeight: 1.6,
        }}>
          Start by giving your campaign a clear name and description. This helps your team 
          identify and manage campaigns effectively.
        </p>
      </div>

      <div style={{ maxWidth: '560px' }}>
        <div style={{ marginBottom: '32px' }}>
          <label style={{
            display: 'block',
            marginBottom: '12px',
            fontSize: fontSize.sm,
            fontWeight: fontWeight.medium,
            color: text.primary,
            fontFamily: fontFamily.body,
          }}>
            Campaign Name
            <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
          </label>
          <input
            type="text"
            value={state.name}
            onChange={(e) => dispatch({ type: 'SET_NAME', name: e.target.value })}
            placeholder="e.g., Q1 Retail Outreach"
            style={{
              width: '100%',
              padding: '16px 20px',
              fontSize: fontSize.base,
              fontFamily: fontFamily.body,
              backgroundColor: background.surface,
              border: `1px solid ${border.default}`,
              borderRadius: '12px',
              color: text.primary,
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
            onBlur={(e) => e.target.style.borderColor = border.default}
          />
          <p style={{
            margin: '8px 0 0 0',
            fontSize: fontSize.xs,
            color: text.muted,
            fontFamily: fontFamily.body,
          }}>
            Choose a descriptive name that reflects your campaign goals
          </p>
        </div>

        <div>
          <label style={{
            display: 'block',
            marginBottom: '12px',
            fontSize: fontSize.sm,
            fontWeight: fontWeight.medium,
            color: text.primary,
            fontFamily: fontFamily.body,
          }}>
            Description
            <span style={{ color: text.muted, marginLeft: '8px', fontWeight: fontWeight.normal }}>(optional)</span>
          </label>
          <textarea
            value={state.description}
            onChange={(e) => dispatch({ type: 'SET_DESCRIPTION', description: e.target.value })}
            placeholder="Describe your campaign goals, target audience, and expected outcomes..."
            rows={5}
            style={{
              width: '100%',
              padding: '16px 20px',
              fontSize: fontSize.base,
              fontFamily: fontFamily.body,
              backgroundColor: background.surface,
              border: `1px solid ${border.default}`,
              borderRadius: '12px',
              color: text.primary,
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              lineHeight: 1.6,
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
            onBlur={(e) => e.target.style.borderColor = border.default}
          />
        </div>
      </div>
    </div>
  );
}
