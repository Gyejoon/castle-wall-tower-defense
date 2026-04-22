import { existsSync, writeFileSync } from 'fs';
import { withManifestSections } from '../../packages/shared/src/assets/manifest';
import {
	TINY_SWORDS_DECORATION_ASSETS,
	TINY_SWORDS_TILESET_ASSETS,
} from '../../packages/phaser-game/src/fieldAssets';
import { convertToWebP } from './convert-webp';
import { generate as generateIcons } from './generate-icons';
import { generateMap } from './generate-map';
import { generate as generateResultUi } from './generate-result-ui';
import { generate as generateProjectiles } from './generate-projectiles';
import type { ManifestEntry } from './shared';
import { generate as generateTowers } from './generate-towers';
import { generate as generateUi } from './generate-ui';
import { generate as generateUnits } from './generate-units';
import { generate as generateCastleWall } from './generate-castle-wall';
import { generate as generateSpawnHut } from './generate-spawn-hut';
import { generate as generateVfx } from './generate-vfx';
import { generate as generateRarityFrames } from './generate-rarity-frames';
import { generate as generateTiles } from './generate-tiles';
import { generate as generateTutorialUi } from './generate-tutorial-ui';
import { generate as generateGachaUi } from './generate-gacha-ui';
import { generate as generateCheckBadge } from './generate-check-badge';
import { generate as generateWorldmap } from './generate-worldmap';

export function collectStaticFieldAssetEntries(): ManifestEntry[] {
	const staticEntries = [
		...TINY_SWORDS_TILESET_ASSETS,
		...TINY_SWORDS_DECORATION_ASSETS,
	].map(({ key, path, frameWidth, frameHeight, frameCount }) => ({
		key,
		type: 'spritesheet' as const,
		path,
		frameWidth,
		frameHeight,
		frameCount,
	}));

	const missing = staticEntries
		.filter(
			(entry) =>
				!existsSync(
					new URL(
						`../../packages/web-shell/public/${entry.path}`,
						import.meta.url,
					),
				),
		)
		.map((entry) => entry.path);
	if (missing.length > 0) {
		throw new Error(
			`[vendor field assets] missing required assets: ${missing.join(', ')}`,
		);
	}

	return staticEntries;
}

export function collectManualManifestEntries(): ManifestEntry[] {
	const entries = [
		{
			key: 'tilemap-phase-a-long-v2',
			type: 'tilemapTiledJSON' as const,
			path: 'assets/maps/phase-a-long-v2.tmj',
			section: 'preload' as const,
		},
	];

	const missing = entries
		.filter(
			(entry) =>
				!existsSync(
					new URL(
						`../../packages/web-shell/public/${entry.path}`,
						import.meta.url,
					),
				),
		)
		.map((entry) => entry.path);
	if (missing.length > 0) {
		throw new Error(
			`[manual manifest assets] missing required assets: ${missing.join(', ')}`,
		);
	}

	return entries;
}

export async function generateAllAssets() {
	console.log('=== Generating all assets ===\n');

	const [
		staticFieldAssets,
		manualManifestEntries,
		towers,
		units,
		projectiles,
		castleWall,
		spawnHut,
		vfx,
		ui,
		resultUi,
		icons,
		map,
		rarityFrames,
		tiles,
		tutorialUi,
		gachaUi,
		checkBadge,
		worldmap,
	] = await Promise.all([
		Promise.resolve(collectStaticFieldAssetEntries()).then((result) => {
			console.log('[vendor-field-assets] done');
			return result;
		}),
		Promise.resolve(collectManualManifestEntries()).then((result) => {
			console.log('[manual-manifest-assets] done');
			return result;
		}),
		generateTowers().then((result) => {
			console.log('[towers] done');
			return result;
		}),
		generateUnits().then((result) => {
			console.log('[units] done');
			return result;
		}),
		generateProjectiles().then((result) => {
			console.log('[projectiles] done');
			return result;
		}),
		generateCastleWall().then((result) => {
			console.log('[castle-wall] done');
			return result;
		}),
		generateSpawnHut().then((result) => {
			console.log('[spawn-hut] done');
			return result;
		}),
		generateVfx().then((result) => {
			console.log('[vfx] done');
			return result;
		}),
		generateUi().then((result) => {
			console.log('[ui] done');
			return result;
		}),
		generateResultUi().then((result) => {
			console.log('[result-ui] done');
			return result;
		}),
		generateIcons().then((result) => {
			console.log('[icons] done');
			return result;
		}),
		generateMap().then((result) => {
			console.log('[map] done');
			return result;
		}),
		generateRarityFrames().then((result) => {
			console.log('[rarity-frames] done');
			return result;
		}),
		generateTiles().then((result) => {
			console.log('[tiles] done');
			return result;
		}),
		generateTutorialUi().then((result) => {
			console.log('[tutorial-ui] done');
			return result;
		}),
		generateGachaUi().then((result) => {
			console.log('[gacha-ui] done');
			return result;
		}),
		generateCheckBadge().then((result) => {
			console.log('[check-badge] done');
			return result;
		}),
		generateWorldmap().then((result) => {
			console.log('[worldmap] done');
			return result;
		}),
	]);

	const allEntries = withManifestSections([
		...staticFieldAssets,
		...manualManifestEntries,
		...towers,
		...units,
		...projectiles,
		...castleWall,
		...spawnHut,
		...vfx,
		...ui,
		...resultUi,
		...icons,
		...map,
		...rarityFrames,
		...tiles,
		...tutorialUi,
		...gachaUi,
		...checkBadge,
		...worldmap,
	]);

	const seen = new Set<string>();
	for (const entry of allEntries) {
		if (seen.has(entry.key)) {
			throw new Error(`Duplicate manifest key: '${entry.key}'`);
		}
		seen.add(entry.key);
	}

	const manifest = {
		generated: new Date().toISOString(),
		assets: allEntries,
	};

	const manifestPath = 'packages/web-shell/public/assets/asset-manifest.json';
	writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
	console.log(`\nWrote ${manifestPath}`);
	console.log(`Total assets: ${allEntries.length}`);

	console.log('\n[webp conversion]');
	const { converted, savedBytes } = await convertToWebP();
	console.log(
		`Converted ${converted} PNGs to WebP (saved ${(savedBytes / 1024).toFixed(1)}KB)`,
	);

	return manifest;
}

if (import.meta.main) {
	generateAllAssets().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
