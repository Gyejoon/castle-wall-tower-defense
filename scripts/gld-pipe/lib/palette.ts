/** Flatten PALETTE from shared.ts into a searchable list of hex colors */

import { PALETTE } from '../../generate-assets/shared';
import { hexToRgb, rgbToLab, type Lab } from './color';

export interface PaletteEntry {
  name: string;
  hex: string;
  lab: Lab;
}

/** Recursively extract all hex color strings from the PALETTE object */
function extractColors(obj: Record<string, unknown>, prefix: string): PaletteEntry[] {
  const entries: PaletteEntry[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) {
      entries.push({ name, hex: value.toLowerCase(), lab: rgbToLab(hexToRgb(value)) });
    } else if (typeof value === 'object' && value !== null) {
      entries.push(...extractColors(value as Record<string, unknown>, name));
    }
  }
  return entries;
}

let _cache: PaletteEntry[] | null = null;

export function getFlatPalette(): PaletteEntry[] {
  if (!_cache) {
    _cache = extractColors(PALETTE as unknown as Record<string, unknown>, '');
  }
  return _cache;
}

/** Get unique hex set for fast lookup */
export function getPaletteHexSet(): Set<string> {
  return new Set(getFlatPalette().map(e => e.hex));
}
