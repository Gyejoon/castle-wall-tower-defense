import {
	type ActiveUnit,
	type AssetManifest,
	buildDeckCardsSafe,
	checkStarClear,
	DEFAULT_DECK,
	DEFAULT_MAP_ID,
	DEFAULT_STAGE_ID,
	ENERGY_PER_WAVE_CLEAR,
	getAllPathCells,
	getMapById,
	getMapPaths,
	getSpawnExitPairs,
	getStageById,
	getStarDifficultyMult,
	getTotalWavesForStage,
	getWavesForStage,
	INITIAL_PLAYER_HP,
	type MapLayout,
	PHASE_A_MAP_ID,
	PHASER_COLORS,
	pickRandomUpgrades,
	type StarRating,
	UNITS,
	type WaveDef,
	type WavePhase,
	type WorldId,
} from '@gld/shared';
import Phaser from 'phaser';
import {
	getCachedAssetManifest,
	OPTIONAL_ASSET_SECTIONS,
	prefetchAssetSections,
	registerOptionalCombatAnimations,
	shouldUseWebPTextures,
	unloadAssetSections,
} from '../assets/assetManifest';
import { soundGenerator } from '../audio/SoundGenerator';
import { EventBus } from '../EventBus';
import {
	GRASS_SEAMLESS_KEY,
	TINY_SWORDS_DECORATION_BY_KEY,
	TINY_SWORDS_PATH_TILESET_KEY,
	type TinySwordsDecorationKind,
} from '../fieldAssets';

/** Per-map theme palette for ground tiles, path overlay, and decorations */
interface MapTheme {
	groundTint: number;
	decorTint: number;
	pathColor: number;
	pathLineColor: number;
}

const MAP_THEMES: Record<string, MapTheme> = {
	forest_gate: {
		groundTint: 0xffffff, // no tint — natural green/brown
		decorTint: 0xffffff,
		pathColor: 0x9f8258,
		pathLineColor: 0xb8956a,
	},
	lava_fortress: {
		groundTint: 0xd4a070, // warm orange/brown cast
		decorTint: 0xc89060,
		pathColor: 0xb05030,
		pathLineColor: 0xc06040,
	},
	storm_citadel: {
		groundTint: 0x8898c0, // cool blue/purple cast
		decorTint: 0x7888b0,
		pathColor: 0x5060a0,
		pathLineColor: 0x6070b0,
	},
};

function getMapTheme(mapId: string): MapTheme {
	return MAP_THEMES[mapId] ?? MAP_THEMES.forest_gate;
}

import { getPlacementGuardFailure } from '../placementRules';
import { createBossBehavior } from '../systems/boss-ai/registry';
import type { BossBehavior } from '../systems/boss-ai/types';
import { CastleWallSystem } from '../systems/CastleWallSystem';
import '../systems/boss-ai/orcWarlord';
import '../systems/boss-ai/forgeMaster';
import '../systems/boss-ai/corruptedArchmage';
import { createWorldGimmick } from '../systems/world-gimmicks/registry';
import type { WorldGimmick } from '../systems/world-gimmicks/types';
import '../systems/world-gimmicks/W2FurnaceGimmick';
import '../systems/world-gimmicks/W3ArcaneGimmick';
import { DamageNumberSystem } from '../systems/DamageNumberSystem';
import { DeckSystem } from '../systems/DeckSystem';
import { EnergySystem } from '../systems/EnergySystem';
import { GridManager } from '../systems/GridManager';
import { PathfindingSystem } from '../systems/PathfindingSystem';
import { PhaseAOrchestrator } from '../systems/PhaseAOrchestrator';
import { SpawnHutSystem } from '../systems/SpawnHutSystem';
import { TowerSystem } from '../systems/TowerSystem';
import { TutorialSystem } from '../systems/TutorialSystem';
import { UnitSystem } from '../systems/UnitSystem';
import { WaveSystem } from '../systems/WaveSystem';

// Phase A pivot starter pool: 5 towers covering single-target, AOE, CC,
// splash, and DOT roles. All from existing assets so the random-summon +
// merge loop reuses pixel medieval sprites without new art.
const PHASE_A_INITIAL_POOL: readonly string[] = [
	'archer',
	'plasma',
	'emp',
	'nova_cannon',
	'flame_tower',
];

export class GameScene extends Phaser.Scene {
	private playerGrid!: GridManager;
	private playerPathfinding!: PathfindingSystem;
	private playerTowers!: TowerSystem;
	private playerUnits!: UnitSystem;
	private playerWaves!: WaveSystem;
	private playerDeck!: DeckSystem;
	private phaseAOrchestrator?: PhaseAOrchestrator;
	private onPhaseASummonReady?: (data: { towerId: string }) => void;
	private onUpgradeApplied?: () => void;
	private castleWall!: CastleWallSystem;
	private spawnHut!: SpawnHutSystem;
	private damageNumbers!: DamageNumberSystem;
	private playerHp = INITIAL_PLAYER_HP;
	private selectedStar: StarRating = 1;
	private energySystem = new EnergySystem();
	private selectedTowerId: string | null = null;
	private gameOver = false;
	private goldEarned = 0;
	private isPhaseAMap = false;
	private currentWaveSlot = 1;
	private lastTimerTickSec = -1;
	private rewardMultiplier = 1;
	private currentSlotDef!: WaveDef;
	private currentStageId!: string;

	private hoverGraphics!: Phaser.GameObjects.Graphics;
	private selectionGraphics!: Phaser.GameObjects.Graphics;
	private rangeOverlayGraphics!: Phaser.GameObjects.Graphics;
	private pathGraphics?: Phaser.GameObjects.Graphics;

