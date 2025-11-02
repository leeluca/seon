import { DEMO_GOAL_TITLES } from './constants';
import { expect, test } from './persistent-webkit-fixtures';
import { ensureUserInitialized } from './testUtils';

const getGoalCard = (page: import('@playwright/test').Page, title: string) =>
  page
    .locator('article.bg-card')
    .filter({ has: page.getByRole('heading', { name: title }) });

const openGoalDetail = async (
  page: import('@playwright/test').Page,
  title: string,
) => {
  const card = getGoalCard(page, title);
  await expect(card).toBeVisible();
  const link = page
    .locator('[data-router-link]')
    .filter({ has: page.getByRole('heading', { name: title }) });
  await expect(link).toBeVisible();
  await link.focus();
  await link.press('Enter');
  await expect(page.getByRole('button', { name: /delete goal/i })).toBeVisible({
    timeout: 10000,
  });
};

test.beforeEach(async ({ page }) => {
  await ensureUserInitialized(page);
});

test.describe('Goal Detail Panel', () => {
  // TODO: verify that goal disappears from goal list after archiving, and reappears after unarchiving
  test('archives and unarchives a goal', async ({ page }) => {
    const goalTitle = DEMO_GOAL_TITLES.progress;

    await expect(getGoalCard(page, goalTitle)).toBeVisible();
    await openGoalDetail(page, goalTitle);

    const archiveButton = page.getByRole('button', { name: /archive goal/i });
    await expect(archiveButton).toBeVisible();
    await archiveButton.click();

    const archivedToast = page
      .locator('[data-sonner-toast][data-type="success"]')
      .last();
    await expect(archivedToast).toContainText(goalTitle);

    await expect(getGoalCard(page, goalTitle)).toHaveCount(0);

    const filterButton = page.getByRole('button', { name: /all goals/i });
    await filterButton.click();
    await page.locator('[role="option"]', { hasText: 'Archived' }).click();

    const archivedCard = getGoalCard(page, goalTitle);
    await expect(archivedCard).toBeVisible();

    await openGoalDetail(page, goalTitle);

    const unarchiveButton = page.getByRole('button', {
      name: /unarchive goal/i,
    });
    await expect(unarchiveButton).toBeVisible();
    await unarchiveButton.click();

    const unarchivedToast = page
      .locator('[data-sonner-toast][data-type="success"]')
      .last();
    await expect(unarchivedToast).toContainText(goalTitle);

    await expect(getGoalCard(page, goalTitle)).toHaveCount(0);

    const archivedFilterButton = page.getByRole('button', {
      name: /archived/i,
    });
    await archivedFilterButton.click();
    await page.locator('[role="option"]', { hasText: 'All Goals' }).click();

    const restoredCard = getGoalCard(page, goalTitle);
    await expect(restoredCard).toBeVisible();
  });

  test('deletes a goal', async ({ page }) => {
    const goalTitle = DEMO_GOAL_TITLES.count;

    const goalCard = getGoalCard(page, goalTitle);
    await expect(goalCard).toBeVisible();

    await openGoalDetail(page, goalTitle);

    const deleteTrigger = page.getByRole('button', { name: /delete goal/i });
    await expect(deleteTrigger).toBeVisible();
    await deleteTrigger.click();

    const confirmDelete = page.getByRole('button', { name: /^delete$/i });
    await expect(confirmDelete).toBeVisible();
    await confirmDelete.click();

    const deletedToast = page
      .locator('[data-sonner-toast][data-type="success"]')
      .last();
    await expect(deletedToast).toContainText(goalTitle);

    await expect(goalCard).toHaveCount(0);
  });

  test('edits a goal', async ({ page }) => {
    const originalTitle = DEMO_GOAL_TITLES.boolean;
    const updatedTitle = 'Wake up at 7 AM - Edited';

    await expect(getGoalCard(page, originalTitle)).toBeVisible();
    await openGoalDetail(page, originalTitle);

    await page.getByText('Edit goal').click();

    const titleField = page.getByLabel(/goal name/i);
    await expect(titleField).toBeVisible();
    await titleField.clear();
    await titleField.fill(updatedTitle);

    const saveButton = page.getByRole('button', { name: /save/i });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    const successToast = page
      .locator('[data-sonner-toast][data-type="success"]')
      .last();
    await expect(successToast).toContainText(/sucessfully updated goal/i);

    await expect(
      page.getByRole('heading', { name: updatedTitle }),
    ).toBeVisible();
    // Close the detail panel
    await page.keyboard.press('Escape');

    await expect(page).toHaveURL(/\/goals(\?.*)?$/);
    // Verify the card title is updated in the list
    await expect(getGoalCard(page, updatedTitle)).toBeVisible({
      timeout: 10000,
    });
  });
});
