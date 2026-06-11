import { describe, expect, it } from 'vitest';
import {
  fmtDataForSeo,
  fmtDataForSeoCpc,
  fmtDataForSeoDifficulty,
  fmtDataForSeoVolume,
  hasDataForSeoValue,
} from '../dataforseoFormat';

describe('DataForSEO display formatting', () => {
  it('renders nullish and zero-fill values as missing data', () => {
    for (const value of [null, undefined, 0]) {
      expect(fmtDataForSeo(value)).toBe('—');
      expect(fmtDataForSeoDifficulty(value)).toBe('—');
      expect(fmtDataForSeoVolume(value)).toBe('—');
      expect(fmtDataForSeoCpc(value)).toBe('—');
      expect(hasDataForSeoValue(value)).toBe(false);
    }
  });

  it('formats real DataForSEO KD, volume, and CPC values', () => {
    expect(fmtDataForSeoDifficulty(16)).toBe('16');
    expect(fmtDataForSeoVolume(590)).toBe('590');
    expect(fmtDataForSeoVolume(12345)).toBe('12,345');
    expect(fmtDataForSeoCpc(2.1)).toBe('$2.10');
  });

  it('keeps legitimate low non-zero covered values visible', () => {
    expect(hasDataForSeoValue(0.01)).toBe(true);
    expect(fmtDataForSeo(0.01, 'currency')).toBe('$0.01');
    expect(fmtDataForSeo(1)).toBe('1');
  });
});
