'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  key: string;
  label: string;
  format?: 'currency' | 'percent' | 'number' | 'text';
}

export interface ExportTableSection {
  type: 'table';
  title: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
}

export interface ExportKPISection {
  type: 'kpis';
  title: string;
  items: { label: string; value: string | number }[];
}

export type ExportSection = ExportTableSection | ExportKPISection;

function formatCellValue(value: unknown, format?: ExportColumn['format']): string {
  if (value == null || value === '') return '—';
  const num = Number(value);
  switch (format) {
    case 'currency':
      return isNaN(num) ? String(value) : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'percent':
      return isNaN(num) ? String(value) : `${num.toFixed(1)}%`;
    case 'number':
      return isNaN(num) ? String(value) : num.toLocaleString('en-US');
    default:
      return String(value);
  }
}

export function exportCSV(filename: string, sections: ExportSection[]): void {
  const lines: string[] = [];

  for (const section of sections) {
    lines.push(`"${section.title}"`);

    if (section.type === 'kpis') {
      lines.push('"Metric","Value"');
      for (const item of section.items) {
        lines.push(`"${item.label}","${String(item.value).replace(/"/g, '""')}"`);
      }
    } else if (section.type === 'table') {
      const headerRow = section.columns.map(c => `"${c.label}"`).join(',');
      lines.push(headerRow);
      for (const row of section.rows) {
        const dataRow = section.columns
          .map(col => {
            const raw = row[col.key];
            const formatted = formatCellValue(raw, col.format);
            return `"${formatted.replace(/"/g, '""')}"`;
          })
          .join(',');
        lines.push(dataRow);
      }
    }

    lines.push('');
  }

  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filename}.csv`);
}

export function exportPDF(
  title: string,
  sections: ExportSection[],
  meta?: { dateRange?: string; filters?: string }
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  const MAGENTA = [219, 39, 119] as [number, number, number];
  const DARK = [30, 30, 30] as [number, number, number];
  const MUTED = [120, 120, 120] as [number, number, number];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...DARK);
  doc.text(title, 14, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const dateLine = `Exported: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  doc.text(dateLine, 14, y);
  y += 4;

  if (meta?.dateRange) {
    doc.text(`Period: ${meta.dateRange}`, 14, y);
    y += 4;
  }
  if (meta?.filters) {
    doc.text(`Filters: ${meta.filters}`, 14, y);
    y += 4;
  }

  doc.setDrawColor(...MAGENTA);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  for (const section of sections) {
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 15;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...MAGENTA);
    doc.text(section.title, 14, y);
    y += 6;

    if (section.type === 'kpis') {
      const kpiData = section.items.map(item => [item.label, String(item.value)]);
      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Value']],
        body: kpiData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2, textColor: DARK },
        headStyles: { fillColor: MAGENTA, textColor: [255, 255, 255], fontStyle: 'bold' },
        margin: { left: 14, right: 14 },
        tableWidth: 120,
      });
      y = (doc as any).lastAutoTable?.finalY + 8 || y + 30;
    } else if (section.type === 'table') {
      const head = section.columns.map(c => c.label);
      const body = section.rows.map(row =>
        section.columns.map(col => formatCellValue(row[col.key], col.format))
      );
      autoTable(doc, {
        startY: y,
        head: [head],
        body,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2, textColor: DARK, overflow: 'ellipsize' },
        headStyles: { fillColor: MAGENTA, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [252, 231, 243] },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable?.finalY + 8 || y + 30;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `Neon Signs Depot - ${title} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
