import {
	type AssetManifest,
	DUAL_CANVAS_H,
	EMOTES,
	FOREST_GATE_MAP,
	getNextEligiblePressureSlot,
	HUD_HEIGHT,
	INITIAL_GOLD,
	INITIAL_PLAYER_HP,
	ISO_CANVAS_H,
	ISO_CANVAS_W,
	ISO_TILE_W,
	PRESSURE_EXPIRES_AT_SEC,
	PRESSURE_LOCK_AT_SEC,
	PRESSURE_PACKET_BY_TIER,
	PRESSURE_TOKEN_CAP,
	type PressurePacketId,
	RANDOM_TOWER_COST,
	WAVE_DEFS,
	type WaveDef,
	type WavePhase,
} from '@gld/shared';
import Phaser from 'phaser';
import Drag from 'phaser3-rex-plugins/plugins/drag.js';
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

const AI_EMOTE_INTERVAL = 15000;
const AI_EMOTE_CHANCE = 0.3;
const GLOBAL_BUY_COOLDOWN_MS = 1200;
const AI_BUY_INTERVAL_MS = 1800;

type PressureOwnerId = 'local' | 'opponent';

interface SlotClearState {
	slotIndex: number;
	localBaseRemaining: number;
	opponentBaseRemaining: number;
	localAwarded: boolean;
	opponentAwarded: boolean;
}

export class GameScene extends Phaser.Scene {
	private playerGrid!: GridManager;
	private playerPathfinding!: PathfindingSystem;
	private playerTowers!: TowerSystem;
	private playerUnits!: UnitSystem;
	private playerWaves!: WaveSystem;
	private playerRandomTower!: RandomTowerSystem;
	private playerMerge!: MergeSystem;

	private aiGrid!: GridManager;
	private aiPathfinding!: PathfindingSystem;
	private aiTowers!: TowerSystem;
	private aiUnits!: UnitSystem;
	private aiRandomTower!: RandomTowerSystem;
	private aiMerge!: MergeSystem;

	private playerHp = INITIAL_PLAYER_HP;
	private aiHp = INITIAL_PLAYER_HP;
	private gold = INITIAL_GOLD;
	private aiGold = INITIAL_GOLD;
	private selectedTowerId: string | null = null;
	private gameOver = false;
	private buyCooldownRemainingMs = 0;
	private lastEmittedBuyCooldownMs = -1;
	private aiBuyCooldownRemainingMs = 0;
	private localPressureInventory: PressurePacketId[] = [];
	private opponentPressureInventory: PressurePacketId[] = [];
	private queuedPressureForPlayer = new Map<number, PressurePacketId>();
	private queuedPressureForOpponent = new Map<number, PressurePacketId>();
	private slotClearState: SlotClearState | null = null;
	private pressureExpired = false;
	private currentSlotDef: WaveDef = WAVE_DEFS[0];

	private hoverGraphics!: Phaser.GameObjects.Graphics;
	private dragGhost!: Phaser.GameObjects.Graphics;
	private mergeHighlights!: Phaser.GameObjects.Graphics;
	private pathGraphics?: Phaser.GameObjects.Graphics;
	private aiPathGraphics?: Phaser.GameObjects.Graphics;
	private playerTowerDragController?: TowerDragController;

	private hudBuyBtn!: Phaser.GameObjects.Text;
	private hudWaveBtn!: Phaser.GameObjects.Text;
	private hudRolledInfo!: Phaser.GameObjects.Text;

	private aiHpText!: Phaser.GameObjects.Text;
	private aiGoldText!: Phaser.GameObjects.Text;
	private feedbackText!: Phaser.GameObjects.Text;
	private aiAvatar?: Phaser.GameObjects.Image;
	private aiGoldIcon?: Phaser.GameObjects.Sprite;

	// Change-detection for per-frame emits
	private lastAiHp = INITIAL_PLAYER_HP;
	private lastAiGold = INITIAL_GOLD;
	private lastAiTowerCount = 0;

	// AI emote timer (mirrors removed AIOpponent behavior)
	private aiEmoteTimer = 0;

	// Named HUD handlers (bound in create)
	private onHudBuy!: () => void;
	private onHudWave!: () => void;
	private onHudReset!: () => void;

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

