import {
  AbstractPowerSyncDatabase,
  BaseObserver,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/web';
import {
  createClient,
  PostgrestSingleResponse,
  Session,
  SupabaseClient,
} from '@supabase/supabase-js';

import { fetchSyncCredentials, getDbAccessToken } from '~/apis/credential';

export type SupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  powersyncUrl?: string;
};

/// Postgres Response codes that cannot be recovered from by retrying.
const FATAL_RESPONSE_CODES = [
  // Class 22 — Data Exception
  // Ex: Data type mismatch.
  new RegExp('^22...$'),
  // Class 23 — Integrity Constraint Violation.
  // Ex: NOT NULL, FOREIGN KEY and UNIQUE violations.
  new RegExp('^23...$'),
  // INSUFFICIENT PRIVILEGE
  new RegExp('^42501$'),
];

export type SupabaseConnectorListener = {
  initialized: () => void;
  sessionStarted: (session: Session) => void;
};

export class SupabaseConnector
  extends BaseObserver<SupabaseConnectorListener>
  implements PowerSyncBackendConnector
{
  readonly client: SupabaseClient;
  readonly config: SupabaseConfig;

  ready: boolean;

  currentSession: Session | null;

  constructor() {
    super();

    this.config = {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      powersyncUrl: import.meta.env.VITE_POWERSYNC_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    };

    this.client = createClient(
      this.config.supabaseUrl,
      this.config.supabaseAnonKey,
      {
        accessToken: async () => await getDbAccessToken(),
      },
    );
    this.currentSession = null;
    this.ready = false;
  }

  init() {
    if (this.ready) {
      return;
    }
    this.ready = true;
    this.iterateListeners((cb) => cb.initialized?.());
  }

  async fetchCredentials() {
    const { result, token, expiresAt, syncUrl } = await fetchSyncCredentials();

    // user not signed in
    if (!result) {
      return null;
    }

    const res = {
      endpoint: this.config.powersyncUrl || syncUrl,
      token: import.meta.env.VITE_POWERSYNC_DEV_TOKEN || token,
      expiresAt: expiresAt ? new Date(expiresAt * 1000) : undefined,
    };

    return res;
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    let lastOp: CrudEntry | null = null;
    try {
      for (const op of transaction.crud) {
        lastOp = op;
        const table = this.client.from(op.table);
        let result: PostgrestSingleResponse<null>;

        switch (op.op) {
          case UpdateType.PUT: {
            const record = { ...op.opData, id: op.id };
            result = await table.upsert(record);
            break;
          }
          case UpdateType.PATCH: {
            result = await table.update(op.opData).eq('id', op.id);
            break;
          }
          case UpdateType.DELETE: {
            result = await table.delete().eq('id', op.id);
            break;
          }
        }

        if (result.error) {
          console.error(result.error);
          const error = new Error(
            `Could not sync database. Received error: ${result.error.message}`,
          );
          throw error;
        }
      }

      await transaction.complete();
    } catch (err: unknown) {
      console.debug(err);
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        typeof (err as { code: unknown }).code === 'string' &&
        FATAL_RESPONSE_CODES.some((regex) =>
          regex.test((err as { code: string }).code),
        )
      ) {
        /**
         * Instead of blocking the queue with these errors,
         * discard the (rest of the) transaction.
         *
         * */

        //  TODO: Save the failing records elsewhere instead of discarding, and/or notify the user.
        console.error('Data upload error - discarding:', lastOp, err);
        await transaction.complete();
      } else {
        // NOTE: Error may be retryable (e.g. network error), the call is retried after a delay when error is thrown.
        throw err;
      }
    }
  }
}
