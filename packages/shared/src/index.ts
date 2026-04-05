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
export type { DeckCardDef } from './constants/deck';
export { buildDeckCards, DEFAULT_DECK, towerToRole } from './constants/deck';
export type { CcAuraConfig, ElementType } from './constants/elements';
export {
	CC_AURA_CONFIGS,
	ELEMENT_MATCHUP,
	ELEMENT_TINT_COLORS,
	getElementMultiplier,
} from './constants/elements';
export { ENERGY_CAP, ENERGY_PER_SEC, INITIAL_ENERGY } from './constants/energy';
export { getLevelBand, scaleUnitStats } from './constants/scaling';
export type { ScaledUnitStats } from './constants/scaling';
export {
	BOARD_TOP_PADDING,
	DEFAULT_GRID_CONFIG,
	GAME_CANVAS_H,
	GRID_HEIGHT,
	GRID_WIDTH,
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
	LAVA_FORTRESS_MAP,
	MAP_REGISTRY,
	STORM_CITADEL_MAP,
} from './constants/maps';
export {
	ALL_TOWERS,
	BASE_TOWERS,
	GOD_TOWERS,
	getTowersByTier,
	HEROIC_TOWERS,
	LEGENDARY_TOWERS,
	RARE_TOWERS,
} from './constants/towers';
export { UNITS } from './constants/units';
export type {
	WaveDef,
	WaveGroup,
	WaveSlotKind,
} from './constants/waves';
export {
	TOTAL_WAVES,
	WAVE_DEFS,
} from './constants/waves';
export type { CombatHudState, WavePhase } from './types/game-state';
export type { Grid, GridConfig, Position, Tile } from './types/grid';
export type { MapLayout } from './types/map';
export type { PlacementFailureReason } from './types/placement';
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
