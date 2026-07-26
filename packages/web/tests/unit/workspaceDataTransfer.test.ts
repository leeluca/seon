import { describe, expect, it } from 'vitest';

import {
  exportWorkspaceData,
  importWorkspaceData,
  parseWorkspaceData,
  serializeWorkspaceData,
  type WorkspaceDataExport,
  type WorkspaceDataTransaction,
  type WorkspaceDataWriter,
} from '~/data/workspace';

const payload: WorkspaceDataExport = {
  format: 'seon-workspace-export',
  version: 1,
  exportId: 'export-1',
  exportedAt: '2026-07-20T00:00:00.000Z',
  source: { workspaceId: 'workspace-1', kind: 'local' },
  data: {
    profile: null,
    goals: [
      {
        id: 'goal-1',
        shortId: 'g1',
        title: 'Read',
        description: null,
        target: 10,
        unit: 'books',
        startDate: '2026-01-01T00:00:00.000Z',
        targetDate: '2026-12-31T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        initialValue: 0,
        type: 'total',
        currentValue: 1,
        completionDate: null,
        archivedAt: null,
      },
    ],
    entries: [
      {
        id: 'entry-1',
        shortId: 'e1',
        goalId: 'goal-1',
        value: 1,
        date: '2026-07-20',
        createdAt: '2026-07-20T00:00:00.000Z',
        updatedAt: '2026-07-20T00:00:00.000Z',
      },
    ],
  },
};

class FakeWorkspaceDatabase
  implements WorkspaceDataWriter, WorkspaceDataTransaction
{
  readonly ids = {
    profile: new Set<string>(),
    goal: new Set<string>(),
    entry: new Set<string>(),
    workspace_meta: new Set<string>(),
  };
  readonly statements: Array<{ sql: string; parameters: unknown[] }> = [];

  async getAll<T>(): Promise<T[]> {
    return [];
  }

  async getOptional<T>(
    sql: string,
    parameters: unknown[] = [],
  ): Promise<T | null> {
    const table = sql.match(/FROM\s+(\w+)/i)?.[1] as keyof typeof this.ids;
    return this.ids[table]?.has(String(parameters[0]))
      ? ({ id: parameters[0] } as T)
      : null;
  }

  async execute(sql: string, parameters: unknown[] = []): Promise<unknown> {
    this.statements.push({ sql, parameters });
    const table = sql.match(
      /INSERT INTO\s+(\w+)/i,
    )?.[1] as keyof typeof this.ids;
    this.ids[table].add(String(parameters[0]));
    return undefined;
  }

  async writeTransaction<T>(
    callback: (transaction: WorkspaceDataTransaction) => Promise<T>,
  ): Promise<T> {
    return callback(this);
  }
}

describe('workspace data transfer', () => {
  it('exports only the recovery-safe workspace tables and fields', async () => {
    const queries: string[] = [];
    const database = {
      getAll: async <T>(sql: string): Promise<T[]> => {
        queries.push(sql);
        if (sql.includes('FROM goal')) return payload.data.goals as T[];
        if (sql.includes('FROM entry')) return payload.data.entries as T[];
        return [];
      },
      getOptional: async <T>(): Promise<T | null> => null,
    };

    const exported = await exportWorkspaceData(
      database,
      { id: 'workspace-1', kind: 'local' },
      {
        idFactory: () => 'export-1',
        now: () => new Date('2026-07-20T00:00:00.000Z'),
      },
    );

    expect(exported).toEqual(payload);
    expect(queries.join(' ')).not.toMatch(
      /userId|\buser\b|ps_crud|credential/i,
    );
  });

  it('round-trips the versioned JSON format', () => {
    expect(parseWorkspaceData(serializeWorkspaceData(payload))).toEqual(
      payload,
    );
  });

  it('rejects entries whose goal is missing', () => {
    const invalid = structuredClone(payload);
    invalid.data.goals = [];

    expect(() => parseWorkspaceData(JSON.stringify(invalid))).toThrow(
      'entry without its goal',
    );
  });

  it('imports allowlisted domain fields and records an atomic marker', async () => {
    const database = new FakeWorkspaceDatabase();

    const result = await importWorkspaceData(database, payload, {
      importId: 'legacy-seon-goals-v1',
      now: () => new Date('2026-07-20T01:00:00.000Z'),
    });

    expect(result).toMatchObject({
      alreadyImported: false,
      imported: { profile: 0, goals: 1, entries: 1 },
    });
    expect(database.ids.goal).toContain('goal-1');
    expect(database.ids.entry).toContain('entry-1');
    expect(database.ids.workspace_meta).toContain(
      'data-import:legacy-seon-goals-v1',
    );
    expect(database.statements.map(({ sql }) => sql)).not.toContainEqual(
      expect.stringMatching(/userId|ps_crud|credential/i),
    );
  });

  it('does not duplicate a completed import', async () => {
    const database = new FakeWorkspaceDatabase();
    await importWorkspaceData(database, payload);
    const statementCount = database.statements.length;

    const retried = await importWorkspaceData(database, payload);

    expect(retried.alreadyImported).toBe(true);
    expect(retried.imported).toEqual({ profile: 0, goals: 0, entries: 0 });
    expect(database.statements).toHaveLength(statementCount);
  });
});
