import { readFile } from 'node:fs/promises';

const metafilePath = new URL(
  '../.cache/wrangler/bundle-meta.json',
  import.meta.url,
);
const metafile = await readFile(metafilePath, 'utf8');
const forbidden = [
  '@hono/node-server',
  'src/entrypoints/node.ts',
  'src/entrypoints/node.js',
];
const included = forbidden.filter((value) => metafile.includes(value));

if (included.length > 0) {
  throw new Error(
    `Worker bundle includes Node-only modules: ${included.join(', ')}`,
  );
}

console.info('Worker metafile contains no Node server entrypoint or adapter');
