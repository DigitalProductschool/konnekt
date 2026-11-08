/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// The MCP server is a Node program: Vite's SSR build bundles it with the linked sources of
// api-types/ and rules/ (their extension-less relative imports, which Node's ESM loader can't
// resolve), into dist/main.js and the rule checks' worker dist/checksWorker.js (research R1)
export default defineConfig({
  build: {
    ssr: true,
    target: 'node22',
    outDir: 'dist',
    rollupOptions: {
      input: { main: 'src/main.ts', checksWorker: 'src/checksWorker.ts' },
      output: { entryFileNames: '[name].js' },
    },
  },
  ssr: {
    noExternal: ['@connection-portal/api-types', '@connection-portal/rules'],
  },
  // The server's modules and its integration tests run in Node (constitution, Principle III)
  test: {
    environment: 'node',
  },
});
