'use client';

import React from 'react';
import { useThemeColors } from '../../hooks/useThemeColors';
import { fontFamily, fontSize } from '../../design/tokens/typography';
import { space } from '../../design/tokens/spacing';
import { ExportMenu } from './ExportMenu';
import type { ExportSection } from '../../lib/exportUtils';

export interface PageExportBarProps {
  filename: string;
  pdfTitle: string;
  sections: ExportSection[];
  meta?: { dateRange?: string; filters?: string };
  loading?: boolean;
}

export function PageExportBar({ filename, pdfTitle, sections, meta, loading }: PageExportBarProps) {
  const tc = useThemeColors();

  const handleExportCSV = () => {
    import('../../lib/exportUtils').then(({ exportCSV }) => {
      exportCSV(filename, sections);
    });
  };

  const handleExportPDF = () => {
    import('../../lib/exportUtils').then(({ exportPDF }) => {
      exportPDF(pdfTitle, sections, meta);
    });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: space['3'] }}>
      <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
        Export page data
      </span>
      <ExportMenu
        onExportCSV={handleExportCSV}
        onExportPDF={handleExportPDF}
        disabled={loading || sections.length === 0}
      />
    </div>
  );
}
