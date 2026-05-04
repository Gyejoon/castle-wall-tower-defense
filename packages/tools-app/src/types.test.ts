import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTilemapJson, parseTilemapRaw } from './tilemapTools';
import { CHECK_LABELS, type CheckId } from './types';

describe('tool check allowlist', () => {
	it('exposes only the supported validation checks', () => {
		const checks = Object.keys(CHECK_LABELS).sort() as CheckId[];
		expect(checks).toEqual(['asset-audit', 'phaser-tests', 'web-build']);
	});
});

describe('tilemap tooling', () => {
	const repoRoot = resolve(process.cwd(), '../..');

	it('parses the current main legacy tilemap with path cells', () => {
		const raw = JSON.parse(
			readFileSync(
				resolve(
					repoRoot,
					'packages/web-shell/public/assets/maps/main-long.json',
				),
				'utf8',
			),
		);
		const tilemap = parseTilemapRaw('main-long.json', raw);

		expect(tilemap.width).toBe(8);
		expect(tilemap.height).toBe(24);
		expect(tilemap.tileSize).toBe(32);
		expect(tilemap.cells.some((cell) => cell.kind === 'path')).toBe(true);
		expect(tilemap.ruleTiles).toContainEqual({
			layer: 'path',
			kind: 'path',
			rule: 'path-neighbor-mask',
		});
	});

	it('generates game-compatible legacy Tiled JSON for 32px drafts', () => {
		const tilemap = buildTilemapJson({
			id: 'unit-check',
			width: 3,
			height: 3,
			tileSize: 32,
			cells: [
				{ x: 0, y: 0, kind: 'ground' },
				{ x: 1, y: 0, kind: 'path' },
				{ x: 2, y: 0, kind: 'ground' },
				{ x: 0, y: 1, kind: 'ground' },
				{ x: 1, y: 1, kind: 'path' },
				{ x: 2, y: 1, kind: 'ground' },
				{ x: 0, y: 2, kind: 'ground' },
				{ x: 1, y: 2, kind: 'path' },
				{ x: 2, y: 2, kind: 'ground' },
			],
		});

		const layers = (tilemap as { layers: Array<{ name: string }> }).layers;
		expect(layers.map((layer) => layer.name)).toEqual([
			'ground',
			'path',
			'decorations',
			'objects',
		]);
		expect(
			(tilemap as { tilesets: Array<{ name: string; tilecount: number }> })
				.tilesets[0],
		).toMatchObject({
			name: 'tiny-swords-primary-tileset',
			tilecount: 6,
		});
	});
});
