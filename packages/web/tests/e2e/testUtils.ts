import { expect, type Page } from '@playwright/test';

/**
 * Ensures the application is in a state where the user is initialized
 *
 * @param page The Playwright Page object.
 */
export async function ensureUserInitialized(page: Page): Promise<void> {
  await page.goto('/');

  await expect(page).toHaveURL(/\/demo/);

  // TODO: consider non-demo initialization
  const startButton = page.getByRole('button', { name: 'Start Demo' });

  await page.waitForLoadState('networkidle');

  expect(startButton).toBeVisible();
  await startButton.click();

  await page.waitForURL(/\/goals/);

  await expect(page).toHaveURL(/\/goals/);
  console.log('[TestUtil] User initialization confirmed (on /goals).');
}
