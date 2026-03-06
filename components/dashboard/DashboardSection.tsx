'use client';

import React from 'react';
import { useThemeColors } from '../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../design/tokens/typography';
import { space, componentSpacing, radius } from '../../design/tokens/spacing';
import { ExportMenu } from './ExportMenu';
import type { ExportSection } from '../../lib/exportUtils';

const LIGHT_TINT = '#f5f3ff';
const DARK_TINT = '#1e1e38';

export interface ExportConfig {
  filename: string;
  pdfTitle: string;
  sections: ExportSection[];
  meta?: { dateRange?: string; filters?: string };
}

export interface DashboardSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  exportConfig?: ExportConfig;
  index?: number;
}

export function DashboardSection({ title, description, children, exportConfig, index }: DashboardSectionProps) {
  const tc = useThemeColors();

  const isTinted = typeof index === 'number' && index % 2 === 1;
  const isDark = tc.background.page === '#0f0f1a';
  const tintBg = isTinted ? (isDark ? DARK_TINT : LIGHT_TINT) : undefined;

  const handleExportCSV = () => {
    if (!exportConfig) return;
    import('../../lib/exportUtils').then(({ exportCSV }) => {
      exportCSV(exportConfig.filename, exportConfig.sections);
    });
  };

  const handleExportPDF = () => {
    if (!exportConfig) return;
    import('../../lib/exportUtils').then(({ exportPDF }) => {
      exportPDF(exportConfig.pdfTitle, exportConfig.sections, exportConfig.meta);
    });
  };

  return (
    <section
      style={{
        marginTop: componentSpacing.sectionTopMargin,
        marginBottom: space['8'],
        ...(tintBg ? {
          backgroundColor: tintBg,
          padding: `${space['6']} ${space['5']}`,
          borderRadius: radius.lg,
          marginLeft: `-${space['4']}`,
          marginRight: `-${space['4']}`,
        } : {}),
      }}
    >
      <div style={{ marginBottom: componentSpacing.sectionHeaderMargin, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: space['4'] }}>
        <div>
          <h2
            style={{
              fontFamily: fontFamily.display,
              fontSize: fontSize['2xl'],
              fontWeight: fontWeight.semibold,
              color: tc.text.secondary,
              marginBottom: space['1'],
              lineHeight: lineHeight.snug,
            }}
          >
            {title}
          </h2>
          {description && (
            <p
              style={{
                fontFamily: fontFamily.body,
                fontSize: fontSize.lg,
                color: tc.text.muted,
                lineHeight: lineHeight.normal,
              }}
            >
              {description}
            </p>
          )}
        </div>
        {exportConfig && (
          <ExportMenu
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            disabled={exportConfig.sections.length === 0}
          />
        )}
      </div>
      {children}
    </section>
  );
}
