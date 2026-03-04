// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { normalizeLandingPage, normalizeToPath } from '../normalize-landing-page';

describe('normalizeToPath', () => {
  it('extracts path from full HTTPS URL', () => {
    expect(normalizeToPath('https://neonsignsdepot.com/custom-neon-signs/')).toBe('/custom-neon-signs/');
  });

  it('extracts path from full HTTP URL', () => {
    expect(normalizeToPath('http://neonsignsdepot.com/products/led-signs')).toBe('/products/led-signs/');
  });

  it('strips query parameters from full URL', () => {
    expect(normalizeToPath('https://neonsignsdepot.com/custom-neon-signs/?ref=google&utm_source=ads')).toBe('/custom-neon-signs/');
  });

  it('strips query parameters from bare path', () => {
    expect(normalizeToPath('/custom-neon-signs/?ref=google')).toBe('/custom-neon-signs/');
  });

  it('appends trailing slash to path without one', () => {
    expect(normalizeToPath('/custom-neon-signs')).toBe('/custom-neon-signs/');
  });

  it('preserves trailing slash if already present', () => {
    expect(normalizeToPath('/custom-neon-signs/')).toBe('/custom-neon-signs/');
  });

  it('handles root URL', () => {
    expect(normalizeToPath('https://quote.neonsignsdepot.com')).toBe('/');
  });

  it('handles root URL with trailing slash', () => {
    expect(normalizeToPath('https://quote.neonsignsdepot.com/')).toBe('/');
  });

  it('handles root path', () => {
    expect(normalizeToPath('/')).toBe('/');
  });

  it('adds leading slash to bare path segment', () => {
    expect(normalizeToPath('custom-neon-signs')).toBe('/custom-neon-signs/');
  });

  it('collapses multiple consecutive slashes', () => {
    expect(normalizeToPath('//custom-neon-signs//page//')).toBe('/custom-neon-signs/page/');
  });

  it('handles subdomain URL — strips domain, keeps path', () => {
    expect(normalizeToPath('https://quote.neonsignsdepot.com/form')).toBe('/form/');
  });

  it('handles URL with port number', () => {
    expect(normalizeToPath('https://neonsignsdepot.com:8080/products/')).toBe('/products/');
  });

  it('handles URL with hash fragment', () => {
    expect(normalizeToPath('https://neonsignsdepot.com/page#section')).toBe('/page/');
  });

  it('handles deeply nested path', () => {
    expect(normalizeToPath('https://neonsignsdepot.com/for-businesses/restaurants/outdoor/')).toBe('/for-businesses/restaurants/outdoor/');
  });
});

describe('normalizeLandingPage', () => {
  it('returns null for all-null inputs', () => {
    expect(normalizeLandingPage(null, null, null)).toBeNull();
  });

  it('returns null for all-undefined inputs', () => {
    expect(normalizeLandingPage(undefined, undefined, undefined)).toBeNull();
  });

  it('returns null for empty string inputs', () => {
    expect(normalizeLandingPage('', '', '')).toBeNull();
  });

  it('returns null for whitespace-only inputs', () => {
    expect(normalizeLandingPage('   ', '   ', '   ')).toBeNull();
  });

  it('prioritizes origin_page over landing_page and origin_url', () => {
    expect(normalizeLandingPage(
      '/from-origin-page/',
      'https://neonsignsdepot.com/from-origin-url/',
      '/from-landing-page/',
    )).toBe('/from-origin-page/');
  });

  it('falls back to landing_page when origin_page is null', () => {
    expect(normalizeLandingPage(
      null,
      'https://neonsignsdepot.com/from-origin-url/',
      '/from-landing-page/',
    )).toBe('/from-landing-page/');
  });

  it('falls back to origin_url when origin_page and landing_page are null', () => {
    expect(normalizeLandingPage(
      null,
      'https://neonsignsdepot.com/from-origin-url/',
      null,
    )).toBe('/from-origin-url/');
  });

  it('normalizes origin_url from full URL to path', () => {
    expect(normalizeLandingPage(
      null,
      'https://neonsignsdepot.com/custom-neon-signs/?utm_source=google',
      null,
    )).toBe('/custom-neon-signs/');
  });

  it('normalizes origin_page that is already a path', () => {
    expect(normalizeLandingPage('/custom-neon-signs', null, null)).toBe('/custom-neon-signs/');
  });

  it('trims whitespace from inputs', () => {
    expect(normalizeLandingPage('  /custom-neon-signs/  ', null, null)).toBe('/custom-neon-signs/');
  });

  it('skips whitespace-only origin_page and falls back to origin_url', () => {
    expect(normalizeLandingPage(
      '   ',
      'https://neonsignsdepot.com/from-origin-url/',
      null,
    )).toBe('/from-origin-url/');
  });

  it('skips whitespace-only origin_page and empty landing_page, falls back to origin_url', () => {
    expect(normalizeLandingPage(
      '   ',
      'https://neonsignsdepot.com/products/',
      '',
    )).toBe('/products/');
  });
});
