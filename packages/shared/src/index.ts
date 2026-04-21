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
export {
	buildDeckCards,
	buildDeckCardsSafe,
	DEFAULT_DECK,
	DEFAULT_DECK_IDS,
	towerToRole,
} from './constants/deck';
export type { CcAuraConfig, ElementType } from './constants/elements';
export {
	CC_AURA_CONFIGS,
	ELEMENT_MATCHUP,
	ELEMENT_TINT_COLORS,
	GLOBAL_RANGE_THRESHOLD,
	getElementMultiplier,
} from './constants/elements';
export {
	ENERGY_CAP,
	ENERGY_INITIAL,
	ENERGY_MAX,
	ENERGY_PER_BOSS_FAST_CLEAR,
	ENERGY_PER_BOSS_KILL,
	ENERGY_PER_KILL,
	ENERGY_PER_SEC,
	ENERGY_PER_SECOND,
	ENERGY_PER_WAVE_CLEAR,
	FAST_CLEAR_THRESHOLD_MS,
	INGAME_GACHA,
	INITIAL_ENERGY,
} from './constants/energy';
export type { UpgradeableFamily } from './constants/familyUpgrade';
export {
	BASE_FAMILY_UPGRADE_COST,
	FAMILY_UPGRADE_DAMAGE_PER_LEVEL,
	familyDamageMultiplier,
	familyUpgradeCost,
	MAX_FAMILY_UPGRADE_LEVEL,
	UPGRADEABLE_FAMILIES,
} from './constants/familyUpgrade';
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
	getAllPathCells,
	getMapById,
	getMapPaths,
	getSpawnExitPairs,
	isMapUnlocked,
	MAP_REGISTRY,
	PHASE_A_LONG_MAP,
	PHASE_A_MAP_ID,
} from './constants/maps';
export {
	battleXp,
	createDefaultSave,
	dupesRequiredForLevel,
	enhancementCost,
	enhancementStatMultiplier,
	getEffectiveStats,
	INITIAL_PREP_MS,
	MAX_TOWER_LEVEL,
	stunCooldownMultiplier,
	stunDurationMultiplier,
	xpToNextLevel,
} from './constants/meta';
export type { ScaledUnitStats } from './constants/scaling';
export { getLevelBand, scaleUnitStats } from './constants/scaling';
export {
	ALL_TOWERS,
	getTowerById,
	getTowersByFamily,
	getTowersByTier,
	MERGE_CHAIN,
	resolveMerge,
	TOWER_DEFS,
} from './constants/towers';
export { PHASER_COLORS, UI_COLORS } from './constants/ui-colors';
export {
	MIN_MOVE_SPEED,
	STUN_IMMUNITY_WINDOW_MS,
	UNITS,
} from './constants/units';
export type {
	WaveDef,
	WaveGroup,
	WaveSlotKind,
} from './constants/waves';
export {
	getTotalWavesForMap,
	getWaveScaling,
	getWavesForMap,
	MAX_WAVE_DURATION_MS,
} from './constants/waves';
export { generatePhaseAWaves } from './data/phaseAWaves';
export type { SummonPool, SummonResult } from './data/summonPool';
export {
	createSummonPool,
	drawRandomSummon,
	getPhaseARefund,
	PHASE_A_SUMMON_COST,
} from './data/summonPool';
export type {
	UpgradeCard,
	UpgradeCardDef,
	UpgradeId,
} from './data/upgradeCards';
export { pickRandomUpgrades, UPGRADE_CARDS } from './data/upgradeCards';
export type {
	CoreColor,
	DurationKey,
	EasingKey,
	ElementKey,
	ElevationKey,
	OverlayDimKey,
	RadiusKey,
	SpacingKey,
	StateColor,
	TierKey,
	Tokens,
	TypographyScale,
	ZIndexKey,
} from './design/tokens';
export {
	core,
	duration,
	easing,
	element,
	elevation,
	fontFamily,
	fontWeight,
	motion,
	overlayDim,
	palette,
	radius,
	spacing,
	state,
	surface,
	tier,
	tokens,
	typography,
	zIndex,
} from './design/tokens';
export type { AdPlacement, AdResult, AdService } from './services/AdService';
export { MockAdService } from './services/AdService';
// Phase 7 (v8): scenario-mode constants (stages/worlds/missions/achievements
// /stageInfo/starDifficulty) removed alongside the SaveData v7→v8 shrink.
// Phase 9 meta rebuild will introduce whatever replacement gating is needed.
export type { CombatHudState, WavePhase } from './types/game-state';
export type { Grid, GridConfig, Position, Tile } from './types/grid';
export type { MapLayout } from './types/map';
export type { PlacementFailureReason } from './types/placement';
export type {
	LeaderboardRow,
	ProfileRow,
	RunRecord,
	RunResult,
	SubmitRunPayload,
} from './types/ranking';
export type {
	OwnedTower,
	ProfileData,
	ProgressData,
	SaveData,
	SettingsData,
} from './types/save';
export { SAVE_STORAGE_KEY, SAVE_VERSION } from './types/save';
export type {
	PlacedTower,
	TowerDef,
	TowerFamily,
	TowerId,
	TowerStats,
} from './types/tower';
export type {
	ActiveUnit,
	UnitDef,
	UnitSpecialBehavior,
	UnitStats,
	UnitType,
} from './types/unit';
