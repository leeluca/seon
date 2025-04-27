import { INITIAL_DEMO_GOAL_COUNT } from './constants';
import { expect, test } from './persistent-webkit-fixtures';

test('homepage renders and redirects correctly', async ({ page }) => {
  await page.goto('/');

  await page.waitForLoadState('networkidle');

  const currentUrl = page.url();

  if (currentUrl.includes('/demo')) {
    const startButton = page.getByRole('button', { name: /start/i });
    await expect(startButton).toBeVisible();

    await startButton.click();

    await page.waitForURL(/\/goals/);

    await expect(page.getByTestId(/goal-card/i)).toHaveCount(
      INITIAL_DEMO_GOAL_COUNT,
    );
  } else {
    throw new Error(`Unexpected URL: ${currentUrl}. Expected /demo `);
  }
});
