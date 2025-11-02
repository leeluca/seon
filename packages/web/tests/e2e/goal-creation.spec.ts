import { GOAL_FIELD_SUFFIX } from '~/components/goalForm/constants';
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

    const createGoalButton = page.getByRole('button', { name: /create goal/i });
    await expect(createGoalButton).toBeDisabled();

    // 3. Fill in required fields (use generated input ids suffix)
    await dialog
      .locator(`input[id$="-${GOAL_FIELD_SUFFIX.title}"]`)
      .fill(newGoalTitle);
    await dialog
      .locator(`input[id$="-${GOAL_FIELD_SUFFIX.targetValue}"]`)
      .fill(targetValue);
    // 4. Submit the form
    await createGoalButton.click();

    // 5. Verify dialog closes
    await expect(dialog).not.toBeVisible();

    // 6. Verify success toast appears (dialog/drawer may remain open by design)
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
