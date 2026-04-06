import {
	type AssetManifest,
	buildDeckCards,
	DEFAULT_DECK,
	DEFAULT_MAP_ID,
	ENERGY_PER_BOSS_KILL,
	ENERGY_PER_KILL,
	getAllPathCells,
	getMapById,
	getMapPaths,
	getSpawnExitPairs,
	getWavesForMap,
	INITIAL_PLAYER_HP,
	type MapLayout,
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
	spawnColor: number;
	exitColor: number;
	pathLineColor: number;
}

const MAP_THEMES: Record<string, MapTheme> = {
	forest_gate: {
		groundTint: 0xffffff, // no tint — natural green/brown
		decorTint: 0xffffff,
		pathColor: 0x9f8258,
		spawnColor: 0x486133,
		exitColor: 0xb0914f,
		pathLineColor: 0xb8956a,
	},
	lava_fortress: {
		groundTint: 0xd4a070, // warm orange/brown cast
		decorTint: 0xc89060,
		pathColor: 0xb05030,
		spawnColor: 0x8b3020,
		exitColor: 0xd06030,
		pathLineColor: 0xc06040,
	},
	storm_citadel: {
		groundTint: 0x8898c0, // cool blue/purple cast
		decorTint: 0x7888b0,
		pathColor: 0x5060a0,
		spawnColor: 0x405080,
		exitColor: 0x7080c0,
		pathLineColor: 0x6070b0,
	},
};

function getMapTheme(mapId: string): MapTheme {
	return MAP_THEMES[mapId] ?? MAP_THEMES.forest_gate;
}

