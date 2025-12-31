'use client';

import { useWizard } from '../WizardContext';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../../lib/design-tokens';

export function StepBasics() {
  const { data, updateData } = useWizard();

  return (
    <div>
      <h2
        style={{
          margin: '0 0 8px 0',
          fontSize: '24px',
          fontWeight: 600,
          color: NSD_COLORS.primary,
          fontFamily: NSD_TYPOGRAPHY.fontDisplay,
        }}
      >
        Campaign Basics
      </h2>
      <p
        style={{
          margin: '0 0 32px 0',
          fontSize: '14px',
          color: NSD_COLORS.text.secondary,
          fontFamily: NSD_TYPOGRAPHY.fontBody,
        }}
      >
        Start by giving your campaign a name and description.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: NSD_COLORS.text.primary,
              marginBottom: '8px',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
            }}
          >
            Campaign Name *
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => updateData({ name: e.target.value })}
            placeholder="e.g., Q1 Enterprise Outreach"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '14px',
              border: `1px solid ${NSD_COLORS.border.default}`,
              borderRadius: NSD_RADIUS.md,
              outline: 'none',
              transition: 'border-color 0.2s ease',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: NSD_COLORS.text.primary,
              marginBottom: '8px',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
            }}
          >
            Description
          </label>
          <textarea
            value={data.description}
            onChange={(e) => updateData({ description: e.target.value })}
            placeholder="Describe the goals and target audience for this campaign..."
            rows={4}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '14px',
              border: `1px solid ${NSD_COLORS.border.default}`,
              borderRadius: NSD_RADIUS.md,
              outline: 'none',
              resize: 'vertical',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
            }}
          />
        </div>
      </div>
    </div>
  );
}
