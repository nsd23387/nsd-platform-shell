// @vitest-environment happy-dom

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

describe('Activity Spine SDK request lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_API_MODE', 'enabled');
    vi.stubEnv('NEXT_PUBLIC_ACTIVITY_SPINE_URL', '/api/activity-spine');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('times out a hung marketing overview request instead of leaving loading unresolved', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal instanceof AbortSignal) {
          signal.addEventListener('abort', () => {
            const err = new Error('Aborted');
            err.name = 'AbortError';
            reject(err);
          }, { once: true });
        }
      });
    });

    const { getMarketingDashboardData } = await import('../sdk');

    const request = getMarketingDashboardData({ preset: 'last_7d' });
    const assertion = expect(request).rejects.toMatchObject({
      name: 'ActivitySpineError',
      statusCode: 408,
      message: 'Activity Spine request timed out after 8000ms',
    });

    await vi.advanceTimersByTimeAsync(8000);

    await assertion;
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
