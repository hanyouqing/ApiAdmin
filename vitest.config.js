import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(rootDir, './Server'),
    },
    extensionAlias: {
      '.js': ['.ts', '.js'],
    },
  },
  test: {
    globals: true,
    environment: 'node',
    hookTimeout: 30000,
    testTimeout: 30000,
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        '**/*.config.ts',
      ],
    },
  },
});
