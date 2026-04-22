import {
	type ActiveUnit,
	type AssetManifest,
	ENERGY_PER_BOSS_FAST_CLEAR,
	ENERGY_PER_BOSS_KILL,
	ENERGY_PER_KILL,
	ENERGY_PER_WAVE_CLEAR,
	FAST_CLEAR_THRESHOLD_MS,
	generatePhaseAWaves,
	getAllPathCells,
	getMapById,
	getMapPaths,
	getSpawnExitPairs,
	INITIAL_PLAYER_HP,
	type MapLayout,
	MockAdService,
	PHASE_A_MAP_ID,
	PHASER_COLORS,
	UNITS,
	type WaveDef,
	type WavePhase,
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
	DIRT_SEAMLESS_KEY,
	GRASS_PLATFORM_FRAMES,
	PLATFORM_LIFT,
	TINY_SWORDS_DECORATION_BY_KEY,
	TINY_SWORDS_PRIMARY_TILESET,
	type TinySwordsDecorationKind,
} from '../fieldAssets';
import { collectVisualLayers } from '../rendering/tiledFieldRenderer';

/** Per-map theme palette for ground tiles, path overlay, and decorations */
interface MapTheme {
	groundTint: number;
	decorTint: number;
	pathColor: number;
	pathLineColor: number;
}

const MAP_THEMES: Record<string, MapTheme> = {
	// Phase 7.5: warm sandstone palette tuned for the 9×18 Phase A board.
	// Path/grid lines run at very low alpha so towers and obstacles stay
	// the visual focus instead of tile chrome.
	phase_a_long: {
		groundTint: 0xc8b89a,
		decorTint: 0xc8b89a,
		pathColor: 0x7a6040,
		pathLineColor: 0xb8956a,
	},
};

function getMapTheme(mapId: string): MapTheme {
	return MAP_THEMES[mapId] ?? MAP_THEMES.phase_a_long;
}

import { getPlacementGuardFailure } from '../placementRules';
import { createBossBehavior } from '../systems/boss-ai/registry';
import type { BossBehavior } from '../systems/boss-ai/types';
import { CastleWallSystem } from '../systems/CastleWallSystem';
import '../systems/boss-ai/orcWarlord';
import '../systems/boss-ai/forgeMaster';
import '../systems/boss-ai/corruptedArchmage';
import '../systems/boss-ai/dragon';
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

// Phase A summon pool (Task 1.4 spec): tier-1 only, one per base family
// (archer, siege, frost, stun). Higher tiers are reached through merge and
// the in-game gacha (tier2/3/4 buttons). Mirrors DEFAULT_POOL in
// @gld/shared/data/summonPool.ts — keep the two in sync.
const PHASE_A_INITIAL_POOL: readonly string[] = [
	'archer', // archer T1
	'nova_cannon', // siege T1
	'emp', // frost T1
	'shield', // stun T1
];

