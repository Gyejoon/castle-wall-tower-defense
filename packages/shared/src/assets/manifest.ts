export type AssetManifestType = 'image' | 'spritesheet' | 'tilemapTiledJSON';

export type AssetManifestSection =
	| 'preload'
	| 'ui'
	| 'vfx'
	| 'projectiles'
	| 'mobile'
	| 'icons'
	| 'boss'
	| 'reward'
	| 'tutorial'
	| 'gacha';

export interface AssetManifestEntry {
	key: string;
	type: AssetManifestType;
	path: string;
	section?: AssetManifestSection;
	frameWidth?: number;
	frameHeight?: number;
	frameCount?: number;
}

export interface AssetManifest {
	generated: string;
	assets: AssetManifestEntry[];
}

export function inferAssetManifestSection(
	entry: Pick<AssetManifestEntry, 'key' | 'path'>,
): AssetManifestSection {
	if (entry.path.includes('/ui-mobile/')) return 'mobile';
	if (entry.path.includes('/icons/')) return 'icons';
	if (entry.path.includes('/projectiles/')) return 'projectiles';
	if (entry.path.includes('/vfx/')) return 'vfx';
	if (entry.path.includes('/boss/')) return 'boss';
	if (entry.path.includes('/reward/')) return 'reward';
	if (entry.path.includes('/tutorial/')) return 'tutorial';
	if (entry.path.includes('/gacha/')) return 'gacha';
	if (entry.path.includes('/ui/')) return 'ui';
	if (entry.path.includes('/towers/') && entry.key.endsWith('-fire'))
		return 'vfx';
	return 'preload';
}

export function withManifestSection<T extends AssetManifestEntry>(
	entry: T,
): T & { section: AssetManifestSection } {
	return {
		...entry,
		section: entry.section ?? inferAssetManifestSection(entry),
	};
}

export function withManifestSections<T extends AssetManifestEntry>(
	entries: T[],
): Array<T & { section: AssetManifestSection }> {
	return entries.map(withManifestSection);
}
