import { INITIAL_DEMO_GOAL_COUNT as INITIAL_GOAL_COUNT } from './constants';
import { expect, test } from './persistent-webkit-fixtures';
import { ensureUserInitialized } from './testUtils';

test.describe('Goal Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await ensureUserInitialized(page);
  });

  test('should not allow creating a new goal with missing required fields', async ({
    page,
  }) => {
    await page.getByRole('link', { name: /new goal/i }).click();

    expect(
      await page.getByRole('button', { name: /create goal/i }).isDisabled(),
    ).toBeTruthy();

    await page.getByRole('button', { name: /close/i }).click();
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

  test('should allow deleting a goal', async ({ page }) => {
    // 1. Wait for the first goal card to be visible
    await page
      .getByTestId(/goal-card/i)
      .first()
      .waitFor({
        state: 'visible',
      });

    // 2. Verify the initial goal count
    await expect(page.getByTestId(/goal-card/i)).toHaveCount(
      INITIAL_GOAL_COUNT,
    );

    // 3. Click the "Delete goal" button
    const firstGoalCard = page.getByTestId(/goal-card/i).first();

    await firstGoalCard
      .getByRole('button', { name: 'Delete goal', exact: true })
      .click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    // 4. Verify success toast appears
    const successToast = page.locator(
      '[data-sonner-toast][data-type="success"]',
    );
    await expect(successToast).toBeVisible();
    await expect(successToast).toContainText(/deleted goal/i);

    // 5. Verify the goal count is reduced by 1
    await expect(page.getByTestId(/goal-card/i)).toHaveCount(
      INITIAL_GOAL_COUNT - 1,
    );
  });
});