export class GameScene extends Phaser.Scene {
	private playerGrid!: GridManager;
	private playerPathfinding!: PathfindingSystem;
	private playerTowers!: TowerSystem;
	private playerUnits!: UnitSystem;
	private playerWaves!: WaveSystem;
	private playerDeck!: DeckSystem;
	private phaseAOrchestrator?: PhaseAOrchestrator;
	private onPhaseASummonReady?: (data: {
		towerId: string;
		source: 'summon' | 'gacha';
	}) => void;
	private onUpgradeApplied?: () => void;
	private onGameResumed?: (data: { livesRestored: number }) => void;
	private castleWall!: CastleWallSystem;
	private spawnHut!: SpawnHutSystem;
	private damageNumbers!: DamageNumberSystem;
	private playerHp = INITIAL_PLAYER_HP;
	private energySystem = new EnergySystem();
	private selectedTowerId: string | null = null;
	private gameOver = false;
	private goldEarned = 0;
	private isPhaseAMap = false;
	private currentWaveSlot = 1;
	private lastTimerTickSec = -1;
	private currentSlotDef!: WaveDef;

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
		phase: WavePhase;
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
		// Phase 7: scenario maps purged. Phase A is the only mode; ignore any
		// non-Phase-A registry mapId and pin to PHASE_A_MAP_ID.
		const mapId =
			data?.mapId ??
			(this.game.registry.get('mapId') as string | undefined) ??
			PHASE_A_MAP_ID;
		this.currentMap = getMapById(
			mapId === PHASE_A_MAP_ID ? mapId : PHASE_A_MAP_ID,
		);
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
		// Phase 9: inject meta progression's global atk% via the scene
		// registry. `PhaserGame.tsx` sets 'meta:atkPct' from the web-shell
		// metaProgressStore before the scene starts; default to 0 if absent
		// (tests, legacy boots). phaser-game package MUST NOT import from
		// web-shell — the registry/event bridge is the only allowed channel.
		const metaAtkPct =
			(this.game.registry.get('meta:atkPct') as number | undefined) ?? 0;
		this.playerTowers.setGlobalModifiers({ atkPct: metaAtkPct });
		this.playerUnits = new UnitSystem(this, this.playerGrid);
		this.playerUnits.setTowerSystem(this.playerTowers);
		this.playerUnits.setStageLevel(1); // Phase 1: LV.1 fixed, Phase 3 will use map-specific levels
		this.playerUnits.setUnitSpawnedCallback((instanceId, defId, isBoss) => {
			if (!isBoss) return;
			// Record boss spawn timestamp for fast-clear energy bonus ([F18]).
			this.playerWaves?.markBossSpawned();
			const def = UNITS.find((u) => u.id === defId);
			if (!def?.bossBehaviorId) return;
			const behavior = createBossBehavior(def.bossBehaviorId);
			if (!behavior) return;
			const unit = this.playerUnits.getUnit(instanceId);
			if (!unit) return;
			this.bossBehaviors.set(instanceId, behavior);
			behavior.onSpawn(this.buildBossContext(unit.data));
		});
		const stageWaves = generatePhaseAWaves(50);
		this.currentSlotDef = stageWaves[0];
		this.playerWaves = new WaveSystem(this.playerUnits, stageWaves);
		this.isPhaseAMap = this.currentMap.id === PHASE_A_MAP_ID;
		const isPhaseAMap = this.isPhaseAMap;
		// Phase A bypasses the 4-tower deck entirely; we still construct
		// DeckSystem with an empty deck so the rest of the scene keeps the
		// same field shape and cleanup contract. The React HUD detects the
		// empty deck-loaded payload and renders the Phase A summon UI instead.
		this.playerDeck = new DeckSystem([]);

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
				// Phase 10 BM stub. Real provider swaps in behind the same
				// `AdService` contract without touching this call site.
				adService: MockAdService,
			});
			this.onPhaseASummonReady = (data) => {
				if (!this.isSceneAlive()) return;
				this.selectedTowerId = data.towerId;
				this.showBuildableZone();
				this.clearRangeOverlay();
				EventBus.emit('tower-deselected');
				this.renderPlaceableHighlights();
			};
			EventBus.on('phase-a-summon-ready', this.onPhaseASummonReady);
			this.playerTowers.setModifierFn((id) =>
				this.phaseAOrchestrator!.getModifier(id),
			);
			this.playerTowers.setFamilyDamageFn((family, towerId) =>
				this.phaseAOrchestrator!.getFamilyDamageMultiplier(family, towerId),
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
		this.renderObstacles();
		this.renderAmbientDecorations();

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
			this.showBuildableZone();
			this.clearRangeOverlay();
			EventBus.emit('tower-deselected');
			this.renderPlaceableHighlights();
		};
		this.onClearTowerSelection = () => {
			if (!this.isSceneAlive()) return;
			this.selectedTowerId = null;
			this.hideBuildableZone();
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
			phase: WavePhase;
		}) => {
			if (!this.isSceneAlive()) return;
			this.spawnHut.setActive(false);
			// Phase A: flat +ENERGY_PER_WAVE_CLEAR at the end of every wave
			// (natural clear + timer-forced alike) to pace summon/gacha cadence.
			// Final wave is skipped because the run is already ending.
			if (this.isPhaseAMap && data.slotIndex < data.totalWaves) {
				this.energySystem.add(ENERGY_PER_WAVE_CLEAR);
			}
			// Phase 4 Task 4.2: roguelike pick now triggers on BOSS-phase clears
			// only. WaveSystem tags each `wave-completed` with the phase that
			// just ended (Task 4.0 [F7]); we bypass the pick if the wave was
			// forced-cleared by the timer (`cleared === false`) or if it was
			// the final wave (defeat/victory HUD owns the run-end flow).
			if (
				data.cleared &&
				this.isPhaseAMap &&
				data.phase === 'boss' &&
				data.slotIndex < data.totalWaves &&
				this.phaseAOrchestrator
			) {
				EventBus.emit('request-pause');
				this.phaseAOrchestrator.requestUpgradePick(3);
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
			this.hideBuildableZone();
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

		// Phase 6: furnace/arcane gimmick VFX removed with world-gimmicks.

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

		// Phase A upgrade flow: resume game after player picks an upgrade
		if (isPhaseAMap) {
			this.onUpgradeApplied = () => {
				if (!this.isSceneAlive()) return;
				EventBus.emit('request-resume');
			};
			EventBus.on('upgrade-applied', this.onUpgradeApplied);

			// Phase 10 Task 10.3 [F11]: on a successful continue-run the
			// orchestrator emits `game-resumed`. We reverse the partial
			// shutdown performed by `emitGameOver` so wave ticks and HP
			// updates flow again.
			//
			// TODO(phase-12): preserve placed towers across game-over so
			// continue truly restores the pre-defeat board. Currently
			// `playerTowers.destroy()` has already run, so the player
			// rebuilds their board after continue.
			this.onGameResumed = (data) => {
				if (!this.isSceneAlive()) return;
				this.gameOver = false;
				this.playerHp = Math.max(1, data.livesRestored);
				EventBus.emit('base-hp-changed', {
					hp: this.playerHp,
					maxHp: INITIAL_PLAYER_HP,
					laneIndex: 0,
				});
				this.castleWall.update(this.playerHp);
				// Re-subscribe the wave lifecycle handlers that emitGameOver
				// tore down so future wave-started / wave-completed events
				// keep HUD state coherent.
				EventBus.off('wave-started', this.onWaveStartedLifecycle);
				EventBus.on('wave-started', this.onWaveStartedLifecycle);
				EventBus.off('boss-warning', this.onBossWarning);
				EventBus.on('boss-warning', this.onBossWarning);
				EventBus.off('wave-completed', this.onWaveCompleted);
				EventBus.on('wave-completed', this.onWaveCompleted);
				EventBus.off('request-set-speed', this.onSetSpeed);
				EventBus.on('request-set-speed', this.onSetSpeed);
			};
			EventBus.on('game-resumed', this.onGameResumed);
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

	private renderField(grid: GridManager, dark: boolean): void {
		const theme = getMapTheme(this.currentMap.id);
		const tile = grid.orthoTile;
		const canvasW = this.scale.width;
		const canvasH = this.scale.height;
		const tilemap = this.make.tilemap({ key: this.currentMap.tilemapKey });
		const visualLayers = collectVisualLayers(tilemap);
		const visualLayerNames = new Set(visualLayers.layerNames);
		const useTiledVisuals = visualLayers.hasRecognizedLayers;

		// Layer 0: Dirt/sand base (low ground — monster path level)
		if (
			typeof this.add.tileSprite === 'function' &&
			(!useTiledVisuals || visualLayerNames.has('ground_base'))
		) {
			const dirtBg = this.add.tileSprite(
				canvasW / 2,
				canvasH / 2,
				canvasW,
				canvasH,
				DIRT_SEAMLESS_KEY,
			);
			dirtBg.setDepth(0);
			dirtBg.setScrollFactor(0);
			if (dark) dirtBg.setTint(0x5c6585);
		}

		// Build path lookup — path cells are "low ground" (monster walkway).
		const pathCells = getAllPathCells(this.currentMap);
		const pathSet = new Set(pathCells.map((p) => `${p.x},${p.y}`));
		const isLow = (x: number, y: number) =>
			pathSet.has(`${x},${y}`) ||
			x < 0 ||
			x >= this.currentMap.width ||
			y < 0 ||
			y >= this.currentMap.height;

		// Layer 2: Elevated grass platform tiles (tower placement level).
		const lift = tile * PLATFORM_LIFT;
		const extraTiles = 2;
		if (!useTiledVisuals || visualLayerNames.has('platform_high')) {
			for (let y = -extraTiles; y < this.currentMap.height + extraTiles; y++) {
				for (let x = -extraTiles; x < this.currentMap.width + extraTiles; x++) {
					if (isLow(x, y)) continue;

					// NSEW bitmask: which neighbors are "low" (path / outside).
					let bitmask = 0;
					if (isLow(x, y - 1)) bitmask |= 1;
					if (isLow(x + 1, y)) bitmask |= 2;
					if (isLow(x, y + 1)) bitmask |= 4;
					if (isLow(x - 1, y)) bitmask |= 8;

					const frame = GRASS_PLATFORM_FRAMES[bitmask] ?? 10;
					const world = grid.gridToWorld(x, y);

					const spr = this.add.sprite(
						world.x,
						world.y - lift,
						TINY_SWORDS_PRIMARY_TILESET.key,
						frame,
					);
					spr.setDisplaySize(tile, tile);
					spr.setOrigin(0.5, 0.5);
					spr.setDepth(2);
					if (dark) spr.setTint(0x6b7899);
					else if (theme.groundTint !== 0xffffff)
						spr.setTint(theme.groundTint);

					// Cliff walls drawn as graphics layers (no stretched tileset frames).
					const hasSouth = !!(bitmask & 4);
					const hasEast = !!(bitmask & 2);
					const hasWest = !!(bitmask & 8);

					if (
						(!useTiledVisuals || visualLayerNames.has('cliff_faces')) &&
						(hasSouth || hasEast || hasWest)
					) {
						const cg = this.add.graphics();
						cg.setDepth(1.5);
						const baseX = world.x - tile / 2;
						const baseY = world.y - lift + tile / 2;

						if (hasSouth) {
							const cliffH = tile * 0.6;
							cg.fillStyle(dark ? 0x3d4558 : 0x6b7b50, 1);
							cg.fillRect(baseX, baseY, tile, cliffH * 0.35);
							cg.fillStyle(dark ? 0x343d4e : 0x5a6843, 1);
							cg.fillRect(baseX, baseY + cliffH * 0.35, tile, cliffH * 0.35);
							cg.fillStyle(dark ? 0x2c3544 : 0x4a5636, 1);
							cg.fillRect(baseX, baseY + cliffH * 0.7, tile, cliffH * 0.3);
							cg.fillStyle(dark ? 0x4a5568 : 0x7d8e5c, 1);
							cg.fillRect(baseX, baseY, tile, 2);
						}

						if (hasEast) {
							cg.fillStyle(dark ? 0x3a4355 : 0x5e6e46, 0.7);
							cg.fillRect(
								baseX + tile - 3,
								world.y - lift - tile / 2,
								3,
								tile,
							);
						}

						if (hasWest) {
							cg.fillStyle(dark ? 0x3a4355 : 0x5e6e46, 0.7);
							cg.fillRect(baseX, world.y - lift - tile / 2, 3, tile);
						}
					}
				}
			}
		}

		// Layer 1.5: Shadow on path cells south of a platform (cliff shadow).
		if (
			!dark &&
			(!useTiledVisuals || visualLayerNames.has('cliff_faces'))
		) {
			const shadowGraphics = this.add.graphics();
			shadowGraphics.setDepth(0.5);
			for (const p of pathCells) {
				if (!isLow(p.x, p.y - 1)) {
					const w = grid.gridToWorld(p.x, p.y);
					shadowGraphics.fillStyle(0x000000, 0.15);
					shadowGraphics.fillRect(
						w.x - tile / 2,
						w.y - tile / 2,
						tile,
						tile * 0.4,
					);
				}
			}
		}

		this.renderDecorations(grid, dark);
	}

	private buildableZoneGraphics?: Phaser.GameObjects.Graphics;

	private showBuildableZone(): void {
		if (!this.buildableZoneGraphics) {
			this.buildableZoneGraphics = this.add.graphics();
			this.buildableZoneGraphics.setDepth(3);
		}
		this.buildableZoneGraphics.clear();
		if (!this.selectedTowerId) return;

		const tile = this.playerGrid.orthoTile;
		const lift = tile * PLATFORM_LIFT;
		for (const point of this.currentMap.buildablePoints) {
			if (!this.playerGrid.canPlaceTower(point.x, point.y)) continue;
			const world = this.playerGrid.gridToWorld(point.x, point.y);
			this.buildableZoneGraphics.fillStyle(0x44ff44, 0.15);
			this.buildableZoneGraphics.fillRect(
				world.x - tile / 2,
				world.y - lift - tile / 2,
				tile,
				tile,
			);
			this.buildableZoneGraphics.lineStyle(1, 0x44ff44, 0.3);
			this.buildableZoneGraphics.strokeRect(
				world.x - tile / 2,
				world.y - lift - tile / 2,
				tile,
				tile,
			);
		}
	}

	private hideBuildableZone(): void {
		if (this.buildableZoneGraphics) this.buildableZoneGraphics.clear();
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

			// Phase 7.5: very low-alpha path stroke so the underlying tilemap
			// reads clean — was 0.08 / 0.40 in scenario builds.
			graphics.lineStyle(4, lineColor, 0.04);
			graphics.beginPath();
			const first = grid.gridToWorld(path[0].x, path[0].y);
			graphics.moveTo(first.x, first.y);
			for (let i = 1; i < path.length; i++) {
				const pt = grid.gridToWorld(path[i].x, path[i].y);
				graphics.lineTo(pt.x, pt.y);
			}
			graphics.strokePath();

			graphics.fillStyle(lineColor, 0.25);
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

	/**
	 * Render fixed map obstacles (trees / rocks / bushes) at their grid
	 * positions. Obstacles are visual only — buildBuildablePoints already
	 * excluded them from placement, and the unit pathPoints data does not
	 * include them so units never try to walk through.
	 *
	 * Falls back silently when the optional `obstacles` field is missing.
	 */
	private renderObstacles(): void {
		const obstacles = this.currentMap.obstacles;
		if (!obstacles || obstacles.length === 0) return;
		const ASSET_KEYS = [
			'tiny-swords-tree-1',
			'tiny-swords-rock-1',
			'tiny-swords-bush-1',
		] as const;
		const tile = this.playerGrid.orthoTile;
		const lift = tile * PLATFORM_LIFT;
		obstacles.forEach((pos, i) => {
			const key = ASSET_KEYS[i % ASSET_KEYS.length];
			if (!this.textures.exists(key)) return;
			const world = this.playerGrid.gridToWorld(pos.x, pos.y);
			// Lift obstacles onto the elevated grass platform.
			const sprite = this.add.sprite(world.x, world.y - lift, key, 0);
			sprite.setDisplaySize(tile * 0.92, tile * 0.92);
			sprite.setOrigin(0.5, 0.7);
			sprite.setDepth(3 + pos.x + pos.y);
		});
	}

	/**
	 * Render ambient decoration sprites (trees/bushes/rocks) from
	 * `map.decorations`. Purely visual — zero pathfinding / placement impact.
	 * Decorations are usually placed just off the playfield (fractional grid
	 * coordinates like -1.2 / 9.3) so they read as background scenery.
	 */
	private renderAmbientDecorations(): void {
		const decorations = this.currentMap.decorations;
		if (!decorations || decorations.length === 0) return;
		const tile = this.playerGrid.orthoTile;
		// Ambient props stay on the low ground (no PLATFORM_LIFT) so they
		// match the dirt base layer visually.
		decorations.forEach((deco) => {
			const variant = deco.variant ?? 1;
			const key = `tiny-swords-${deco.kind}-${variant}`;
			if (!this.textures.exists(key)) return;
			const world = this.playerGrid.gridToWorld(deco.x, deco.y);
			const sprite = this.add.sprite(world.x, world.y, key, 0);
			const scale = deco.kind === 'tree' ? 1.1 : 0.85;
			sprite.setDisplaySize(tile * scale, tile * scale);
			sprite.setOrigin(0.5, 0.72);
			sprite.setAlpha(0.85);
			// Decorations never overlap gameplay cells, so a flat depth is fine.
			sprite.setDepth(2.5);
		});
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
					tier: tower.tier,
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
		const towersPlaced = this.playerTowers.getTowers().length;
		this.playerTowers.destroy();

		EventBus.emit('game-over', {
			result: payload.result,
			stats: {
				wavesCleared:
					payload.result === 'victory'
						? payload.finalSlot
						: Math.max(0, payload.finalSlot - 1),
				totalWaves: this.playerWaves.getMaxWaves(),
				towersPlaced,
				timeSurvivedSec: Math.round(this.playerWaves.getElapsedMs() / 1000),
				goldEarned: this.goldEarned,
				remainingHp: Math.max(0, this.playerHp),
				initialHp: INITIAL_PLAYER_HP,
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
			this.hideBuildableZone();
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
			// Phase 4 [F15]: `effect_amp` scales slow/stun durations (multiply).
			// Applied at the Game scene boundary so UnitSystem stays decoupled
			// from the roguelike stack tracker.
			const effectAmp =
				this.isPhaseAMap && this.phaseAOrchestrator
					? this.phaseAOrchestrator.getEffectDurationMultiplier()
					: 1;
			if (evt.slow) {
				const behavior = this.bossBehaviors.get(evt.unitId);
				if (!behavior?.isCcImmune()) {
					unitSystem.applySlow(
						evt.unitId,
						evt.slow.factor,
						evt.slow.duration * effectAmp,
					);
				}
			}
			if (evt.stun) {
				const behavior = this.bossBehaviors.get(evt.unitId);
				if (!behavior?.isCcImmune()) {
					unitSystem.applyStun(evt.unitId, evt.stun.duration * effectAmp);
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
				// Phase 4 [F15]: +1 per kill baseline, with the roguelike
				// `energy_harvest` upgrade stacking additively on top (+1 per
				// stack). Every 5th wave doubles the baseline as a soft pacing
				// buff — stack bonus is additive on top of the doubled value.
				if (this.isPhaseAMap) {
					const harvestBonus =
						this.phaseAOrchestrator?.getEnergyPerKillBonus() ?? 0;
					const baseline =
						ENERGY_PER_KILL * (this.currentWaveSlot % 5 === 0 ? 2 : 1);
					this.energySystem.add(baseline + harvestBonus);
				}
			},
			(unitId, result) => {
				if (!result) return;
				const behavior = this.bossBehaviors.get(unitId);
				if (!behavior) return;
				const unit = this.playerUnits.getUnit(unitId);
				if (result.killed) {
					// Phase 3 (sole-mode): boss-kill energy reward, plus a
					// fast-clear bonus if the boss dies within
					// FAST_CLEAR_THRESHOLD_MS of its first spawn. Falls back
					// to wave start if bossSpawnMs was not recorded (e.g. if
					// the boss died before the spawn callback fired).
					if (this.isPhaseAMap) {
						this.energySystem.add(ENERGY_PER_BOSS_KILL);
						const elapsed =
							this.playerWaves.getElapsedMs() -
							(this.playerWaves.bossSpawnMs ?? this.playerWaves.getElapsedMs());
						if (elapsed < FAST_CLEAR_THRESHOLD_MS) {
							this.energySystem.add(ENERGY_PER_BOSS_FAST_CLEAR);
						}
					}
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
		if (this.onUpgradeApplied) {
			EventBus.off('upgrade-applied', this.onUpgradeApplied);
		}
		if (this.onGameResumed) {
			EventBus.off('game-resumed', this.onGameResumed);
		}
		if (this.onPhaseASummonReady) {
			EventBus.off('phase-a-summon-ready', this.onPhaseASummonReady);
		}
		this.phaseAOrchestrator?.destroy();
		this.phaseAOrchestrator = undefined;
		soundGenerator.reset();

		this.tutorial?.destroy();
		this.tutorial = undefined;

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
