import { describe, expect, it } from 'vitest';
import config from '../vite.config';

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

describe('vite PWA asset coverage', () => {
  it('precache includes webp assets for runtime-preferred art', () => {
    const pwaPlugin = asArray(config.plugins).find((plugin) => plugin && typeof plugin === 'object' && 'api' in plugin);

    expect(pwaPlugin).toBeTruthy();

    const api = (pwaPlugin as { api?: { options?: { includeAssets?: string[]; workbox?: { globPatterns?: string[] } } } }).api;
    expect(api?.options?.includeAssets).toContain('assets/**/*.webp');
    expect(api?.options?.workbox?.globPatterns).toContain('**/*.{js,css,html,png,webp,json,woff2}');
  });
});
