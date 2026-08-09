export interface NodeShutdownDependencies {
  closeServer(): Promise<void>;
  drainBackgroundTasks(): Promise<void>;
  closeDatabase(): Promise<void>;
}

export async function shutdownNodeRuntime({
  closeServer,
  drainBackgroundTasks,
  closeDatabase,
}: NodeShutdownDependencies): Promise<void> {
  await closeServer();
  await drainBackgroundTasks();
  await closeDatabase();
}
