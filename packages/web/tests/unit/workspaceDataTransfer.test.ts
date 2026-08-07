import { describe, expect, it } from 'vitest';

import {
  exportWorkspaceData,
  getLegacyImportId,
  IMPORT_TRANSACTION_OPERATION_LIMIT,
  importWorkspaceData,
  parseWorkspaceData,
  serializeWorkspaceData,
  type WorkspaceDataExport,
  type WorkspaceDataTransaction,
  type WorkspaceDataWriter,
} from '~/data/workspace';

const exportId = '00000000-0000-4000-8000-000000000001';
const workspaceId = '00000000-0000-4000-8000-000000000002';
const goalId = '00000000-0000-4000-8000-000000000003';
const entryId = '00000000-0000-4000-8000-000000000004';

function firstRecord<T>(records: T[]): T {
  const record = records[0];
  if (!record) throw new Error('Workspace fixture is missing a record');
  return record;
}

const payload: WorkspaceDataExport = {
  format: 'seon-workspace-export',
  version: 1,
  exportId,
  exportedAt: '2026-07-20T00:00:00.000Z',
  source: { workspaceId, kind: 'local' },
  data: {
    profile: null,
    goals: [
      {
        id: goalId,
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
        type: 'COUNT',
        currentValue: 1,
        completionDate: null,
        archivedAt: null,
      },
    ],
    entries: [
      {
        id: entryId,
        shortId: 'e1',
        goalId,
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
  readonly transactions: Array<Array<{ sql: string; parameters: unknown[] }>> =
    [];

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
    const firstStatement = this.statements.length;
    const result = await callback(this);
    this.transactions.push(this.statements.slice(firstStatement));
    return result;
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
      { id: workspaceId, kind: 'local' },
      {
        idFactory: () => exportId,
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

  it('imports allowlisted domain fields and records a completion marker', async () => {
    const database = new FakeWorkspaceDatabase();

    const result = await importWorkspaceData(database, payload, {
      importId: 'legacy-seon-goals-v1',
      now: () => new Date('2026-07-20T01:00:00.000Z'),
    });

    expect(result).toMatchObject({
      alreadyImported: false,
      imported: { profile: 0, goals: 1, entries: 1 },
    });
    expect(database.ids.goal).toContain(goalId);
    expect(database.ids.entry).toContain(entryId);
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

  it('splits large imports into uploadable PowerSync transactions', async () => {
    const database = new FakeWorkspaceDatabase();
    const largePayload = structuredClone(payload);
    const baseGoal = payload.data.goals[0];
    if (!baseGoal) throw new Error('Goal fixture is missing');
    largePayload.data.entries = [];
    largePayload.data.goals = Array.from(
      { length: IMPORT_TRANSACTION_OPERATION_LIMIT * 2 + 1 },
      (_, index) => ({
        ...baseGoal,
        id: `00000000-0000-4000-8000-${(index + 1000)
          .toString(16)
          .padStart(12, '0')}`,
        shortId: `g${index}`,
      }),
    );

    await importWorkspaceData(database, largePayload);

    const syncableOperationCounts = database.transactions
      .map(
        (statements) =>
          statements.filter(({ sql }) =>
            /INSERT INTO\s+(profile|goal|entry)/i.test(sql),
          ).length,
      )
      .filter((count) => count > 0);
    expect(syncableOperationCounts).toEqual([
      IMPORT_TRANSACTION_OPERATION_LIMIT,
      IMPORT_TRANSACTION_OPERATION_LIMIT,
      1,
    ]);
  });

  it.each([
    {
      name: 'non-UUID record ids',
      mutate: (invalid: WorkspaceDataExport) => {
        firstRecord(invalid.data.goals).id = 'goal-1';
        firstRecord(invalid.data.entries).goalId = 'goal-1';
      },
    },
    {
      name: 'unsupported goal types',
      mutate: (invalid: WorkspaceDataExport) => {
        (firstRecord(invalid.data.goals) as { type: string }).type = 'total';
      },
    },
    {
      name: 'out-of-range PostgreSQL integers',
      mutate: (invalid: WorkspaceDataExport) => {
        firstRecord(invalid.data.goals).target = 2_147_483_648;
      },
    },
    {
      name: 'invalid dates',
      mutate: (invalid: WorkspaceDataExport) => {
        firstRecord(invalid.data.entries).date = 'not-a-date';
      },
    },
  ])('rejects $name before writing locally', async ({ mutate }) => {
    const database = new FakeWorkspaceDatabase();
    const invalid = structuredClone(payload);
    mutate(invalid);

    await expect(importWorkspaceData(database, invalid)).rejects.toThrow(
      'Invalid Seon workspace export',
    );
    expect(database.statements).toHaveLength(0);
  });

  it('uses a different legacy import marker for each storage backend', () => {
    const baseCandidate = {
      databaseFilename: 'seon-goals.db' as const,
      goalCount: 1,
      entryCount: 1,
    };

    expect(
      getLegacyImportId({ ...baseCandidate, storageBackend: 'opfs' }),
    ).not.toBe(
      getLegacyImportId({ ...baseCandidate, storageBackend: 'indexeddb' }),
    );
  });
});
