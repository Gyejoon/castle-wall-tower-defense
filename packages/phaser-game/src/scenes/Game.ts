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
	PHASER_COLORS,
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
	TINY_SWORDS_DECORATION_BY_KEY,
	TINY_SWORDS_GROUND_FRAMES,
	TINY_SWORDS_PRIMARY_TILESET,
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
import { SpawnHutSystem } from '../systems/SpawnHutSystem';
import { TowerSystem } from '../systems/TowerSystem';
import { TutorialSystem } from '../systems/TutorialSystem';
import { UnitSystem } from '../systems/UnitSystem';
import { WaveSystem } from '../systems/WaveSystem';

export class GameScene extends Phaser.Scene {
	private playerGrid!: GridManager;
	private playerPathfinding!: PathfindingSystem;
	private playerTowers!: TowerSystem;
	private playerUnits!: UnitSystem;
	private playerWaves!: WaveSystem;
	private playerDeck!: DeckSystem;
	private castleWall!: CastleWallSystem;
	private spawnHut!: SpawnHutSystem;
	private damageNumbers!: DamageNumberSystem;
	private onDmgNumbersChange = (_parent: unknown, value: boolean) => {
		if (!this.isSceneAlive()) return;
		this.damageNumbers.setEnabled(value);
	};
	private playerHp = INITIAL_PLAYER_HP;
	private selectedStar: StarRating = 1;
	private energySystem = new EnergySystem();
	private selectedTowerId: string | null = null;
	private gameOver = false;
	private goldEarned = 0;
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
	private onPause!: () => void;
	private onResume!: () => void;
	private onPlaceTowerAt!: (data: {
		towerDefId: string;
		clientX: number;
		clientY: number;
	}) => void;
	private onDragDrop!: (data: {
		towerDefId: string;
		clientX: number;
		clientY: number;
	}) => void;
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
	private speedMultiplier: 1 | 2 = 1;
	private scaledGameTime = 0;
	private onWaveCompleted!: (data: {
		wave: number;
		totalWaves: number;
		slotIndex: number;
		delaySec: number;
	}) => void;
	private onSetSpeed!: (data: { multiplier: 1 | 2 }) => void;

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

		const deckIds = this.game.registry.get('deckIds') as string[] | undefined;
		const deckCards =
			deckIds && deckIds.length > 0
				? buildDeckCardsSafe(deckIds)
				: DEFAULT_DECK;
		this.playerDeck = new DeckSystem(deckCards);
		this.damageNumbers = new DamageNumberSystem(this);
		const showDmgNumbers = this.game.registry.get('showDamageNumbers') as
			| boolean
			| undefined;
		this.damageNumbers.setEnabled(showDmgNumbers !== false);
		this.game.registry.events.on(
			'changedata-showDamageNumbers',
			this.onDmgNumbersChange,
		);
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

