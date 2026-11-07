#!/usr/bin/env node
/**
 * Compatibility entry — models are TypeScript under Server/.
 * Prefer: make seed-demo
 */
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(
  'npx',
  ['tsx', 'scripts/seed-demo.mjs'],
  { cwd: join(root, 'Server'), stdio: 'inherit', env: process.env }
);
process.exit(result.status ?? 1);
