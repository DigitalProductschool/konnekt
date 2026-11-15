/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The workers (checks, personas, pdf) are module workers whose dynamic imports form chunks of
  // their own (spec 011, research R2)
  worker: { format: 'es' },
  // The unit tests cover pure functions only, so they run in Node, without a DOM
  test: {
    environment: 'node',
  },
});
