import { describe, expect, it } from 'vitest';
import { collectStaticFieldAssetEntries } from '../generate-all';

describe('generate-all field asset contract', () => {
  it('uses vendored Tiny Swords field assets instead of generated field tile keys', () => {
    const entries = collectStaticFieldAssetEntries();

    expect(entries.some((entry) => entry.key === 'grid-floor')).toBe(false);
    expect(entries.some((entry) => entry.key === 'path-tile')).toBe(false);
    expect(entries.some((entry) => entry.key === 'spawn-tile')).toBe(false);
    expect(entries.some((entry) => entry.key === 'exit-tile')).toBe(false);
    expect(entries.some((entry) => entry.key === 'tileset')).toBe(false);
    expect(entries.some((entry) => entry.key === 'tiny-swords-tileset-color-1')).toBe(true);
    expect(entries.some((entry) => entry.key === 'tiny-swords-tree-1')).toBe(true);
  });
});
