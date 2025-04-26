import { expect, test } from './persistent-webkit-fixtures';
import { ensureUserInitialized } from './testUtils';

test.describe('Goal Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await ensureUserInitialized(page);
  });

  test('should allow creating a new goal with required fields', async ({
    page,
  }) => {
    const newGoalTitle = `My E2E Test Goal - ${Math.floor(Math.random() * 8)}`;
    const targetValue = '100';

    // 1. Click the "New Goal" button
    await page.getByRole('link', { name: /new goal/i }).click();

    // 2. Wait for the dialog to appear and verify title
    const dialog = page.locator(
      'div[role="dialog"]:has(h2:has-text("Add new goal"))',
    );
    await expect(dialog).toBeVisible();

    // 3. Fill in required fields
    // Goal Name
    await dialog.locator('input#title').fill(newGoalTitle);
    // Target Value
    await dialog.locator('input#target-value').fill(targetValue);

    // 4. Submit the form
    await dialog.getByRole('button', { name: /create goal/i }).click();

    // 5. Verify dialog closes
    await expect(dialog).not.toBeVisible();

    // 6. Verify success toast appears
    const successToast = page.locator(
      '[data-sonner-toast][data-type="success"]',
    );
    await expect(successToast).toBeVisible();
    await expect(successToast).toContainText(/sucessfully added goal/i);

    // 7. Verify the new goal appears on the goals list page
    await expect(
      page.locator(`article.bg-card:has(h3:has-text("${newGoalTitle}"))`),
    ).toBeVisible();
  });
});
