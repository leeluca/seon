import { mkdir, readFile, writeFile } from 'node:fs/promises';

const requiredVariables = [
  'HYPERDRIVE_ID',
  'BETTER_AUTH_URL',
  'POWERSYNC_AUDIENCE',
  'SYNC_URL',
  'ORIGIN_URLS',
  'AUTH_EMAIL_DELIVERY',
  'AUTH_EMAIL_FROM',
];

const missing = requiredVariables.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Missing Worker deployment variables: ${missing.join(', ')}`);
}

const source = JSON.parse(await readFile('wrangler.jsonc', 'utf8'));
source.$schema = '../../../node_modules/wrangler/config-schema.json';
source.main = '../src/entrypoints/worker.ts';
source.hyperdrive[0].id = process.env.HYPERDRIVE_ID;
delete source.hyperdrive[0].localConnectionString;
source.vars = Object.fromEntries(
  requiredVariables
    .filter((name) => name !== 'HYPERDRIVE_ID')
    .map((name) => [name, process.env[name]]),
);

await mkdir('.cache', { recursive: true });
await writeFile(
  '.cache/wrangler.production.jsonc',
  `${JSON.stringify(source, null, 2)}\n`,
);
