import {
	type AssetManifest,
	type ElementType,
	FOREST_GATE_MAP,
	getElementDamageMultiplier,
	INITIAL_GOLD,
	INITIAL_PLAYER_HP,
	RANDOM_TOWER_COST,
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
import { TowerDragController } from '../input/TowerDragController';
import { getPlacementGuardFailure } from '../placementRules';
import { GridManager } from '../systems/GridManager';
import { MergeSystem } from '../systems/MergeSystem';
import { PathfindingSystem } from '../systems/PathfindingSystem';
import { RandomTowerSystem } from '../systems/RandomTowerSystem';
import { TowerSystem } from '../systems/TowerSystem';
import { UnitSystem } from '../systems/UnitSystem';
import { WaveSystem } from '../systems/WaveSystem';

const GLOBAL_BUY_COOLDOWN_MS = 1200;

export class GameScene extends Phaser.Scene {
	private playerGrid!: GridManager;
	private playerPathfinding!: PathfindingSystem;
	private playerTowers!: TowerSystem;
	private playerUnits!: UnitSystem;
	private playerWaves!: WaveSystem;
	private playerRandomTower!: RandomTowerSystem;
	private playerMerge!: MergeSystem;

	private playerHp = INITIAL_PLAYER_HP;
	private gold = INITIAL_GOLD;
	private selectedTowerId: string | null = null;
	private gameOver = false;
	private buyCooldownRemainingMs = 0;
	private lastEmittedBuyCooldownMs = -1;
	private currentSlotDef: WaveDef = WAVE_DEFS[0];

	private hoverGraphics!: Phaser.GameObjects.Graphics;
	private dragGhost!: Phaser.GameObjects.Graphics;
	private mergeHighlights!: Phaser.GameObjects.Graphics;
	private pathGraphics?: Phaser.GameObjects.Graphics;
	private playerTowerDragController?: TowerDragController;

	private hudBuyBtn!: Phaser.GameObjects.Text;
	private hudRolledInfo!: Phaser.GameObjects.Text;
	private feedbackText!: Phaser.GameObjects.Text;

	private onHudBuy!: () => void;

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
		this.playerRandomTower = new RandomTowerSystem();
		this.playerMerge = new MergeSystem(this.playerTowers);

		this.events.on('shutdown', this.cleanup, this);

		this.cacheDecorationData();
		this.renderField(this.playerGrid, false);

		this.hoverGraphics = this.add.graphics();
		this.dragGhost = this.add.graphics();
		this.dragGhost.setDepth(20);
		this.mergeHighlights = this.add.graphics();
		this.mergeHighlights.setDepth(15);

		this.playerUnits.setPath(FOREST_GATE_MAP.path);
		this.renderPath(this.playerGrid);

		this.setupInput();
		this.setupTowerDragController();

		this.onHudBuy = () => this.handleBuyTower();

		this.createHUD();

		this.onSelectTower = (data) => {
			this.selectedTowerId = data.towerDefId;
		};
		this.onClearTowerSelection = () => {
			this.selectedTowerId = null;
		};

		this.onWaveStartedLifecycle = (data) => {
			this.currentSlotDef = WAVE_DEFS[data.slotIndex - 1] ?? WAVE_DEFS[0];
			soundGenerator.playWaveStart();
			this.updateHUD();
		};

		EventBus.on('request-select-tower', this.onSelectTower);
		EventBus.on('request-clear-tower-selection', this.onClearTowerSelection);
		EventBus.on('wave-started', this.onWaveStartedLifecycle);

		EventBus.emit('game-ready');
		EventBus.emit('gold-changed', { gold: this.gold });
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
				sprite.setDisplaySize(this.playerGrid.orthoTile, this.playerGrid.orthoTile);
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
			if (this.playerTowerDragController?.isDragging()) {
				return;
			}

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

	private createHUD(): void {
		const cw = this.scale.width;
		const ch = this.scale.height;
		const HUD_HEIGHT = 88;
		const hudY = ch - HUD_HEIGHT / 2;

		this.hudBuyBtn = this.add
			.text(
				cw / 2,
				hudY,
				`타워 구매 ${RANDOM_TOWER_COST}G`,
				{
					fontFamily: 'monospace',
					fontSize: '14px',
					color: '#f0d060',
					backgroundColor: '#2a1f0a',
					padding: { x: 24, y: 12 },
				},
			)
			.setOrigin(0.5)
			.setDepth(100)
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', this.onHudBuy);

		this.hudRolledInfo = this.add
			.text(cw / 2, ch - HUD_HEIGHT - 4, '', {
				fontFamily: 'monospace',
				fontSize: '8px',
				color: '#f0d060',
				align: 'center',
			})
			.setOrigin(0.5, 1)
			.setDepth(100);

		this.feedbackText = this.add
			.text(cw / 2, ch - HUD_HEIGHT - 16, '', {
				fontFamily: 'monospace',
				fontSize: '8px',
				color: '#e53170',
				align: 'center',
			})
			.setOrigin(0.5, 1)
			.setDepth(100);
	}

	private handleBuyTower(): void {
		if (this.gold < RANDOM_TOWER_COST) return;
		if (this.playerWaves.getPhase() === 'ended') return;
		if (this.buyCooldownRemainingMs > 0) return;
		if (this.selectedTowerId) return;

		const rolledTower = this.playerRandomTower.rollRandomTower();
		this.selectedTowerId = rolledTower.id;
		this.spendGold(RANDOM_TOWER_COST);
		this.setBuyCooldown(GLOBAL_BUY_COOLDOWN_MS);
		this.hudRolledInfo.setText(`배치 대기: ${rolledTower.name}`);
		EventBus.emit('random-tower-rolled', {
			towerId: rolledTower.id,
			towerDef: rolledTower,
			source: 'owned_pool',
			asCard: true,
		});
		this.updateHUD();
	}

	private updateHUD(): void {
		const phase = this.playerWaves.getPhase();
		const canBuy =
			phase !== 'ended' &&
			this.gold >= RANDOM_TOWER_COST &&
			!this.selectedTowerId &&
			this.buyCooldownRemainingMs <= 0;
		this.hudBuyBtn.setAlpha(canBuy ? 1 : 0.4);

		if (!this.selectedTowerId) {
			this.hudRolledInfo.setText('');
		}
	}

	private renderMergeHighlights(
		fromPos: { x: number; y: number },
		currentGridPos: { x: number; y: number },
	): void {
		this.mergeHighlights.clear();

		for (const tower of this.playerTowers.getTowers()) {
			if (tower.position.x === fromPos.x && tower.position.y === fromPos.y) {
				continue;
			}
			if (!this.playerMerge.canMerge(fromPos, tower.position)) continue;

			const isHover =
				tower.position.x === currentGridPos.x &&
				tower.position.y === currentGridPos.y;
			this.playerGrid.fillTileRect(
				this.mergeHighlights,
				tower.position.x,
				tower.position.y,
				0x2cb67d,
				isHover ? 0.4 : 0.15,
			);
		}
	}

	private spendGold(amount: number): boolean {
		if (this.gold < amount) return false;
		this.gold -= amount;
		EventBus.emit('gold-changed', { gold: this.gold });
		return true;
	}

	private earnGold(amount: number): void {
		this.gold += amount;
		EventBus.emit('gold-changed', { gold: this.gold });
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

	private showFeedback(msg: string): void {
		this.feedbackText.setText(msg);
		this.time.delayedCall(2000, () => {
			if (this.feedbackText.text === msg) this.feedbackText.setText('');
		});
	}

	private setBuyCooldown(remainingMs: number): void {
		this.buyCooldownRemainingMs = Math.max(0, remainingMs);
		this.emitBuyCooldown();
	}

	private tickBuyCooldown(delta: number): void {
		if (this.buyCooldownRemainingMs <= 0) return;
		this.buyCooldownRemainingMs = Math.max(
			0,
			this.buyCooldownRemainingMs - delta,
		);
		this.emitBuyCooldown();
	}

	private emitBuyCooldown(): void {
		const roundedMs =
			this.buyCooldownRemainingMs <= 0
				? 0
				: Math.ceil(this.buyCooldownRemainingMs / 100) * 100;
		if (roundedMs === this.lastEmittedBuyCooldownMs) return;
		this.lastEmittedBuyCooldownMs = roundedMs;
		EventBus.emit('buy-cooldown-updated', { remainingMs: roundedMs });
	}

	private handlePlaceTower(
		gridX: number,
		gridY: number,
		towerDefId: string,
	): void {
		const guardFailure = getPlacementGuardFailure({
			phase: this.playerWaves.getPhase(),
			gold: this.gold,
			towerCost: 0,
		});

		if (guardFailure) {
			this.showFeedback(
				guardFailure === 'combat_phase' ? '경기 종료' : '배치 불가',
			);
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
			this.showFeedback(
				placed.reason === 'blocked_path' ? '경로 차단' : '배치 불가',
			);
			EventBus.emit('tower-placed', {
				col: gridX,
				row: gridY,
				towerId: towerDefId,
				success: false,
				reason: placed.reason,
			});
			return;
		}

		this.selectedTowerId = null;
		this.hudRolledInfo.setText('');
		this.playerTowerDragController?.sync();
		EventBus.emit('tower-placed', {
			col: gridX,
			row: gridY,
			towerId: towerDefId,
			success: true,
		});
		EventBus.emit('player-tower-count', {
			count: this.playerTowers.getTowers().length,
		});
		this.playerUnits.setPath(FOREST_GATE_MAP.path);
		this.renderPath(this.playerGrid);
		EventBus.emit('path-updated', { path: FOREST_GATE_MAP.path });
		this.updateHUD();
	}

	private processCombatField(
		towerSystem: Pick<TowerSystem, 'update'>,
		unitSystem: Pick<
			UnitSystem,
			'applyDamage' | 'applySlow' | 'getUnitElement' | 'getUnitPositions' | 'update'
		>,
		time: number,
		delta: number,
		onKill: (info: { unitDefId: string; bounty: number }) => void,
	): string[] {
		const unitPositions = unitSystem.getUnitPositions();
		const damageEvents = towerSystem.update(time, delta, unitPositions);

		for (const evt of damageEvents) {
			const unitElement = unitSystem.getUnitElement(evt.unitId);
			const elementMult = getElementDamageMultiplier(
				evt.towerElement as ElementType,
				unitElement as ElementType,
			);
			const finalDamage = Math.round(evt.damage * elementMult);
			const result = unitSystem.applyDamage(evt.unitId, finalDamage);
			if (result?.killed) {
				onKill({
					unitDefId: result.unitDefId,
					bounty: result.bounty,
				});
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

		this.playerWaves.update(delta);
		this.tickBuyCooldown(delta);

		const playerExits = this.processCombatField(
			this.playerTowers,
			this.playerUnits,
			time,
			delta,
			(info) => {
				this.earnGold(info.bounty);
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
		this.playerTowerDragController?.destroy();
		this.playerTowerDragController = undefined;

		this.playerTowers.destroy();
		this.playerUnits.destroy();
		this.playerWaves.destroy();
		this.playerMerge.destroy();
		this.playerRandomTower.reset();

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

	private setupTowerDragController(): void {
		const dragPlugin: {
			add: (
				gameObject: Phaser.GameObjects.Image,
				_config?: Record<string, unknown>,
			) => { destroy?: () => void };
		} = {
			add: (gameObject) => {
				this.input.setDraggable(gameObject);
				return {};
			},
		};

		this.playerTowerDragController = new TowerDragController({
			dragPlugin,
			gridManager: this.playerGrid,
			towerSystem: this.playerTowers,
			canInteract: () =>
				!this.gameOver &&
				this.playerWaves.getPhase() !== 'ended' &&
				this.selectedTowerId === null,
			onPreview: ({ fromPos, gridPos }) => {
				this.hoverGraphics.clear();
				this.dragGhost.clear();
				if (this.playerGrid.isInBounds(gridPos.x, gridPos.y)) {
					this.playerGrid.fillTileRect(
						this.dragGhost,
						gridPos.x,
						gridPos.y,
						0xffffff,
						0.3,
					);
				}
				this.renderMergeHighlights(fromPos, gridPos);
			},
			onDrop: ({ fromPos, toPos }) => {
				this.dragGhost.clear();
				this.mergeHighlights.clear();

				if (toPos.x === fromPos.x && toPos.y === fromPos.y) {
					return;
				}

				if (this.playerMerge.canMerge(fromPos, toPos)) {
					const result = this.playerMerge.merge(fromPos, toPos);
					if (result) {
						this.playerTowerDragController?.sync();
						EventBus.emit('tower-merged', {
							fromPos,
							toPos,
							newTowerId: result.id,
							newTowerDef: result,
						});
						EventBus.emit('tower-merge-resolved', {
							success: true,
							fromPos,
							toPos,
							newTowerId: result.id,
						});
						this.playerUnits.setPath(FOREST_GATE_MAP.path);
						this.renderPath(this.playerGrid);
						EventBus.emit('path-updated', { path: FOREST_GATE_MAP.path });
						EventBus.emit('player-tower-count', {
							count: this.playerTowers.getTowers().length,
						});
					}
					return;
				}

				EventBus.emit('tower-merge-failed', { reason: 'invalid_merge' });
				EventBus.emit('tower-merge-resolved', {
					success: false,
					fromPos,
					toPos,
					failureReason: 'invalid_merge',
				});
			},
		});
	}
}

function getEmptyAssetManifest(): AssetManifest {
	return {
		generated: '',
		assets: [],
	};
}
