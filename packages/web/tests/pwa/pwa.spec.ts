import { expect, test } from '@playwright/test';

test('keeps the local workspace usable on an offline deep-link reload', async ({
  context,
  page,
  request,
}) => {
  const manifestResponse = await request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  await expect(manifestResponse.json()).resolves.toMatchObject({
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    icons: expect.arrayContaining([
      expect.objectContaining({
        src: '/pwa-maskable-512x512.png',
        purpose: 'maskable',
      }),
    ]),
  });

  await page.goto('/');
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.ready;
    return Boolean(registration.active);
  });

  // The virtual registration module owns registration, so no generated
  // registerSW.js script should also be injected into the document.
  await expect(page.locator('script[src="/registerSW.js"]')).toHaveCount(0);

  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

  await page.getByRole('button', { name: /get started/i }).click();
  await page.waitForURL(/\/goals/);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Goals' })).toBeVisible();

  const goalTitle = 'Offline farewell goal';
  await page.getByRole('link', { name: /new goal/i }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('input[id$="-title"]').fill(goalTitle);
  await dialog.locator('input[id$="-target-value"]').fill('10');
  await dialog.getByRole('button', { name: /create goal/i }).click();

  const goalCard = page
    .locator('article.bg-card')
    .filter({ has: page.getByText(goalTitle, { exact: true }) });
  await expect(goalCard).toBeVisible();
  await goalCard.getByRole('link', { name: /toggle goal details/i }).click();
  await page.waitForURL(/\/goals\/.+/);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: goalTitle })).toBeVisible();

  await context.setOffline(false);
});
