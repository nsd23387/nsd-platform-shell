'use client';

import type { CampaignVariant } from '../types/campaign';

interface VariantsDisplayProps {
  variants: CampaignVariant[];
}

export function VariantsDisplay({ variants }: VariantsDisplayProps) {
  if (variants.length === 0) {
    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}
      >
        <h4
          style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
          }}
        >
          Personalization Variants
        </h4>
        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', textAlign: 'center', padding: '24px' }}>
          No variants configured.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}
    >
      <h4
        style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          fontWeight: 600,
          color: '#374151',
        }}
      >
        Personalization Variants (Read-Only)
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {variants.map((variant) => (
          <div
            key={variant.id}
            style={{
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                {variant.name}
              </h5>
              <span
                style={{
                  fontSize: '12px',
                  padding: '2px 8px',
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  borderRadius: '4px',
                }}
              >
                Weight: {variant.weight}%
              </span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#6b7280' }}>Subject Line</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#374151' }}>{variant.subject_line}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#6b7280' }}>Body Preview</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
                {variant.body_preview}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