		this.onWaveCompleted = (data: { wave: number; totalWaves: number }) => {
			if (!this.isSceneAlive()) return;
			this.spawnHut.setActive(false);
			if (data.wave < data.totalWaves) {
				this.energySystem.add(ENERGY_PER_WAVE_CLEAR);
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

		this.onPause = () => {
			if (!this.isSceneAlive()) return;
			this.scene.pause();
		};
		this.onResume = () => {
			if (!this.isSceneAlive()) return;
			this.scene.resume();
		};

		this.onPlaceTowerAt = (data) => {
			if (!this.isSceneAlive() || this.gameOver) return;
			const canvas = this.game.canvas;
			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;
			const worldX = data.clientX * scaleX;
			const worldY = data.clientY * scaleY;
			const gridPos = this.playerGrid.worldToGrid(worldX, worldY);
			this.handlePlaceTower(gridPos.x, gridPos.y, data.towerDefId);
		};
		this.onDragDrop = this.onPlaceTowerAt;

		EventBus.on('request-select-tower', this.onSelectTower);
		EventBus.on('request-clear-tower-selection', this.onClearTowerSelection);
		EventBus.on('request-sell-tower', this.onSellTower);
		EventBus.on('request-pause', this.onPause);
		EventBus.on('request-resume', this.onResume);
		EventBus.on('request-place-tower-at', this.onPlaceTowerAt);
		EventBus.on('drag-drop', this.onDragDrop);
		EventBus.on('wave-started', this.onWaveStartedLifecycle);
		EventBus.on('boss-warning', this.onBossWarning);
		EventBus.on('wave-completed', this.onWaveCompleted);
		EventBus.on('request-set-speed', this.onSetSpeed);

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
		const graphics = this.add.graphics();
		const theme = getMapTheme(this.currentMap.id);
		const pathColor = dark ? 0x5c6585 : theme.pathColor;

		const allCells = getAllPathCells(this.currentMap);
		for (const point of allCells) {
			grid.fillTileRect(
				graphics,
				point.x,
				point.y,
				pathColor,
				dark ? 0.4 : 0.52,
			);
		}
	}

	private renderField(grid: GridManager, dark: boolean): void {
		const theme = getMapTheme(this.currentMap.id);
		const tile = this.playerGrid.orthoTile;
		const canvasW = this.scale.width;
		const canvasH = this.scale.height;

		// Calculate how many extra tiles needed to fill the canvas beyond the grid
		const gridPixelW = tile * this.currentMap.width;
		const gridPixelH = tile * this.currentMap.height;
		const extraLeft = Math.ceil((canvasW - gridPixelW) / 2 / tile) + 1;
		const extraRight = extraLeft;
		const extraTop = Math.ceil((canvasH - gridPixelH) / 2 / tile) + 1;
		const extraBottom = extraTop;

		const startX = -extraLeft;
		const endX = this.currentMap.width + extraRight;
		const startY = -extraTop;
		const endY = this.currentMap.height + extraBottom;

		for (let y = startY; y < endY; y++) {
			for (let x = startX; x < endX; x++) {
				const world = grid.gridToWorld(x, y);
				const frame =
					TINY_SWORDS_GROUND_FRAMES[
						((((x % 2) + 2) % 2) + (((y % 2) + 2) % 2)) %
							TINY_SWORDS_GROUND_FRAMES.length
					];
				const sprite = this.add.sprite(
					world.x,
					world.y,
					TINY_SWORDS_PRIMARY_TILESET.key,
					frame,
				);
				sprite.setDisplaySize(tile, tile);
				sprite.setOrigin(0.5, 0.5);
				sprite.setDepth(0);

				if (dark) {
					sprite.setTint(0x6b7899);
				} else if (theme.groundTint !== 0xffffff) {
					sprite.setTint(theme.groundTint);
				}
			}
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
					this.damageNumbers.show(pos.x, pos.y, result.actualDamage);
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
		// prep/마지막 보스 페이즈에는 에너지 자연 증가 없음
		const phase = this.playerWaves.getPhase();
		const isLastBoss = phase === 'boss' && this.playerWaves.isLastWave();
		if (phase !== 'prep' && !isLastBoss) {
			this.energySystem.update(scaledDelta / 1000);
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

		this.damageNumbers.update(_time, delta);

		for (const exit of playerExits) {
			this.playerHp = Math.max(0, this.playerHp - 1);
			EventBus.emit('player-damaged', {
				playerId: 'local',
				damage: 1,
				remainingHp: this.playerHp,
			});

			// Boss leak = instant defeat (only on actual boss waves)
			if (exit.isBoss && this.currentSlotDef.kind === 'boss') {
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
		EventBus.off('request-pause', this.onPause);
		EventBus.off('request-resume', this.onResume);
		EventBus.off('request-place-tower-at', this.onPlaceTowerAt);
		EventBus.off('drag-drop', this.onDragDrop);
		EventBus.off('wave-started', this.onWaveStartedLifecycle);
		EventBus.off('boss-warning', this.onBossWarning);
		EventBus.off('wave-completed', this.onWaveCompleted);
		EventBus.off('request-set-speed', this.onSetSpeed);
		this.game.registry.events.off(
			'changedata-showDamageNumbers',
			this.onDmgNumbersChange,
		);
		soundGenerator.reset();

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
