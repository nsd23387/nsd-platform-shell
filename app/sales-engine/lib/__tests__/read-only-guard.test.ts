/**
 * Read-Only Guard - Unit Tests
 * 
 * Tests for the read-only API enforcement module.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  isAllowedMethod,
  isForbiddenMethod,
  assertReadOnly,
  ReadOnlyViolationError,
  createReadOnlyFetch,
  ALLOWED_METHODS,
  FORBIDDEN_METHODS,
} from '../read-only-guard';

describe('isAllowedMethod', () => {
  it('should return true for GET method', () => {
    expect(isAllowedMethod('GET')).toBe(true);
    expect(isAllowedMethod('get')).toBe(true);
  });

  it('should return true for HEAD method', () => {
    expect(isAllowedMethod('HEAD')).toBe(true);
  });

  it('should return true for OPTIONS method', () => {
    expect(isAllowedMethod('OPTIONS')).toBe(true);
  });

  it('should return false for POST method', () => {
    expect(isAllowedMethod('POST')).toBe(false);
  });

  it('should return false for PUT method', () => {
    expect(isAllowedMethod('PUT')).toBe(false);
  });

  it('should return false for PATCH method', () => {
    expect(isAllowedMethod('PATCH')).toBe(false);
  });

  it('should return false for DELETE method', () => {
    expect(isAllowedMethod('DELETE')).toBe(false);
  });
});

describe('isForbiddenMethod', () => {
  it('should return true for POST method', () => {
    expect(isForbiddenMethod('POST')).toBe(true);
    expect(isForbiddenMethod('post')).toBe(true);
  });

  it('should return true for PUT method', () => {
    expect(isForbiddenMethod('PUT')).toBe(true);
  });

  it('should return true for PATCH method', () => {
    expect(isForbiddenMethod('PATCH')).toBe(true);
  });

  it('should return true for DELETE method', () => {
    expect(isForbiddenMethod('DELETE')).toBe(true);
  });

  it('should return false for GET method', () => {
    expect(isForbiddenMethod('GET')).toBe(false);
  });
});

describe('assertReadOnly', () => {
  it('should not throw for GET requests', () => {
    expect(() => assertReadOnly('GET', '/api/campaigns')).not.toThrow();
  });

  it('should not throw for HEAD requests', () => {
    expect(() => assertReadOnly('HEAD', '/api/campaigns')).not.toThrow();
  });

  it('should throw ReadOnlyViolationError for POST requests', () => {
    expect(() => assertReadOnly('POST', '/api/campaigns')).toThrow(ReadOnlyViolationError);
  });

  it('should throw ReadOnlyViolationError for PUT requests', () => {
    expect(() => assertReadOnly('PUT', '/api/campaigns/123')).toThrow(ReadOnlyViolationError);
  });

  it('should throw ReadOnlyViolationError for PATCH requests', () => {
    expect(() => assertReadOnly('PATCH', '/api/campaigns/123')).toThrow(ReadOnlyViolationError);
  });

  it('should throw ReadOnlyViolationError for DELETE requests', () => {
    expect(() => assertReadOnly('DELETE', '/api/campaigns/123')).toThrow(ReadOnlyViolationError);
  });
});

describe('ReadOnlyViolationError', () => {
  it('should have correct error properties', () => {
    const error = new ReadOnlyViolationError('POST', '/api/campaigns');
    
    expect(error.name).toBe('ReadOnlyViolationError');
    expect(error.method).toBe('POST');
    expect(error.endpoint).toBe('/api/campaigns');
    expect(error.timestamp).toBeDefined();
    expect(error.message).toContain('READ-ONLY VIOLATION');
    expect(error.message).toContain('POST');
    expect(error.message).toContain('/api/campaigns');
  });

  it('should include explanatory message', () => {
    const error = new ReadOnlyViolationError('DELETE', '/api/campaigns/123');
    
    expect(error.message).toContain('read-only');
    expect(error.message).toContain('cannot perform mutations');
  });
});

describe('createReadOnlyFetch', () => {
  it('should allow GET requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}'));
    const guardedFetch = createReadOnlyFetch(mockFetch);

    await guardedFetch('/api/campaigns');

    expect(mockFetch).toHaveBeenCalled();
  });

  it('should allow GET requests with explicit method', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}'));
    const guardedFetch = createReadOnlyFetch(mockFetch);

    await guardedFetch('/api/campaigns', { method: 'GET' });

    expect(mockFetch).toHaveBeenCalled();
  });

  it('should reject POST requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}'));
    const guardedFetch = createReadOnlyFetch(mockFetch);

    await expect(
      guardedFetch('/api/campaigns', { method: 'POST' })
    ).rejects.toThrow(ReadOnlyViolationError);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should reject PUT requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}'));
    const guardedFetch = createReadOnlyFetch(mockFetch);

    await expect(
      guardedFetch('/api/campaigns/123', { method: 'PUT' })
    ).rejects.toThrow(ReadOnlyViolationError);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should reject PATCH requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}'));
    const guardedFetch = createReadOnlyFetch(mockFetch);

    await expect(
      guardedFetch('/api/campaigns/123', { method: 'PATCH' })
    ).rejects.toThrow(ReadOnlyViolationError);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should reject DELETE requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}'));
    const guardedFetch = createReadOnlyFetch(mockFetch);

    await expect(
      guardedFetch('/api/campaigns/123', { method: 'DELETE' })
    ).rejects.toThrow(ReadOnlyViolationError);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle URL objects', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}'));
    const guardedFetch = createReadOnlyFetch(mockFetch);

    await guardedFetch(new URL('https://api.example.com/campaigns'));

    expect(mockFetch).toHaveBeenCalled();
  });
});

describe('Constants', () => {
  it('ALLOWED_METHODS should include GET, HEAD, OPTIONS', () => {
    expect(ALLOWED_METHODS).toContain('GET');
    expect(ALLOWED_METHODS).toContain('HEAD');
    expect(ALLOWED_METHODS).toContain('OPTIONS');
  });

  it('FORBIDDEN_METHODS should include POST, PUT, PATCH, DELETE', () => {
    expect(FORBIDDEN_METHODS).toContain('POST');
    expect(FORBIDDEN_METHODS).toContain('PUT');
    expect(FORBIDDEN_METHODS).toContain('PATCH');
    expect(FORBIDDEN_METHODS).toContain('DELETE');
  });
});
