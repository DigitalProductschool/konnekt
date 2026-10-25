/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The unit tests cover pure functions only, so they run in Node, without a DOM
  test: {
    environment: 'node',
  },
});
