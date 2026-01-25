'use client';

import { useState } from 'react';

interface ICP {
  keywords: string[];
  locations: { country: string; state?: string; city?: string }[];
  industries: string[];
  employeeSize: { min: number; max: number };
  roles: string[];
  painPoints: string[];
  valuePropositions: string[];
}

interface ICPEditorProps {
  icp: ICP;
  onChange: (updates: Partial<ICP>) => void;
}

function TagInput({
  label,
  tags,
  onChange,
  placeholder,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  /**
   * Process input string and split by commas into individual tags.
   */
  const processInput = (inputStr: string): string[] => {
    return inputStr
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .filter((s) => !tags.includes(s));
  };

  const addTagsFromInput = (inputStr: string) => {
    const newTags = processInput(inputStr);
    if (newTags.length > 0) {
      onChange([...tags, ...newTags]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      addTagsFromInput(input);
      setInput('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.includes(',')) {
      addTagsFromInput(value);
      setInput('');
    } else {
      setInput(value);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.includes(',')) {
      e.preventDefault();
      addTagsFromInput(pastedText);
      setInput('');
    }
  };

  const handleBlur = () => {
    if (input.trim()) {
      addTagsFromInput(input);
      setInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div style={{ marginBottom: '20px' }}>
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
        {label}
      </label>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px 12px',
          minHeight: '44px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          backgroundColor: '#fff',
        }}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              backgroundColor: '#f3f0ff',
              color: '#8b5cf6',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'var(--font-body, Inter, sans-serif)',
            }}
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: '#8b5cf6',
                fontSize: '16px',
                lineHeight: 1,
              }}
            >
              x
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : ''}
          style={{
            flex: 1,
            minWidth: '120px',
            border: 'none',
            outline: 'none',
            fontSize: '14px',
            fontFamily: 'var(--font-body, Inter, sans-serif)',
          }}
        />
      </div>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
        Press Enter or use commas to add multiple values
      </p>
    </div>
  );
}

export function ICPEditor({ icp, onChange }: ICPEditorProps) {
  return (
    <div>
      <TagInput
        label="Keywords"
        tags={icp.keywords}
        onChange={(keywords) => onChange({ keywords })}
        placeholder="Add targeting keywords..."
      />

      <TagInput
        label="Industries"
        tags={icp.industries}
        onChange={(industries) => onChange({ industries })}
        placeholder="Add target industries..."
      />

      <TagInput
        label="Job Roles"
        tags={icp.roles}
        onChange={(roles) => onChange({ roles })}
        placeholder="Add target roles..."
      />

      <div style={{ marginBottom: '20px' }}>
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
          Company Size (Employees)
        </label>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <input
            type="number"
            value={icp.employeeSize.min}
            onChange={(e) =>
              onChange({
                employeeSize: { ...icp.employeeSize, min: parseInt(e.target.value) || 0 },
              })
            }
            placeholder="Min"
            style={{
              width: '100px',
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'var(--font-body, Inter, sans-serif)',
            }}
          />
          <span style={{ color: '#6b7280' }}>to</span>
          <input
            type="number"
            value={icp.employeeSize.max}
            onChange={(e) =>
              onChange({
                employeeSize: { ...icp.employeeSize, max: parseInt(e.target.value) || 0 },
              })
            }
            placeholder="Max"
            style={{
              width: '100px',
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'var(--font-body, Inter, sans-serif)',
            }}
          />
        </div>
      </div>

      <TagInput
        label="Pain Points"
        tags={icp.painPoints}
        onChange={(painPoints) => onChange({ painPoints })}
        placeholder="Add customer pain points..."
      />

      <TagInput
        label="Value Propositions"
        tags={icp.valuePropositions}
        onChange={(valuePropositions) => onChange({ valuePropositions })}
        placeholder="Add value propositions..."
      />
    </div>
  );
}
