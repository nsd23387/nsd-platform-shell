'use client';

import React, { useEffect, useState } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface SerpFeatureRow {
  keyword: string;
  feature_type: string;
  detected_at: string;
  has_schema_rec: boolean;
}

function BacklinksContent() {
  const tc = useThemeColors();
  const [rows, setRows] = useState<SerpFeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/proxy/seo/serp-features')
      .then(r => r.json())
      .then((data: { data?: SerpFeatureRow[] }) => {
        if (!cancelled) { setRows(data.data ?? []); setLoading(false); }
      })
      .catch((err: Error) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const tdStyle: React.CSSProperties = {
    padding: `${space['3']} ${space['4']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.secondary,
  };

  // Group by feature_type
  const groups = rows.reduce<Record<string, SerpFeatureRow[]>>((acc, row) => {
    (acc[row.feature_type] = acc[row.feature_type] || []).push(row);
    return acc;
  }, {});

  const featureLabel: Record<string, string> = {
    featured_snippet: 'Featured Snippet',
    people_also_ask: 'People Also Ask',
    knowledge_panel: 'Knowledge Panel',
    image_pack: 'Image Pack',
    local_pack: 'Local Pack',
    video_carousel: 'Video Carousel',
  };

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['2'] }}>
          SEO Intelligence / Analysis
        </p>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }}>
          SERP Features
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted }}>
          Keywords triggering special Google SERP features — opportunities for schema markup.
        </p>
      </div>

      {loading && <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>Loading...</div>}
      {error && <div style={{ padding: space['4'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, color: tc.text.primary, fontFamily: fontFamily.body }}>Failed to load: {error}</div>}

      {!loading && !error && rows.length === 0 && (
        <div style={{ padding: space['8'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, textAlign: 'center' }}>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.secondary, marginBottom: space['2'] }}>No SERP features detected yet</p>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>SERP feature detection runs Wednesdays at 04:00 UTC.</p>
        </div>
      )}

      {!loading && !error && Object.entries(groups).map(([type, featureRows]) => (
        <div key={type} style={{ marginBottom: space['6'] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], marginBottom: space['3'] }}>
            <h2 style={{ fontFamily: fontFamily.display, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: tc.text.primary }}>
              {featureLabel[type] || type.replace(/_/g, ' ')}
            </h2>
            <span style={{ display: 'inline-block', padding: `${space['0.5']} ${space['2']}`, borderRadius: radius.full, fontSize: fontSize.sm, fontWeight: fontWeight.medium, backgroundColor: tc.background.muted, color: tc.text.muted }}>
              {featureRows.length}
            </span>
          </div>
          <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                  {['Keyword', 'Detected', 'Schema Rec'].map(h => (
                    <th key={h} style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureRows.map((row, i) => (
                  <tr key={`${row.keyword}-${i}`} style={{ borderBottom: `1px solid ${tc.border.subtle}` }}>
                    <td style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>
                      {row.keyword}
                      {type === 'featured_snippet' && !row.has_schema_rec && (
                        <span style={{ marginLeft: space['2'], display: 'inline-block', padding: `${space['0.5']} ${space['2']}`, borderRadius: radius.full, fontSize: fontSize.sm, fontWeight: fontWeight.medium, backgroundColor: '#fffbeb', color: '#92400e' }}>
                          No schema rec yet
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>{new Date(row.detected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td style={tdStyle}>
                      {row.has_schema_rec
                        ? <span style={{ color: '#065f46', fontWeight: fontWeight.medium }}>Yes</span>
                        : <span style={{ color: tc.text.placeholder }}>No</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SerpFeaturesPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <BacklinksContent />
    </DashboardGuard>
  );
}
