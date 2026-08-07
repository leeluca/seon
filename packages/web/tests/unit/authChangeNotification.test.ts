import { beforeEach, describe, expect, it } from 'vitest';

import { AUTH_CHANGE_KEY } from '../../src/constants/storage';
import { notifyAuthSessionChanged } from '../../src/features/auth/authChangeNotification';

describe('cross-tab auth change notification', () => {
  beforeEach(() => localStorage.clear());

  it('publishes a credential-free change marker', () => {
    notifyAuthSessionChanged();

    const marker = localStorage.getItem(AUTH_CHANGE_KEY);
    expect(marker).not.toBeNull();
    expect(JSON.parse(marker ?? '{}')).toMatchObject({
      changedAt: expect.any(String),
      nonce: expect.any(String),
      reason: 'session-changed',
    });
    expect(marker).not.toContain('token');
  });

  it('identifies password-reset notifications', () => {
    notifyAuthSessionChanged('password-reset');

    expect(
      JSON.parse(localStorage.getItem(AUTH_CHANGE_KEY) ?? '{}'),
    ).toMatchObject({ reason: 'password-reset' });
  });
});