	private onSelectTower!: (data: { towerDefId: string }) => void;
	private onClearTowerSelection!: () => void;
	private onSellTower!: (data: { col: number; row: number }) => void;
	private onMoveTower!: (data: {
		fromCol: number;
		fromRow: number;
		toCol: number;
		toRow: number;
	}) => void;
	private onEnterMoveMode!: (data: {
		fromCol: number;
		fromRow: number;
	}) => void;
	private movePending: { fromCol: number; fromRow: number } | null = null;
	private onPause!: () => void;
	private onResume!: () => void;
	private onWaveStartedLifecycle!: (data: {
		wave: number;
		totalWaves: number;
		slotIndex: number;
		phase: WavePhase;
		kind: WaveDef['kind'];
		startAtSec: number;
	}) => void;
	private onBossWarning!: (data: {
		slotIndex: number;
		bossSlotIndex: number;
		startAtSec: number;
	}) => void;
	private bossPrefetched = false;
	private speedMultiplier: 1 | 2 | 3 = 1;
	private scaledGameTime = 0;
	private onWaveCompleted!: (data: {
		wave: number;
		totalWaves: number;
		slotIndex: number;
		delaySec: number;
		cleared: boolean;
	}) => void;
	private onSetSpeed!: (data: { multiplier: 1 | 2 | 3 }) => void;

	private decorationTiles: Array<{
		x: number;
		y: number;
		assetKey: string;
		kind: TinySwordsDecorationKind;
		variant: string;
	}> | null = null;
	private optionalAssetManifest: AssetManifest = getEmptyAssetManifest();
	private isCleaningUp = false;
	private tutorial?: TutorialSystem;
	private currentMap!: MapLayout;
	private worldGimmick: WorldGimmick | null = null;
	private furnaceTintOverlays: Phaser.GameObjects.Rectangle[] = [];
	private onFurnaceCycle!: (data: {
		active: boolean;
		tiles: Array<{ x: number; y: number }>;
	}) => void;
	private onArcaneBurst!: (data: {
		area: { startX: number; startY: number; endX: number; endY: number };
		stunMs: number;
	}) => void;
	private bossBehaviors = new Map<string, BossBehavior>(); // key = unit instanceId

	constructor() {
		super('Game');
	}

	/**
	 * Returns true only if this scene instance is in a state where its
	 * GameObjects and systems can be safely touched. EventBus is a module
	 * singleton, so handlers can survive past scene shutdown if listener
	 * cleanup is skipped (e.g. React StrictMode quirks, Phaser game.destroy
	 * emitting only 'destroy' not 'shutdown'). Guard every EventBus handler
	 * with this to avoid crashes like:
	 *   - Cannot read properties of null (reading 'queueOp') in onPause
	 *   - Cannot read properties of undefined (reading 'sys') in
	 *     SpawnHutSystem.setActive, called via a stale onWaveStartedLifecycle.
	 */
	private isSceneAlive(): boolean {
		if (this.isCleaningUp) return false;
		const status = this.sys?.settings?.status;
		// Phaser scene status: SHUTDOWN=8, DESTROYED=9. Skip if >= SHUTDOWN.
		return typeof status === 'number' && status < 8;
	}

