'use client';

import React, { useState } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';

export interface TagInputProps {
  label: string;
  name: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  error?: string;
  helpText?: string;
}

export function TagInput({
  label,
  name,
  values,
  onChange,
  placeholder,
  error,
  helpText,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed && !values.includes(trimmed)) {
        onChange([...values, trimmed]);
      }
      setInputValue('');
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.includes(',')) {
      e.preventDefault();
      const newTags = pastedText
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag && !values.includes(tag));
      if (newTags.length > 0) {
        onChange([...values, ...newTags]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(values.filter((tag) => tag !== tagToRemove));
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
      </label>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: NSD_COLORS.background,
          border: `1px solid ${error ? NSD_COLORS.semantic.critical.border : NSD_COLORS.border.default}`,
          borderRadius: NSD_RADIUS.md,
          minHeight: '44px',
        }}
      >
        {values.map((tag) => (
          <span
            key={tag}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              backgroundColor: NSD_COLORS.semantic.info.bg,
              color: NSD_COLORS.primary,
              borderRadius: NSD_RADIUS.full,
              fontSize: '13px',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '16px',
                height: '16px',
                padding: 0,
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                color: NSD_COLORS.primary,
                opacity: 0.7,
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={name}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={values.length === 0 ? placeholder : ''}
          style={{
            flex: 1,
            minWidth: '120px',
            padding: '4px 0',
            border: 'none',
            outline: 'none',
            fontSize: '14px',
            color: NSD_COLORS.text.primary,
            backgroundColor: 'transparent',
            fontFamily: NSD_TYPOGRAPHY.fontBody,
          }}
        />
      </div>

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
            color: NSD_COLORS.semantic.critical.text,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
