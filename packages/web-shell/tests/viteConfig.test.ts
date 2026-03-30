import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

const viteConfigSource = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf-8');

describe('vite PWA asset coverage', () => {
  it('precache includes webp assets for runtime-preferred art', () => {
    expect(viteConfigSource).toContain("includeAssets: ['assets/**/*.png', 'assets/**/*.webp', 'assets/**/*.json', 'manifest.json']");
    expect(viteConfigSource).toContain("globPatterns: ['**/*.{js,css,html,png,webp,json,woff2}']");
  });
});
