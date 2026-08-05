import type { JWK } from 'jose';
import type { KeyObject, webcrypto } from 'node:crypto';

// User constants
export const TEST_USER = {
  id: '01HQ5GMZN7MMVFHBF6YVPFQJ4R',
  email: 'test@example.com',
  password: 'hashed.password',
};

// JWT Keys constants
export const MOCK_JWT_KEYS = {
  jwtPrivateKey: 'mocked-private-key',
  jwtPublicKey: 'mocked-public-key',
  jwtDbPrivateKey: 'mocked-db-private-key',
  publicKeyJWK: { kid: 'test-kid' },
  publicKeyKid: 'test-kid',
};

// JWT Config constants
export const MOCK_JWT_CONFIGS = {
  access: {
    expiration: 900,
    algorithm: 'RS256',
    signingKey: 'mocked-private-key',
    verificationKey: 'mocked-public-key',
    aud: 'authenticated',
    role: 'authenticated',
    kid: 'test-kid',
    cookieName: 'access_token',
  },
  db_access: {
    expiration: 900,
    algorithm: 'HS256',
    signingKey: 'mocked-db-private-key',
    verificationKey: 'mocked-db-private-key',
    aud: 'authenticated',
    role: 'authenticated',
    kid: '1',
    cookieName: 'db_access_token',
  },
};

// JWT Payload constants
export const MOCK_JWT_PAYLOAD = {
  sub: TEST_USER.id,
  exp: Math.floor(Date.now() / 1000) + 900,
  iat: Math.floor(Date.now() / 1000),
  aud: 'authenticated',
  role: 'authenticated',
};

// Token constants
export const MOCK_TOKENS = {
  valid: {
    access: 'valid-access-token',
  },
  invalid: 'invalid.token.here',
};

// Type definitions for JWT related objects
export interface JWTKeys {
  jwtPrivateKey: string | webcrypto.CryptoKey;
  jwtPublicKey: string | webcrypto.CryptoKey;
  jwtDbPrivateKey: string | KeyObject;
  publicKeyJWK: JWK;
  publicKeyKid: string;
}

export interface JWTConfig {
  expiration: number;
  algorithm: string;
  signingKey: string | KeyObject;
  verificationKey: string | KeyObject;
  aud: string;
  role: string;
  kid: string;
  cookieName: string;
}

// Database URL constant
export const TEST_DB_URL = 'postgres://test';
