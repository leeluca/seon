import { INITIAL_DEMO_GOAL_COUNT } from './constants';
import { expect, test } from './persistent-webkit-fixtures';
import { ensureUserInitialized } from './testUtils';

test.describe('Demo Flow', () => {
  test('homepage renders and redirects correctly', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/demo');

    const startButton = page.getByRole('button', { name: /start/i });
    await expect(startButton).toBeVisible();

    await startButton.click();

    await page.waitForURL(/\/goals/);

    await Promise.all([
      expect(page.getByRole('button', { name: /demo mode/i })).toBeVisible(),
      expect(page.getByTestId(/goal-card/i)).toHaveCount(
        INITIAL_DEMO_GOAL_COUNT,
      ),
    ]);
  });

  test('demo is reseatable', async ({ page }) => {
    await ensureUserInitialized(page);

    const startOverButton = page.getByRole('button', { name: /start over/i });
    await expect(startOverButton).toBeVisible();
    await startOverButton.click();

    const resetButton = page.getByRole('button', { name: /reset/i });
    await expect(resetButton).toBeVisible();
    await resetButton.click();

    await expect(
      page.getByRole('button', { name: /start demo/i }),
    ).toBeVisible();
  });
});