	// Cached decoration data (parsed once, used for both fields)
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
		this.playerGrid = new GridManager(FOREST_GATE_MAP, ISO_CANVAS_H);
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

		this.aiGrid = new GridManager(FOREST_GATE_MAP, 0);
		this.aiPathfinding = new PathfindingSystem();
		this.aiTowers = new TowerSystem(this, this.aiGrid, this.aiPathfinding);
		this.aiUnits = new UnitSystem(this, this.aiGrid);
		this.aiRandomTower = new RandomTowerSystem();
		this.aiMerge = new MergeSystem(this.aiTowers);

		this.events.on('shutdown', this.cleanup, this);

		this.cacheDecorationData();
		this.renderField(this.aiGrid, true);
		this.renderField(this.playerGrid, false);

		this.hoverGraphics = this.add.graphics();
		this.dragGhost = this.add.graphics();
		this.dragGhost.setDepth(20);
		this.mergeHighlights = this.add.graphics();
		this.mergeHighlights.setDepth(15);

		this.playerUnits.setPath(FOREST_GATE_MAP.path);
		this.aiUnits.setPath(FOREST_GATE_MAP.path);
		this.renderPath(this.playerGrid, false);
		this.renderPath(this.aiGrid, true);

		// Input only on player field — clicks on AI area naturally out-of-bounds
		this.setupInput();
		this.setupTowerDragController();

		this.onHudBuy = () => this.handleBuyTower();
		this.onHudWave = () => undefined;
		this.onHudReset = () => EventBus.emit('request-reset-run');

		this.createHUD();
		this.createAIOverlay();

		this.onSelectTower = (data) => {
			this.selectedTowerId = data.towerDefId;
		};
		this.onClearTowerSelection = () => {
			this.selectedTowerId = null;
		};

		this.onWaveStartedLifecycle = (data) => {
			this.currentSlotDef = WAVE_DEFS[data.slotIndex - 1] ?? WAVE_DEFS[0];
			this.beginSlotTracking(this.currentSlotDef);
			soundGenerator.playWaveStart();
			const waveDef = WAVE_DEFS[data.slotIndex - 1];
			if (waveDef) {
				for (const group of waveDef.groups) {
					this.aiUnits.queueUnits(group.unitId, group.count, {
						source: 'base',
						countsTowardClear: true,
					});
				}
			}
			this.applyQueuedPressureForSlot(data.slotIndex);
			if (data.kind === 'sudden_death') {
				this.expirePressureAtSuddenDeath();
			}
			if (data.kind === 'hard_end') {
				this.resolveHardEnd();
				return;
			}
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
			grid.fillIsoDiamond(
				graphics,
				point.x,
				point.y,
				pathColor,
				dark ? 0.4 : 0.52,
			);
		}

