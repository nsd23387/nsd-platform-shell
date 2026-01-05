'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';

export interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'textarea' | 'number' | 'select';
  placeholder?: string;
  value: string | number;
  onChange: (value: string | number) => void;
  error?: string;
  required?: boolean;
  helpText?: string;
  options?: { value: string; label: string }[];
  rows?: number;
}

export function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required,
  helpText,
  options,
  rows = 3,
}: FormFieldProps) {
  const inputStyles: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    color: NSD_COLORS.text.primary,
    backgroundColor: NSD_COLORS.background,
    border: `1px solid ${error ? '#EF4444' : NSD_COLORS.border.default}`,
    borderRadius: NSD_RADIUS.md,
    fontFamily: NSD_TYPOGRAPHY.fontBody,
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <label
        htmlFor={name}
        style={{
          display: 'block',
          marginBottom: '6px',
          fontSize: '14px',
          fontWeight: 500,
          color: NSD_COLORS.text.primary,
          fontFamily: NSD_TYPOGRAPHY.fontBody,
        }}
      >
        {label}
        {required && (
          <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
        )}
      </label>

      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          style={{ ...inputStyles, resize: 'vertical' }}
        />
      ) : type === 'select' ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyles, cursor: 'pointer' }}
        >
          <option value="">{placeholder || 'Select...'}</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) =>
            onChange(type === 'number' ? Number(e.target.value) : e.target.value)
          }
          style={inputStyles}
        />
      )}

      {helpText && !error && (
        <p
          style={{
            margin: '6px 0 0 0',
            fontSize: '12px',
            color: NSD_COLORS.text.muted,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
          }}
        >
          {helpText}
        </p>
      )}

      {error && (
        <p
          style={{
            margin: '6px 0 0 0',
            fontSize: '12px',
            color: '#EF4444',
            fontFamily: NSD_TYPOGRAPHY.fontBody,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
