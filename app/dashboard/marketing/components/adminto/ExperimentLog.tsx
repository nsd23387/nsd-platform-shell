'use client';

import { useState, useCallback } from 'react';
import { useThemeColors } from '../../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../../design/tokens/typography';
import { space, radius, duration } from '../../../../../design/tokens/spacing';

export interface Experiment {
  id: string;
  name: string;
  engine: string;
  hypothesis: string;
  changeMade: string;
  startDate: string;
  endDate?: string;
  resultLift?: number;
  decision: 'keep' | 'revert' | 'iterate' | 'pending';
  notes?: string;
}

export interface ExperimentLogProps {
  experiments: Experiment[];
  onAdd: (experiment: Omit<Experiment, 'id'>) => void;
  onUpdate: (id: string, experiment: Partial<Experiment>) => void;
  onDelete: (id: string) => void;
  engineOptions?: string[];
}

const decisionLabels: Record<Experiment['decision'], { label: string; variant: 'success' | 'danger' | 'warning' | 'info' }> = {
  keep: { label: 'Keep', variant: 'success' },
  revert: { label: 'Revert', variant: 'danger' },
  iterate: { label: 'Iterate', variant: 'warning' },
  pending: { label: 'Pending', variant: 'info' },
};

const defaultEngineOptions = ['Warm Outreach', 'Cold Outreach', 'SEO', 'Run Paid Ads'];