	create(data?: { mapId?: string }) {
		this.isCleaningUp = false;
		this.scaledGameTime = 0;
		this.speedMultiplier = 1;
		this.time.timeScale = 1;
		this.anims.globalTimeScale = 1;
		const mapId =
			data?.mapId ??
			(this.game.registry.get('mapId') as string | undefined) ??
			DEFAULT_MAP_ID;
		this.currentMap = getMapById(mapId);
		this.rewardMultiplier = this.currentMap.rewardMultiplier;
		this.optionalAssetManifest = getCachedAssetManifest(this);
		const canvasW = this.scale.width;
		const canvasH = this.scale.height;
		this.playerGrid = new GridManager(this.currentMap, {
			canvasWidth: canvasW,
			canvasHeight: canvasH,
		});
		this.playerPathfinding = new PathfindingSystem();
		const collection = this.game.registry.get('collection') as
			| import('@gld/shared').OwnedTower[]
			| undefined;
		this.playerTowers = new TowerSystem(
			this,
			this.playerGrid,
			this.playerPathfinding,
			collection,
			getSpawnExitPairs(this.currentMap),
		);
		this.playerUnits = new UnitSystem(this, this.playerGrid);
		this.playerUnits.setTowerSystem(this.playerTowers);
		this.playerUnits.setStageLevel(1); // Phase 1: LV.1 fixed, Phase 3 will use map-specific levels
		this.playerUnits.setUnitSpawnedCallback((instanceId, defId, isBoss) => {
			if (!isBoss) return;
			const def = UNITS.find((u) => u.id === defId);
			if (!def?.bossBehaviorId) return;
			const behavior = createBossBehavior(def.bossBehaviorId);
			if (!behavior) return;
			const unit = this.playerUnits.getUnit(instanceId);
			if (!unit) return;
			this.bossBehaviors.set(instanceId, behavior);
			behavior.onSpawn(this.buildBossContext(unit.data));
		});
		const rawStageId = this.game.registry.get('selectedStageId') as
			| string
			| undefined;
		const stageId = rawStageId ?? DEFAULT_STAGE_ID;
		this.currentStageId = stageId;
		const stageDef = getStageById(stageId);
		const stageWaves = getWavesForStage(stageDef.waveSetId);
		if (stageWaves.length === 0) {
			throw new Error(
				`[GameScene] Stage "${stageId}" has empty wave definitions`,
			);
		}
		this.currentSlotDef = stageWaves[0];
		const rawStar = this.game.registry.get('selectedStar');
		const selectedStar: StarRating =
			rawStar === 2 || rawStar === 3 ? rawStar : 1;
		this.selectedStar = selectedStar;
		const starMult = getStarDifficultyMult(selectedStar);
		this.playerWaves = new WaveSystem(this.playerUnits, stageWaves, undefined, {
			difficultyHpMult: this.currentMap.difficultyHpMult * starMult.hp,
			armorMult: starMult.armor,
			speedMult: starMult.speed,
			ccResist: starMult.ccResist,
		});
		this.worldGimmick = createWorldGimmick(stageDef.worldId as WorldId, {
			worldId: stageDef.worldId as WorldId,
			map: this.currentMap,
			star: selectedStar,
			eventBus: EventBus,
			getSceneTimeMs: () => this.scaledGameTime,
			getTowers: () => this.playerTowers.getAllTowers(),
		});
		this.worldGimmick?.init();
		this.worldGimmick?.onBattleStart();
		this.playerTowers.setWorldGimmick(this.worldGimmick);

		this.isPhaseAMap = this.currentMap.id === PHASE_A_MAP_ID;
		const isPhaseAMap = this.isPhaseAMap;
		const deckIds = this.game.registry.get('deckIds') as string[] | undefined;
		const deckCards = isPhaseAMap
			? []
			: deckIds && deckIds.length > 0
				? buildDeckCardsSafe(deckIds)
				: DEFAULT_DECK;
		// Phase A bypasses the 4-tower deck entirely. We still construct
		// DeckSystem (with an empty deck) so the rest of the scene keeps the
		// same field shape and cleanup contract; the React HUD detects the
		// empty deck-loaded payload and renders the Phase A summon UI instead.
		this.playerDeck = new DeckSystem(deckCards);

		// Phase A pivot: only active on the dedicated phase_a_long map. Wires
		// SummonPool + MergeSystem to TowerSystem via PhaseAOrchestrator and
		// listens for request-summon-tower / request-merge-towers from the
		// React HUD. Legacy maps continue to use the 4-tower deck flow above.
		if (isPhaseAMap) {
			this.energySystem.disableCap();
			this.phaseAOrchestrator = new PhaseAOrchestrator({
				towerSystem: this.playerTowers,
				initialPool: PHASE_A_INITIAL_POOL,
				energySystem: this.energySystem,
			});
			this.onPhaseASummonReady = (data) => {
				if (!this.isSceneAlive()) return;
				this.selectedTowerId = data.towerId;
				this.clearRangeOverlay();
				EventBus.emit('tower-deselected');
				this.renderPlaceableHighlights();
			};
			EventBus.on('phase-a-summon-ready', this.onPhaseASummonReady);
			this.playerTowers.setModifierFn((id) =>
				this.phaseAOrchestrator!.getModifier(id),
			);
			// Phase A: 1 unit per second (1000ms) instead of default 300ms
			this.playerUnits.setSpawnInterval(1000);
		}

		this.damageNumbers = new DamageNumberSystem(this);
		this.events.on('shutdown', this.cleanup, this);

		this.cacheDecorationData();
		this.renderField(this.playerGrid, false);

		this.hoverGraphics = this.add.graphics();
		this.selectionGraphics = this.add.graphics();
		this.selectionGraphics.setDepth(15);
		this.rangeOverlayGraphics = this.add.graphics();
		this.rangeOverlayGraphics.setDepth(22);
		this.rangeOverlayGraphics.setAlpha(0);

		this.playerUnits.setPaths(getMapPaths(this.currentMap));
		this.renderPath(this.playerGrid);

		this.castleWall = new CastleWallSystem(
			this,
			this.playerGrid,
			this.currentMap,
		);
		this.castleWall.create();
		this.castleWall.update(this.playerHp);

		this.spawnHut = new SpawnHutSystem(this, this.playerGrid, this.currentMap);
		this.spawnHut.create();

		this.setupInput();

		this.onSelectTower = (data) => {
			if (!this.isSceneAlive()) return;
			const card = this.playerDeck.getCardByTowerId(data.towerDefId);
			if (!card) return;
			this.selectedTowerId = data.towerDefId;
			this.clearRangeOverlay();
			EventBus.emit('tower-deselected');
			this.renderPlaceableHighlights();
		};
		this.onClearTowerSelection = () => {
			if (!this.isSceneAlive()) return;
			this.selectedTowerId = null;
			this.selectionGraphics.clear();
			this.clearRangeOverlay();
			EventBus.emit('tower-deselected');
		};

		this.onWaveStartedLifecycle = (data) => {
			if (!this.isSceneAlive()) return;
			this.currentSlotDef = stageWaves[data.slotIndex - 1] ?? stageWaves[0];
			this.currentWaveSlot = data.slotIndex;
			soundGenerator.playWaveStart();
			this.spawnHut.setActive(true);
			this.worldGimmick?.onWaveStart(data.wave);
		};

		this.onBossWarning = () => {
			if (!this.isSceneAlive()) return;
			if (!this.bossPrefetched) {
				this.bossPrefetched = true;
				void this.prefetchBossAssets();
			}
			this.showBossWarningOverlay();
		};

		this.onWaveCompleted = (data: {
			wave: number;
			totalWaves: number;
			slotIndex: number;
			delaySec: number;
			cleared: boolean;
		}) => {
			if (!this.isSceneAlive()) return;
			this.spawnHut.setActive(false);
			// Phase A: no wave-clear energy bonus — energy comes from kills only
			if (data.cleared && !this.isPhaseAMap) {
				this.energySystem.add(ENERGY_PER_WAVE_CLEAR);
			}
			// Phase A: every 10 waves, offer 3 random upgrade cards
			if (
				data.cleared &&
				this.isPhaseAMap &&
				data.slotIndex % 10 === 0 &&
				data.slotIndex > 0 &&
				data.slotIndex < data.totalWaves
			) {
				const choices = pickRandomUpgrades(3);
				EventBus.emit('request-pause');
				EventBus.emit('upgrade-choice-ready', {
					choices: choices.map((c) => ({
						id: c.id,
						name: c.name,
						description: c.description,
						icon: c.icon,
					})),
				});
			}
		};

		this.onSetSpeed = ({ multiplier }) => {
			if (!this.isSceneAlive()) return;
			this.speedMultiplier = multiplier;
			this.time.timeScale = multiplier;
			this.anims.globalTimeScale = multiplier;
		};

		this.onSellTower = ({ col, row }) => {
			if (!this.isSceneAlive()) return;
			const result = this.playerTowers.sellTower(col, row);
			if (result.success) {
				this.energySystem.add(result.refund);
				EventBus.emit('energy-changed', {
					energy: this.energySystem.getEnergy(),
				});
				EventBus.emit('tower-sold', { col, row, refund: result.refund });
				EventBus.emit('player-tower-count', {
					count: this.playerTowers.getTowers().length,
				});
				this.clearRangeOverlay();
				EventBus.emit('tower-deselected');
			}
		};

		this.onEnterMoveMode = ({ fromCol, fromRow }) => {
			if (!this.isSceneAlive()) return;
			this.movePending = { fromCol, fromRow };
			this.selectedTowerId = null;
			this.selectionGraphics.clear();
			this.clearRangeOverlay();
			this.renderPlaceableHighlights();
		};

		this.onMoveTower = ({ fromCol, fromRow, toCol, toRow }) => {
			if (!this.isSceneAlive()) return;
			const ok = this.playerTowers.moveTower(fromCol, fromRow, toCol, toRow);
			if (ok) {
				EventBus.emit('tower-moved', { fromCol, fromRow, toCol, toRow });
				EventBus.emit('tower-deselected');
				this.clearRangeOverlay();
				this.selectionGraphics.clear();
				this.playerUnits.setPaths(getMapPaths(this.currentMap));
				this.renderPath(this.playerGrid);
			} else {
				EventBus.emit('move-failed', { reason: 'invalid-tile' });
			}
		};

		this.onPause = () => {
			if (!this.isSceneAlive()) return;
			this.scene.pause();
		};
		this.onResume = () => {
			if (!this.isSceneAlive()) return;
			this.scene.resume();
		};

		this.onFurnaceCycle = ({ active, tiles }) => {
			if (!this.isSceneAlive()) return;

			if (!active) {
				// OFF transition: fadeOut 300ms then destroy
				for (const overlay of this.furnaceTintOverlays) {
					this.tweens.add({
						targets: overlay,
						alpha: 0,
						duration: 300,
						ease: 'Quad.easeIn',
						onComplete: () => overlay.destroy(),
					});
				}
				this.furnaceTintOverlays = [];
				return;
			}

			// Clear any leftover overlays before creating new ones
			for (const overlay of this.furnaceTintOverlays) overlay.destroy();
			this.furnaceTintOverlays = [];

			for (const tile of tiles) {
				const world = this.playerGrid.gridToWorld(tile.x, tile.y);
				const size = this.playerGrid.orthoTile;
				const rect = this.add.rectangle(
					world.x,
					world.y,
					size,
					size,
					0xcc6600,
					0.3,
				);
				rect.setDepth(0.5);
				this.furnaceTintOverlays.push(rect);
				this.tweens.add({
					targets: rect,
					alpha: { from: 0, to: 0.3 },
					duration: 200,
					ease: 'Quad.easeOut',
				});
			}
		};

		this.onArcaneBurst = ({ area, stunMs: _stunMs }) => {
			if (!this.isSceneAlive()) return;
			const topLeft = this.playerGrid.gridToWorld(area.startX, area.startY);
			const bottomRight = this.playerGrid.gridToWorld(area.endX, area.endY);
			const tileSize = this.playerGrid.orthoTile;
			const cx = (topLeft.x + bottomRight.x) / 2;
			const cy = (topLeft.y + bottomRight.y) / 2;
			const w = bottomRight.x - topLeft.x + tileSize;
			const h = bottomRight.y - topLeft.y + tileSize;
			const flash = this.add.rectangle(cx, cy, w, h, 0x8040c0, 0.4);
			flash.setDepth(0.9);
			this.tweens.add({
				targets: flash,
				alpha: 0,
				duration: 600,
				ease: 'Quad.easeOut',
				onComplete: () => flash.destroy(),
			});
		};

		EventBus.on('request-select-tower', this.onSelectTower);
		EventBus.on('request-clear-tower-selection', this.onClearTowerSelection);
		EventBus.on('request-sell-tower', this.onSellTower);
		EventBus.on('request-move-tower', this.onMoveTower);
		EventBus.on('request-enter-move-mode', this.onEnterMoveMode);
		EventBus.on('request-pause', this.onPause);
		EventBus.on('request-resume', this.onResume);
		EventBus.on('wave-started', this.onWaveStartedLifecycle);
		EventBus.on('boss-warning', this.onBossWarning);
		EventBus.on('wave-completed', this.onWaveCompleted);
		EventBus.on('request-set-speed', this.onSetSpeed);
		EventBus.on('furnace-cycle', this.onFurnaceCycle);
		EventBus.on('arcane-burst', this.onArcaneBurst);

		// Phase A upgrade flow: resume game after player picks an upgrade
		if (isPhaseAMap) {
			this.onUpgradeApplied = () => {
				if (!this.isSceneAlive()) return;
				EventBus.emit('request-resume');
			};
			EventBus.on('upgrade-applied', this.onUpgradeApplied);
		}

		EventBus.emit('game-ready');
		EventBus.emit('energy-changed', { energy: this.energySystem.getEnergy() });
		EventBus.emit('deck-loaded', { cards: this.playerDeck.getCards() });
		EventBus.emit('current-scene-ready', this);

		void this.prefetchOptionalAssets();
		const tutorialCompleted = this.game.registry.get('tutorialCompleted') as
			| boolean
			| undefined;
		if (!tutorialCompleted) {
			this.tutorial = new TutorialSystem(this);
			void this.tutorial.start();
		}
		this.playerWaves.start();
	}

