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
import { generate as generateVfx } from './generate-vfx';
import { generate as generateRarityFrames } from './generate-rarity-frames';

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

export async function generateAllAssets() {
	console.log('=== Generating all assets ===\n');

	const [
		staticFieldAssets,
		towers,
		units,
		projectiles,
		vfx,
		ui,
		resultUi,
		icons,
		map,
		rarityFrames,
	] = await Promise.all([
		Promise.resolve(collectStaticFieldAssetEntries()).then((result) => {
			console.log('[vendor-field-assets] done');
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
	]);

	const allEntries = withManifestSections([
		...staticFieldAssets,
		...towers,
		...units,
		...projectiles,
		...vfx,
		...ui,
		...resultUi,
		...icons,
		...map,
		...rarityFrames,
	]);

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
