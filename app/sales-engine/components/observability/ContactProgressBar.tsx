'use client';

/**
 * ContactProgressBar Component
 * 
 * Compact horizontal progress bar showing contact distribution across
 * the 4-state pipeline. Includes tooltips and legend.
 * 
 * SHOULD HAVE component for compact pipeline visualization.
 */

import React, { useState } from 'react';
import { NSD_COLORS, NSD_RADIUS } from '../../lib/design-tokens';

export interface ContactProgressBarProps {
  pending: number;
  processing: number;
  ready: number;
  blocked: number;
  /** Show legend below the bar (default: true) */
  showLegend?: boolean;
  /** Bar height in pixels (default: 16) */
  height?: number;
}

const SEGMENT_CONFIG = {
  pending: { 
    label: 'Awaiting Scoring', 
    color: '#9CA3AF',
  },
  processing: { 
    label: 'Scoring/Enriching', 
    color: '#3B82F6',
  },
  ready: { 
    label: 'Ready', 
    color: '#10B981',
  },
  blocked: { 
    label: 'Blocked', 
    color: '#EF4444',
  },
};

type SegmentKey = keyof typeof SEGMENT_CONFIG;

export function ContactProgressBar({ 
  pending, 
  processing, 
  ready, 
  blocked,
  showLegend = true,
  height = 16,
}: ContactProgressBarProps) {
  const [hoveredSegment, setHoveredSegment] = useState<SegmentKey | null>(null);

  const total = pending + processing + ready + blocked;
  
  if (total === 0) {
    return (
      <div
        style={{
          height: `${height}px`,
          backgroundColor: NSD_COLORS.border.light,
          borderRadius: NSD_RADIUS.full,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: '11px', color: NSD_COLORS.text.muted }}>
          No contacts
        </span>
      </div>
    );
  }

  const allSegments: Array<{ key: SegmentKey; count: number; width: number }> = [
    { key: 'pending' as const, count: pending, width: (pending / total) * 100 },
    { key: 'processing' as const, count: processing, width: (processing / total) * 100 },
    { key: 'ready' as const, count: ready, width: (ready / total) * 100 },
    { key: 'blocked' as const, count: blocked, width: (blocked / total) * 100 },
  ];
  
  const segments = allSegments.filter(s => s.count > 0);

  return (
    <div style={{ width: '100%' }}>
      {/* Progress bar */}
      <div
        style={{
          height: `${height}px`,
          display: 'flex',
          borderRadius: NSD_RADIUS.full,
          overflow: 'hidden',
          backgroundColor: NSD_COLORS.border.light,
        }}
      >
        {segments.map((segment) => {
          const config = SEGMENT_CONFIG[segment.key];
          const isHovered = hoveredSegment === segment.key;
          
          return (
            <div
              key={segment.key}
              style={{
                width: `${segment.width}%`,
                minWidth: segment.count > 0 ? '4px' : '0',
                height: '100%',
                backgroundColor: config.color,
                cursor: 'pointer',
                transition: 'opacity 0.2s, transform 0.2s',
                opacity: isHovered ? 0.8 : 1,
                position: 'relative',
              }}
              onMouseEnter={() => setHoveredSegment(segment.key)}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '8px',
                    padding: '6px 10px',
                    backgroundColor: NSD_COLORS.text.primary,
                    color: NSD_COLORS.text.inverse,
                    borderRadius: NSD_RADIUS.md,
                    fontSize: '12px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    zIndex: 100,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  {config.label}: {segment.count.toLocaleString()} ({Math.round(segment.width)}%)
                  {/* Arrow */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-4px',
                      left: '50%',
                      transform: 'translateX(-50%) rotate(45deg)',
                      width: '8px',
                      height: '8px',
                      backgroundColor: NSD_COLORS.text.primary,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {showLegend && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginTop: '10px',
          }}
        >
          {segments.map((segment) => {
            const config = SEGMENT_CONFIG[segment.key];
            return (
              <div
                key={segment.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: config.color,
                  }}
                />
                <span style={{ fontSize: '12px', color: NSD_COLORS.text.muted }}>
                  {config.label}:
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                  {segment.count.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ContactProgressBar;