export function ExperimentLog({
  experiments,
  onAdd,
  onUpdate,
  onDelete,
  engineOptions = defaultEngineOptions,
}: ExperimentLogProps) {
  const tc = useThemeColors();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Experiment, 'id'>>({
    name: '',
    engine: engineOptions[0],
    hypothesis: '',
    changeMade: '',
    startDate: new Date().toISOString().split('T')[0],
    decision: 'pending',
  });

  const resetForm = useCallback(() => {
    setForm({
      name: '',
      engine: engineOptions[0],
      hypothesis: '',
      changeMade: '',
      startDate: new Date().toISOString().split('T')[0],
      decision: 'pending',
    });
    setShowForm(false);
    setEditId(null);
  }, [engineOptions]);

  const handleSubmit = useCallback(() => {
    if (!form.name.trim()) return;
    if (editId) {
      onUpdate(editId, form);
    } else {
      onAdd(form);
    }
    resetForm();
  }, [form, editId, onAdd, onUpdate, resetForm]);

  const startEdit = useCallback(
    (exp: Experiment) => {
      const { id, ...rest } = exp;
      setForm(rest);
      setEditId(id);
      setShowForm(true);
    },
    [],
  );

  const decisionColors = {
    success: { bg: tc.semantic.success.light, text: tc.semantic.success.dark },
    danger: { bg: tc.semantic.danger.light, text: tc.semantic.danger.dark },
    warning: { bg: tc.semantic.warning.light, text: tc.semantic.warning.dark },
    info: { bg: tc.semantic.info.light, text: tc.semantic.info.dark },
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: fontFamily.body,
    fontSize: fontSize.md,
    color: tc.text.primary,
    backgroundColor: tc.background.muted,
    border: `1px solid ${tc.border.default}`,
    borderRadius: radius.md,
    padding: `${space['1.5']} ${space['3']}`,
    outline: 'none',
    width: '100%',
  };

  return (
    <div
      data-testid="experiment-log"
      style={{
        backgroundColor: tc.background.surface,
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.lg,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${space['4']} ${space['5']}`,
          borderBottom: `1px solid ${tc.border.default}`,
          gap: space['2'],
        }}
      >
        <span
          style={{
            fontFamily: fontFamily.display,
            fontSize: fontSize.lg,
            fontWeight: fontWeight.medium,
            color: tc.text.primary,
          }}
        >
          Experiments & Learnings
        </span>
        <button
          data-testid="button-add-experiment"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          style={{
            fontFamily: fontFamily.body,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.medium,
            color: tc.text.inverse,
            backgroundColor: tc.chartColors[0],
            border: 'none',
            borderRadius: radius.md,
            padding: `${space['1.5']} ${space['3']}`,
            cursor: 'pointer',
          }}
        >
          + Add Experiment
        </button>
      </div>

      {showForm && (
        <div
          data-testid="experiment-form"
          style={{
            padding: space['5'],
            borderBottom: `1px solid ${tc.border.default}`,
            backgroundColor: tc.background.muted,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: space['3'],
              marginBottom: space['3'],
            }}
          >
            <div>
              <label style={{ ...labelStyle(tc), display: 'block', marginBottom: space['1'] }}>Name</label>
              <input
                data-testid="input-experiment-name"
                style={inputStyle}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Experiment name"
              />
            </div>
            <div>
              <label style={{ ...labelStyle(tc), display: 'block', marginBottom: space['1'] }}>Engine</label>
              <select
                data-testid="select-experiment-engine"
                style={inputStyle}
                value={form.engine}
                onChange={(e) => setForm((f) => ({ ...f, engine: e.target.value }))}
              >
                {engineOptions.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ ...labelStyle(tc), display: 'block', marginBottom: space['1'] }}>Start Date</label>
              <input
                data-testid="input-experiment-start"
                type="date"
                style={inputStyle}
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ ...labelStyle(tc), display: 'block', marginBottom: space['1'] }}>End Date</label>
              <input
                data-testid="input-experiment-end"
                type="date"
                style={inputStyle}
                value={form.endDate || ''}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value || undefined }))}
              />
            </div>
            <div>
              <label style={{ ...labelStyle(tc), display: 'block', marginBottom: space['1'] }}>Result Lift %</label>
              <input
                data-testid="input-experiment-lift"
                type="number"
                style={inputStyle}
                value={form.resultLift ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    resultLift: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                placeholder="e.g. 12.5"
              />
            </div>
            <div>
              <label style={{ ...labelStyle(tc), display: 'block', marginBottom: space['1'] }}>Decision</label>
              <select
                data-testid="select-experiment-decision"
                style={inputStyle}
                value={form.decision}
                onChange={(e) => setForm((f) => ({ ...f, decision: e.target.value as Experiment['decision'] }))}
              >
                <option value="pending">Pending</option>
                <option value="keep">Keep</option>
                <option value="revert">Revert</option>
                <option value="iterate">Iterate</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: space['3'] }}>
            <label style={{ ...labelStyle(tc), display: 'block', marginBottom: space['1'] }}>Hypothesis</label>
            <textarea
              data-testid="input-experiment-hypothesis"
              style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
              value={form.hypothesis}
              onChange={(e) => setForm((f) => ({ ...f, hypothesis: e.target.value }))}
              placeholder="What do you expect to happen?"
            />
          </div>
          <div style={{ marginBottom: space['3'] }}>
            <label style={{ ...labelStyle(tc), display: 'block', marginBottom: space['1'] }}>Change Made</label>
            <textarea
              data-testid="input-experiment-change"
              style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
              value={form.changeMade}
              onChange={(e) => setForm((f) => ({ ...f, changeMade: e.target.value }))}
              placeholder="What was changed?"
            />
          </div>
          <div style={{ marginBottom: space['3'] }}>
            <label style={{ ...labelStyle(tc), display: 'block', marginBottom: space['1'] }}>Notes</label>
            <textarea
              data-testid="input-experiment-notes"
              style={{ ...inputStyle, minHeight: '40px', resize: 'vertical' }}
              value={form.notes || ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes"
            />
          </div>
          <div style={{ display: 'flex', gap: space['2'] }}>
            <button
              data-testid="button-save-experiment"
              onClick={handleSubmit}
              style={{
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: tc.text.inverse,
                backgroundColor: tc.chartColors[0],
                border: 'none',
                borderRadius: radius.md,
                padding: `${space['1.5']} ${space['4']}`,
                cursor: 'pointer',
              }}
            >
              {editId ? 'Update' : 'Save'}
            </button>
            <button
              data-testid="button-cancel-experiment"
              onClick={resetForm}
              style={{
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: tc.text.secondary,
                backgroundColor: 'transparent',
                border: `1px solid ${tc.border.default}`,
                borderRadius: radius.md,
                padding: `${space['1.5']} ${space['4']}`,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {experiments.length === 0 && !showForm ? (
        <div
          style={{
            padding: `${space['8']} ${space['5']}`,
            textAlign: 'center',
            color: tc.text.muted,
            fontFamily: fontFamily.body,
            fontSize: fontSize.base,
          }}
        >
          No experiments recorded yet. Click &quot;+ Add Experiment&quot; to start tracking.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ backgroundColor: tc.background.muted }}>
                {['Name', 'Engine', 'Dates', 'Lift', 'Decision', 'Actions'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: `${space['3']} ${space['4']}`,
                      textAlign: 'left',
                      fontFamily: fontFamily.body,
                      fontSize: fontSize.xs,
                      fontWeight: fontWeight.medium,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase' as const,
                      color: tc.text.secondary,
                      borderBottom: `1px solid ${tc.border.default}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {experiments.map((exp) => {
                const dec = decisionLabels[exp.decision];
                const col = decisionColors[dec.variant];
                return (
                  <tr
                    key={exp.id}
                    data-testid={`experiment-row-${exp.id}`}
                    style={{
                      borderBottom: `1px solid ${tc.border.subtle}`,
                      transition: `background-color ${duration.fast}`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = tc.background.hover;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={cellStyle(tc)}>
                      <div style={{ fontWeight: fontWeight.medium }}>{exp.name}</div>
                      {exp.hypothesis && (
                        <div
                          style={{
                            fontSize: fontSize.xs,
                            color: tc.text.muted,
                            marginTop: space['0.5'],
                            lineHeight: lineHeight.normal,
                          }}
                        >
                          {exp.hypothesis}
                        </div>
                      )}
                    </td>
                    <td style={cellStyle(tc)}>{exp.engine}</td>
                    <td style={cellStyle(tc)}>
                      {exp.startDate}
                      {exp.endDate ? ` \u2013 ${exp.endDate}` : ' \u2013 ongoing'}
                    </td>
                    <td style={cellStyle(tc)}>
                      {exp.resultLift != null ? (
                        <span
                          style={{
                            color: exp.resultLift >= 0 ? tc.semantic.success.dark : tc.semantic.danger.dark,
                            fontWeight: fontWeight.medium,
                          }}
                        >
                          {exp.resultLift >= 0 ? '+' : ''}
                          {exp.resultLift}%
                        </span>
                      ) : (
                        <span style={{ color: tc.text.muted }}>&mdash;</span>
                      )}
                    </td>
                    <td style={cellStyle(tc)}>
                      <span
                        style={{
                          fontFamily: fontFamily.body,
                          fontSize: fontSize.xs,
                          fontWeight: fontWeight.medium,
                          padding: `${space['0.5']} ${space['2']}`,
                          borderRadius: radius.full,
                          backgroundColor: col.bg,
                          color: col.text,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {dec.label}
                      </span>
                    </td>
                    <td style={cellStyle(tc)}>
                      <div style={{ display: 'flex', gap: space['2'] }}>
                        <button
                          data-testid={`button-edit-experiment-${exp.id}`}
                          onClick={() => startEdit(exp)}
                          style={actionBtnStyle(tc)}
                        >
                          Edit
                        </button>
                        <button
                          data-testid={`button-delete-experiment-${exp.id}`}
                          onClick={() => onDelete(exp.id)}
                          style={{
                            ...actionBtnStyle(tc),
                            color: tc.semantic.danger.dark,
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function labelStyle(tc: ReturnType<typeof import('../../../../../hooks/useThemeColors').useThemeColors>): React.CSSProperties {
  return {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: tc.text.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  };
}

function cellStyle(tc: ReturnType<typeof import('../../../../../hooks/useThemeColors').useThemeColors>): React.CSSProperties {
  return {
    padding: `${space['3']} ${space['4']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.md,
    color: tc.text.primary,
    verticalAlign: 'top',
  };
}

function actionBtnStyle(tc: ReturnType<typeof import('../../../../../hooks/useThemeColors').useThemeColors>): React.CSSProperties {
  return {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: tc.text.secondary,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: `${space['0.5']} ${space['1']}`,
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  };
}
