import { describe, expect, it } from 'vitest';

import { comparePW, hashPW } from '../../../src/services/password.js';

describe('Password Service', () => {
  describe('hashPW', () => {
    it('should hash a password', async () => {
      const password = 'test-password';
      const hashedPassword = await hashPW(password);

      expect(hashedPassword).toBeTruthy();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toContain('.'); // Format: hash.salt
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'test-password';
      const hash1 = await hashPW(password);
      const hash2 = await hashPW(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePW', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'test-password';
      const hashedPassword = await hashPW(password);

      const result = await comparePW({
        receivedPassword: password,
        storedPassword: hashedPassword,
      });

      expect(result).toBe(true);
    });

    it('should return false for non-matching password and hash', async () => {
      const password = 'test-password';
      const wrongPassword = 'wrong-password';
      const hashedPassword = await hashPW(password);

      const result = await comparePW({
        receivedPassword: wrongPassword,
        storedPassword: hashedPassword,
      });

      expect(result).toBe(false);
    });

    it('should handle invalid hash formats gracefully', async () => {
      const password = 'test-password';
      const invalidHash = 'invalid-hash-format';

      // This should throw an error since the hash format is invalid
      await expect(
        comparePW({
          receivedPassword: password,
          storedPassword: invalidHash,
        }),
      ).rejects.toThrow();
    });
  });
});
