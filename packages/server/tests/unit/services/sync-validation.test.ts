import { describe, expect, it } from 'vitest';

import { validateSyncOperation } from '../../../src/services/sync-validation.js';

const id = '019b2f0e-7c32-7000-8000-000000000001';
const goalId = '019b2f0e-7c32-7000-8000-000000000002';
const timestamp = '2026-07-20T00:00:00.000Z';

describe('validateSyncOperation', () => {
  it('normalizes a complete goal put and drops the client updatedAt', () => {
    const result = validateSyncOperation({
      table: 'goal',
      op: 'PUT',
      id,
      data: {
        shortId: 'goal-1',
        title: 'Ship the sync rewrite',
        description: null,
        initialValue: 0,
        currentValue: 1,
        target: 3,
        unit: 'milestones',
        startDate: timestamp,
        targetDate: timestamp,
        createdAt: timestamp,
        updatedAt: '2000-01-01T00:00:00.000Z',
        completionDate: null,
        archivedAt: null,
        type: 'COUNT',
      },
    });

    expect(result.rejection).toBeUndefined();
    expect(result.operation?.data).not.toHaveProperty('updatedAt');
    expect(result.operation?.data).toMatchObject({
      title: 'Ship the sync rewrite',
      currentValue: 1,
    });
  });

  it('rejects ownership fields instead of accepting a client user id', () => {
    const result = validateSyncOperation({
      table: 'entry',
      op: 'PUT',
      id,
      data: {
        shortId: 'entry-1',
        goalId,
        value: 1,
        date: timestamp,
        createdAt: timestamp,
        userId: id,
      },
    });

    expect(result.rejection).toMatchObject({ code: 'unsupported_field' });
  });

  it('ignores preferences on a profile PUT and accepts them on a PATCH', () => {
    const put = validateSyncOperation({
      table: 'profile',
      op: 'PUT',
      id,
      data: {
        name: 'Luca',
        email: 'luca@example.com',
        createdAt: timestamp,
        updatedAt: timestamp,
        preferences: JSON.stringify({ language: 'pt' }),
      },
    });
    const patch = validateSyncOperation({
      table: 'profile',
      op: 'PATCH',
      id,
      data: { preferences: JSON.stringify({ language: 'pt' }) },
    });

    expect(put).toEqual({
      operation: {
        table: 'profile',
        op: 'PUT',
        id,
        data: {},
      },
    });
    expect(patch).toEqual({
      operation: {
        table: 'profile',
        op: 'PATCH',
        id,
        data: { preferences: { language: 'pt' } },
      },
    });
  });

  it('rejects incomplete inserts and invalid preferences', () => {
    expect(
      validateSyncOperation({
        table: 'goal',
        op: 'PUT',
        id,
        data: { title: 'Incomplete' },
      }).rejection,
    ).toMatchObject({ code: 'missing_field' });

    expect(
      validateSyncOperation({
        table: 'profile',
        op: 'PATCH',
        id,
        data: { preferences: '{not-json}' },
      }).rejection,
    ).toMatchObject({ code: 'invalid_field' });
  });

  it('treats a replaced local profile deletion as a server no-op', () => {
    expect(
      validateSyncOperation({
        table: 'profile',
        op: 'DELETE',
        id,
      }),
    ).toEqual({
      operation: { table: 'profile', op: 'DELETE', id, data: {} },
    });
  });

  it.each([-2_147_483_649, 2_147_483_648])(
    'rejects the out-of-range PostgreSQL integer %s',
    (value) => {
      expect(
        validateSyncOperation({
          table: 'goal',
          op: 'PATCH',
          id,
          data: { target: value },
        }).rejection,
      ).toMatchObject({ code: 'invalid_field' });
      expect(
        validateSyncOperation({
          table: 'entry',
          op: 'PATCH',
          id,
          data: { value },
        }).rejection,
      ).toMatchObject({ code: 'invalid_field' });
    },
  );

  it.each([-2_147_483_648, 2_147_483_647])(
    'accepts the PostgreSQL integer boundary %s',
    (value) => {
      expect(
        validateSyncOperation({
          table: 'goal',
          op: 'PATCH',
          id,
          data: { target: value },
        }).operation?.data,
      ).toEqual({ target: value });
      expect(
        validateSyncOperation({
          table: 'entry',
          op: 'PATCH',
          id,
          data: { value },
        }).operation?.data,
      ).toEqual({ value });
    },
  );
});