import { getPlacementGuardFailure } from '../placementRules';
import { DeckSystem } from '../systems/DeckSystem';
import { EnergySystem } from '../systems/EnergySystem';
import { GridManager } from '../systems/GridManager';
import { PathfindingSystem } from '../systems/PathfindingSystem';
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

	private playerHp = INITIAL_PLAYER_HP;
	private energySystem = new EnergySystem();
	private selectedTowerId: string | null = null;
	private gameOver = false;
	private goldEarned = 0;
	private rewardMultiplier = 1;
	private currentSlotDef!: WaveDef;

	private hoverGraphics!: Phaser.GameObjects.Graphics;
	private selectionGraphics!: Phaser.GameObjects.Graphics;
	private pathGraphics?: Phaser.GameObjects.Graphics;

	private onSelectTower!: (data: { towerDefId: string }) => void;
	private onClearTowerSelection!: () => void;
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

	constructor() {
		super('Game');
	}

	create(data?: { mapId?: string }) {
		this.isCleaningUp = false;
		this.scaledGameTime = 0;
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
		this.playerUnits.setStageLevel(1); // Phase 1: LV.1 fixed, Phase 3 will use map-specific levels
		const mapWaves = getWavesForMap(mapId);
		if (mapWaves.length === 0) {
			throw new Error(`[GameScene] Map "${mapId}" has empty wave definitions`);
		}
		this.currentSlotDef = mapWaves[0];
		this.playerWaves = new WaveSystem(this.playerUnits, mapWaves, undefined, {
			difficultyHpMult: this.currentMap.difficultyHpMult,
		});
		const deckIds = this.game.registry.get('deckIds') as string[] | undefined;
		const deckCards = deckIds ? buildDeckCards(deckIds) : DEFAULT_DECK;
		this.playerDeck = new DeckSystem(deckCards);

		this.events.on('shutdown', this.cleanup, this);

		this.cacheDecorationData();
		this.renderField(this.playerGrid, false);

		this.hoverGraphics = this.add.graphics();
		this.selectionGraphics = this.add.graphics();
		this.selectionGraphics.setDepth(15);

		this.playerUnits.setPaths(getMapPaths(this.currentMap));
		this.renderPath(this.playerGrid);

		this.setupInput();

		this.onSelectTower = (data) => {
			const card = this.playerDeck.getCardByTowerId(data.towerDefId);
			if (!card) return;
			this.selectedTowerId = data.towerDefId;
			this.renderPlaceableHighlights();
		};
		this.onClearTowerSelection = () => {
			this.selectedTowerId = null;
			this.selectionGraphics.clear();
		};

		this.onWaveStartedLifecycle = (data) => {
			this.currentSlotDef = mapWaves[data.slotIndex - 1] ?? mapWaves[0];
			soundGenerator.playWaveStart();
		};

		this.onBossWarning = () => {
			if (!this.bossPrefetched) {
				this.bossPrefetched = true;
				void this.prefetchBossAssets();
			}
			this.showBossWarningOverlay();
		};

		this.onSetSpeed = ({ multiplier }) => {
			this.speedMultiplier = multiplier;
			this.time.timeScale = multiplier;
			this.anims.globalTimeScale = multiplier;
		};

		EventBus.on('request-select-tower', this.onSelectTower);
		EventBus.on('request-clear-tower-selection', this.onClearTowerSelection);
		EventBus.on('wave-started', this.onWaveStartedLifecycle);
		EventBus.on('boss-warning', this.onBossWarning);
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
		const spawnColor = dark ? 0x40556f : theme.spawnColor;
		const exitColor = dark ? 0x7e8aa8 : theme.exitColor;

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

		// Render spawn points for all lanes
		const paths = getMapPaths(this.currentMap);
		for (const lane of paths) {
			if (lane.length === 0) continue;
			const sp = lane[0];
			grid.fillTileRect(graphics, sp.x, sp.y, spawnColor, dark ? 0.58 : 0.68);
			const spWorld = grid.gridToWorld(sp.x, sp.y);
			graphics.fillStyle(dark ? 0xc4d6ff : 0xf6e3aa, dark ? 0.95 : 0.88);
			graphics.fillCircle(spWorld.x, spWorld.y - 6, 7);

			const ep = lane[lane.length - 1];
			grid.fillTileRect(graphics, ep.x, ep.y, exitColor, dark ? 0.58 : 0.68);
			const epWorld = grid.gridToWorld(ep.x, ep.y);
			graphics.fillStyle(dark ? 0xc4d6ff : 0xf6e3aa, dark ? 0.95 : 0.88);
			graphics.fillCircle(epWorld.x, epWorld.y - 6, 7);
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
					canPlace ? 0x7f5af0 : 0xe53170,
					0.2,
				);
			}
		});

		this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
			const gridPos = this.playerGrid.worldToGrid(
				pointer.worldX,
				pointer.worldY,
			);

			if (
				this.selectedTowerId &&
				this.playerGrid.isInBounds(gridPos.x, gridPos.y)
			) {
				this.handlePlaceTower(gridPos.x, gridPos.y, this.selectedTowerId);
			}
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
						0x7f5af0,
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
		EventBus.off('wave-started', this.onWaveStartedLifecycle);
		EventBus.off('boss-warning', this.onBossWarning);
		EventBus.off('request-set-speed', this.onSetSpeed);
		const towersPlaced = this.playerTowers.getTowers().length;
		this.playerTowers.destroy();
		EventBus.emit('game-over', {
			...payload,
			stats: {
				wavesCleared:
					payload.result === 'victory'
						? payload.finalSlot
						: Math.max(0, payload.finalSlot - 1),
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
			'applyDamage' | 'applySlow' | 'applyStun' | 'getUnitPositions' | 'update'
		>,
		time: number,
		delta: number,
		onKill: () => void,
	): string[] {
		const unitPositions = unitSystem.getUnitPositions();
		const damageEvents = towerSystem.update(time, delta, unitPositions);

		for (const evt of damageEvents) {
			if (evt.damage > 0) {
				const result = unitSystem.applyDamage(
					evt.unitId,
					evt.damage,
					evt.armorPierce,
				);
				if (result?.killed) {
					this.goldEarned += result.bounty;
					const energyReward = result.isBoss
						? ENERGY_PER_BOSS_KILL
						: ENERGY_PER_KILL;
					this.energySystem.add(energyReward);
					onKill();
				}
			}
			if (evt.slow) {
				unitSystem.applySlow(evt.unitId, evt.slow.factor, evt.slow.duration);
			}
			if (evt.stun) {
				unitSystem.applyStun(evt.unitId, evt.stun.duration);
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
		this.energySystem.update(scaledDelta / 1000);

		const playerExits = this.processCombatField(
			this.playerTowers,
			this.playerUnits,
			this.scaledGameTime,
			scaledDelta,
			() => {
				soundGenerator.playUnitDeath();
			},
		);

		for (const _uid of playerExits) {
			this.playerHp = Math.max(0, this.playerHp - 1);
			EventBus.emit('player-damaged', {
				playerId: 'local',
				damage: 1,
				remainingHp: this.playerHp,
			});
			if (this.playerHp <= 0) {
				this.emitGameOver({
					result: 'defeat',
					reason: 'base_hp_depleted',
					finalSlot: this.currentSlotDef.slotIndex,
				});
				return;
			}
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

	private cleanup() {
		if (this.isCleaningUp) return;
		this.isCleaningUp = true;

		EventBus.off('request-select-tower', this.onSelectTower);
		EventBus.off('request-clear-tower-selection', this.onClearTowerSelection);
		EventBus.off('wave-started', this.onWaveStartedLifecycle);
		EventBus.off('boss-warning', this.onBossWarning);
		soundGenerator.reset();
		EventBus.off('request-set-speed', this.onSetSpeed);

		this.tutorial?.destroy();
		this.tutorial = undefined;

		this.selectionGraphics.clear();
		this.hoverGraphics?.destroy();
		this.pathGraphics?.destroy();
		this.playerTowers.destroy();
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
		this.cameras.main.shake(300, 0.005);
		const overlay = this.add.rectangle(
			this.scale.width / 2,
			this.scale.height / 2,
			this.scale.width,
			this.scale.height,
			0xff0000,
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
