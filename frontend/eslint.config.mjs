import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist/**', 'node_modules/**']),

  // Application source: React 19 + Vite + browser globals
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: globals.browser },
    settings: { react: { version: 'detect' } },
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      // Import order: side effects -> external deps -> relative (parent, then same dir)
      'simple-import-sort/imports': [
        'error',
        {
          groups: [['^\\u0000'], ['^node:', '^@?\\w'], ['^\\.\\.', '^\\.']],
        },
      ],
      'simple-import-sort/exports': 'error',
      // Convention: unused bindings are prefixed with an underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Root-level build config (vite.config.ts, eslint.config.mjs): Node globals.
  // `*` does not cross directories, so this matches only the package root.
  {
    files: ['*.{ts,mjs}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  // Must be last: disable formatting rules that conflict with Prettier
  eslintConfigPrettier,
]);
