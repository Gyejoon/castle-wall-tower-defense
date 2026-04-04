import {
	type AssetManifest,
	FOREST_GATE_MAP,
	INITIAL_PLAYER_HP,
	WAVE_DEFS,
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
import { getPlacementGuardFailure } from '../placementRules';
import { DeckSystem } from '../systems/DeckSystem';
import { EnergySystem } from '../systems/EnergySystem';
import { GridManager } from '../systems/GridManager';
import { PathfindingSystem } from '../systems/PathfindingSystem';
import { TowerSystem } from '../systems/TowerSystem';
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
	private currentSlotDef: WaveDef = WAVE_DEFS[0];

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

	private decorationTiles: Array<{
		x: number;
		y: number;
		assetKey: string;
		kind: TinySwordsDecorationKind;
		variant: string;
	}> | null = null;
	private optionalAssetManifest: AssetManifest = getEmptyAssetManifest();
	private isCleaningUp = false;

	constructor() {
		super('Game');
	}

	create() {
		this.isCleaningUp = false;
		this.optionalAssetManifest = getCachedAssetManifest(this);
		const canvasW = this.scale.width;
		const canvasH = this.scale.height;
		this.playerGrid = new GridManager(FOREST_GATE_MAP, {
			canvasWidth: canvasW,
			canvasHeight: canvasH,
		});
		this.playerPathfinding = new PathfindingSystem();
		this.playerTowers = new TowerSystem(
			this,
			this.playerGrid,
			this.playerPathfinding,
		);
		this.playerUnits = new UnitSystem(this, this.playerGrid);
		this.playerWaves = new WaveSystem(this.playerUnits);
		this.playerDeck = new DeckSystem();

		this.events.on('shutdown', this.cleanup, this);

		this.cacheDecorationData();
		this.renderField(this.playerGrid, false);

		this.hoverGraphics = this.add.graphics();
		this.selectionGraphics = this.add.graphics();
		this.selectionGraphics.setDepth(15);

		this.playerUnits.setPath(FOREST_GATE_MAP.path);
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
			this.currentSlotDef = WAVE_DEFS[data.slotIndex - 1] ?? WAVE_DEFS[0];
			soundGenerator.playWaveStart();
		};

		EventBus.on('request-select-tower', this.onSelectTower);
		EventBus.on('request-clear-tower-selection', this.onClearTowerSelection);
		EventBus.on('wave-started', this.onWaveStartedLifecycle);

		EventBus.emit('game-ready');
		EventBus.emit('energy-changed', { energy: this.energySystem.getEnergy() });
		EventBus.emit('deck-loaded', { cards: this.playerDeck.getCards() });
		EventBus.emit('current-scene-ready', this);

		void this.prefetchOptionalAssets();
		this.playerWaves.start();
	}

	private cacheDecorationData(): void {
		const tilemap = this.make.tilemap({ key: 'tilemap-forest-gate' });
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
					x: Math.round(objectX / FOREST_GATE_MAP.tileSize),
					y: Math.round(objectY / FOREST_GATE_MAP.tileSize),
					assetKey,
					kind: kind as TinySwordsDecorationKind,
					variant,
				};
			})
			.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
	}

	private renderFieldPathOverlay(grid: GridManager, dark: boolean): void {
		const graphics = this.add.graphics();
		const pathColor = dark ? 0x5c6585 : 0x9f8258;
		const spawnColor = dark ? 0x40556f : 0x486133;
		const exitColor = dark ? 0x7e8aa8 : 0xb0914f;

		for (const point of FOREST_GATE_MAP.path) {
			grid.fillTileRect(
				graphics,
				point.x,
				point.y,
				pathColor,
				dark ? 0.4 : 0.52,
			);
		}

		grid.fillTileRect(
			graphics,
			FOREST_GATE_MAP.spawnPoint.x,
			FOREST_GATE_MAP.spawnPoint.y,
			spawnColor,
			dark ? 0.58 : 0.68,
		);
		grid.fillTileRect(
			graphics,
			FOREST_GATE_MAP.exitPoint.x,
			FOREST_GATE_MAP.exitPoint.y,
			exitColor,
			dark ? 0.58 : 0.68,
		);

		const spawnWorld = grid.gridToWorld(
			FOREST_GATE_MAP.spawnPoint.x,
			FOREST_GATE_MAP.spawnPoint.y,
		);
		const exitWorld = grid.gridToWorld(
			FOREST_GATE_MAP.exitPoint.x,
			FOREST_GATE_MAP.exitPoint.y,
		);

		graphics.fillStyle(dark ? 0xc4d6ff : 0xf6e3aa, dark ? 0.95 : 0.88);
		graphics.fillCircle(spawnWorld.x, spawnWorld.y - 6, 7);
		graphics.fillCircle(exitWorld.x, exitWorld.y - 6, 7);
	}

	private renderField(grid: GridManager, dark: boolean): void {
		for (let y = 0; y < FOREST_GATE_MAP.height; y++) {
			for (let x = 0; x < FOREST_GATE_MAP.width; x++) {
				const world = grid.gridToWorld(x, y);
				const frame =
					TINY_SWORDS_GROUND_FRAMES[(x + y) % TINY_SWORDS_GROUND_FRAMES.length];
				const sprite = this.add.sprite(
					world.x,
					world.y,
					TINY_SWORDS_PRIMARY_TILESET.key,
					frame,
				);
				sprite.setDisplaySize(
					this.playerGrid.orthoTile,
					this.playerGrid.orthoTile,
				);
				sprite.setOrigin(0.5, 0.5);
				sprite.setDepth(0);
				if (dark) {
					sprite.setTint(0x6b7899);
				}
			}
		}

		this.renderFieldPathOverlay(grid, dark);
		this.renderDecorations(grid, dark);
	}

	private renderDecorations(grid: GridManager, dark: boolean): void {
		if (!this.decorationTiles) return;

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
			}
		}
	}

	private renderPath(grid: GridManager): void {
		const path = FOREST_GATE_MAP.path;
		if (!this.pathGraphics) this.pathGraphics = this.add.graphics();
		const graphics = this.pathGraphics;
		graphics.clear();
		if (path.length < 2) return;

		const lineColor = 0xb8956a;

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
				graphics.fillCircle(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 1.5);
			}
		}
		const last = grid.gridToWorld(
			path[path.length - 1].x,
			path[path.length - 1].y,
		);
		graphics.fillCircle(last.x, last.y, 1.5);
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

		for (let y = 0; y < FOREST_GATE_MAP.height; y++) {
			for (let x = 0; x < FOREST_GATE_MAP.width; x++) {
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
		EventBus.emit('game-over', payload);
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
		this.playerUnits.setPath(FOREST_GATE_MAP.path);
		this.renderPath(this.playerGrid);
		EventBus.emit('path-updated', { path: FOREST_GATE_MAP.path });
	}

	private processCombatField(
		towerSystem: Pick<TowerSystem, 'update'>,
		unitSystem: Pick<
			UnitSystem,
			'applyDamage' | 'applySlow' | 'getUnitPositions' | 'update'
		>,
		time: number,
		delta: number,
		onKill: () => void,
	): string[] {
		const unitPositions = unitSystem.getUnitPositions();
		const damageEvents = towerSystem.update(time, delta, unitPositions);

		for (const evt of damageEvents) {
			const result = unitSystem.applyDamage(evt.unitId, evt.damage);
			if (result?.killed) {
				onKill();
			}
			if (evt.slow) {
				unitSystem.applySlow(evt.unitId, evt.slow.factor, evt.slow.duration);
			}
		}

		const { reachedExit } = unitSystem.update(time, delta);
		return reachedExit;
	}

	update(time: number, delta: number) {
		if (this.gameOver) return;

		this.playerWaves.update(delta, this.playerUnits.getActiveCount());
		this.energySystem.update(delta / 1000);

		const playerExits = this.processCombatField(
			this.playerTowers,
			this.playerUnits,
			time,
			delta,
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

		this.selectionGraphics.clear();
		this.playerTowers.destroy();
		this.playerUnits.destroy();
		this.playerWaves.destroy();
		this.playerDeck.reset();

		unloadAssetSections(
			this,
			this.optionalAssetManifest,
			OPTIONAL_ASSET_SECTIONS,
		);
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
