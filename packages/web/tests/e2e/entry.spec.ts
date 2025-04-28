import { DEMO_GOALS } from './constants';
import { expect, test } from './persistent-webkit-fixtures';
import { ensureUserInitialized } from './testUtils';

test.beforeEach(async ({ page }) => {
  await ensureUserInitialized(page);
});

test.describe('Goal Entry Management', () => {
  test('should add a new entry for today', async ({ page }) => {
    const goalCard = page
      .getByTestId(/goal-card/i)
      .filter({ hasText: DEMO_GOALS[0].title });
    await expect(goalCard).toBeVisible();

    // 1. Find today's button in the calendar heatmap within the specific goal card
    const todayButton = goalCard.locator('button[aria-current="date"]');
    await expect(todayButton).toBeVisible();
    const initialClass = await todayButton.getAttribute('class');

    // 2. Get the current value of the progress bar
    const currentValue = await goalCard
      .getByRole('progressbar')
      .getAttribute('aria-valuenow');

    // 3. Click today's button to open the entry form popover
    await todayButton.click();

    // 4. Locate the popover (dialog) and the input field
    const popover = page.getByRole('dialog');
    await expect(popover).toBeVisible();
    await expect(popover.getByText('Progress')).toBeVisible();

    const valueInput = popover.locator('input#entry-value');
    await expect(valueInput).toBeVisible();

    // 5. Increase the value by 1 and save
    await page.getByRole('button', { name: 'Increase' }).click();
    await popover.getByRole('button', { name: 'Save' }).click();

    // 6. Verify the popover closes, the button has the success background
    await Promise.all([
      expect(popover).not.toBeVisible(),
      expect(todayButton).not.toHaveClass(initialClass ?? ''),
      expect(todayButton).toHaveClass(/bg-emerald-500/),
    ]);

    // 7. Verify the progress value has increased
    const newValue = await goalCard
      .getByRole('progressbar')
      .getAttribute('aria-valuenow');

    expect(Number(newValue)).toBeGreaterThan(Number(currentValue));
  });

  test('should add a new entry for yes or no goal', async ({ page }) => {
    const goalCard = page
      .getByTestId(/goal-card/i)
      .filter({ hasText: DEMO_GOALS[2].title });
    await expect(goalCard).toBeVisible();

    // 1. Find today's button in the calendar heatmap within the specific goal card
    const todayButton = goalCard.locator('button[aria-current="date"]');
    await expect(todayButton).toBeVisible();
    const initialClass = await todayButton.getAttribute('class');

    // 2. Get the current value of the progress bar
    const currentValue = await goalCard
      .getByRole('progressbar')
      .getAttribute('aria-valuenow');

    // 3. Click today's button to open the entry form popover
    await todayButton.click();

    // 4. Locate the popover (dialog) and the input field
    const popover = page.getByRole('dialog');
    await expect(popover).toBeVisible();
    await expect(popover.getByText('Did you achieve it?')).toBeVisible();

    // 5. Click yes and save
    await page.getByRole('button', { name: 'Yes' }).click();

    // 6. Verify the popover closes, the button has the success background
    await Promise.all([
      expect(popover).not.toBeVisible(),
      expect(todayButton).not.toHaveClass(initialClass ?? ''),
      expect(todayButton).toHaveClass(/bg-emerald-500/),
    ]);

    // 7. Verify the progress value has increased
    const newValue = await goalCard
      .getByRole('progressbar')
      .getAttribute('aria-valuenow');

    expect(Number(newValue)).toBeGreaterThan(Number(currentValue));
  });

  test('should delete an existing entry for today', async ({ page }) => {
    const goalCard = page
      .getByTestId(/goal-card/i)
      .filter({ hasText: DEMO_GOALS[0].title });
    await expect(goalCard).toBeVisible();

    // 1. Add entry for today
    const todayButton = goalCard.locator('button[aria-current="date"]');
    await expect(todayButton).toBeVisible();
    const initialClass = await todayButton.getAttribute('class');

    await todayButton.click();

    const popover = page.getByRole('dialog');
    await expect(popover).toBeVisible();
    await expect(popover.getByText('Progress')).toBeVisible();

    const valueInput = popover.locator('input#entry-value');
    await expect(valueInput).toBeVisible();
    await page.getByRole('button', { name: 'Increase' }).click();
    await popover.getByRole('button', { name: 'Save' }).click();

    await Promise.all([
      expect(popover).not.toBeVisible(),
      expect(todayButton).not.toHaveClass(initialClass ?? ''),
      expect(todayButton).toHaveClass(/bg-emerald-500/),
    ]);

    // 2. Get updated values for comparison later
    const newValue = await goalCard
      .getByRole('progressbar')
      .getAttribute('aria-valuenow');
    const classAfterAdd = await todayButton.getAttribute('class');

    // 3. Reopen popover
    await todayButton.click();
    await expect(popover).toBeVisible();

    // 4. Find and click the delete button
    const deleteButton = popover.getByRole('button', { name: 'Delete entry' });
    await expect(deleteButton).toBeVisible();
    await expect(deleteButton).toBeEnabled();
    await deleteButton.click();

    // 5. Verify the popover closes, the button has the success background
    await Promise.all([
      expect(popover).not.toBeVisible(),
      expect(todayButton).not.toHaveClass(
        classAfterAdd ?? 'non-existent-class',
      ),
      expect(todayButton).not.toHaveClass(/bg-emerald-500/),
    ]);

    // 6. Verify the progress value has decreased
    const updatedValue = await goalCard
      .getByRole('progressbar')
      .getAttribute('aria-valuenow');

    expect(Number(updatedValue)).toBeLessThan(Number(newValue));
  });
});