	private cacheDecorationData(): void {
		const tilemap = this.make.tilemap({ key: this.currentMap.tilemapKey });
		const decorLayer = tilemap.getObjectLayer?.('decorations');
		if (!decorLayer) {
			this.decorationTiles = [];
			return;
		}

		this.decorationTiles = decorLayer.objects
			.map((object) => {
				const properties = new Map(
					(object.properties ?? []).map(
						(property: { name: string; value: unknown }) => [
							property.name,
							property.value,
						],
					),
				);
				const assetKey = properties.get('assetKey');
				const kind = properties.get('kind');
				const variant = properties.get('variant');

				if (
					typeof assetKey !== 'string' ||
					typeof kind !== 'string' ||
					typeof variant !== 'string'
				) {
					return null;
				}

				const objectX = typeof object.x === 'number' ? object.x : 0;
				const objectY = typeof object.y === 'number' ? object.y : 0;

				return {
					x: Math.round(objectX / this.currentMap.tileSize),
					y: Math.round(objectY / this.currentMap.tileSize),
					assetKey,
					kind: kind as TinySwordsDecorationKind,
					variant,
				};
			})
			.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
	}

	private renderFieldPathOverlay(grid: GridManager, dark: boolean): void {
		const tile = grid.orthoTile;
		const allCells = getAllPathCells(this.currentMap);
		const cellSet = new Set(allCells.map((p) => `${p.x},${p.y}`));

		for (const point of allCells) {
			// NSEW bitmask: N=1, E=2, S=4, W=8
			let bitmask = 0;
			if (cellSet.has(`${point.x},${point.y - 1}`)) bitmask |= 1; // N
			if (cellSet.has(`${point.x + 1},${point.y}`)) bitmask |= 2; // E
			if (cellSet.has(`${point.x},${point.y + 1}`)) bitmask |= 4; // S
			if (cellSet.has(`${point.x - 1},${point.y}`)) bitmask |= 8; // W

			const world = grid.gridToWorld(point.x, point.y);
			const sprite = this.add.sprite(
				world.x,
				world.y,
				TINY_SWORDS_PATH_TILESET_KEY,
				bitmask,
			);
			sprite.setDisplaySize(tile, tile);
			sprite.setOrigin(0.5, 0.5);
			sprite.setDepth(1);

			if (dark) {
				sprite.setTint(0x5c6585);
			}
		}
	}

