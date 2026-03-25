'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { getSchemaMarkup, updateSchemaMarkupStatus, applySchemaMarkup } from '../../../../lib/seoApi';
import type { SchemaMarkupRow } from '../../../../lib/seoApi';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#f5f5f5', text: '#525252' },
  ready: { bg: '#dbeafe', text: '#1e40af' },
  applied: { bg: '#d1fae5', text: '#065f46' },
  rejected: { bg: '#fee2e2', text: '#991b1b' },
};

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  Product: { bg: '#e0e7ff', text: '#3730a3' },
  FAQPage: { bg: '#fef3c7', text: '#92400e' },
  BreadcrumbList: { bg: '#f3e8ff', text: '#6b21a8' },
  Organization: { bg: '#d1fae5', text: '#065f46' },
};

function Badge({ label, colors }: { label: string; colors: { bg: string; text: string } }) {
  return (
    <span style={{ display: 'inline-block', padding: `${space['0.5']} ${space['2']}`, borderRadius: radius.full, fontSize: fontSize.sm, fontWeight: fontWeight.medium, backgroundColor: colors.bg, color: colors.text, fontFamily: fontFamily.body, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function SchemaMarkupContent() {
  const tc = useThemeColors();
  const [rows, setRows] = useState<SchemaMarkupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getSchemaMarkup().then(data => { setRows(data); setLoading(false); }).catch(err => { setError(err.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id: string, action: 'ready' | 'rejected' | 'apply') => {
    try {
      if (action === 'apply') { await applySchemaMarkup(id); }
      else { await updateSchemaMarkupStatus(id, action); }
      load();
    } catch (err) { console.error('Schema action failed:', err); }
  };

  const tdStyle: React.CSSProperties = { padding: `${space['3']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary };

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['2'] }}>SEO Intelligence / Optimization</p>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }} data-testid="text-schema-title">Schema Markup</h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted }}>JSON-LD structured data for search engine rich results.</p>
      </div>

      {loading && <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>Loading schema markup...</div>}
      {error && <div style={{ padding: space['4'], color: '#991b1b', fontFamily: fontFamily.body }}>{error}</div>}

      {!loading && !error && rows.length === 0 && (
        <div style={{ padding: space['8'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, textAlign: 'center' }}>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.secondary, marginBottom: space['2'] }}>No schema markup generated yet</p>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>Schema is generated automatically for indexed pages or can be triggered manually.</p>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                {['Page Path', 'Schema Type', 'Status', 'Applied At', 'Actions'].map(h => (
                  <th key={h} style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <React.Fragment key={row.id}>
                  <tr style={{ borderBottom: `1px solid ${tc.border.subtle}`, cursor: 'pointer' }} onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}>
                    <td style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{row.page_path}</td>
                    <td style={tdStyle}><Badge label={row.schema_type} colors={TYPE_STYLES[row.schema_type] || TYPE_STYLES.Product} /></td>
                    <td style={tdStyle}><Badge label={row.status} colors={STATUS_STYLES[row.status] || STATUS_STYLES.draft} /></td>
                    <td style={tdStyle}>{row.applied_at ? new Date(row.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: space['1'] }}>
                        {row.status === 'draft' && <button onClick={(e) => { e.stopPropagation(); handleAction(row.id, 'ready'); }} style={{ padding: `${space['0.5']} ${space['2']}`, fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.medium, color: '#1e40af', backgroundColor: '#dbeafe', border: 'none', borderRadius: radius.md, cursor: 'pointer' }}>Mark Ready</button>}
                        {row.status === 'ready' && <button onClick={(e) => { e.stopPropagation(); handleAction(row.id, 'apply'); }} style={{ padding: `${space['0.5']} ${space['2']}`, fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.medium, color: '#065f46', backgroundColor: '#d1fae5', border: 'none', borderRadius: radius.md, cursor: 'pointer' }}>Apply</button>}
                        {!['applied', 'rejected'].includes(row.status) && <button onClick={(e) => { e.stopPropagation(); handleAction(row.id, 'rejected'); }} style={{ padding: `${space['0.5']} ${space['2']}`, fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.medium, color: '#991b1b', backgroundColor: '#fee2e2', border: 'none', borderRadius: radius.md, cursor: 'pointer' }}>Reject</button>}
                      </div>
                    </td>
                  </tr>
                  {expandedRow === row.id && (
                    <tr><td colSpan={5} style={{ padding: space['4'], backgroundColor: tc.background.muted }}>
                      <pre style={{ fontFamily: 'monospace', fontSize: '12px', color: tc.text.secondary, whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto' }}>
                        {JSON.stringify(row.schema_json, null, 2)}
                      </pre>
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SchemaMarkupPage() {
  return <DashboardGuard dashboard="seo" fallback={<AccessDenied />}><SchemaMarkupContent /></DashboardGuard>;
}
