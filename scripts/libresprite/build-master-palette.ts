#!/usr/bin/env bun
/**
 * build-master-palette — Export scripts/generate-assets/shared.ts PALETTE
 * into GIMP .gpl format for LibreSprite.
 *
 * Run: bun scripts/libresprite/build-master-palette.ts
 * Output: scripts/libresprite/master.gpl
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PALETTE } from '../generate-assets/shared';

type HexColor = `#${string}`;

function isHex(v: unknown): v is HexColor {
  return typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const expand = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = Number.parseInt(expand.slice(0, 6), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function flatten(
  obj: Record<string, unknown>,
  prefix = '',
): Array<{ name: string; hex: string }> {
  const out: Array<{ name: string; hex: string }> = [];
  for (const [k, v] of Object.entries(obj)) {
    const name = prefix ? `${prefix}.${k}` : k;
    if (isHex(v)) {
      out.push({ name, hex: v });
    } else if (v && typeof v === 'object') {
      out.push(...flatten(v as Record<string, unknown>, name));
    }
  }
  return out;
}

function build(): string {
  const flat = flatten(PALETTE as unknown as Record<string, unknown>);
  const seen = new Map<string, string>();
  const unique: Array<{ name: string; r: number; g: number; b: number }> = [];
  for (const { name, hex } of flat) {
    const key = hex.toLowerCase();
    if (seen.has(key)) continue;
    seen.set(key, name);
    const [r, g, b] = hexToRgb(hex);
    unique.push({ name, r, g, b });
  }

  const lines: string[] = [
    'GIMP Palette',
    'Name: Grid Line Defense Master',
    `Columns: 10`,
    '#',
    `# Auto-generated from scripts/generate-assets/shared.ts PALETTE`,
    `# Total unique colors: ${unique.length}`,
    '#',
  ];
  for (const { name, r, g, b } of unique) {
    // GPL format: "R G B\tname" — fields left-padded to 3 digits
    const pad = (n: number) => n.toString().padStart(3, ' ');
    lines.push(`${pad(r)} ${pad(g)} ${pad(b)}\t${name}`);
  }
  return lines.join('\n') + '\n';
}

function main() {
  const gpl = build();
  const out = join(import.meta.dir, 'master.gpl');
  writeFileSync(out, gpl);
  const count = gpl.split('\n').filter((l) => /^\s*\d/.test(l)).length;
  console.log(`✓ Wrote ${out} (${count} colors)`);
}

main();