	private renderField(grid: GridManager, dark: boolean): void {
		const theme = getMapTheme(this.currentMap.id);
		const canvasW = this.scale.width;
		const canvasH = this.scale.height;

		// Seamless grass background — single TileSprite covers entire canvas
		if (typeof this.add.tileSprite === 'function') {
			const grassBg = this.add.tileSprite(
				canvasW / 2,
				canvasH / 2,
				canvasW,
				canvasH,
				GRASS_SEAMLESS_KEY,
			);
			grassBg.setDepth(0);
			grassBg.setScrollFactor(0);
			if (dark) {
				grassBg.setTint(0x6b7899);
			} else if (theme.groundTint !== 0xffffff) {
				grassBg.setTint(theme.groundTint);
			}
		} else {
			// Fallback for test environments without tileSprite — noop
		}

		this.renderFieldPathOverlay(grid, dark);
		this.renderDecorations(grid, dark);
	}

	private renderDecorations(grid: GridManager, dark: boolean): void {
		if (!this.decorationTiles) return;
		const theme = getMapTheme(this.currentMap.id);

		for (const { x, y, assetKey } of this.decorationTiles) {
			const asset = TINY_SWORDS_DECORATION_BY_KEY[assetKey];
			if (!asset) continue;

			const world = grid.gridToWorld(x, y);
			const sprite = this.add.sprite(world.x, world.y, assetKey, 0);
			sprite.setDisplaySize(asset.renderWidth, asset.renderHeight);
			sprite.setOrigin(0.5, asset.originY);
			sprite.setDepth(3 + x + y + asset.depthOffset);
			if (dark) {
				sprite.setTint(0x66758f);
			} else if (theme.decorTint !== 0xffffff) {
				sprite.setTint(theme.decorTint);
			}
		}
	}

	private renderPath(grid: GridManager): void {
		if (!this.pathGraphics) this.pathGraphics = this.add.graphics();
		const graphics = this.pathGraphics;
		graphics.clear();

		const theme = getMapTheme(this.currentMap.id);
		const lineColor = theme.pathLineColor;
		const paths = getMapPaths(this.currentMap);

		for (const path of paths) {
			if (path.length < 2) continue;

			graphics.lineStyle(4, lineColor, 0.08);
			graphics.beginPath();
			const first = grid.gridToWorld(path[0].x, path[0].y);
			graphics.moveTo(first.x, first.y);
			for (let i = 1; i < path.length; i++) {
				const pt = grid.gridToWorld(path[i].x, path[i].y);
				graphics.lineTo(pt.x, pt.y);
			}
			graphics.strokePath();

			graphics.fillStyle(lineColor, 0.4);
			for (let i = 0; i < path.length - 1; i++) {
				const a = grid.gridToWorld(path[i].x, path[i].y);
				const b = grid.gridToWorld(path[i + 1].x, path[i + 1].y);
				for (let s = 0; s < 4; s += 2) {
					const t = s / 4;
					graphics.fillCircle(
						a.x + (b.x - a.x) * t,
						a.y + (b.y - a.y) * t,
						1.5,
					);
				}
			}
			const last = grid.gridToWorld(
				path[path.length - 1].x,
				path[path.length - 1].y,
			);
			graphics.fillCircle(last.x, last.y, 1.5);
		}
	}

