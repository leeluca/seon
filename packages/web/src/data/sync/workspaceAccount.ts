export const WORKSPACE_OWNER_HEADER = 'X-Seon-Workspace-Owner-Id';

export function createWorkspaceOwnerHeaders(
  ownerAccountId: string,
  options: { json?: boolean } = {},
): Headers {
  const headers = new Headers();
  headers.set(WORKSPACE_OWNER_HEADER, ownerAccountId);
  if (options.json) headers.set('Content-Type', 'application/json');
  return headers;
}
