import { afterEach, describe, expect, it, vi } from 'vitest';

import fetcher from '~/apis/fetcher';
import {
  clearPendingSignOut,
  flushPendingSignOut,
  getPendingSignOut,
  markPendingSignOut,
} from '~/features/auth/authSession';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('browser auth sessions', () => {
  it('uses one refresh request for concurrent expired access tokens', async () => {
    let protectedRequests = 0;
    let refreshRequests = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url.endsWith('/api/auth/refresh')) {
          refreshRequests += 1;
          return jsonResponse({
            result: true,
            userId: 'account-a',
            expiresAt: 123,
          });
        }

        protectedRequests += 1;
        if (protectedRequests <= 2) {
          return jsonResponse(
            {
              error: {
                code: 'ACCESS_TOKEN_INVALID',
                message: 'Expired',
              },
            },
            401,
          );
        }
        return jsonResponse({ result: true, userId: 'account-a' });
      }),
    );

    await Promise.all([
      fetcher('/api/auth/status'),
      fetcher('/api/auth/status'),
    ]);

    expect(refreshRequests).toBe(1);
    expect(protectedRequests).toBe(4);
  });

  it('keeps server revocation pending while offline and retries online', async () => {
    markPendingSignOut('account-a');
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    await expect(flushPendingSignOut()).resolves.toBe(false);
    expect(getPendingSignOut()?.userId).toBe('account-a');

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ result: true })),
    );

    await expect(flushPendingSignOut()).resolves.toBe(true);
    expect(getPendingSignOut()).toBeNull();
  });

  it('still signs out locally when browser storage rejects writes', () => {
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });

    expect(() => markPendingSignOut('account-a')).not.toThrow();
    expect(getPendingSignOut()?.userId).toBe('account-a');

    setItem.mockRestore();
    clearPendingSignOut();
  });
});
