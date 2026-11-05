import { defineConfig } from 'vitest/config';

// The rules logic is pure, so its tests run in Node, without a DOM. `rules/` has no Vite build,
// so this file is its Vitest configuration (constitution, Principle III)
export default defineConfig({
  test: {
    environment: 'node',
  },
});