	private setupInput(): void {
		this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
			const gridPos = this.playerGrid.worldToGrid(
				pointer.worldX,
				pointer.worldY,
			);
			this.hoverGraphics.clear();

			if (this.playerGrid.isInBounds(gridPos.x, gridPos.y)) {
				const canPlace = this.playerGrid.canPlaceTower(gridPos.x, gridPos.y);
				this.playerGrid.fillTileRect(
					this.hoverGraphics,
					gridPos.x,
					gridPos.y,
					canPlace ? PHASER_COLORS.accent : PHASER_COLORS.danger,
					0.2,
				);
			}
		});

		this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
			const gridPos = this.playerGrid.worldToGrid(
				pointer.worldX,
				pointer.worldY,
			);

			if (this.gameOver) return;
			if (!this.playerGrid.isInBounds(gridPos.x, gridPos.y)) return;

			if (this.movePending) {
				const { fromCol, fromRow } = this.movePending;
				this.movePending = null;
				this.selectionGraphics.clear();
				const ok = this.playerTowers.moveTower(
					fromCol,
					fromRow,
					gridPos.x,
					gridPos.y,
				);
				if (ok) {
					EventBus.emit('tower-moved', {
						fromCol,
						fromRow,
						toCol: gridPos.x,
						toRow: gridPos.y,
					});
					EventBus.emit('tower-deselected');
					this.clearRangeOverlay();
					this.playerUnits.setPaths(getMapPaths(this.currentMap));
					this.renderPath(this.playerGrid);
				} else {
					EventBus.emit('move-failed', { reason: 'invalid-tile' });
				}
				return;
			}

			if (this.selectedTowerId) {
				this.handlePlaceTower(gridPos.x, gridPos.y, this.selectedTowerId);
				return;
			}

			const tower = this.playerTowers.getTowerAt(gridPos.x, gridPos.y);
			if (tower) {
				const refund = TowerSystem.calcRefund(tower.def.cost);
				EventBus.emit('tower-selected', {
					towerDefId: tower.def.id,
					towerName: tower.def.name,
					col: gridPos.x,
					row: gridPos.y,
					refund,
					grade: tower.grade,
				});
				this.drawRangeOverlay(gridPos.x, gridPos.y, tower.def.stats.range);
			} else {
				EventBus.emit('tower-deselected');
				this.clearRangeOverlay();
			}
		});
	}

	private drawRangeOverlay(col: number, row: number, range: number): void {
		this.rangeOverlayGraphics.clear();
		this.tweens.killTweensOf(this.rangeOverlayGraphics);
		const worldPos = this.playerGrid.gridToWorld(col, row);
		const radius = range * this.playerGrid.tileSize;

		this.rangeOverlayGraphics.fillStyle(PHASER_COLORS.gold, 0.08);
		this.rangeOverlayGraphics.fillCircle(worldPos.x, worldPos.y, radius);
		this.rangeOverlayGraphics.lineStyle(2, PHASER_COLORS.gold, 0.6);
		this.rangeOverlayGraphics.strokeCircle(worldPos.x, worldPos.y, radius);

		this.rangeOverlayGraphics.setAlpha(0);
		this.tweens.add({
			targets: this.rangeOverlayGraphics,
			alpha: 1,
			duration: 120,
			ease: 'Quad.easeOut',
		});
	}

	private clearRangeOverlay(): void {
		this.tweens.killTweensOf(this.rangeOverlayGraphics);
		this.tweens.add({
			targets: this.rangeOverlayGraphics,
			alpha: 0,
			duration: 60,
			ease: 'Quad.easeIn',
			onComplete: () => this.rangeOverlayGraphics.clear(),
		});
	}

	private renderPlaceableHighlights(): void {
		this.selectionGraphics.clear();
		if (!this.selectedTowerId) return;

		for (let y = 0; y < this.currentMap.height; y++) {
			for (let x = 0; x < this.currentMap.width; x++) {
				if (this.playerGrid.canPlaceTower(x, y)) {
					this.playerGrid.fillTileRect(
						this.selectionGraphics,
						x,
						y,
						PHASER_COLORS.accent,
						0.12,
					);
				}
			}
		}
	}

	private emitGameOver(payload: {
		result: 'victory' | 'defeat';
		reason: 'all_waves_cleared' | 'base_hp_depleted';
		finalSlot: number;
	}): void {
		if (this.gameOver) return;
		this.gameOver = true;
		this.rangeOverlayGraphics.clear();
		EventBus.off('wave-started', this.onWaveStartedLifecycle);
		EventBus.off('boss-warning', this.onBossWarning);
		EventBus.off('wave-completed', this.onWaveCompleted);
		EventBus.off('request-set-speed', this.onSetSpeed);
		EventBus.off('furnace-cycle', this.onFurnaceCycle);
		EventBus.off('arcane-burst', this.onArcaneBurst);
		for (const overlay of this.furnaceTintOverlays) overlay.destroy();
		this.furnaceTintOverlays = [];
		const towersPlaced = this.playerTowers.getTowers().length;
		this.playerTowers.destroy();

		const starCleared =
			payload.result === 'victory'
				? checkStarClear(this.selectedStar, this.playerHp, INITIAL_PLAYER_HP)
				: false;

		const mapId = this.currentMap.id;
		EventBus.emit('game-over', {
			...payload,
			mapId,
			selectedStar: this.selectedStar,
			starCleared,
			hpRemaining: Math.max(0, this.playerHp),
			stats: {
				wavesCleared:
					payload.result === 'victory'
						? payload.finalSlot
						: Math.max(0, payload.finalSlot - 1),
				totalWaves: getTotalWavesForStage(this.currentStageId),
				towersPlaced,
				timeSurvivedSec: Math.round(this.playerWaves.getElapsedMs() / 1000),
				goldEarned: this.goldEarned * this.rewardMultiplier,
				rewardMultiplier: this.rewardMultiplier,
			},
		});
	}

	private handlePlaceTower(
		gridX: number,
		gridY: number,
		towerDefId: string,
	): void {
		// Phase A: orchestrator handles energy + placement directly
		if (this.phaseAOrchestrator?.hasPendingSummon()) {
			this.phaseAOrchestrator.completePlacement(gridX, gridY);
			this.selectedTowerId = null;
			this.selectionGraphics.clear();
			this.clearRangeOverlay();
			return;
		}

		const card = this.playerDeck.getCardByTowerId(towerDefId);
		if (!card) return;

		const energyCost = card.energyCost;
		if (!this.energySystem.canAfford(energyCost)) {
			EventBus.emit('tower-placed', {
				col: gridX,
				row: gridY,
				towerId: towerDefId,
				success: false,
				reason: 'insufficient_energy',
			});
			return;
		}

		const guardFailure = getPlacementGuardFailure({
			phase: this.playerWaves.getPhase(),
		});

		if (guardFailure) {
			EventBus.emit('tower-placed', {
				col: gridX,
				row: gridY,
				towerId: towerDefId,
				success: false,
				reason: guardFailure,
			});
			return;
		}

		const placed = this.playerTowers.placeTower(gridX, gridY, towerDefId);
		if (!placed.success) {
			EventBus.emit('tower-placed', {
				col: gridX,
				row: gridY,
				towerId: towerDefId,
				success: false,
				reason: placed.reason,
			});
			return;
		}

		this.energySystem.spend(energyCost);
		this.selectedTowerId = null;
		this.selectionGraphics.clear();
		this.clearRangeOverlay();
		EventBus.emit('tower-deselected');
		EventBus.emit('tower-placed', {
			col: gridX,
			row: gridY,
			towerId: towerDefId,
			success: true,
			energySpent: energyCost,
		});
		EventBus.emit('player-tower-count', {
			count: this.playerTowers.getTowers().length,
		});
		this.playerUnits.setPaths(getMapPaths(this.currentMap));
		this.renderPath(this.playerGrid);
	}

	private processCombatField(
		towerSystem: Pick<TowerSystem, 'update'>,
		unitSystem: Pick<
			UnitSystem,
			| 'applyDamage'
			| 'applySlow'
			| 'applyStun'
			| 'getUnitPositions'
			| 'getUnitWorldPos'
			| 'update'
		>,
		time: number,
		delta: number,
		onKill: () => void,
		onDamageResult?: (
			unitId: string,
			result: ReturnType<UnitSystem['applyDamage']>,
		) => void,
	): { id: string; isBoss: boolean }[] {
		const unitPositions = unitSystem.getUnitPositions();
		const damageEvents = towerSystem.update(time, delta, unitPositions);

		for (const evt of damageEvents) {
			if (evt.damage > 0) {
				const pos = unitSystem.getUnitWorldPos(evt.unitId);
				const result = unitSystem.applyDamage(
					evt.unitId,
					evt.damage,
					evt.armorPierce,
				);
				if (pos && result) {
					// hit: show number. miss: show MISS. absorbed/invulnerable: silent.
					if (result.outcome === 'hit') {
						this.damageNumbers.show(pos.x, pos.y, result.actualDamage);
					} else if (result.outcome === 'miss') {
						this.damageNumbers.showMiss(pos.x, pos.y);
					}
				}
				onDamageResult?.(evt.unitId, result);
				if (result?.killed) {
					this.goldEarned += result.bounty;
					onKill();
				}
			}
			if (evt.slow) {
				const behavior = this.bossBehaviors.get(evt.unitId);
				if (!behavior?.isCcImmune()) {
					unitSystem.applySlow(evt.unitId, evt.slow.factor, evt.slow.duration);
				}
			}
			if (evt.stun) {
				const behavior = this.bossBehaviors.get(evt.unitId);
				if (!behavior?.isCcImmune()) {
					unitSystem.applyStun(evt.unitId, evt.stun.duration);
				}
			}
		}

		const { reachedExit } = unitSystem.update(time, delta);
		return reachedExit;
	}

	update(_time: number, delta: number) {
		if (this.gameOver) return;
		const scaledDelta = delta * this.speedMultiplier;
		this.scaledGameTime += scaledDelta;

		this.worldGimmick?.onTick(scaledDelta);
		this.playerWaves.update(scaledDelta, this.playerUnits.getActiveCount());
		const phase = this.playerWaves.getPhase();
		// Phase A: energy from kills only, no time-based regen
		if (phase !== 'prep' && !this.isPhaseAMap) {
			this.energySystem.update(scaledDelta / 1000);
		}
		// Phase A: energy_regen upgrade tick
		if (this.isPhaseAMap && this.phaseAOrchestrator) {
			this.phaseAOrchestrator.tickEnergyRegen(scaledDelta / 1000);
		}

		// Tick boss behaviors before combat so they can react with fresh sceneTime
		for (const [instanceId, behavior] of this.bossBehaviors) {
			const unit = this.playerUnits.getUnit(instanceId);
			if (!unit || unit.pendingDestroy) {
				behavior.destroy();
				this.bossBehaviors.delete(instanceId);
				continue;
			}
			behavior.onTick(this.buildBossContext(unit.data), scaledDelta);
		}

		const playerExits = this.processCombatField(
			this.playerTowers,
			this.playerUnits,
			this.scaledGameTime,
			scaledDelta,
			() => {
				soundGenerator.playUnitDeath();
				// Phase A: energy from kills, not time. +1 per kill, x2 on every 5th wave
				if (this.isPhaseAMap) {
					const killEnergyBonus =
						this.phaseAOrchestrator?.getUpgradeStacks('kill_energy') ?? 0;
					const bonus =
						(this.currentWaveSlot % 5 === 0 ? 2 : 1) + killEnergyBonus;
					this.energySystem.add(bonus);
				}
			},
			(unitId, result) => {
				if (!result) return;
				const behavior = this.bossBehaviors.get(unitId);
				if (!behavior) return;
				const unit = this.playerUnits.getUnit(unitId);
				if (result.killed) {
					behavior.destroy();
					this.bossBehaviors.delete(unitId);
					return;
				}
				if (unit) {
					const hpRatio = unit.data.hp / unit.maxHp;
					behavior.onDamageTaken(this.buildBossContext(unit.data), hpRatio);
				}
			},
		);

		// Wave timer tick — throttled to 1 emit/sec to avoid event spam
		const remainingSec = this.playerWaves.getWaveRemainingSec();
		if (remainingSec >= 0 && remainingSec !== this.lastTimerTickSec) {
			this.lastTimerTickSec = remainingSec;
			EventBus.emit('wave-timer-tick', {
				remainingSec,
				wave: this.currentWaveSlot,
				totalWaves: this.playerWaves.getMaxWaves(),
			});
		}

		this.damageNumbers.update(_time, delta);

		for (const exit of playerExits) {
			this.playerHp = Math.max(0, this.playerHp - 1);
			EventBus.emit('player-damaged', {
				playerId: 'local',
				damage: 1,
				remainingHp: this.playerHp,
			});

			// Boss leak = instant defeat (isBoss is only true for bossBehaviorId units)
			if (exit.isBoss) {
				EventBus.emit('base-hp-changed', {
					hp: 0,
					maxHp: INITIAL_PLAYER_HP,
					laneIndex: 0,
				});
				this.castleWall.update(0);
				this.castleWall.onHit();
				this.emitGameOver({
					result: 'defeat',
					reason: 'base_hp_depleted',
					finalSlot: this.currentSlotDef.slotIndex,
				});
				return;
			}

			if (this.playerHp <= 0) {
				EventBus.emit('base-hp-changed', {
					hp: 0,
					maxHp: INITIAL_PLAYER_HP,
					laneIndex: 0,
				});
				this.castleWall.update(0);
				this.castleWall.onHit();
				this.emitGameOver({
					result: 'defeat',
					reason: 'base_hp_depleted',
					finalSlot: this.currentSlotDef.slotIndex,
				});
				return;
			}
		}

		if (playerExits.length > 0) {
			EventBus.emit('base-hp-changed', {
				hp: this.playerHp,
				maxHp: INITIAL_PLAYER_HP,
				laneIndex: 0,
			});
			this.castleWall.update(this.playerHp);
			this.castleWall.onHit();
		}

		if (
			this.playerWaves.getPhase() === 'ended' &&
			!this.playerUnits.hasActiveUnits() &&
			!this.playerUnits.hasQueuedUnits()
		) {
			this.emitGameOver({
				result: 'victory',
				reason: 'all_waves_cleared',
				finalSlot: this.currentSlotDef.slotIndex,
			});
		}
	}

	private buildBossContext(
		boss: ActiveUnit,
	): import('../systems/boss-ai/types').BossContext {
		return {
			boss,
			sceneTimeMs: this.scaledGameTime,
			spawnUnit: (unitId, pos, metadata) => {
				this.playerUnits.spawnAdditionalUnit(unitId, pos, metadata);
			},
			disableTower: (towerId, untilMs) => {
				if (towerId === '__random__') {
					const towers = this.playerTowers.getAllTowers();
					if (towers.length === 0) return;
					const target = towers[Math.floor(Math.random() * towers.length)];
					this.playerTowers.disableTower(target.data.instanceId, untilMs);
				} else {
					this.playerTowers.disableTower(towerId, untilMs);
				}
			},
		};
	}

	private cleanup() {
		if (this.isCleaningUp) return;
		this.isCleaningUp = true;

		EventBus.off('request-select-tower', this.onSelectTower);
		EventBus.off('request-clear-tower-selection', this.onClearTowerSelection);
		EventBus.off('request-sell-tower', this.onSellTower);
		EventBus.off('request-move-tower', this.onMoveTower);
		EventBus.off('request-enter-move-mode', this.onEnterMoveMode);
		EventBus.off('request-pause', this.onPause);
		EventBus.off('request-resume', this.onResume);
		EventBus.off('wave-started', this.onWaveStartedLifecycle);
		EventBus.off('boss-warning', this.onBossWarning);
		EventBus.off('wave-completed', this.onWaveCompleted);
		EventBus.off('request-set-speed', this.onSetSpeed);
		EventBus.off('furnace-cycle', this.onFurnaceCycle);
		EventBus.off('arcane-burst', this.onArcaneBurst);
		if (this.onUpgradeApplied) {
			EventBus.off('upgrade-applied', this.onUpgradeApplied);
		}
		if (this.onPhaseASummonReady) {
			EventBus.off('phase-a-summon-ready', this.onPhaseASummonReady);
		}
		this.phaseAOrchestrator?.destroy();
		this.phaseAOrchestrator = undefined;
		soundGenerator.reset();

		for (const overlay of this.furnaceTintOverlays) overlay.destroy();
		this.furnaceTintOverlays = [];

		this.tutorial?.destroy();
		this.tutorial = undefined;

		this.worldGimmick?.destroy();
		this.worldGimmick = null;

		this.castleWall?.destroy();
		this.spawnHut?.destroy();

		this.selectionGraphics.clear();
		this.rangeOverlayGraphics.clear();
		this.hoverGraphics?.destroy();
		this.pathGraphics?.destroy();
		this.damageNumbers.destroy();
		this.playerTowers.destroy();
		for (const b of this.bossBehaviors.values()) b.destroy();
		this.bossBehaviors.clear();
		this.playerUnits.destroy();
		this.playerWaves.destroy();
		this.playerDeck.reset();
		this.energySystem.reset();

		unloadAssetSections(
			this,
			this.optionalAssetManifest,
			OPTIONAL_ASSET_SECTIONS,
		);
		if (this.bossPrefetched) {
			unloadAssetSections(this, this.optionalAssetManifest, ['boss']);
		}
	}

	private async prefetchBossAssets(): Promise<void> {
		await prefetchAssetSections(
			this,
			this.optionalAssetManifest,
			['boss'],
			shouldUseWebPTextures(),
		);
		if (!this.isCleaningUp) {
			registerOptionalCombatAnimations(this, this.optionalAssetManifest);
		}
	}

	private showBossWarningOverlay(): void {
		const shakeEnabled = this.game.registry.get('screenShake') !== false;
		if (shakeEnabled) {
			this.cameras.main.shake(300, 0.005);
		}
		const overlay = this.add.rectangle(
			this.scale.width / 2,
			this.scale.height / 2,
			this.scale.width,
			this.scale.height,
			PHASER_COLORS.danger,
			0.15,
		);
		overlay.setDepth(90);
		this.tweens.add({
			targets: overlay,
			alpha: 0,
			duration: 2000,
			onComplete: () => overlay.destroy(),
		});
	}

	private async prefetchOptionalAssets(): Promise<void> {
		await prefetchAssetSections(
			this,
			this.optionalAssetManifest,
			OPTIONAL_ASSET_SECTIONS,
			shouldUseWebPTextures(),
		);
		if (this.isCleaningUp) {
			unloadAssetSections(
				this,
				this.optionalAssetManifest,
				OPTIONAL_ASSET_SECTIONS,
			);
			return;
		}
		registerOptionalCombatAnimations(this, this.optionalAssetManifest);
	}
}

function getEmptyAssetManifest(): AssetManifest {
	return {
		generated: '',
		assets: [],
	};
}
