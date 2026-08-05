import {
  BaseObserver,
  UpdateType,
  type AbstractPowerSyncDatabase,
  type PowerSyncBackendConnector,
} from '@powersync/web';
import {
  createClient,
  type PostgrestSingleResponse,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js';

import { fetchSyncCredentials, getDbAccessToken } from '~/data/sync/credential';
import type { Preferences } from '~/types/user';
import { APIError } from '~/utils/errors';

export type SupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  powersyncUrl?: string;
};

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

  private authenticationRequired = false;

  constructor(
    readonly ownerAccountId: string,
    private readonly onAuthenticationRequired?: () => void,
  ) {
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
        accessToken: async () => await getDbAccessToken(this.ownerAccountId),
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
    if (this.authenticationRequired) return null;

    try {
      const { result, token, expiresAt, syncUrl } = await fetchSyncCredentials(
        this.ownerAccountId,
      );

      if (!result) return null;

      return {
        endpoint: this.config.powersyncUrl || syncUrl,
        token: import.meta.env.VITE_POWERSYNC_DEV_TOKEN || token,
        expiresAt: expiresAt ? new Date(expiresAt * 1000) : undefined,
      };
    } catch (error) {
      if (
        error instanceof APIError &&
        (error.status === 401 || error.status === 409)
      ) {
        this.authenticationRequired = true;
        this.onAuthenticationRequired?.();
        return null;
      }

      throw error;
    }
  }

  markAuthenticated() {
    this.authenticationRequired = false;
  }

  // TODO: implement batching strategy to improve performance
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    for (const op of transaction.crud) {
      const table = this.client.from(op.table);
      let result: PostgrestSingleResponse<null>;
      const operation =
        op.table === 'user' && op.op === UpdateType.PUT
          ? UpdateType.PATCH
          : op.op;

      switch (operation) {
        case UpdateType.PUT: {
          const record = { ...op.opData, id: op.id };
          result = await table.upsert(record);
          break;
        }
        case UpdateType.PATCH: {
          const patchData = { ...op.opData };
          if (
            op.table === 'user' &&
            'preferences' in patchData &&
            typeof patchData.preferences === 'string'
          ) {
            try {
              patchData.preferences = JSON.parse(
                patchData.preferences,
              ) as Preferences;
            } catch (error) {
              console.error('Error parsing JSON for user.preferences', error);
            }
          }
          result = await table.update(patchData).eq('id', op.id);
          break;
        }
        case UpdateType.DELETE: {
          result = await table.delete().eq('id', op.id);
          break;
        }
      }

      if (result.error) {
        console.error(result.error);
        // Keep the transaction queued. The user can export their local data even
        // if this legacy server can no longer accept a particular operation.
        throw result.error;
      }
    }

    await transaction.complete();
  }
}
