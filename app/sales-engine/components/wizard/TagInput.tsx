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

  /**
   * Process input string and split by commas into individual tags.
   * Handles trimming, deduplication, and filtering empty values.
   */
  const processInput = (input: string): string[] => {
    return input
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .filter((s) => !values.includes(s)); // Remove duplicates
  };

  /**
   * Add tags from the current input value.
   * Used by Enter key, blur, and when comma is detected.
   */
  const addTagsFromInput = (input: string) => {
    const newTags = processInput(input);
    if (newTags.length > 0) {
      onChange([...values, ...newTags]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTagsFromInput(inputValue);
      setInputValue('');
    }
  };

  /**
   * Handle input changes - detect commas and process immediately.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // If the input contains a comma, process it immediately
    if (value.includes(',')) {
      addTagsFromInput(value);
      setInputValue('');
    } else {
      setInputValue(value);
    }
  };

  /**
   * Handle paste events - split pasted text by commas.
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.includes(',')) {
      e.preventDefault();
      addTagsFromInput(pastedText);
      setInputValue('');
    }
    // If no comma, let default paste behavior happen
  };

  /**
   * Handle blur - add any remaining input as tag(s).
   */
  const handleBlur = () => {
    if (inputValue.trim()) {
      addTagsFromInput(inputValue);
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
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
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
          {helpText} <span style={{ opacity: 0.7 }}>• Separate multiple values with commas</span>
        </p>
      )}
      {!helpText && !error && (
        <p
          style={{
            margin: '6px 0 0 0',
            fontSize: '12px',
            color: NSD_COLORS.text.muted,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
          }}
        >
          Press Enter or use commas to separate values
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
