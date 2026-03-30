import type { OutputBundle, Plugin as RollupPlugin } from 'rollup';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const NON_PHASER_CHUNK_BUDGET_KB = 500;
const PHASER_CHUNK_WARNING_LIMIT_KB = 1600;

const createNonPhaserChunkBudgetWarning = (): RollupPlugin => ({
  name: 'non-phaser-chunk-budget-warning',
  generateBundle(_, bundle: OutputBundle) {
    for (const output of Object.values(bundle)) {
      if (output.type !== 'chunk' || output.name === 'phaser') continue;

      const chunkSizeKB = new TextEncoder().encode(output.code).byteLength / 1024;
      if (chunkSizeKB > NON_PHASER_CHUNK_BUDGET_KB) {
        this.warn(
          `Chunk ${output.fileName} is ${chunkSizeKB.toFixed(1)} kB after minification, exceeding the ${NON_PHASER_CHUNK_BUDGET_KB} kB non-Phaser budget.`,
        );
      }
    }
  },
});

export default defineConfig({
  plugins: [
    react(),
    createNonPhaserChunkBudgetWarning(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['assets/**/*.png', 'assets/**/*.json', 'manifest.json'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,json,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: PHASER_CHUNK_WARNING_LIMIT_KB,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules') && id.includes('phaser')) return 'phaser';
          if (id.includes('node_modules') && (id.includes('/react/') || id.includes('/react-dom/'))) return 'react';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
