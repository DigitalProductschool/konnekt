import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// The workspace's one flat config (research R1). ESLint finds it from any package directory by
// searching upwards, so each package's `lint` script stays `eslint .`

// Import order: side effects -> external deps (the workspace packages among them) -> relative
// (parent, then same dir)
const importOrder = {
  'simple-import-sort/imports': [
    'error',
    {
      groups: [['^\\u0000'], ['^node:', '^@?\\w'], ['^\\.\\.', '^\\.']],
    },
  ],
  'simple-import-sort/exports': 'error',
};

// Convention: unused bindings are prefixed with an underscore
const unusedVars = {
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    },
  ],
};

// The packages' boundaries (constitution, "Technology and Structure Constraints"): `api-types`
// imports nothing, `rules` imports `api-types` and itself, and neither imports the SPA or the MCP
// server
const NOT_THE_APPS = {
  group: ['**/frontend/**', '**/mcp/**'],
  message: 'api-types/ and rules/ import nothing from frontend/ or mcp/.',
};

export default defineConfig([
  globalIgnores(['**/dist/**', '**/node_modules/**']),

  // The SPA: React 19 + Vite + browser globals
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
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
      ...importOrder,
      ...unusedVars,
      // The SPA and the MCP server never import each other
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['**/mcp/**'], message: 'frontend/ imports nothing from mcp/.' }],
        },
      ],
    },
  },

  // The connection's PDF: nothing about a PDF is logged (FR-042; spec 011)
  {
    files: [
      'frontend/src/utils/connectionPdf/**/*.ts',
      'frontend/src/workers/pdf.ts',
      'frontend/src/hooks/useConnectionPdf.ts',
    ],
    rules: { 'no-console': 'error' },
  },

  // The shared packages: pure TypeScript, no globals. Nothing in them logs: the checks, the
  // personas and the evaluator run on findings and applicants (research R18)
  {
    files: ['{api-types,rules}/src/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      ...importOrder,
      ...unusedVars,
      'no-console': 'error',
      'no-restricted-imports': ['error', { patterns: [NOT_THE_APPS] }],
    },
  },
  {
    files: ['api-types/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            NOT_THE_APPS,
            {
              group: ['@konnekt/rules', '@konnekt/rules/**'],
              message: 'api-types/ imports nothing, not even rules/.',
            },
          ],
        },
      ],
    },
  },

  // The MCP server and its integration tests: Node globals. It logs only through src/log.ts,
  // which writes the method, tool, status and duration and nothing else (research R18)
  {
    files: ['mcp/src/**/*.ts', 'mcp/test/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      ...importOrder,
      ...unusedVars,
      'no-console': 'error',
      // The SPA and the MCP server never import each other
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/frontend/**'], message: 'mcp/ imports nothing from frontend/.' },
          ],
        },
      ],
    },
  },
  {
    files: ['mcp/src/log.ts'],
    rules: { 'no-console': 'off' },
  },

  // Build and test configs (vite.config.ts, vitest.config.ts, eslint.config.mjs): Node globals.
  // `*` does not cross directories, so these match only a package's root and the workspace root
  {
    files: ['*/vite.config.ts', '*/vitest.config.ts', '*.mjs'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  // Must be last: disable formatting rules that conflict with Prettier
  eslintConfigPrettier,
]);
