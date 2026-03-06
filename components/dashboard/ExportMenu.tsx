'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useThemeColors } from '../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../design/tokens/typography';
import { space } from '../../design/tokens/spacing';
import { magenta } from '../../design/tokens/colors';

export interface ExportMenuProps {
  onExportCSV: () => void;
  onExportPDF: () => void;
  disabled?: boolean;
}

export function ExportMenu({ onExportCSV, onExportPDF, disabled }: ExportMenuProps) {
  const tc = useThemeColors();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        data-testid="button-export"
        style={{
          fontFamily: fontFamily.body,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.medium,
          color: disabled ? tc.text.muted : magenta[600],
          background: 'transparent',
          border: `1px solid ${disabled ? tc.border.default : magenta[300]}`,
          borderRadius: '4px',
          padding: `${space['1']} ${space['3']}`,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: space['1'],
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
      </button>

      {open && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: space['1'],
            background: tc.background.surface,
            border: `1px solid ${tc.border.default}`,
            borderRadius: '4px',
            zIndex: 50,
            minWidth: '130px',
          }}
        >
          <button
            onClick={() => { onExportCSV(); setOpen(false); }}
            data-testid="button-export-csv"
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              color: tc.text.primary,
              background: 'transparent',
              border: 'none',
              padding: `${space['2']} ${space['3']}`,
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = tc.background.hover || magenta[50])}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            CSV
          </button>
          <div style={{ height: '1px', background: tc.border.default }} />
          <button
            onClick={() => { onExportPDF(); setOpen(false); }}
            data-testid="button-export-pdf"
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              color: tc.text.primary,
              background: 'transparent',
              border: 'none',
              padding: `${space['2']} ${space['3']}`,
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = tc.background.hover || magenta[50])}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            PDF
          </button>
        </div>
      )}
    </div>
  );
}
