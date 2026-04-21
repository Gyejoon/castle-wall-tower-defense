import {
	type AssetManifest,
	ENERGY_PER_BOSS_FAST_CLEAR,
	ENERGY_PER_BOSS_KILL,
	ENERGY_PER_KILL,
	ENERGY_PER_WAVE_CLEAR,
	FAST_CLEAR_THRESHOLD_MS,
	generatePhaseAWaves,
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
import { InputController } from './input/InputController';
import { PlacementCoordinator } from './input/PlacementCoordinator';
import { FieldRenderer } from './render/FieldRenderer';
import { RangeOverlayController } from './render/RangeOverlayController';
import { BossContextBuilder } from './runtime/BossContextBuilder';
import { CombatMediator } from './runtime/CombatMediator';
import { GameStateManager } from './runtime/GameStateManager';

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
	private energySystem = new EnergySystem();
	private isPhaseAMap = false;
	private lastTimerTickSec = -1;

	private state!: GameStateManager;
	private combat!: CombatMediator;
	private bossCtx!: BossContextBuilder;
	private fieldRenderer!: FieldRenderer;
	private rangeOverlay!: RangeOverlayController;
	private inputController!: InputController;
	private placement!: PlacementCoordinator;

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
	private onWaveCompleted!: (data: {
		wave: number;
		totalWaves: number;
		slotIndex: number;
		delaySec: number;
		cleared: boolean;
		phase: WavePhase;
	}) => void;
	private onSetSpeed!: (data: { multiplier: 1 | 2 | 3 }) => void;

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
		this.state = new GameStateManager({
			emit: EventBus.emit.bind(EventBus),
			onEndGame: (reason) => this.handleEndGame(reason),
			onExitSideEffect: (remainingHp, _isBossLeak) => {
				EventBus.emit('base-hp-changed', {
					hp: remainingHp,
					maxHp: INITIAL_PLAYER_HP,
					laneIndex: 0,
				});
				this.castleWall.update(remainingHp);
				this.castleWall.onHit();
			},
		});
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
			behavior.onSpawn(this.bossCtx.build(unit.data));
		});
		const stageWaves = generatePhaseAWaves(50);
		this.state.setCurrentSlotDef(stageWaves[0]);
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
				this.inputController.setSelectedTowerId(data.towerId);
				this.rangeOverlay.showBuildableZone(data.towerId);
				this.rangeOverlay.clearRangeOverlay();
				EventBus.emit('tower-deselected');
				this.rangeOverlay.renderPlaceableHighlights(data.towerId);
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
		this.bossCtx = new BossContextBuilder({
			units: this.playerUnits,
			towers: this.playerTowers,
			getSceneTime: () => this.state.getScaledTime(),
		});
		this.combat = new CombatMediator({
			towers: this.playerTowers,
			units: this.playerUnits,
			damageNumbers: this.damageNumbers,
			bossBehaviors: this.bossBehaviors,
			orchestrator: this.phaseAOrchestrator,
			isPhaseAMap: this.isPhaseAMap,
		});
		this.events.on('shutdown', this.cleanup, this);

		this.fieldRenderer = new FieldRenderer(
			this,
			this.playerGrid,
			this.currentMap,
		);
		this.rangeOverlay = new RangeOverlayController(
			this,
			this.playerGrid,
			this.currentMap,
		);
		this.fieldRenderer.renderAll();

		this.playerUnits.setPaths(getMapPaths(this.currentMap));

		this.castleWall = new CastleWallSystem(
			this,
			this.playerGrid,
			this.currentMap,
		);
		this.castleWall.create();
		this.castleWall.update(this.state.getHp());

		this.spawnHut = new SpawnHutSystem(this, this.playerGrid, this.currentMap);
		this.spawnHut.create();

		this.placement = new PlacementCoordinator({
			towers: this.playerTowers,
			energy: this.energySystem,
			deck: this.playerDeck,
			orchestrator: this.phaseAOrchestrator,
			waves: this.playerWaves,
			emit: EventBus.emit.bind(EventBus),
			onPhaseAFastPath: () => {
				// Mirror the pre-Phase-5 inline cleanup after a Phase A
				// fast-path placement (Game.ts.handlePlaceTower lines 622-626).
				this.inputController.setSelectedTowerId(null);
				this.rangeOverlay.hideBuildableZone();
				this.rangeOverlay.clearSelection();
				this.rangeOverlay.clearRangeOverlay();
			},
			onBeforeSuccessEmit: () => {
				// Mirror the pre-Phase-5 overlay clears that happened between
				// energy.spend and the tower-deselected emit.
				this.inputController.setSelectedTowerId(null);
				this.rangeOverlay.clearSelection();
				this.rangeOverlay.clearRangeOverlay();
			},
			onSuccess: () => {
				this.playerUnits.setPaths(getMapPaths(this.currentMap));
				this.fieldRenderer.refreshPath();
			},
		});

		this.inputController = new InputController(this, this.playerGrid, {
			hoverGraphics: this.rangeOverlay.getHoverGraphics(),
			onPlace: (col, row, id) => this.placement.place(col, row, id),
			onSelectTower: (col, row, tower) => {
				const refund = TowerSystem.calcRefund(tower.def.cost);
				EventBus.emit('tower-selected', {
					towerDefId: tower.def.id,
					towerName: tower.def.name,
					col,
					row,
					refund,
					tier: tower.tier,
				});
				this.rangeOverlay.drawRangeOverlay(col, row, tower.def.stats.range);
			},
			onDeselect: () => {
				EventBus.emit('tower-deselected');
				this.rangeOverlay.clearRangeOverlay();
			},
			onMoveCommit: (from, to) => {
				this.rangeOverlay.clearSelection();
				const ok = this.playerTowers.moveTower(
					from.col,
					from.row,
					to.col,
					to.row,
				);
				if (ok) {
					EventBus.emit('tower-moved', {
						fromCol: from.col,
						fromRow: from.row,
						toCol: to.col,
						toRow: to.row,
					});
					EventBus.emit('tower-deselected');
					this.rangeOverlay.clearRangeOverlay();
					this.playerUnits.setPaths(getMapPaths(this.currentMap));
					this.fieldRenderer.refreshPath();
				} else {
					EventBus.emit('move-failed', { reason: 'invalid-tile' });
				}
			},
			isGameOver: () => this.state.isGameOver(),
			getTowerAt: (col, row) => this.playerTowers.getTowerAt(col, row),
		});
		this.inputController.setup();

		this.onSelectTower = (data) => {
			if (!this.isSceneAlive()) return;
			const card = this.playerDeck.getCardByTowerId(data.towerDefId);
			if (!card) return;
			this.inputController.setSelectedTowerId(data.towerDefId);
			this.rangeOverlay.showBuildableZone(data.towerDefId);
			this.rangeOverlay.clearRangeOverlay();
			EventBus.emit('tower-deselected');
			this.rangeOverlay.renderPlaceableHighlights(data.towerDefId);
		};
		this.onClearTowerSelection = () => {
			if (!this.isSceneAlive()) return;
			this.inputController.setSelectedTowerId(null);
			this.rangeOverlay.hideBuildableZone();
			this.rangeOverlay.clearSelection();
			this.rangeOverlay.clearRangeOverlay();
			EventBus.emit('tower-deselected');
		};

		this.onWaveStartedLifecycle = (data) => {
			if (!this.isSceneAlive()) return;
			this.state.setCurrentSlotDef(
				stageWaves[data.slotIndex - 1] ?? stageWaves[0],
			);
			this.state.setCurrentWaveSlot(data.slotIndex);
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
			this.state.setSpeed(multiplier);
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
				this.rangeOverlay.clearRangeOverlay();
				EventBus.emit('tower-deselected');
			}
		};

		this.onEnterMoveMode = ({ fromCol, fromRow }) => {
			if (!this.isSceneAlive()) return;
			this.inputController.setMovePending({ fromCol, fromRow });
			this.inputController.setSelectedTowerId(null);
			this.rangeOverlay.hideBuildableZone();
			this.rangeOverlay.clearSelection();
			this.rangeOverlay.clearRangeOverlay();
			this.rangeOverlay.renderPlaceableHighlights(null);
		};

		this.onMoveTower = ({ fromCol, fromRow, toCol, toRow }) => {
			if (!this.isSceneAlive()) return;
			const ok = this.playerTowers.moveTower(fromCol, fromRow, toCol, toRow);
			if (ok) {
				EventBus.emit('tower-moved', { fromCol, fromRow, toCol, toRow });
				EventBus.emit('tower-deselected');
				this.rangeOverlay.clearRangeOverlay();
				this.rangeOverlay.clearSelection();
				this.playerUnits.setPaths(getMapPaths(this.currentMap));
				this.fieldRenderer.refreshPath();
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
				this.state.setGameOver(false);
				this.state.setHp(Math.max(1, data.livesRestored));
				EventBus.emit('base-hp-changed', {
					hp: this.state.getHp(),
					maxHp: INITIAL_PLAYER_HP,
					laneIndex: 0,
				});
				this.castleWall.update(this.state.getHp());
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

	/**
	 * Scene-side last-mile cleanup triggered by GameStateManager.endGame.
	 * Emits the `game-over` payload (with run stats), tears down the range
	 * overlay, detaches wave/lifecycle handlers, and destroys the tower
	 * system. GameStateManager already set the `gameOver` flag before this
	 * runs.
	 */
	private handleEndGame(payload: {
		result: 'victory' | 'defeat';
		reason: 'all_waves_cleared' | 'base_hp_depleted';
	}): void {
		this.rangeOverlay.getRangeOverlayGraphics().clear();
		EventBus.off('wave-started', this.onWaveStartedLifecycle);
		EventBus.off('boss-warning', this.onBossWarning);
		EventBus.off('wave-completed', this.onWaveCompleted);
		EventBus.off('request-set-speed', this.onSetSpeed);
		const towersPlaced = this.playerTowers.getTowers().length;
		this.playerTowers.destroy();

		const finalSlot = this.state.getCurrentSlotDef()?.slotIndex ?? 0;
		EventBus.emit('game-over', {
			result: payload.result,
			stats: {
				wavesCleared:
					payload.result === 'victory' ? finalSlot : Math.max(0, finalSlot - 1),
				totalWaves: this.playerWaves.getMaxWaves(),
				towersPlaced,
				timeSurvivedSec: Math.round(this.playerWaves.getElapsedMs() / 1000),
				goldEarned: this.state.getGoldEarned(),
				remainingHp: Math.max(0, this.state.getHp()),
				initialHp: INITIAL_PLAYER_HP,
			},
		});
	}

	update(_time: number, delta: number) {
		if (this.state.isGameOver()) return;
		const scaledDelta = this.state.tick(delta);

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

		this.tickBossBehaviors(scaledDelta);

		const { reachedExit } = this.combat.tick(
			this.state.getScaledTime(),
			scaledDelta,
			() => this.onUnitKilled(),
			(unitId, result) => this.onBossDamageResult(unitId, result),
		);

		// Wave timer tick — throttled to 1 emit/sec to avoid event spam
		const remainingSec = this.playerWaves.getWaveRemainingSec();
		if (remainingSec >= 0 && remainingSec !== this.lastTimerTickSec) {
			this.lastTimerTickSec = remainingSec;
			EventBus.emit('wave-timer-tick', {
				remainingSec,
				wave: this.state.getCurrentWaveSlot(),
				totalWaves: this.playerWaves.getMaxWaves(),
			});
		}

		this.damageNumbers.update(_time, delta);

		this.state.applyExits(reachedExit);
		if (this.state.isGameOver()) return;

		this.state.checkVictoryCondition(
			this.playerWaves.getPhase(),
			this.playerUnits.hasActiveUnits(),
			this.playerUnits.hasQueuedUnits(),
		);
	}

	private tickBossBehaviors(scaledDelta: number): void {
		for (const [instanceId, behavior] of this.bossBehaviors) {
			const unit = this.playerUnits.getUnit(instanceId);
			if (!unit || unit.pendingDestroy) {
				behavior.destroy();
				this.bossBehaviors.delete(instanceId);
				continue;
			}
			behavior.onTick(this.bossCtx.build(unit.data), scaledDelta);
		}
	}

	private onUnitKilled(): void {
		soundGenerator.playUnitDeath();
		// Phase 4 [F15]: +1 per kill baseline, with the roguelike
		// `energy_harvest` upgrade stacking additively on top (+1 per
		// stack). Every 5th wave doubles the baseline as a soft pacing
		// buff — stack bonus is additive on top of the doubled value.
		if (this.isPhaseAMap) {
			const harvestBonus =
				this.phaseAOrchestrator?.getEnergyPerKillBonus() ?? 0;
			const baseline =
				ENERGY_PER_KILL * (this.state.getCurrentWaveSlot() % 5 === 0 ? 2 : 1);
			this.energySystem.add(baseline + harvestBonus);
		}
	}

	private onBossDamageResult(
		unitId: string,
		result: ReturnType<UnitSystem['applyDamage']>,
	): void {
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
			behavior.onDamageTaken(this.bossCtx.build(unit.data), hpRatio);
		}
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

		// Controllers destroy AFTER EventBus.off (so handlers that might
		// read their state have already detached) but BEFORE the gameplay
		// systems they observe are torn down. Matches the AGENTS.md
		// cleanup order: EventBus.off → input/placement →
		// combat/state/bossCtx → systems → renderers.
		this.inputController?.destroy();
		this.placement?.destroy();
		this.state?.destroy();

		this.phaseAOrchestrator?.destroy();
		this.phaseAOrchestrator = undefined;
		soundGenerator.reset();

		this.tutorial?.destroy();
		this.tutorial = undefined;

		this.castleWall?.destroy();
		this.spawnHut?.destroy();

		this.damageNumbers.destroy();
		this.playerTowers.destroy();
		for (const b of this.bossBehaviors.values()) b.destroy();
		this.bossBehaviors.clear();
		this.playerUnits.destroy();
		this.playerWaves.destroy();
		this.playerDeck.reset();
		this.energySystem.reset();

		// Renderer destroy runs AFTER EventBus.off + system destroy per
		// AGENTS.md scene-teardown rule. Handler guards (isSceneAlive)
		// also prevent stale callbacks from touching controllers that
		// may be mid-destroy.
		this.fieldRenderer?.destroy();
		this.rangeOverlay?.destroy();

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
