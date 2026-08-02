import { HTTPException } from 'hono/http-exception';
import { describe, expect, it } from 'vitest';

import { assertWorkspaceOwner } from '../../../src/routes/sync.js';

describe('sync workspace ownership', () => {
  it('accepts the workspace owner', () => {
    expect(() => assertWorkspaceOwner('account-a', 'account-a')).not.toThrow();
  });

  it('rejects a missing or different workspace owner', () => {
    for (const expectedOwner of [undefined, 'account-a']) {
      const error = (() => {
        try {
          assertWorkspaceOwner(expectedOwner, 'account-b');
        } catch (caught) {
          return caught;
        }
      })();

      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(409);
    }
  });
});
