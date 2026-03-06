'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius, duration, easing } from '../../../../design/tokens/spacing';
import { indigo } from '../../../../design/tokens/colors';
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';

interface Experiment {
  id: string;
  name: string;
  engine: string;
  hypothesis: string;
  change: string;
  startDate: string;
  endDate: string;
  result: string;
  decision: string;
  notes: string;
}

const STORAGE_KEY = 'nsd-marketing-experiments';
const ENGINES = ['Warm Outreach', 'Cold Outreach', 'SEO', 'Run Paid Ads'];
const DECISIONS = ['keep', 'revert', 'iterate', 'pending'];

function loadExperiments(): Experiment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveExperiments(experiments: Experiment[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(experiments));
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const EMPTY: Experiment = {
  id: '', name: '', engine: 'Warm Outreach', hypothesis: '', change: '',
  startDate: '', endDate: '', result: '', decision: 'pending', notes: '',
};

export default function ExperimentsPage() {
  const tc = useThemeColors();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [editing, setEditing] = useState<Experiment | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { setExperiments(loadExperiments()); }, []);

  const save = useCallback((list: Experiment[]) => {
    setExperiments(list);
    saveExperiments(list);
  }, []);

  const handleSave = () => {
    if (!editing) return;
    if (editing.id) {
      save(experiments.map((e) => (e.id === editing.id ? editing : e)));
    } else {
      save([...experiments, { ...editing, id: makeId() }]);
    }
    setEditing(null);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    save(experiments.filter((e) => e.id !== id));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    border: `1px solid ${tc.border.default}`,
    borderRadius: radius.md,
    color: tc.text.primary,
    backgroundColor: tc.background.surface,
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: tc.text.muted,
    marginBottom: space['1'],
  };

  const thStyle: React.CSSProperties = {
    padding: `${space['3']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: tc.text.muted,
    textAlign: 'left' as const,
    borderBottom: `1px solid ${tc.border.default}`,
    whiteSpace: 'nowrap' as const,
  };

  const tdStyle: React.CSSProperties = {
    padding: `${space['2.5']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.secondary,
    borderBottom: `1px solid ${tc.border.subtle}`,
  };

  const btnStyle: React.CSSProperties = {
    padding: `${space['1.5']} ${space['4']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    border: 'none',
    borderRadius: radius.full,
    cursor: 'pointer',
    transition: `all ${duration.normal} ${easing.DEFAULT}`,
  };

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <DrilldownBreadcrumb items={[{label:'Marketing', href:'/dashboard/marketing'}, {label:'System'}, {label:'Experiments'}]} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: space['3'], marginBottom: space['6'] }}>
          <div>
            <h1
              style={{
                fontFamily: fontFamily.display,
                fontSize: fontSize['3xl'],
                fontWeight: fontWeight.semibold,
                color: tc.text.primary,
                marginBottom: space['1'],
                lineHeight: lineHeight.snug,
              }}
              data-testid="text-page-title"
            >
              Experiments & Learnings
            </h1>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
              Track marketing experiments across all Core 4 engines.
            </p>
          </div>
          <button
            onClick={() => { setEditing({ ...EMPTY }); setShowForm(true); }}
            style={{ ...btnStyle, backgroundColor: indigo[950], color: '#fff' }}
            data-testid="button-add-experiment"
          >
            + Add Experiment
          </button>
        </div>

        {showForm && editing && (
          <div
            style={{
              marginBottom: space['6'],
              padding: space['6'],
              border: `1px solid ${tc.border.default}`,
              borderRadius: radius.lg,
              backgroundColor: tc.background.surface,
            }}
            data-testid="form-experiment"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: space['4'], marginBottom: space['4'] }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input style={inputStyle} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} data-testid="input-experiment-name" />
              </div>
              <div>
                <label style={labelStyle}>Engine</label>
                <select style={inputStyle} value={editing.engine} onChange={(e) => setEditing({ ...editing, engine: e.target.value })} data-testid="select-experiment-engine">
                  {ENGINES.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Start Date</label>
                <input type="date" style={inputStyle} value={editing.startDate} onChange={(e) => setEditing({ ...editing, startDate: e.target.value })} data-testid="input-experiment-start" />
              </div>
              <div>
                <label style={labelStyle}>End Date</label>
                <input type="date" style={inputStyle} value={editing.endDate} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} data-testid="input-experiment-end" />
              </div>
              <div>
                <label style={labelStyle}>Decision</label>
                <select style={inputStyle} value={editing.decision} onChange={(e) => setEditing({ ...editing, decision: e.target.value })} data-testid="select-experiment-decision">
                  {DECISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Result (lift %)</label>
                <input style={inputStyle} value={editing.result} onChange={(e) => setEditing({ ...editing, result: e.target.value })} placeholder="e.g. +12%" data-testid="input-experiment-result" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space['4'], marginBottom: space['4'] }}>
              <div>
                <label style={labelStyle}>Hypothesis</label>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' as const }} value={editing.hypothesis} onChange={(e) => setEditing({ ...editing, hypothesis: e.target.value })} data-testid="input-experiment-hypothesis" />
              </div>
              <div>
                <label style={labelStyle}>Change Made</label>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' as const }} value={editing.change} onChange={(e) => setEditing({ ...editing, change: e.target.value })} data-testid="input-experiment-change" />
              </div>
            </div>
            <div style={{ marginBottom: space['4'] }}>
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...inputStyle, minHeight: 40, resize: 'vertical' as const }} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} data-testid="input-experiment-notes" />
            </div>
            <div style={{ display: 'flex', gap: space['3'] }}>
              <button onClick={handleSave} style={{ ...btnStyle, backgroundColor: indigo[950], color: '#fff' }} data-testid="button-save-experiment">Save</button>
              <button onClick={() => { setEditing(null); setShowForm(false); }} style={{ ...btnStyle, backgroundColor: tc.background.muted, color: tc.text.secondary }} data-testid="button-cancel-experiment">Cancel</button>
            </div>
          </div>
        )}

        <DashboardSection title="Experiment Log" description={`${experiments.length} experiment${experiments.length !== 1 ? 's' : ''} recorded.`}>
          {experiments.length === 0 ? (
            <div style={{ padding: space['8'], textAlign: 'center' as const, border: `1px dashed ${tc.border.default}`, borderRadius: radius.lg, backgroundColor: tc.background.muted }}>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
                No experiments yet. Click &ldquo;Add Experiment&rdquo; to start tracking.
              </p>
            </div>
          ) : (
            <div style={{ overflow: 'auto', border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, backgroundColor: tc.background.surface }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="table-experiments">
                <thead>
                  <tr>
                    {['Name', 'Engine', 'Hypothesis', 'Result', 'Decision', 'Dates', 'Actions'].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {experiments.map((exp) => (
                    <tr key={exp.id} data-testid={`row-experiment-${exp.id}`}>
                      <td style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{exp.name}</td>
                      <td style={tdStyle}>{exp.engine}</td>
                      <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{exp.hypothesis}</td>
                      <td style={tdStyle}>{exp.result || '—'}</td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: `${space['0.5']} ${space['2']}`,
                          borderRadius: radius.full,
                          fontSize: fontSize.xs,
                          fontWeight: fontWeight.medium,
                          backgroundColor: exp.decision === 'keep' ? tc.semantic.success.light : exp.decision === 'revert' ? tc.semantic.danger.light : exp.decision === 'iterate' ? tc.semantic.warning.light : tc.background.muted,
                          color: exp.decision === 'keep' ? tc.semantic.success.dark : exp.decision === 'revert' ? tc.semantic.danger.dark : exp.decision === 'iterate' ? tc.semantic.warning.dark : tc.text.muted,
                        }}>
                          {exp.decision}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontSize: fontSize.xs }}>{exp.startDate}{exp.endDate ? ` - ${exp.endDate}` : ''}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: space['2'] }}>
                          <button
                            onClick={() => { setEditing(exp); setShowForm(true); }}
                            style={{ ...btnStyle, padding: `${space['1']} ${space['3']}`, fontSize: fontSize.xs, backgroundColor: tc.background.muted, color: tc.text.secondary }}
                            data-testid={`button-edit-experiment-${exp.id}`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            style={{ ...btnStyle, padding: `${space['1']} ${space['3']}`, fontSize: fontSize.xs, backgroundColor: tc.semantic.danger.light, color: tc.semantic.danger.dark }}
                            data-testid={`button-delete-experiment-${exp.id}`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardSection>
      </div>
    </DashboardGuard>
  );
}
