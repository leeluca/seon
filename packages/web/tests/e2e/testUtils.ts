import { expect, type Page } from '@playwright/test';

/**
 * Ensures the application is in a state where the user is initialized
 *
 * @param page The Playwright Page object.
 */
export async function ensureUserInitialized(page: Page): Promise<void> {
  await page.goto('/');

  // TODO: consider non-demo initialization
  const startButton = page.getByRole('button', { name: /start/i });

  await page.waitForLoadState('networkidle');

  if (await startButton.isVisible()) {
    console.log(
      '[TestUtil] Demo start button found. Initializing user via UI...',
    );
    await startButton.click();

    await page.waitForURL(/\/goals/, { timeout: 10000 });
    console.log('[TestUtil] Navigated to /goals after demo start.');
  } else {
    console.log(
      '[TestUtil] Demo start button not visible. Checking current URL...',
    );
    // If not on demo, ensure it's on the goals page
    if (!page.url().includes('/goals')) {
      console.log(
        `[TestUtil] Not on /goals (URL: ${page.url()}). Navigating...`,
      );
      await page.goto('/goals');
      await page.waitForURL(/\/goals/);
      console.log('[TestUtil] Navigated to /goals directly.');
    } else {
      console.log('[TestUtil] Already on /goals page.');
    }
  }

  await expect(page).toHaveURL(/\/goals/);
  console.log('[TestUtil] User initialization confirmed (on /goals).');
}
