export type {
	AssetManifest,
	AssetManifestEntry,
	AssetManifestSection,
	AssetManifestType,
} from './assets/manifest';
export {
	inferAssetManifestSection,
	withManifestSection,
	withManifestSections,
} from './assets/manifest';
export type { BossPhaseConfig } from './constants/boss';
export { BOSS_CONFIG, FINAL_BOSS_HP_MULTIPLIER } from './constants/boss';
export type { DeckCardDef } from './constants/deck';
export { buildDeckCards, DEFAULT_DECK, towerToRole } from './constants/deck';
export type { CcAuraConfig, ElementType } from './constants/elements';
export {
	CC_AURA_CONFIGS,
	ELEMENT_MATCHUP,
	ELEMENT_TINT_COLORS,
	getElementMultiplier,
} from './constants/elements';
export {
	ENERGY_CAP,
	ENERGY_PER_BOSS_KILL,
	ENERGY_PER_KILL,
	ENERGY_PER_SEC,
	INITIAL_ENERGY,
} from './constants/energy';
export type { GachaResult } from './constants/gacha';
export {
	GACHA_COSTS,
	PITY_THRESHOLD,
	rollGacha,
	rollGacha10,
} from './constants/gacha';
export {
	BOARD_TOP_PADDING,
	DEFAULT_GRID_CONFIG,
	GAME_CANVAS_H,
	GRID_HEIGHT,
	GRID_WIDTH,
	HP_WALL_STAGE_1,
	HP_WALL_STAGE_2,
	INITIAL_PLAYER_HP,
	ORTHO_CANVAS_W,
	ORTHO_TILE,
	TILE_SIZE,
} from './constants/grid';
export {
	DEFAULT_MAP_ID,
	FOREST_GATE_MAP,
	getAllPathCells,
	getMapById,
	getMapPaths,
	getSpawnExitPairs,
	isMapUnlocked,
	LAVA_FORTRESS_MAP,
	MAP_REGISTRY,
	STORM_CITADEL_MAP,
} from './constants/maps';
export {
	battleXp,
	createDefaultSave,
	enhancementCost,
	enhancementStatMultiplier,
	getEffectiveStats,
	MAX_TOWER_LEVEL,
	PROMOTION_CONFIG,
	xpToNextLevel,
} from './constants/meta';
export {
	DAILY_MISSION_TYPES,
	generateDailyMissions,
	generateWeeklyMissions,
	KST_OFFSET_MS,
	MISSION_LABELS,
	shouldResetDaily,
	shouldResetWeekly,
	toKSTDateStr,
	WEEKLY_MISSION_TYPES,
} from './constants/missions';
export type { ScaledUnitStats } from './constants/scaling';
export { getLevelBand, scaleUnitStats } from './constants/scaling';
export { getMaxGoldForMap, getMaxXpForMap } from './constants/stageInfo';
export {
	ALL_TOWERS,
	BASE_TOWERS,
	GOD_TOWERS,
	getTowersByTier,
	HEROIC_TOWERS,
	LEGENDARY_TOWERS,
	RARE_TOWERS,
} from './constants/towers';
export { PHASER_COLORS, UI_COLORS } from './constants/ui-colors';
export { UNITS } from './constants/units';
export type {
	WaveDef,
	WaveGroup,
	WaveSlotKind,
} from './constants/waves';
export {
	getTotalWavesForMap,
	getWavesForMap,
	TOTAL_WAVES,
	WAVE_DEFS,
} from './constants/waves';
export type { CombatHudState, WavePhase } from './types/game-state';
export type { Grid, GridConfig, Position, Tile } from './types/grid';
export type { MapLayout } from './types/map';
export type { PlacementFailureReason } from './types/placement';
export type {
	MissionProgress,
	MissionType,
	OwnedTower,
	ProfileData,
	ProgressData,
	SaveData,
	SettingsData,
	TowerGrade,
} from './types/save';
export { SAVE_STORAGE_KEY, SAVE_VERSION, TOWER_GRADES } from './types/save';
export type {
	FusionTowerType,
	PlacedTower,
	TowerDef,
	TowerStats,
	TowerTier,
	TowerType,
} from './types/tower';
export { TIER_NAMES } from './types/tower';
export type { ActiveUnit, UnitDef, UnitStats, UnitType } from './types/unit';
