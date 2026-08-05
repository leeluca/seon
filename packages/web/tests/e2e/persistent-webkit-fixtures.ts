import {
  test as base,
  expect as baseExpect,
  type BrowserContextOptions,
  type Page,
  type PlaywrightTestArgs,
  type PlaywrightTestOptions,
  type PlaywrightWorkerArgs,
  type PlaywrightWorkerOptions,
} from '@playwright/test';

export const expect = baseExpect;

type ProjectOptions = Pick<
  BrowserContextOptions,
  | 'acceptDownloads'
  | 'bypassCSP'
  | 'colorScheme'
  | 'deviceScaleFactor'
  | 'extraHTTPHeaders'
  | 'geolocation'
  | 'hasTouch'
  | 'httpCredentials'
  | 'ignoreHTTPSErrors'
  | 'isMobile'
  | 'javaScriptEnabled'
  | 'locale'
  | 'permissions'
  | 'proxy'
  | 'timezoneId'
  | 'userAgent'
  | 'viewport'
>;

type AutoPurgeFixture = {
  _autoPurgeOpfsWebKit: unknown;
};

async function purgeOpfs(page: Page): Promise<void> {
  // Load a same-origin document that does not initialize the application DB.
  // WebKit keeps OPFS data for an origin across persistent contexts, so it must
  // be cleared before the app opens (and locks) the SQLite files.
  await page.goto('/favicon.svg');

  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();

    for await (const [name, entry] of root.entries()) {
      await root.removeEntry(name, {
        recursive: entry.kind === 'directory',
      });
    }
  });
}

// NOTE: Safari does not support OPFS in non-persistent mode.
// https://github.com/cypress-io/cypress/issues/30270
// Therefore it is necessary to extend the base test to provide a persistent context for WebKit AND auto-purge OPFS
export const test = base.extend<
  {
    context: import('@playwright/test').BrowserContext;
  } & AutoPurgeFixture,
  PlaywrightWorkerArgs &
    PlaywrightWorkerOptions &
    ProjectOptions &
    PlaywrightTestArgs &
    PlaywrightTestOptions
>({
  context: async (
    {
      context,
      browserName,
      playwright,
      acceptDownloads,
      bypassCSP,
      colorScheme,
      deviceScaleFactor,
      extraHTTPHeaders,
      geolocation,
      hasTouch,
      httpCredentials,
      ignoreHTTPSErrors,
      isMobile,
      javaScriptEnabled,
      locale,
      permissions,
      proxy,
      timezoneId,
      userAgent,
      viewport,
    },
    use,
  ) => {
    if (browserName === 'webkit') {
      const persistentContextOptions: BrowserContextOptions = {
        acceptDownloads,
        bypassCSP,
        colorScheme,
        deviceScaleFactor,
        extraHTTPHeaders,
        geolocation,
        hasTouch,
        httpCredentials,
        ignoreHTTPSErrors,
        isMobile,
        javaScriptEnabled,
        locale,
        permissions,
        proxy,
        timezoneId,
        userAgent,
        viewport,
      };

      // Launch persistent context using playwright.webkit
      const webkitContext = await playwright.webkit.launchPersistentContext(
        '',
        persistentContextOptions,
      );

      await use(webkitContext);

      await webkitContext.close();
    } else {
      // For non-webkit browsers, use the default context provided by Playwright Test
      await use(context);
      await context.close();
    }
  },

  _autoPurgeOpfsWebKit: [
    async (
      { page, browserName }: { page: Page; browserName: string },
      use: () => Promise<void>,
    ) => {
      // Purge before the app loads. Purging during teardown is too late because
      // the app still has its SQLite files open, particularly in WebKit.
      if (browserName === 'webkit') {
        await purgeOpfs(page);
      }

      await use();
    },
    { auto: true },
  ],
});
