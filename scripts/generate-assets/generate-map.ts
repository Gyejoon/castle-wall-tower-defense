import { writeFileSync } from 'fs';
import type { ManifestEntry } from './shared';

interface ScaffoldArgs {
	id: string;
	name: string;
	width: number;
	height: number;
	tileSize: number;
}

function scaffoldTmj(args: ScaffoldArgs): object {
	const { width, height, tileSize } = args;
	const cellCount = width * height;
	return {
		width,
		height,
		tilewidth: tileSize,
		tileheight: tileSize,
		orientation: 'orthogonal',
		version: '1.10',
		tiledversion: '1.10.2',
		type: 'map',
		properties: [
			{ name: 'id', type: 'string', value: args.id },
			{ name: 'name', type: 'string', value: args.name },
			{ name: 'recommendedPower', type: 'int', value: 50 },
			{ name: 'rewardMultiplier', type: 'int', value: 1 },
			{ name: 'difficultyHpMult', type: 'float', value: 1.0 },
			{
				name: 'tilemapKey',
				type: 'string',
				value: `tilemap-${args.id}`,
			},
			{
				name: 'tilesetKey',
				type: 'string',
				value: 'tiny-swords-tileset-color-1',
			},
		],
		layers: [
			{
				name: 'ground',
				type: 'tilelayer',
				width,
				height,
				data: new Array(cellCount).fill(1),
			},
			{
				name: 'terrain',
				type: 'tilelayer',
				width,
				height,
				data: new Array(cellCount).fill(1),
			},
			{ name: 'paths', type: 'objectgroup', objects: [] },
			{ name: 'structures', type: 'objectgroup', objects: [] },
			{ name: 'decorations', type: 'objectgroup', objects: [] },
			{ name: 'objects', type: 'objectgroup', objects: [] },
		],
	};
}

/** @deprecated Maps are now source-controlled .tmj.json files. */
export async function generateMap(): Promise<ManifestEntry[]> {
	return [];
}

if (import.meta.main) {
	const [id, name, w, h, tileSize] = process.argv.slice(2);
	if (!id) {
		console.error(
			'usage: bun scripts/generate-assets/generate-map.ts <id> <name> <w> <h> <tileSize>',
		);
		process.exit(1);
	}
	const out = `packages/shared/src/maps/${id.replace(/_/g, '-')}.tmj.json`;
	const json = scaffoldTmj({
		id,
		name: name || id,
		width: Number(w) || 8,
		height: Number(h) || 18,
		tileSize: Number(tileSize) || 32,
	});
	writeFileSync(out, JSON.stringify(json, null, 2));
	console.log(`  wrote ${out}`);
}
