import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      '*.config.js',
      'Client/dist',
      'Server/dist',
      'Scripts/**',
      'Plugins/**',
      'Static/**',
      'coverage/**',
      'backups/**',
      'terragrunt/**',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Pre-existing debt: keep CI green; tighten gradually per file.
      'prefer-const': 'warn',
      'no-useless-escape': 'warn',
      'no-useless-catch': 'warn',
      'no-dupe-else-if': 'warn',
      'no-prototype-builtins': 'warn',
      'no-empty': 'warn',
      'no-case-declarations': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
    },
  }
);
