import { defineConfig } from 'vite';
// worker.format 'es': a module worker that code-splits (dynamic import) can't be an IIFE
export default defineConfig({ worker: { format: 'es' }, build: { reportCompressedSize: true } });
