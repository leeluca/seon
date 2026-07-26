import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/auth/runtime.js', () => ({
  getCurrentSession: vi.fn(),
}));

const { getCurrentSession } = await import('../../../src/auth/runtime.js');
const { requireSession } = await import('../../../src/auth/session.js');

const getCurrentSessionMock = vi.mocked(getCurrentSession);
const context = {} as Context;

beforeEach(() => {
  getCurrentSessionMock.mockReset();
});

describe('requireSession', () => {
  it('returns the active Better Auth session', async () => {
    const currentSession = {
      user: { id: '0198f091-6bf3-7236-a622-23190e33a19f' },
      session: { id: '0198f091-a184-739f-bf7f-872e45afad7a' },
    };
    getCurrentSessionMock.mockResolvedValue(currentSession as never);

    await expect(requireSession(context)).resolves.toBe(currentSession);
  });

  it('rejects requests that do not have a session', async () => {
    getCurrentSessionMock.mockResolvedValue(null);

    const error = await requireSession(context).catch((caught) => caught);
    expect(error).toBeInstanceOf(HTTPException);
    expect(error.status).toBe(401);
  });

  it('forwards fresh-session checks for sensitive operations', async () => {
    getCurrentSessionMock.mockResolvedValue(null);

    await expect(
      requireSession(context, { fresh: true }),
    ).rejects.toBeInstanceOf(HTTPException);
    expect(getCurrentSessionMock).toHaveBeenCalledWith(context, {
      fresh: true,
    });
  });
});
