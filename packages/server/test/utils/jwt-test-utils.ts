import { createSecretKey, randomBytes } from 'node:crypto';
import * as jose from 'jose';

import type { JWTConfigEnv, JWTKeys } from '../../src/services/jwt.js';

export interface TestJWTData {
  // Actual keys for direct usage in tests
  keys: JWTKeys;
  // Properly encoded config strings for initialization testing
  config: JWTConfigEnv;
}

export async function createJWTTestData(): Promise<TestJWTData> {
  // Generate RS256 key pair
  const { privateKey, publicKey } = await jose.generateKeyPair('RS256', {
    extractable: true,
  });

  // Export keys to PEM format
  const privatePem = await jose.exportPKCS8(privateKey);
  const publicPem = await jose.exportSPKI(publicKey);

  // Base64 encode the PEM strings
  const privateKeyEncoded = btoa(privatePem);
  const publicKeyEncoded = btoa(publicPem);

  // Generate and encode secrets
  const refreshSecret = randomBytes(32).toString('base64');
  const dbPrivateKey = randomBytes(32).toString('base64');

  // Create the secret key objects
  const jwtRefreshSecret = createSecretKey(
    Buffer.from(refreshSecret, 'base64'),
  );
  const jwtDbPrivateKey = createSecretKey(Buffer.from(dbPrivateKey, 'base64'));

  // Generate JWK data
  const publicKeyJWK = await jose.exportJWK(publicKey);
  const publicKeyKid = await jose.calculateJwkThumbprintUri(publicKeyJWK);

  return {
    keys: {
      jwtPrivateKey: privateKey,
      jwtPublicKey: publicKey,
      jwtRefreshSecret,
      jwtDbPrivateKey,
      publicKeyJWK,
      publicKeyKid,
    },
    config: {
      privateKey: privateKeyEncoded,
      publicKey: publicKeyEncoded,
      refreshSecret,
      dbPrivateKey,
      accessExpiration: '900',
      refreshExpiration: '604800',
      dbAccessExpiration: '900',
    },
  };
}

export function createInvalidJWTConfig(): JWTConfigEnv {
  return {
    privateKey: 'invalid-key',
    publicKey: 'invalid-key',
    refreshSecret: 'test-refresh-secret',
    dbPrivateKey: 'test-db-private-key',
    accessExpiration: '900',
    refreshExpiration: '604800',
    dbAccessExpiration: '900',
  };
}
