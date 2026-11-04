import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Native builds and browser profiles contain files locked on Windows.
      ignored: [
        '**/src-tauri/**',
        '**/.responsive-check/**',
        '**/.git/**',
        '**/dist/**',
        '**/*.log',
      ],
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    },
  },
});
