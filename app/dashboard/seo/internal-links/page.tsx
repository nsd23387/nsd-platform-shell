'use client';

import React, { useEffect, useState } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { violet, magenta, indigo } from '../../../../design/tokens/colors';
import { getInternalLinkRecs } from '../../../../lib/seoApi';
import type { InternalLinkRec } from '../../../../lib/seoApi';

function PriorityBadge({ priority }: { priority: string }) {
  const colorMap: Record<string, string> = { high: magenta[500], medium: indigo[500], low: violet[400] };
  const color = colorMap[priority] || indigo[400];
  return (
    <span style={{
      display: 'inline-block', padding: `${space['0.5']} ${space['2']}`,
      borderRadius: radius.full, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
      backgroundColor: `${color}15`, color, textTransform: 'capitalize',
    }}>
      {priority}
    </span>
  );
}

function InternalLinksContent() {
  const tc = useThemeColors();
  const [data, setData] = useState<InternalLinkRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await getInternalLinkRecs();
        if (!cancelled) { setData(result); setLoading(false); }
      } catch (err: unknown) {
        if (!cancelled) { setError(err instanceof Error ? err.message : 'Unknown error'); setLoading(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const cellStyle = { padding: `${space['3']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary };
  const headerStyle = { padding: `${space['3']} ${space['4']}`, textAlign: 'left' as const, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.muted };

  if (loading) return <div style={{ padding: space['8'], color: tc.text.muted, fontFamily: fontFamily.body }}>Loading internal link recommendations...</div>;
  if (error) return <div style={{ padding: space['8'], color: tc.semantic.danger.dark, fontFamily: fontFamily.body }}>Error: {error}</div>;

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }} data-testid="text-internal-links-title">
          Internal Link Recommendations
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted, lineHeight: lineHeight.normal }}>
          Topic-cluster and crawl-depth based linking suggestions. {data.length} recommendations.
        </p>
      </div>

      <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
              {['Source Page', 'Target Page', 'Anchor Text', 'Priority', 'Rule', 'Reason'].map(h => (
                <th key={h} style={headerStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-link-rec-${i}`}>
                <td style={{ ...cellStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{r.source_page}</td>
                <td style={cellStyle}>{r.target_page}</td>
                <td style={{ ...cellStyle, fontStyle: 'italic' }}>{r.anchor_text}</td>
                <td style={cellStyle}><PriorityBadge priority={r.priority} /></td>
                <td style={cellStyle}>{r.rule_source?.replace(/_/g, ' ')}</td>
                <td style={{ ...cellStyle, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.reason}>{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>No internal link recommendations yet.</div>}
      </div>
    </div>
  );
}

export default function InternalLinksPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <InternalLinksContent />
    </DashboardGuard>
  );
}
