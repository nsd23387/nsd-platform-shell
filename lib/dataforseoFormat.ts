export type DataForSeoFormatKind = 'integer' | 'currency';

const DASH = '—';

export function hasDataForSeoValue(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value !== 0;
}

export function fmtDataForSeo(value: number | null | undefined, kind: DataForSeoFormatKind = 'integer'): string {
  if (!hasDataForSeoValue(value)) return DASH;
  return kind === 'currency'
    ? `$${value.toFixed(2)}`
    : Math.round(value).toLocaleString('en-US');
}

export function fmtDataForSeoDifficulty(value: number | null | undefined): string {
  return fmtDataForSeo(value, 'integer');
}

export function fmtDataForSeoVolume(value: number | null | undefined): string {
  return fmtDataForSeo(value, 'integer');
}

export function fmtDataForSeoCpc(value: number | null | undefined): string {
  return fmtDataForSeo(value, 'currency');
}
