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

// Extend base test to provide a persistent context for WebKit AND auto-purge OPFS
export const test = base.extend<
  {
    context: import('@playwright/test').BrowserContext;
  } & AutoPurgeFixture, // Include the auto-use fixture type
  // Combine types needed for BOTH fixtures
  PlaywrightWorkerArgs &
    PlaywrightWorkerOptions &
    ProjectOptions &
    PlaywrightTestArgs &
    PlaywrightTestOptions
>({
  context: async (
    {
      context, // Default context
      browserName,
      playwright, // playwright object
      // Explicitly list used project options
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
      // Construct options object from explicitly listed fixtures
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
    }
  },

  _autoPurgeOpfsWebKit: [
    async (
      { page, browserName }: { page: Page; browserName: string },
      use: () => Promise<void>,
    ) => {
      // Run the test
      await use();

      // Teardown: Purge OPFS only for WebKit after the test has run
      if (browserName === 'webkit') {
        console.log(
          '[Fixture] Running OPFS purge via page.evaluate for WebKit...',
        );
        try {
          await page.evaluate(async () => {
            try {
              const root: FileSystemDirectoryHandle =
                await navigator.storage.getDirectory();

              await new Promise((resolve) => setTimeout(resolve, 50));

              const entries = [];
              // Check if standard entries() exists, otherwise assume non-standard items() might
              const iterator = root.entries
                ? root.entries()
                : (
                    root as FileSystemDirectoryHandle & {
                      items: () => AsyncIterableIterator<
                        [string, FileSystemHandle]
                      >;
                    }
                  ).items();
              for await (const [name, handle] of iterator) {
                entries.push({ name, kind: handle.kind });
              }

              if (entries.length === 0) {
                console.log('[Browser] OPFS is empty.');
                return;
              }

              for (const entry of entries) {
                try {
                  await root.removeEntry(entry.name, {
                    recursive: entry.kind === 'directory',
                  });
                } catch (removeErr) {
                  console.error(
                    `[Browser] Failed to remove ${entry.kind}: ${entry.name}`,
                    removeErr,
                  );
                }
              }
            } catch (err) {
              console.error(
                '[Browser] Error during OPFS purge evaluation:',
                err,
              );
            }
          });
          console.log('[Fixture] OPFS purge via page.evaluate completed.');
        } catch (err) {
          console.error(
            '[Fixture] Error calling page.evaluate for OPFS purge:',
            err,
          );
        }
      }
    },
    { auto: true },
  ],
});
