'use client';

/**
 * <Term> — inline jargon explainer (C-4, comprehension pack).
 *
 * Renders its children with a dotted underline and a native title tooltip so an
 * operator who doesn't know an abbreviation can hover (or focus, via tabIndex)
 * to get a one-line plain-language definition. Definitions describe what the
 * data ACTUALLY is in this system (source included) — never marketing gloss.
 *
 * Usage: apply at FIRST USE per surface — header cells and section captions,
 * not every table cell.
 */

import React from 'react';

export const TERM_DEFS = {
  impr: 'impr = impressions — how many times this page/query appeared in Google Search results (source: Google Search Console).',
  pos: 'pos = average position in Google results (source: Google Search Console). Lower is better — 1.0 is the top result.',
  kd: 'KD = keyword difficulty, 0–100 (source: DataForSEO). Higher = harder to rank for.',
  vol: 'vol = monthly search volume for the keyword (source: DataForSEO).',
  cpc: 'CPC = cost per click in USD that advertisers pay for this keyword (source: DataForSEO) — a proxy for commercial value.',
  ref: '“ref” = reference metric — third-party keyword intelligence (DataForSEO snapshot, dated), not something measured on your site. Hover a value for its source and as-of date.',
  gate: 'The gate is the engine’s automated quality check — only candidates that pass it reach the approval queue; everything else is withheld with a recorded reason.',
  lane: 'Lane 1 = engine executes after your approval · Lane 2 = manual Rank Math work · Lane 3 = advisory only.',
} as const;

export type TermKey = keyof typeof TERM_DEFS;

/** One-line lane explainer for captions where lanes appear. */
export const LANE_EXPLAINER = TERM_DEFS.lane;

export interface TermProps {
  /** Key into the shared definition dictionary. */
  k?: TermKey;
  /** Override / ad-hoc definition (wins over `k`). */
  def?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Term({ k, def, children, style }: TermProps) {
  const definition = def ?? (k ? TERM_DEFS[k] : undefined);
  if (!definition) return <>{children}</>;
  return (
    <span
      tabIndex={0}
      title={definition}
      aria-label={typeof children === 'string' ? `${children} — ${definition}` : definition}
      style={{
        textDecoration: 'underline dotted',
        textDecorationThickness: '1px',
        textUnderlineOffset: '2px',
        cursor: 'help',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
