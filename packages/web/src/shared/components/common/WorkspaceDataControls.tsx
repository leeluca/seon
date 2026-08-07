import { useRef, useState } from 'react';
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
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    setBusy(true);
    try {
      downloadWorkspaceExport(await createWorkspaceExport());
    } catch (error) {
      console.error('Could not export workspace data', error);
      toast.error('Could not export the workspace.');
    } finally {
      setBusy(false);
    }
  };

  const importData = async (file: File) => {
    setBusy(true);
    try {
      const payload = parseWorkspaceData(await file.text());
      const result = await importWorkspaceData(powerSyncDb, payload);
      toast.success(
        result.alreadyImported
          ? 'This recovery file was already imported.'
          : `Imported ${result.imported.goals} goal(s) and ${result.imported.entries} entry/entries.`,
      );
      if (!result.alreadyImported) window.location.reload();
    } catch (error) {
      console.error('Could not import workspace data', error);
      toast.error('That file is not a valid Seon workspace export.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => void exportData()}
      >
        <DownloadIcon />
        Export JSON
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <UploadIcon />
        Import JSON
      </Button>
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept="application/json,.json"
        aria-label="Import Seon workspace JSON"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importData(file);
        }}
      />
    </div>
  );
}
