'use client';

import React from 'react';
import { useThemeColors } from '../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../design/tokens/typography';
import { space, componentSpacing } from '../../design/tokens/spacing';
import { ExportMenu } from './ExportMenu';
import type { ExportSection } from '../../lib/exportUtils';

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
}

export function DashboardSection({ title, description, children, exportConfig }: DashboardSectionProps) {
  const tc = useThemeColors();

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
      }}
    >
      <div style={{ marginBottom: componentSpacing.sectionHeaderMargin, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: space['4'] }}>
        <div>
          <h2
            style={{
              fontFamily: fontFamily.display,
              fontSize: fontSize.xl,
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
                fontSize: fontSize.base,
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
