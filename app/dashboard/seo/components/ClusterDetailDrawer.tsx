'use client';

import React from 'react';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius, duration, easing } from '../../../../design/tokens/spacing';
import { Icon } from '../../../../design/components/Icon';
import type { SeoClusterDetail } from '../../../../lib/seoApi';

interface ClusterDetailDrawerProps {
  cluster: SeoClusterDetail | null;
  loading: boolean;
  onClose: () => void;
}

export function ClusterDetailDrawer({ cluster, loading, onClose }: ClusterDetailDrawerProps) {
  const tc = useThemeColors();

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'flex-end',
  };

  const drawerStyle: React.CSSProperties = {
    width: '480px',
    maxWidth: '100vw',
    backgroundColor: tc.background.surface,
    height: '100%',
    overflow: 'auto',
    borderLeft: `1px solid ${tc.border.default}`,
    padding: space['6'],
  };

  const tdStyle: React.CSSProperties = {
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.secondary,
  };

  return (
    <div style={overlayStyle} onClick={onClose} data-testid="drawer-cluster-detail">
      <div style={drawerStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: space['6'] }}>
          <h2 style={{ fontFamily: fontFamily.display, fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: tc.text.primary, lineHeight: lineHeight.snug }}>
            Cluster Detail
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: tc.text.muted, padding: space['1'] }}
            data-testid="button-close-cluster-drawer"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {loading && (
          <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>
            Loading cluster members...
          </div>
        )}

        {!loading && cluster && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space['4'], marginBottom: space['6'] }}>
              <div style={{ backgroundColor: tc.background.muted, padding: space['4'], borderRadius: radius.lg }}>
                <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['1'] }}>Primary Keyword</p>
                <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.primary }} data-testid="text-cluster-primary-keyword">{cluster.primary_keyword}</p>
              </div>
              <div style={{ backgroundColor: tc.background.muted, padding: space['4'], borderRadius: radius.lg }}>
                <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['1'] }}>Cluster Size</p>
                <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.primary }}>{cluster.members?.length ?? cluster.keyword_count} keywords</p>
              </div>
              <div style={{ backgroundColor: tc.background.muted, padding: space['4'], borderRadius: radius.lg, gridColumn: '1 / -1' }}>
                <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['1'] }}>Total Impressions</p>
                <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: tc.text.primary }}>{cluster.total_impressions.toLocaleString()}</p>
              </div>
            </div>

            <h3 style={{ fontFamily: fontFamily.display, fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: tc.text.secondary, marginBottom: space['3'] }}>
              Member Keywords
            </h3>
            <div style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                    {['Keyword', 'Impressions', 'Clicks', 'Position', 'CTR'].map((h) => (
                      <th key={h} style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(cluster.members ?? []).map((m, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-member-${i}`}>
                      <td style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{m.keyword}</td>
                      <td style={tdStyle}>{m.impressions.toLocaleString()}</td>
                      <td style={tdStyle}>{m.clicks}</td>
                      <td style={tdStyle}>{m.position.toFixed(1)}</td>
                      <td style={tdStyle}>{m.ctr.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