		grid.fillIsoDiamond(
			graphics,
			FOREST_GATE_MAP.spawnPoint.x,
			FOREST_GATE_MAP.spawnPoint.y,
			spawnColor,
			dark ? 0.58 : 0.68,
		);
		grid.fillIsoDiamond(
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
				sprite.setDisplaySize(ISO_TILE_W, ISO_TILE_W);
				sprite.setOrigin(0.5, 0.62);
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

	private renderPath(grid: GridManager, isAi: boolean): void {
		const path = FOREST_GATE_MAP.path;
		if (isAi) {
			if (!this.aiPathGraphics) this.aiPathGraphics = this.add.graphics();
		} else {
			if (!this.pathGraphics) this.pathGraphics = this.add.graphics();
		}
		// Guaranteed non-null by the initialization above
		const graphics = (
			isAi ? this.aiPathGraphics : this.pathGraphics
		) as Phaser.GameObjects.Graphics;
		graphics.clear();
		if (path.length < 2) return;

		const lineColor = isAi ? 0x7a6040 : 0xb8956a;

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
				const isOccupied = !this.playerGrid.isWalkable(gridPos.x, gridPos.y);
				this.playerGrid.fillIsoDiamond(
					this.hoverGraphics,
					gridPos.x,
					gridPos.y,
					isOccupied ? 0xe53170 : 0x7f5af0,
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
		const hudY = DUAL_CANVAS_H - HUD_HEIGHT / 2;
		const btnStyle: Phaser.Types.GameObjects.Text.TextStyle = {
			fontFamily: 'monospace',
			fontSize: '11px',
			color: '#f0d060',
			backgroundColor: '#2a1f0a',
			padding: { x: 12, y: 8 },
		};

		this.hudBuyBtn = this.add
			.text(
				ISO_CANVAS_W * 0.18,
				hudY,
				`타워 구매 ${RANDOM_TOWER_COST}G`,
				btnStyle,
			)
			.setOrigin(0.5)
			.setDepth(100)
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', this.onHudBuy);

		this.hudWaveBtn = this.add
			.text(ISO_CANVAS_W * 0.54, hudY, '웨이브 시작', btnStyle)
			.setOrigin(0.5)
			.setDepth(100)
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', this.onHudWave);

		this.add
			.text(ISO_CANVAS_W * 0.85, hudY, '초기화', {
				...btnStyle,
				color: '#94a1b2',
			})
			.setOrigin(0.5)
			.setDepth(100)
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', this.onHudReset);

		this.hudRolledInfo = this.add
			.text(ISO_CANVAS_W / 2, DUAL_CANVAS_H - HUD_HEIGHT - 4, '', {
				fontFamily: 'monospace',
				fontSize: '8px',
				color: '#f0d060',
				align: 'center',
			})
			.setOrigin(0.5, 1)
			.setDepth(100);

		// Placement feedback (shown briefly on error)
		this.feedbackText = this.add
			.text(ISO_CANVAS_W / 2, DUAL_CANVAS_H - HUD_HEIGHT - 16, '', {
				fontFamily: 'monospace',
				fontSize: '8px',
				color: '#e53170',
				align: 'center',
			})
			.setOrigin(0.5, 1)
			.setDepth(100);
	}

	private createAIOverlay(): void {
		const style: Phaser.Types.GameObjects.Text.TextStyle = {
			fontFamily: 'monospace',
			fontSize: '8px',
		};
		this.aiHpText = this.add
			.text(28, 8, `AI HP ${this.aiHp}`, { ...style, color: '#e53170' })
			.setDepth(100);
		this.aiGoldText = this.add
			.text(28, 20, `AI 골드 ${this.aiGold}`, { ...style, color: '#f0d060' })
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

		this.hudWaveBtn.setText(this.getHudTimerLabel());
		this.hudWaveBtn.setAlpha(0.75);

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
			if (tower.position.x === fromPos.x && tower.position.y === fromPos.y)
				continue;
			if (!this.playerMerge.canMerge(fromPos, tower.position)) continue;

			const isHover =
				tower.position.x === currentGridPos.x &&
				tower.position.y === currentGridPos.y;
			this.playerGrid.fillIsoDiamond(
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

	private endGame(winnerId: string): void {
		if (this.gameOver) return;
		this.gameOver = true;
		EventBus.emit('game-over', { winnerId });
	}

	private showFeedback(msg: string): void {
		this.feedbackText.setText(msg);
		this.time.delayedCall(2000, () => {
			if (this.feedbackText.text === msg) this.feedbackText.setText('');
		});
	}

	private getHudTimerLabel(): string {
		if (this.playerWaves.getPhase() === 'ended') {
			return '종료';
		}

		const elapsedSec = Math.floor(this.playerWaves.getElapsedMs() / 1000);
		const nextSlot = WAVE_DEFS[this.currentSlotDef.slotIndex] as
			| (typeof WAVE_DEFS)[number]
			| undefined;
		const remainingSec = nextSlot
			? Math.max(0, nextSlot.startAtSec - elapsedSec)
			: 0;
		const prefix =
			this.currentSlotDef.kind === 'boss'
				? '보스'
				: this.currentSlotDef.kind === 'sudden_death'
					? '서든'
					: `슬롯 ${this.currentSlotDef.slotIndex}`;
		return `${prefix} ${remainingSec}s`;
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

	private beginSlotTracking(slot: WaveDef): void {
		this.slotClearState = {
			slotIndex: slot.slotIndex,
			localBaseRemaining: slot.groups.reduce(
				(sum, group) => sum + group.count,
				0,
			),
			opponentBaseRemaining: slot.groups.reduce(
				(sum, group) => sum + group.count,
				0,
			),
			localAwarded: false,
			opponentAwarded: false,
		};
	}

	private applyQueuedPressureForSlot(slotIndex: number): void {
		const playerPacket = this.queuedPressureForPlayer.get(slotIndex);
		if (playerPacket) {
			for (const group of PRESSURE_PACKET_BY_TIER[
				this.getPacketTier(playerPacket)
			].groups) {
				this.playerUnits.queueUnits(group.unitId, group.count, {
					bountyOverride: 0,
					countsTowardClear: false,
					source: 'pressure',
				});
			}
			this.queuedPressureForPlayer.delete(slotIndex);
		}

		const opponentPacket = this.queuedPressureForOpponent.get(slotIndex);
		if (opponentPacket) {
			for (const group of PRESSURE_PACKET_BY_TIER[
				this.getPacketTier(opponentPacket)
			].groups) {
				this.aiUnits.queueUnits(group.unitId, group.count, {
					bountyOverride: 0,
					countsTowardClear: false,
					source: 'pressure',
				});
			}
			this.queuedPressureForOpponent.delete(slotIndex);
		}
	}

	private getPacketTier(packetId: PressurePacketId): 1 | 2 | 3 {
		return PRESSURE_PACKET_BY_TIER[1].id === packetId
			? 1
			: PRESSURE_PACKET_BY_TIER[2].id === packetId
				? 2
				: 3;
	}

	private recordBaseKill(ownerId: PressureOwnerId): void {
		if (
			!this.slotClearState ||
			this.slotClearState.slotIndex !== this.currentSlotDef.slotIndex
		) {
			return;
		}
		if (
			this.currentSlotDef.kind !== 'normal' ||
			!this.currentSlotDef.pressureEnabled ||
			!this.currentSlotDef.pressureTier
		) {
			return;
		}

		if (ownerId === 'local') {
			this.slotClearState.localBaseRemaining = Math.max(
				0,
				this.slotClearState.localBaseRemaining - 1,
			);
		} else {
			this.slotClearState.opponentBaseRemaining = Math.max(
				0,
				this.slotClearState.opponentBaseRemaining - 1,
			);
		}

		this.tryAwardPressure(ownerId);
	}

	private tryAwardPressure(ownerId: PressureOwnerId): void {
		if (
			!this.slotClearState ||
			this.slotClearState.slotIndex !== this.currentSlotDef.slotIndex
		)
			return;
		if (
			this.currentSlotDef.kind !== 'normal' ||
			!this.currentSlotDef.pressureEnabled ||
			!this.currentSlotDef.pressureTier
		)
			return;

		const deadlineMs = (this.currentSlotDef.startAtSec + 22) * 1000;
		if (this.playerWaves.getElapsedMs() > deadlineMs) return;

		const inventory =
			ownerId === 'local'
				? this.localPressureInventory
				: this.opponentPressureInventory;
		const awardedKey = ownerId === 'local' ? 'localAwarded' : 'opponentAwarded';
		const remaining =
			ownerId === 'local'
				? this.slotClearState.localBaseRemaining
				: this.slotClearState.opponentBaseRemaining;

		if (this.slotClearState[awardedKey] || remaining > 0) return;
		if (inventory.length >= PRESSURE_TOKEN_CAP) return;

		const packetId =
			PRESSURE_PACKET_BY_TIER[this.currentSlotDef.pressureTier].id;
		inventory.push(packetId);
		this.slotClearState[awardedKey] = true;
		EventBus.emit('pressure-earned', {
			ownerId,
			slotIndex: this.currentSlotDef.slotIndex,
			pressureTokens: inventory.length,
			packetId,
		});
		this.tryQueuePressure(ownerId, this.currentSlotDef.slotIndex);
	}

	private tryQueuePressure(
		ownerId: PressureOwnerId,
		fromSlotIndex: number,
	): void {
		const elapsedSec = Math.floor(this.playerWaves.getElapsedMs() / 1000);
		if (elapsedSec >= PRESSURE_LOCK_AT_SEC) return;

		const inventory =
			ownerId === 'local'
				? this.localPressureInventory
				: this.opponentPressureInventory;
		if (inventory.length === 0) return;

		const targetMap =
			ownerId === 'local'
				? this.queuedPressureForOpponent
				: this.queuedPressureForPlayer;
		let targetSlot = getNextEligiblePressureSlot(fromSlotIndex);
		while (targetSlot && targetMap.has(targetSlot.slotIndex)) {
			targetSlot = getNextEligiblePressureSlot(targetSlot.slotIndex);
		}
		if (!targetSlot) return;

		const packetId = inventory.shift();
		if (!packetId) return;
		targetMap.set(targetSlot.slotIndex, packetId);
		EventBus.emit('pressure-queued', {
			ownerId,
			slotIndex: fromSlotIndex,
			pressureTokens: inventory.length,
			packetId,
			targetSlotIndex: targetSlot.slotIndex,
		});
	}

	private expirePressureAtSuddenDeath(): void {
		for (const packetId of this.localPressureInventory.splice(0)) {
			EventBus.emit('pressure-expired', {
				ownerId: 'local',
				slotIndex: this.currentSlotDef.slotIndex,
				pressureTokens: 0,
				packetId,
			});
		}
		for (const packetId of this.opponentPressureInventory.splice(0)) {
			EventBus.emit('pressure-expired', {
				ownerId: 'opponent',
				slotIndex: this.currentSlotDef.slotIndex,
				pressureTokens: 0,
				packetId,
			});
		}
	}

	private resolveHardEnd(): void {
		if (this.playerHp > this.aiHp) {
			this.endGame('local');
			return;
		}
		if (this.aiHp > this.playerHp) {
			this.endGame('opponent');
			return;
		}
		this.endGame(this.gold >= this.aiGold ? 'local' : 'opponent');
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
		this.renderPath(this.playerGrid, false);
		EventBus.emit('path-updated', { path: FOREST_GATE_MAP.path });
		this.updateHUD();
	}

	private updateAIRealtime(delta: number): void {
		this.aiBuyCooldownRemainingMs = Math.max(
			0,
			this.aiBuyCooldownRemainingMs - delta,
		);
		if (
			this.aiBuyCooldownRemainingMs <= 0 &&
			this.aiGold >= RANDOM_TOWER_COST
		) {
			const tower = this.aiRandomTower.rollRandomTower();
			const pos = this.findAIPlacement();
			if (pos) {
				this.aiGold -= RANDOM_TOWER_COST;
				this.aiTowers.placeTower(pos.x, pos.y, tower.id);
				this.aiBuyCooldownRemainingMs = AI_BUY_INTERVAL_MS;
			}
		}

		if (Math.random() < 0.02) {
			this.tryAIMerge();
		}

		this.tryQueuePressure('opponent', this.currentSlotDef.slotIndex);
	}

	private findAIPlacement(): { x: number; y: number } | null {
		const candidates = FOREST_GATE_MAP.placementPoints.filter((p) =>
			this.aiGrid.isWalkable(p.x, p.y),
		);
		if (candidates.length === 0) return null;
		return candidates[Math.floor(Math.random() * candidates.length)];
	}

	private tryAIMerge(): void {
		const towers = this.aiTowers.getTowers();
		for (let i = 0; i < towers.length; i++) {
			for (let j = i + 1; j < towers.length; j++) {
				if (this.aiMerge.canMerge(towers[i].position, towers[j].position)) {
					this.aiMerge.merge(towers[i].position, towers[j].position);
					return;
				}
			}
		}
	}

	private processCombatField(
		towerSystem: TowerSystem,
		unitSystem: UnitSystem,
		time: number,
		delta: number,
		onKill: (info: {
			unitDefId: string;
			bounty: number;
			countsTowardClear: boolean;
			source: 'base' | 'pressure' | 'transfer';
		}) => void,
	): string[] {
		const unitPositions = unitSystem.getUnitPositions();
		const damageEvents = towerSystem.update(time, delta, unitPositions);

		for (const evt of damageEvents) {
			const result = unitSystem.applyDamage(evt.unitId, evt.damage);
			if (result?.killed) {
				onKill({
					unitDefId: result.unitDefId,
					bounty: result.bounty,
					countsTowardClear: result.countsTowardClear,
					source: result.source,
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
		this.updateAIRealtime(delta);
		if (
			!this.pressureExpired &&
			Math.floor(this.playerWaves.getElapsedMs() / 1000) >=
				PRESSURE_EXPIRES_AT_SEC &&
			this.currentSlotDef.kind === 'sudden_death'
		) {
			this.pressureExpired = true;
			this.expirePressureAtSuddenDeath();
		}

		// Player field
		const playerExits = this.processCombatField(
			this.playerTowers,
			this.playerUnits,
			time,
			delta,
			(info) => {
				this.earnGold(info.bounty);
				soundGenerator.playUnitDeath();
				this.aiUnits.queueTransferUnits(info.unitDefId, 1);
				EventBus.emit('kill-transfer', { unitType: info.unitDefId, count: 1 });
				if (info.countsTowardClear && info.source === 'base') {
					this.recordBaseKill('local');
				}
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
				this.endGame('opponent');
				return;
			}
		}

		// AI field
		const aiExits = this.processCombatField(
			this.aiTowers,
			this.aiUnits,
			time,
			delta,
			(info) => {
				this.aiGold += info.bounty;
				this.playerUnits.queueTransferUnits(info.unitDefId, 1);
				if (info.countsTowardClear && info.source === 'base') {
					this.recordBaseKill('opponent');
				}
			},
		);

		for (const _uid of aiExits) {
			this.aiHp = Math.max(0, this.aiHp - 1);
			if (this.aiHp <= 0) {
				this.endGame('local');
				return;
			}
		}

		// Detect changes before updating cached values
		const aiTowerCount = this.aiTowers.getTowers().length;
		const hpChanged = this.aiHp !== this.lastAiHp;
		const goldChanged = this.aiGold !== this.lastAiGold;
		const towerChanged = aiTowerCount !== this.lastAiTowerCount;

		// Update overlays only when values change
		if (hpChanged) {
			this.lastAiHp = this.aiHp;
			this.aiHpText.setText(`AI HP ${this.aiHp}`);
		}
		if (goldChanged) {
			this.lastAiGold = this.aiGold;
			this.aiGoldText.setText(`AI 골드 ${this.aiGold}`);
		}

		// Emit opponent state on any change
		if (hpChanged || goldChanged || towerChanged) {
			this.lastAiTowerCount = aiTowerCount;
			EventBus.emit('opponent-state', {
				gold: this.aiGold,
				hp: this.aiHp,
				towerCount: aiTowerCount,
			});
		}

		// AI random emotes
		this.aiEmoteTimer += delta;
		if (this.aiEmoteTimer >= AI_EMOTE_INTERVAL) {
			this.aiEmoteTimer = 0;
			if (Math.random() < AI_EMOTE_CHANCE) {
				const emote = EMOTES[Math.floor(Math.random() * EMOTES.length)];
				EventBus.emit('emote-received', {
					emoteId: emote.id,
					playerId: 'opponent',
				});
			}
		}

		// Win condition
		if (
			this.playerWaves.getPhase() === 'ended' &&
			!this.playerUnits.hasActiveUnits() &&
			!this.playerUnits.hasQueuedUnits() &&
			!this.aiUnits.hasActiveUnits() &&
			!this.aiUnits.hasQueuedUnits()
		) {
			this.resolveHardEnd();
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

		this.aiTowers.destroy();
		this.aiUnits.destroy();
		this.aiRandomTower.reset();
		this.aiMerge.destroy();
		this.aiAvatar?.destroy();
		this.aiGoldIcon?.destroy();

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
		this.applyOptionalUiAssets();
	}

	private applyOptionalUiAssets(): void {
		if (!this.aiAvatar && this.textures.exists('ui-ghost-avatar')) {
			this.aiAvatar = this.add
				.image(12, 14, 'ui-ghost-avatar')
				.setDisplaySize(18, 18)
				.setDepth(100)
				.setAlpha(0.95);
		}

		if (!this.aiGoldIcon && this.textures.exists('ui-stat-icons')) {
			this.aiGoldIcon = this.add
				.sprite(12, 32, 'ui-stat-icons', 1)
				.setDisplaySize(16, 16)
				.setDepth(100)
				.setAlpha(0.95);
		}
	}

	private setupTowerDragController(): void {
		const dragPlugin: {
			add: (
				gameObject: Phaser.GameObjects.Image,
				config?: Record<string, unknown>,
			) => { destroy?: () => void };
		} = {
			add: (gameObject, config) =>
				new Drag(gameObject, config) as { destroy?: () => void },
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
					this.playerGrid.fillIsoDiamond(
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
						this.renderPath(this.playerGrid, false);
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
