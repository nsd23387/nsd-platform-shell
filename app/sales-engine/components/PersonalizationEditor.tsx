'use client';

import { useState } from 'react';
import type { PersonalizationStrategy } from '../types/campaign';
import { background, text, border, violet, magenta } from '../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../design/tokens/typography';

interface PersonalizationEditorProps {
  personalization: PersonalizationStrategy;
  onChange: (personalization: PersonalizationStrategy) => void;
  disabled?: boolean;
}

const toneOptions: { value: PersonalizationStrategy['toneOfVoice']; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Formal, business-focused communication' },
  { value: 'friendly', label: 'Friendly', description: 'Warm, approachable but still professional' },
  { value: 'casual', label: 'Casual', description: 'Relaxed, conversational style' },
  { value: 'authoritative', label: 'Authoritative', description: 'Expert, confident, industry-leading' },
];

export function PersonalizationEditor({ personalization, onChange, disabled }: PersonalizationEditorProps) {
  const [newUSP, setNewUSP] = useState('');

  function updateField<K extends keyof PersonalizationStrategy>(field: K, value: PersonalizationStrategy[K]) {
    onChange({ ...personalization, [field]: value });
  }

  function addUSP() {
    if (!newUSP.trim()) return;
    onChange({
      ...personalization,
      uniqueSellingPoints: [...personalization.uniqueSellingPoints, newUSP.trim()],
    });
    setNewUSP('');
  }

  function removeUSP(index: number) {
    onChange({
      ...personalization,
      uniqueSellingPoints: personalization.uniqueSellingPoints.filter((_, i) => i !== index),
    });
  }

  const sectionStyle = {
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: background.muted,
    borderRadius: '8px',
    border: `1px solid ${border.subtle}`,
  };

  const labelStyle = {
    display: 'block' as const,
    marginBottom: '8px',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: text.secondary,
  };

  const inputStyle = {
    padding: '10px 14px',
    fontSize: fontSize.sm,
    border: `1px solid ${border.default}`,
    borderRadius: '6px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
    backgroundColor: background.surface,
    color: text.primary,
  };

  return (
    <div style={{ fontFamily: fontFamily.body }}>
      <div style={sectionStyle}>
        <label style={labelStyle}>Tone of Voice</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {toneOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => !disabled && updateField('toneOfVoice', option.value)}
              disabled={disabled}
              style={{
                padding: '16px',
                backgroundColor: personalization.toneOfVoice === option.value ? violet[100] : background.surface,
                color: personalization.toneOfVoice === option.value ? violet[700] : text.secondary,
                border: `2px solid ${personalization.toneOfVoice === option.value ? violet[500] : border.default}`,
                borderRadius: '8px',
                textAlign: 'left' as const,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontWeight: fontWeight.semibold, marginBottom: '4px' }}>{option.label}</div>
              <div style={{ fontSize: fontSize.xs, opacity: 0.8 }}>{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Primary Call-to-Action</label>
        <input
          type="text"
          value={personalization.primaryCTA}
          onChange={(e) => updateField('primaryCTA', e.target.value)}
          disabled={disabled}
          placeholder="e.g., Get a Free Quote, Schedule a Demo"
          style={inputStyle}
        />
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Unique Selling Points</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {personalization.uniqueSellingPoints.map((usp, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: violet[50],
                borderRadius: '8px',
                border: `1px solid ${violet[200]}`,
              }}
            >
              <span style={{ color: violet[500], fontWeight: fontWeight.semibold }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: fontSize.sm, color: violet[700] }}>{usp}</span>
              {!disabled && (
                <button
                  onClick={() => removeUSP(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: violet[400], fontSize: '18px' }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {!disabled && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={newUSP}
              onChange={(e) => setNewUSP(e.target.value)}
              placeholder="Add a unique selling point"
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addUSP();
              }}
            />
            <button
              onClick={addUSP}
              style={{
                padding: '10px 20px',
                backgroundColor: magenta[500],
                color: text.inverse,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: fontWeight.semibold,
              }}
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
