'use client';

import { useState } from 'react';
import type { ICP, Location } from '../types/campaign';

interface ICPEditorProps {
  icp: ICP;
  onChange: (icp: ICP) => void;
  disabled?: boolean;
}

export function ICPEditor({ icp, onChange, disabled }: ICPEditorProps) {
  const [newKeyword, setNewKeyword] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newPainPoint, setNewPainPoint] = useState('');
  const [newValueProp, setNewValueProp] = useState('');

  function addToArray(field: keyof ICP, value: string) {
    if (!value.trim()) return;
    const current = icp[field] as string[];
    onChange({ ...icp, [field]: [...current, value.trim()] });
  }

  function removeFromArray(field: keyof ICP, index: number) {
    const current = icp[field] as string[];
    onChange({ ...icp, [field]: current.filter((_, i) => i !== index) });
  }

  function updateEmployeeSize(field: 'min' | 'max', value: number) {
    onChange({
      ...icp,
      employeeSize: { ...icp.employeeSize, [field]: value },
    });
  }

  function addLocation(location: Location) {
    onChange({ ...icp, locations: [...icp.locations, location] });
  }

  function removeLocation(index: number) {
    onChange({ ...icp, locations: icp.locations.filter((_, i) => i !== index) });
  }

  const sectionStyle = {
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: '#1f1f1f',
    borderRadius: '8px',
    border: '1px solid #333',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 600 as const,
    color: '#d1d5db',
  };

  const tagStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#312e81',
    color: '#c7d2fe',
    borderRadius: '16px',
    fontSize: '13px',
    margin: '4px',
  };

  const inputStyle = {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #4b5563',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: '#0f0f0f',
    color: '#fff',
  };

  return (
    <div>
      <div style={sectionStyle}>
        <label style={labelStyle}>Keywords</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '12px' }}>
          {icp.keywords.map((kw, i) => (
            <span key={i} style={tagStyle}>
              {kw}
              {!disabled && (
                <button
                  onClick={() => removeFromArray('keywords', i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a5b4fc', fontSize: '14px' }}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        {!disabled && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Add keyword"
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addToArray('keywords', newKeyword);
                  setNewKeyword('');
                }
              }}
            />
            <button
              onClick={() => { addToArray('keywords', newKeyword); setNewKeyword(''); }}
              style={{ padding: '8px 16px', backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Add
            </button>
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Industries</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '12px' }}>
          {icp.industries.map((ind, i) => (
            <span key={i} style={{ ...tagStyle, backgroundColor: '#14532d', color: '#86efac' }}>
              {ind}
              {!disabled && (
                <button
                  onClick={() => removeFromArray('industries', i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', fontSize: '14px' }}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        {!disabled && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              placeholder="Add industry"
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addToArray('industries', newIndustry);
                  setNewIndustry('');
                }
              }}
            />
            <button
              onClick={() => { addToArray('industries', newIndustry); setNewIndustry(''); }}
              style={{ padding: '8px 16px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Add
            </button>
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Employee Size Range</label>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>Min</span>
            <input
              type="number"
              value={icp.employeeSize.min}
              onChange={(e) => updateEmployeeSize('min', parseInt(e.target.value) || 0)}
              disabled={disabled}
              style={{ ...inputStyle, width: '100px', marginLeft: '8px' }}
            />
          </div>
          <span style={{ color: '#6b7280' }}>to</span>
          <div>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>Max</span>
            <input
              type="number"
              value={icp.employeeSize.max}
              onChange={(e) => updateEmployeeSize('max', parseInt(e.target.value) || 0)}
              disabled={disabled}
              style={{ ...inputStyle, width: '100px', marginLeft: '8px' }}
            />
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Target Roles</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '12px' }}>
          {icp.roles.map((role, i) => (
            <span key={i} style={{ ...tagStyle, backgroundColor: '#78350f', color: '#fde68a' }}>
              {role}
              {!disabled && (
                <button
                  onClick={() => removeFromArray('roles', i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fbbf24', fontSize: '14px' }}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        {!disabled && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="Add target role"
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addToArray('roles', newRole);
                  setNewRole('');
                }
              }}
            />
            <button
              onClick={() => { addToArray('roles', newRole); setNewRole(''); }}
              style={{ padding: '8px 16px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Add
            </button>
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Pain Points</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {icp.painPoints.map((pp, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#450a0a', borderRadius: '6px', border: '1px solid #7f1d1d' }}>
              <span style={{ color: '#fca5a5' }}>•</span>
              <span style={{ flex: 1, fontSize: '14px', color: '#fecaca' }}>{pp}</span>
              {!disabled && (
                <button
                  onClick={() => removeFromArray('painPoints', i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: '14px' }}
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
              value={newPainPoint}
              onChange={(e) => setNewPainPoint(e.target.value)}
              placeholder="Add pain point"
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addToArray('painPoints', newPainPoint);
                  setNewPainPoint('');
                }
              }}
            />
            <button
              onClick={() => { addToArray('painPoints', newPainPoint); setNewPainPoint(''); }}
              style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Add
            </button>
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Value Propositions</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {icp.valuePropositions.map((vp, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#052e16', borderRadius: '6px', border: '1px solid #166534' }}>
              <span style={{ color: '#4ade80' }}>✓</span>
              <span style={{ flex: 1, fontSize: '14px', color: '#86efac' }}>{vp}</span>
              {!disabled && (
                <button
                  onClick={() => removeFromArray('valuePropositions', i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#22c55e', fontSize: '14px' }}
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
              value={newValueProp}
              onChange={(e) => setNewValueProp(e.target.value)}
              placeholder="Add value proposition"
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addToArray('valuePropositions', newValueProp);
                  setNewValueProp('');
                }
              }}
            />
            <button
              onClick={() => { addToArray('valuePropositions', newValueProp); setNewValueProp(''); }}
              style={{ padding: '8px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Add
            </button>
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Target Locations</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {icp.locations.map((loc, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#0c4a6e', borderRadius: '6px', border: '1px solid #0369a1' }}>
              <span style={{ fontSize: '14px', color: '#7dd3fc' }}>
                📍 {loc.city ? `${loc.city}, ` : ''}{loc.state ? `${loc.state}, ` : ''}{loc.country}
              </span>
              {!disabled && (
                <button
                  onClick={() => removeLocation(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#38bdf8', fontSize: '14px' }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {!disabled && (
          <LocationAdder onAdd={addLocation} />
        )}
      </div>
    </div>
  );
}

function LocationAdder({ onAdd }: { onAdd: (loc: Location) => void }) {
  const [country, setCountry] = useState('United States');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');

  function handleAdd() {
    if (!country.trim()) return;
    onAdd({ country: country.trim(), state: state.trim() || undefined, city: city.trim() || undefined });
    setState('');
    setCity('');
  }

  const inputStyle = {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #4b5563',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: '#0f0f0f',
    color: '#fff',
  };

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <input
        type="text"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        placeholder="Country"
        style={{ ...inputStyle, width: '150px' }}
      />
      <input
        type="text"
        value={state}
        onChange={(e) => setState(e.target.value)}
        placeholder="State (optional)"
        style={{ ...inputStyle, width: '150px' }}
      />
      <input
        type="text"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="City (optional)"
        style={{ ...inputStyle, width: '150px' }}
      />
      <button
        onClick={handleAdd}
        style={{ padding: '8px 16px', backgroundColor: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
      >
        Add Location
      </button>
    </div>
  );
}
