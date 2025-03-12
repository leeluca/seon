/**
 * Checks if Origin Private File System (OPFS) is available in the current browser
 */
export async function isOpfsAvailable(): Promise<boolean> {
  try {
    if (!navigator.storage || !navigator.storage.getDirectory) {
      return false;
    }

    const root = await navigator.storage.getDirectory();
    return !!root;
  } catch (error) {
    console.error('OPFS availability check failed:', error);
    return false;
  }
}
