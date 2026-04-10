import {
	type AssetManifest,
	type AssetManifestEntry,
	type AssetManifestSection,
	inferAssetManifestSection,
} from '@gld/shared';
import type Phaser from 'phaser';

export const OPTIONAL_ASSET_SECTIONS: AssetManifestSection[] = [
	'ui',
	'vfx',
	'projectiles',
];

const CORE_UNIT_IDS = [
	'scout_drone',
	'battle_robot',
	'heavy_walker',
	'stealth_drone',
	'titan',
] as const;

export function getCoreUnitIds(): readonly string[] {
	return CORE_UNIT_IDS;
}

export function shouldUseWebPTextures(): boolean {
	try {
		const c = document.createElement('canvas');
		return c.toDataURL('image/webp').startsWith('data:image/webp');
	} catch {
		return false;
	}
}

export function getCachedAssetManifest(scene: Phaser.Scene): AssetManifest {
	const manifest = scene.cache.json.get('asset-manifest') as
		| AssetManifest
		| undefined;
	if (!manifest || !Array.isArray(manifest.assets)) {
		throw new Error('asset-manifest cache is missing or invalid');
	}

	return {
		...manifest,
		assets: manifest.assets.map(normalizeAssetEntry),
	};
}

export function preloadAssetSection(
	scene: Phaser.Scene,
	manifest: AssetManifest,
	section: AssetManifestSection,
	useWebP: boolean,
): void {
	for (const asset of getManifestSectionEntries(manifest, section)) {
		queueAssetLoad(scene, asset, useWebP);
	}
}

export async function prefetchAssetSections(
	scene: Phaser.Scene,
	manifest: AssetManifest,
	sections: AssetManifestSection[],
	useWebP: boolean,
): Promise<void> {
	const assets = dedupeAssets(
		sections.flatMap((section) => getManifestSectionEntries(manifest, section)),
	).filter((asset) => !isAssetLoaded(scene, asset));

	if (assets.length === 0) return;

	for (const asset of assets) {
		queueAssetLoad(scene, asset, useWebP);
	}

	await new Promise<void>((resolve) => {
		scene.load.once('complete', () => resolve());
		scene.load.start();
	});
}

export function unloadAssetSections(
	scene: Phaser.Scene,
	manifest: AssetManifest,
	sections: AssetManifestSection[],
): void {
	for (const asset of dedupeAssets(
		sections.flatMap((section) => getManifestSectionEntries(manifest, section)),
	)) {
		switch (asset.type) {
			case 'image':
			case 'spritesheet':
				if (scene.textures.exists(asset.key)) {
					scene.textures.remove(asset.key);
				}
				removeOptionalAnimation(scene, asset.key);
				break;
			case 'tilemapTiledJSON':
				scene.cache.tilemap.remove(asset.key);
				break;
		}
	}
}

export function registerOptionalCombatAnimations(
	scene: Phaser.Scene,
	manifest: AssetManifest,
): void {
	for (const asset of dedupeAssets([
		...getManifestSectionEntries(manifest, 'vfx'),
		...getManifestSectionEntries(manifest, 'projectiles'),
		...getManifestSectionEntries(manifest, 'boss'),
	])) {
		if (asset.type !== 'spritesheet') continue;
		if (!asset.frameCount || !asset.frameWidth || !asset.frameHeight) continue;
		if (!scene.textures.exists(asset.key)) continue;

		const animationKey = getOptionalAnimationKey(asset.key);
		if (scene.anims.exists(animationKey)) continue;

		const isBossAnim =
			asset.key.startsWith('unit-') && asset.key.includes('-boss');
		scene.anims.create({
			key: animationKey,
			frames: scene.anims.generateFrameNumbers(asset.key, {
				start: 0,
				end: asset.frameCount - 1,
			}),
			frameRate: getAnimationFrameRate(asset.key),
			repeat: isBossAnim ? -1 : 0,
		});
	}
}

export function getOptionalAnimationKey(assetKey: string): string {
	return `anim-${assetKey}`;
}

function queueAssetLoad(
	scene: Phaser.Scene,
	asset: AssetManifestEntry,
	useWebP: boolean,
): void {
	const path =
		asset.type === 'image' || asset.type === 'spritesheet'
			? resolveTexturePath(asset.path, useWebP)
			: asset.path;

	switch (asset.type) {
		case 'image':
			scene.load.image(asset.key, path);
			break;
		case 'spritesheet':
			if (!asset.frameWidth || !asset.frameHeight) {
				throw new Error(
					`spritesheet asset is missing frame metadata: ${asset.key}`,
				);
			}
			scene.load.spritesheet(asset.key, path, {
				frameWidth: asset.frameWidth,
				frameHeight: asset.frameHeight,
			});
			break;
		case 'tilemapTiledJSON':
			scene.load.tilemapTiledJSON(asset.key, path);
			break;
	}
}

export function getManifestSectionEntries(
	manifest: AssetManifest,
	section: AssetManifestSection,
): AssetManifestEntry[] {
	if (!manifest?.assets) return [];
	return manifest.assets
		.map(normalizeAssetEntry)
		.filter((asset) => asset.section === section);
}

function normalizeAssetEntry(asset: AssetManifestEntry): AssetManifestEntry {
	return {
		...asset,
		section: asset.section ?? inferAssetManifestSection(asset),
	};
}

function isAssetLoaded(
	scene: Phaser.Scene,
	asset: AssetManifestEntry,
): boolean {
	switch (asset.type) {
		case 'image':
		case 'spritesheet':
			return scene.textures.exists(asset.key);
		case 'tilemapTiledJSON':
			return scene.cache.tilemap.exists(asset.key);
	}
}

function removeOptionalAnimation(scene: Phaser.Scene, assetKey: string): void {
	if (!('anims' in scene) || !scene.anims) return;
	const animationKey = getOptionalAnimationKey(assetKey);
	if (scene.anims.exists(animationKey)) {
		scene.anims.remove(animationKey);
	}
}

function getAnimationFrameRate(assetKey: string): number {
	if (assetKey === 'projectile-hit-flash') return 18;
	if (assetKey.endsWith('-fire')) return 14;
	return 14;
}

function dedupeAssets(assets: AssetManifestEntry[]): AssetManifestEntry[] {
	const seen = new Set<string>();
	return assets.filter((asset) => {
		if (seen.has(asset.key)) return false;
		seen.add(asset.key);
		return true;
	});
}

function resolveTexturePath(path: string, useWebP: boolean): string {
	if (!useWebP) return path;
	return path.replace(/\.png$/, '.webp');
}
