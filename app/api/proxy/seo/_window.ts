import { NextRequest } from 'next/server';

export type SeoWindowParams = {
  days: number;
  start: string | null;
  end: string | null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseSeoWindow(req: NextRequest): SeoWindowParams {
  const rawDays = Number(req.nextUrl.searchParams.get('days') ?? '30');
  const days = Number.isFinite(rawDays)
    ? Math.max(1, Math.min(180, Math.round(rawDays)))
    : 30;
  const rawStart = req.nextUrl.searchParams.get('start');
  const rawEnd = req.nextUrl.searchParams.get('end');
  return {
    days,
    start: rawStart && DATE_RE.test(rawStart) ? rawStart : null,
    end: rawEnd && DATE_RE.test(rawEnd) ? rawEnd : null,
  };
}
