import { useRef, useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { DownloadIcon, UploadIcon } from 'lucide-react';
import { toast } from 'sonner';

import { powerSyncDb } from '~/data/db/database';
import {
  createWorkspaceExport,
  downloadWorkspaceExport,
  importWorkspaceData,
  parseWorkspaceData,
} from '~/data/workspace';
import { Button } from '../ui/button';

export function WorkspaceDataControls() {
  const { t } = useLingui();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    setBusy(true);
    try {
      downloadWorkspaceExport(await createWorkspaceExport());
    } catch (error) {
      console.error('Could not export workspace data', error);
      toast.error(t`Could not save a backup. Your data is unchanged.`);
    } finally {
      setBusy(false);
    }
  };

  const importData = async (file: File) => {
    setBusy(true);
    try {
      const payload = parseWorkspaceData(await file.text());
      const result = await importWorkspaceData(powerSyncDb, payload);
      const { goals, entries } = result.imported;
      toast.success(
        result.alreadyImported
          ? t`This backup was already restored.`
          : t`Restored ${goals} goals and ${entries} entries.`,
      );
      if (!result.alreadyImported) window.location.reload();
    } catch (error) {
      console.error('Could not import workspace data', error);
      toast.error(t`That file isn't a Seon backup.`);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => void exportData()}
      >
        <DownloadIcon data-icon="inline-start" />
        <Trans>Save backup</Trans>
      </Button>
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <UploadIcon data-icon="inline-start" />
        <Trans>Restore backup</Trans>
      </Button>
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept="application/json,.json"
        aria-label={t`Choose a Seon backup file`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importData(file);
        }}
      />
    </div>
  );
}
