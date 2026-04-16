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
export type { AchievementDef } from './constants/achievements';
export { ACHIEVEMENT_MAP, ACHIEVEMENTS } from './constants/achievements';
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
	ENERGY_PER_SEC,
	ENERGY_PER_WAVE_CLEAR,
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
	getNextMapInWorld,
	getSpawnExitPairs,
	isMapUnlocked,
	LAVA_FORTRESS_MAP,
	MAP_REGISTRY,
	PHASE_A_LONG_MAP,
	PHASE_A_MAP_ID,
	STORM_CITADEL_MAP,
} from './constants/maps';
export {
	battleXp,
	createDefaultSave,
	enhancementCost,
	enhancementStatMultiplier,
	GRADE_BONUS,
	GRADE_MAX_LEVEL,
	getEffectiveStats,
	INITIAL_PREP_MS,
	MAX_TOWER_LEVEL,
	maxLevelForGrade,
	PROMOTION_CONFIG,
	stunCooldownMultiplier,
	stunDurationMultiplier,
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
export {
	getMaxGoldForMap,
	getMaxXpForMap,
	getTotalRewardMultiplier,
} from './constants/stageInfo';
export {
	DEFAULT_STAGE_ID,
	getNextStageId,
	getStageById,
	getStagesByWorld,
	STAGE_ORDER,
	STAGES,
} from './constants/stages';
export type { StarRating } from './constants/starDifficulty';
export {
	checkStarClear,
	getStarDifficultyMult,
	PERFECT_CLEAR_BONUS,
	STAR_CLEAR_CONDITIONS,
	STAR_DIFFICULTY,
	STAR_REWARD_MULTIPLIERS,
} from './constants/starDifficulty';
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
	generatePhaseAWaves,
	getTotalWavesForMap,
	getTotalWavesForStage,
	getWaveScaling,
	getWavesForMap,
	getWavesForStage,
	MAX_WAVE_DURATION_MS,
	STAGE_WAVES,
	TOTAL_WAVES,
	WAVE_SCALING,
} from './constants/waves';
export {
	getWorldById,
	WORLD_ORDER,
	WORLDS,
} from './constants/worlds';
export type { SummonPool, SummonResult } from './data/summonPool';
export {
	createSummonPool,
	drawRandomSummon,
	getPhaseARefund,
	PHASE_A_SUMMON_COST,
} from './data/summonPool';
export type { UpgradeCardDef, UpgradeId } from './data/upgradeCards';
export { pickRandomUpgrades, UPGRADE_CARDS } from './data/upgradeCards';
export {
	getStageLockStatus,
	isStageUnlocked,
	isWorldUnlocked,
} from './systems/unlock-rules';
export type { CombatHudState, WavePhase } from './types/game-state';
export type { Grade } from './types/grade';
export { GRADES, isMaxGrade, nextGrade } from './types/grade';
export type { Grid, GridConfig, Position, Tile } from './types/grid';
export type { GimmickTileSet, MapLayout } from './types/map';
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
	StageDef,
	StageLockStatus,
	WorldDef,
	WorldId,
	WorldUnlockRule,
} from './types/stage';
export type {
	FusionTowerType,
	PlacedTower,
	TowerDef,
	TowerStats,
	TowerTier,
	TowerType,
} from './types/tower';
export { TIER_NAMES } from './types/tower';
export type {
	ActiveUnit,
	UnitDef,
	UnitSpecialBehavior,
	UnitStats,
	UnitType,
} from './types/unit';
export { calcCombatPower, calcTowerPower } from './utils/combatPower';
