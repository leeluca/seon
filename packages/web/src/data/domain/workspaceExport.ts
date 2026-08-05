import db from '~/data/db/database';

export const WORKSPACE_EXPORT_FORMAT = 'seon-workspace-export' as const;
export const WORKSPACE_EXPORT_VERSION = 1 as const;

export interface LegacyWorkspaceExport {
  format: typeof WORKSPACE_EXPORT_FORMAT;
  version: typeof WORKSPACE_EXPORT_VERSION;
  exportId: string;
  exportedAt: string;
  source: {
    workspaceId: string;
    kind: 'local' | 'account';
  };
  data: {
    profile: {
      id: string;
      name: string;
      email: string | null;
      preferences: string | null;
      createdAt: string;
      updatedAt: string;
    } | null;
    goals: Array<{
      id: string;
      shortId: string;
      title: string;
      description: string | null;
      target: number;
      unit: string;
      startDate: string;
      targetDate: string;
      createdAt: string;
      updatedAt: string;
      initialValue: number;
      type: string;
      currentValue: number;
      completionDate: string | null;
      archivedAt: string | null;
    }>;
    entries: Array<{
      id: string;
      shortId: string;
      goalId: string;
      value: number;
      date: string;
      createdAt: string;
      updatedAt: string;
    }>;
  };
}

type LegacyWorkspaceData = LegacyWorkspaceExport['data'] & {
  profile: NonNullable<LegacyWorkspaceExport['data']['profile']> & {
    useSync: number | null;
  };
};

export function buildLegacyWorkspaceExport(
  data: LegacyWorkspaceData,
  options: {
    idFactory?: () => string;
    now?: () => Date;
  } = {},
): LegacyWorkspaceExport {
  const { useSync, ...profile } = data.profile;
  const exportedAt = (options.now ?? (() => new Date()))().toISOString();

  return {
    format: WORKSPACE_EXPORT_FORMAT,
    version: WORKSPACE_EXPORT_VERSION,
    exportId: (options.idFactory ?? (() => crypto.randomUUID()))(),
    exportedAt,
    source: {
      workspaceId: profile.id,
      kind: useSync ? 'account' : 'local',
    },
    data: { profile, goals: data.goals, entries: data.entries },
  };
}

export async function createLegacyWorkspaceExport(
  options: { idFactory?: () => string; now?: () => Date } = {},
): Promise<LegacyWorkspaceExport> {
  const [profile, goals, entries] = await Promise.all([
    db
      .selectFrom('user')
      .select([
        'id',
        'name',
        'email',
        'preferences',
        'createdAt',
        'updatedAt',
        'useSync',
      ])
      .executeTakeFirst(),
    db
      .selectFrom('goal')
      .select([
        'id',
        'shortId',
        'title',
        'description',
        'target',
        'unit',
        'startDate',
        'targetDate',
        'createdAt',
        'updatedAt',
        'initialValue',
        'type',
        'currentValue',
        'completionDate',
        'archivedAt',
      ])
      .orderBy('createdAt')
      .orderBy('id')
      .execute(),
    db
      .selectFrom('entry')
      .select([
        'id',
        'shortId',
        'goalId',
        'value',
        'date',
        'createdAt',
        'updatedAt',
      ])
      .orderBy('date')
      .orderBy('createdAt')
      .orderBy('id')
      .execute(),
  ]);

  if (!profile) {
    throw new Error('The local workspace is not initialized');
  }

  return buildLegacyWorkspaceExport({ profile, goals, entries }, options);
}

export function downloadLegacyWorkspaceExport(payload: LegacyWorkspaceExport) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `seon-workspace-${payload.exportedAt.slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
