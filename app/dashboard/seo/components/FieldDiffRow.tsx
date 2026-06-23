'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { PALETTE, monoStack } from '../_shared';

type FieldType = 'h1' | 'meta' | 'title' | 'alt';

interface Props {
  field: FieldType;
  before: string | null;
  after: string;
  qualityScore: number;
  guardReason?: string;
}

const FIELD_LABELS: Record<FieldType, string> = {
  h1: 'H1',
  meta: 'META',
  title: 'TITLE',
  alt: 'ALT',
};

const FIELD_TONES: Record<FieldType, { bg: string; fg: string }> = {
  h1: { bg: PALETTE.goodSoft, fg: PALETTE.good },
  meta: { bg: PALETTE.violetSoft, fg: PALETTE.violet },
  title: { bg: PALETTE.infoSoft, fg: PALETTE.info },
  alt: { bg: '#f1f5f9', fg: '#475569' },
};

function qualityColor(score: number): string {
  if (score > 0.75) return PALETTE.good;
  if (score >= 0.5) return '#d97706';
  return PALETTE.bad;
}

export function FieldDiffRow({ field, before, after, qualityScore, guardReason }: Props) {
  const tc = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const afterRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    if (afterRef.current) {
      setOverflows(afterRef.current.scrollHeight > afterRef.current.clientHeight + 2);
    }
  }, [after]);

  const tone = FIELD_TONES[field];
  const hasBefore = before && before.trim().length > 0;

  return (
    <div
      onClick={() => setExpanded((e) => !e)}
      style={{
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.md,
        padding: space['4'],
        background: tc.background.surface,
        marginBottom: space['3'],
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], flexWrap: 'wrap' }}>
        {/* Field chip */}
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 999,
            fontSize: '11px',
            fontWeight: fontWeight.semibold,
            background: tone.bg,
            color: tone.fg,
            fontFamily: fontFamily.body,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {FIELD_LABELS[field]}
        </span>

        {/* Before */}
        {expanded ? null : (
          hasBefore ? (
            <span
              aria-label="Current value"
              style={{
                fontFamily: fontFamily.body,
                fontSize: '12px',
                color: tc.text.muted,
                maxWidth: '220px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {before}
            </span>
          ) : (
            <span
              style={{
                fontFamily: fontFamily.body,
                fontSize: '12px',
                color: tc.text.muted,
                fontStyle: 'italic',
              }}
            >
              No current value
            </span>
          )
        )}

        {!expanded && (
          <span style={{ color: tc.text.muted, fontSize: '12px' }}>→</span>
        )}

        {/* After (collapsed: 2-line clamp) */}
        {!expanded && (
          <span
            aria-label="Proposed value"
            style={{
              fontFamily: fontFamily.body,
              fontSize: '12px',
              color: tc.text.primary,
              fontWeight: fontWeight.medium,
              flex: 1,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
            }}
          >
            {after}
          </span>
        )}

        {/* Quality bar */}
        <div
          style={{
            width: '60px',
            height: '6px',
            borderRadius: 3,
            background: tc.border.subtle,
            flexShrink: 0,
            marginLeft: 'auto',
            overflow: 'hidden',
          }}
          title={`Quality score: ${Math.round(qualityScore * 100)}%`}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(1, Math.max(0, qualityScore)) * 100}%`,
              background: qualityColor(qualityScore),
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ marginTop: space['3'] }}>
          <div style={{ marginBottom: space['2'] }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: fontWeight.semibold,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.05em',
                color: tc.text.muted,
                fontFamily: fontFamily.body,
                marginBottom: '4px',
              }}
            >
              Current value
            </div>
            {hasBefore ? (
              <div
                aria-label="Current value"
                style={{
                  fontFamily: fontFamily.body,
                  fontSize: '13px',
                  color: tc.text.muted,
                  padding: space['2'],
                  background: tc.background.muted,
                  borderRadius: radius.sm,
                  lineHeight: 1.5,
                }}
              >
                {before}
              </div>
            ) : (
              <div
                style={{
                  fontFamily: fontFamily.body,
                  fontSize: '13px',
                  color: tc.text.muted,
                  fontStyle: 'italic',
                  padding: space['2'],
                  background: tc.background.muted,
                  borderRadius: radius.sm,
                }}
              >
                No current value — this field will be added.
              </div>
            )}
          </div>
          <div style={{ marginBottom: guardReason ? space['2'] : 0 }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: fontWeight.semibold,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.05em',
                color: tc.text.muted,
                fontFamily: fontFamily.body,
                marginBottom: '4px',
              }}
            >
              Proposed value
            </div>
            <div
              aria-label="Proposed value"
              style={{
                fontFamily: fontFamily.body,
                fontSize: '13px',
                color: tc.text.primary,
                fontWeight: fontWeight.medium,
                padding: space['2'],
                background: PALETTE.goodSoft,
                borderRadius: radius.sm,
                lineHeight: 1.5,
              }}
            >
              {after}
            </div>
          </div>
          {guardReason && (
            <div
              style={{
                fontSize: '12px',
                color: PALETTE.warn,
                fontFamily: fontFamily.body,
                padding: space['2'],
                background: PALETTE.warnSoft,
                borderRadius: radius.sm,
              }}
            >
              <strong>Guard note:</strong> {guardReason}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: space['2'],
              marginTop: space['2'],
              fontSize: '12px',
              color: tc.text.muted,
              fontFamily: fontFamily.body,
            }}
          >
            <span>Quality:</span>
            <div
              style={{
                width: '80px',
                height: '6px',
                borderRadius: 3,
                background: tc.border.subtle,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(1, Math.max(0, qualityScore)) * 100}%`,
                  background: qualityColor(qualityScore),
                  borderRadius: 3,
                }}
              />
            </div>
            <span style={{ fontFamily: monoStack }}>{Math.round(qualityScore * 100)}%</span>
          </div>
        </div>
      )}

      {!expanded && overflows && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          style={{
            marginTop: '4px',
            fontSize: '11px',
            color: PALETTE.violet,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: fontFamily.body,
            padding: 0,
          }}
        >
          Show more
        </button>
      )}
    </div>
  );
}
