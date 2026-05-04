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

export type AssetPolishLevel = 'canvas-only' | 'libresprite-polished';

export interface CatalogEntry {
	key: string;
	type: AssetManifestType;
	path: string;
	section: AssetManifestSection;
	frameWidth?: number;
	frameHeight?: number;
	frameCount?: number;
	polish?: AssetPolishLevel;
	fileExists: boolean;
	webpExists: boolean | null;
	codeReferences: string[];
}

export type AcrStatus = 'draft' | 'in_review' | 'blocked' | 'ready' | 'applied';
export type CheckStatus = 'pending' | 'pass' | 'fail' | 'required';

export interface AcrChecklistItem {
	id: string;
	label: string;
	status: CheckStatus;
}

export interface AcrLogEntry {
	id: string;
	at: string;
	kind: 'info' | 'command' | 'apply';
	message: string;
	stdout?: string;
	stderr?: string;
	exitCode?: number;
}

export interface AssetChangeRequest {
	id: string;
	title: string;
	assetKeys: string[];
	status: AcrStatus;
	checklist: AcrChecklistItem[];
	logs: AcrLogEntry[];
	manifestUpdates?: Array<{
		key: string;
		section?: AssetManifestSection;
		polish?: AssetPolishLevel;
	}>;
	createdAt: string;
	updatedAt: string;
	appliedAt?: string;
}

export interface StagingEntry {
	id: string;
	hasOriginal: boolean;
	hasPolished: boolean;
	metadata: StagingMetadata | null;
}

export interface StagingMetadata {
	assetId: string;
	sourcePath: string;
	destPath: string;
	forgedAt: string;
	polishLevel: AssetPolishLevel;
	polish: {
		palette: boolean;
		rimLight: { strength: number; shadow: number };
		noise: { density: number; seed: number };
		animation?: { frameW: number; frameH: number; frameCount: number };
	};
	status: 'pending' | 'accepted' | 'rejected';
	warnings: string[];
	acceptedAt?: string;
}

export type CheckId = 'asset-audit' | 'phaser-tests' | 'web-build';

export const CHECK_LABELS: Record<CheckId, string> = {
	'asset-audit': 'Asset audit',
	'phaser-tests': 'Phaser tests',
	'web-build': 'Web build',
};

export type ToolSection = 'Assets' | 'Tilemap' | 'Scenes' | 'Balance' | 'UI';

export interface UiComponent {
	key: string;
	category: string;
	file: string;
	exports: string[];
	sectionId: string | null;
	codeReferences: string[];
}

export type Busy =
	| 'idle'
	| 'loading'
	| 'creating'
	| 'saving'
	| 'checking'
	| 'applying'
	| 'staging';

export type TileKind = 'ground' | 'path' | 'platform' | 'wall' | 'foliage';

export interface TilemapCell {
	x: number;
	y: number;
	kind: TileKind;
}

export interface TilemapDocument {
	id: string;
	file: string;
	width: number;
	height: number;
	tileSize: number;
	cells: TilemapCell[];
	ruleTiles: Array<{
		layer: string;
		kind: TileKind;
		rule: 'fill' | 'path-neighbor-mask' | 'inverse-path';
	}>;
}

export interface SceneRecord {
	key: string;
	className: string;
	file: string;
	order: number;
	enabled: boolean;
	view: 'boot' | 'preload' | 'top-down-game' | 'overlay';
	notes: string;
}

export interface SceneSettings {
	scenes: SceneRecord[];
	updatedAt: string;
}

export interface EnergyBalance {
	energyPerSecond: number;
	energyInitial: number;
	energyMax: number;
	energyPerKill: number;
	energyPerWaveClear: number;
	energyPerBossKill: number;
	energyPerBossFastClear: number;
	fastClearThresholdMs: number;
}

export interface GachaBalance {
	tier2: { cost: number; successRate: number };
	tier3: { cost: number; successRate: number };
	tier4: { cost: number; successRate: number };
}

export interface WaveScalingRow {
	slot: number;
	hp: number;
	speed: number;
}

export interface TowerBalanceRow {
	id: string;
	name: string;
	tier: number;
	family: string;
	cost: number;
	damage?: number;
	range?: number;
	attackSpeed?: number;
}

export interface BalanceSheet {
	energy: EnergyBalance;
	gacha: GachaBalance;
	hpSlope: number;
	waveScaling: WaveScalingRow[];
	towers: TowerBalanceRow[];
}
