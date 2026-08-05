import { describe, expect, it } from 'vitest';

import { buildLegacyWorkspaceExport } from '~/data/domain/workspaceExport';

describe('legacy workspace export', () => {
  it('creates a successor-compatible export without ownership or auth data', () => {
    const payload = buildLegacyWorkspaceExport(
      {
        profile: {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Local User',
          email: 'user@example.com',
          preferences: '{}',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          useSync: 1,
        },
        goals: [
          {
            id: '00000000-0000-4000-8000-000000000002',
            shortId: 'goal',
            title: 'Read',
            description: null,
            target: 12,
            unit: 'books',
            startDate: '2026-01-01T00:00:00.000Z',
            targetDate: '2026-12-31T00:00:00.000Z',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            initialValue: 0,
            type: 'COUNT',
            currentValue: 1,
            completionDate: null,
            archivedAt: null,
          },
        ],
        entries: [],
      },
      {
        idFactory: () => '00000000-0000-4000-8000-000000000003',
        now: () => new Date('2026-08-02T00:00:00.000Z'),
      },
    );

    expect(payload).toMatchObject({
      format: 'seon-workspace-export',
      version: 1,
      source: {
        workspaceId: '00000000-0000-4000-8000-000000000001',
        kind: 'account',
      },
    });
    expect(JSON.stringify(payload)).not.toMatch(
      /userId|access_token|refresh_token|ps_crud/,
    );
  });
});
