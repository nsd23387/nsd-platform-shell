'use client';

import { useWizard } from '../WizardContext';

export function StepBasics() {
  const { data, updateData } = useWizard();

  return (
    <div>
      <h2
        style={{
          margin: '0 0 8px 0',
          fontSize: '24px',
          fontWeight: 600,
          color: '#1e1e4a',
          fontFamily: 'var(--font-display, Poppins, sans-serif)',
        }}
      >
        Campaign Basics
      </h2>
      <p
        style={{
          margin: '0 0 32px 0',
          fontSize: '14px',
          color: '#6b7280',
          fontFamily: 'var(--font-body, Inter, sans-serif)',
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
              color: '#374151',
              marginBottom: '8px',
              fontFamily: 'var(--font-body, Inter, sans-serif)',
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
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              fontFamily: 'var(--font-body, Inter, sans-serif)',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '8px',
              fontFamily: 'var(--font-body, Inter, sans-serif)',
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
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'var(--font-body, Inter, sans-serif)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
