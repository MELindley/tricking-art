import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// BASE_PATH lets the build be hosted under a sub-path (e.g. GitHub Pages: /tricking-art/).
export default defineConfig({
  base: process.env.BASE_PATH ?? './',
  plugins: [react()],
  // Keep fonts etc. as real files so the CSP doesn't need to allow data: URIs.
  build: { assetsInlineLimit: 0 },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
