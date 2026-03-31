import {
	DUAL_CANVAS_H,
	EMOTES,
	FOREST_GATE_MAP,
	HUD_HEIGHT,
	INITIAL_GOLD,
	INITIAL_PLAYER_HP,
	ISO_CANVAS_H,
	ISO_CANVAS_W,
	ISO_TILE_DEPTH,
	ISO_TILE_H,
	ISO_TILE_W,
	RANDOM_TOWER_COST,
	WAVE_DEFS,
} from '@gld/shared';
import Phaser from 'phaser';
import { soundGenerator } from '../audio/SoundGenerator';
import { EventBus } from '../EventBus';
import { getPlacementGuardFailure } from '../placementRules';
import { GridManager } from '../systems/GridManager';
import { MergeSystem } from '../systems/MergeSystem';
import { PathfindingSystem } from '../systems/PathfindingSystem';
import { RandomTowerSystem } from '../systems/RandomTowerSystem';
import { TowerSystem } from '../systems/TowerSystem';
import { UnitSystem } from '../systems/UnitSystem';
import { WaveSystem } from '../systems/WaveSystem';

const TILE_RENDER_H = ISO_TILE_H + ISO_TILE_DEPTH;
const AI_MAX_BUILD_ATTEMPTS = 10;
const AI_MERGE_CHANCE = 0.2;
const AI_EMOTE_INTERVAL = 15000;
const AI_EMOTE_CHANCE = 0.3;

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

	private hoverGraphics!: Phaser.GameObjects.Graphics;
	private isDragging = false;
	private dragFrom: { x: number; y: number } | null = null;
	private dragGhost!: Phaser.GameObjects.Graphics;
	private mergeHighlights!: Phaser.GameObjects.Graphics;
	private pathGraphics?: Phaser.GameObjects.Graphics;
	private aiPathGraphics?: Phaser.GameObjects.Graphics;

	private hudBuyBtn!: Phaser.GameObjects.Text;
	private hudWaveBtn!: Phaser.GameObjects.Text;
	private hudRolledInfo!: Phaser.GameObjects.Text;

	private aiHpText!: Phaser.GameObjects.Text;
	private aiGoldText!: Phaser.GameObjects.Text;
	private feedbackText!: Phaser.GameObjects.Text;

	// Change-detection for per-frame emits
	private lastAiHp = INITIAL_PLAYER_HP;
	private lastAiGold = INITIAL_GOLD;
	private lastAiTowerCount = 0;

	// AI emote timer (mirrors removed AIOpponent behavior)
	private aiEmoteTimer = 0;

	private onSelectTower!: (data: { towerDefId: string }) => void;
	private onClearTowerSelection!: () => void;
	private onGameWon!: () => void;
	private onWaveStartedLifecycle!: (data: {
		wave: number;
		totalWaves: number;
	}) => void;

	// Cached decoration data (parsed once, used for both fields)
	private decorationTiles: Array<{
		x: number;
		y: number;
		frame: number;
	}> | null = null;

	constructor() {
		super('Game');
	}

	create() {
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
		this.createHUD();
		this.createAIOverlay();

		this.onSelectTower = (data) => {
			this.selectedTowerId = data.towerDefId;
		};
		this.onClearTowerSelection = () => {
			this.selectedTowerId = null;
		};
		this.onGameWon = () => {
			this.endGame('local');
		};

		this.onWaveStartedLifecycle = (data) => {
			soundGenerator.playWaveStart();
			const waveDef = WAVE_DEFS[data.wave - 1];
			if (waveDef) {
				for (const group of waveDef.groups) {
					this.aiUnits.queueUnits(group.unitId, group.count);
				}
			}
			this.aiBuildPhase();
			this.updateHUD();
		};

		EventBus.on('request-select-tower', this.onSelectTower);
		EventBus.on('request-clear-tower-selection', this.onClearTowerSelection);
		EventBus.on('game-won', this.onGameWon);
		EventBus.on('wave-started', this.onWaveStartedLifecycle);

		EventBus.emit('game-ready');
		EventBus.emit('gold-changed', { gold: this.gold });
		EventBus.emit('current-scene-ready', this);

		this.playerWaves.start();
	}

	private cacheDecorationData(): void {
		const tilemap = this.make.tilemap({ key: 'tilemap-forest-gate' });
		const decorLayer = tilemap.getLayer('decoration');
		if (!decorLayer) {
			this.decorationTiles = [];
			return;
		}

		this.decorationTiles = [];
		for (let y = 0; y < decorLayer.height; y++) {
			for (let x = 0; x < decorLayer.width; x++) {
				const tile = decorLayer.data[y][x];
				if (tile.index > 0) {
					this.decorationTiles.push({ x, y, frame: tile.index - 1 });
				}
			}
		}
	}

	private renderField(grid: GridManager, dark: boolean): void {
		const floorKey = dark ? 'grid-floor-dark' : 'grid-floor';
		const pathKey = dark ? 'path-tile-dark' : 'path-tile';
		const spawnKey = dark ? 'spawn-tile-dark' : 'spawn-tile';
		const exitKey = dark ? 'exit-tile-dark' : 'exit-tile';

		for (let y = 0; y < FOREST_GATE_MAP.height; y++) {
			for (let x = 0; x < FOREST_GATE_MAP.width; x++) {
				const world = grid.gridToWorld(x, y);
				const sprite = this.add.sprite(world.x, world.y, floorKey);
				const cropX = (x + y) % 2 === 0 ? 0 : ISO_TILE_W;
				sprite.setCrop(cropX, 0, ISO_TILE_W, TILE_RENDER_H);
				sprite.setDisplaySize(ISO_TILE_W, TILE_RENDER_H);
				sprite.setOrigin(0.5, 0.5);
				sprite.setDepth(0);
			}
		}

		for (const point of FOREST_GATE_MAP.path) {
			const world = grid.gridToWorld(point.x, point.y);
			this.add
				.image(world.x, world.y, pathKey)
				.setDisplaySize(ISO_TILE_W, TILE_RENDER_H)
				.setDepth(1);
		}

		const spawnWorld = grid.gridToWorld(
			FOREST_GATE_MAP.spawnPoint.x,
			FOREST_GATE_MAP.spawnPoint.y,
		);
		this.add
			.image(spawnWorld.x, spawnWorld.y, spawnKey)
			.setDisplaySize(ISO_TILE_W, TILE_RENDER_H)
			.setDepth(2);

		const exitWorld = grid.gridToWorld(
			FOREST_GATE_MAP.exitPoint.x,
			FOREST_GATE_MAP.exitPoint.y,
		);
		this.add
			.image(exitWorld.x, exitWorld.y, exitKey)
			.setDisplaySize(ISO_TILE_W, TILE_RENDER_H)
			.setDepth(2);

		this.renderDecorations(grid, dark);
	}

	private renderDecorations(grid: GridManager, dark: boolean): void {
		if (!this.decorationTiles) return;

		for (const { x, y, frame } of this.decorationTiles) {
			const world = grid.gridToWorld(x, y);
			const sprite = this.add.sprite(world.x, world.y, 'tileset', frame);
			sprite.setOrigin(0.5, 0.5);
			sprite.setDepth(3);
			if (dark) {
				sprite.setTint(0x666688);
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
			const gridPos = this.playerGrid.worldToGrid(
				pointer.worldX,
				pointer.worldY,
			);
			this.hoverGraphics.clear();

			if (this.isDragging) {
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
				this.renderMergeHighlights(gridPos);
				return;
			}

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
				return;
			}

			if (
				this.playerWaves.getPhase() === 'building' &&
				this.playerGrid.isInBounds(gridPos.x, gridPos.y) &&
				this.playerTowers.hasTowerAt(gridPos.x, gridPos.y)
			) {
				this.isDragging = true;
				this.dragFrom = { x: gridPos.x, y: gridPos.y };
			}
		});

		this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
			if (!this.isDragging || !this.dragFrom) return;

			const gridPos = this.playerGrid.worldToGrid(
				pointer.worldX,
				pointer.worldY,
			);

			if (gridPos.x !== this.dragFrom.x || gridPos.y !== this.dragFrom.y) {
				if (this.playerMerge.canMerge(this.dragFrom, gridPos)) {
					const fromPos = { ...this.dragFrom };
					const result = this.playerMerge.merge(fromPos, gridPos);
					if (result) {
						EventBus.emit('tower-merged', {
							fromPos,
							toPos: gridPos,
							newTowerId: result.id,
							newTowerDef: result,
						});
						this.playerUnits.setPath(FOREST_GATE_MAP.path);
						this.renderPath(this.playerGrid, false);
						EventBus.emit('path-updated', { path: FOREST_GATE_MAP.path });
					}
				} else {
					EventBus.emit('tower-merge-failed', { reason: 'invalid_merge' });
				}
			}

			this.isDragging = false;
			this.dragFrom = null;
			this.dragGhost.clear();
			this.mergeHighlights.clear();
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
			.on('pointerdown', () => this.handleBuyTower());

		this.hudWaveBtn = this.add
			.text(ISO_CANVAS_W * 0.54, hudY, '웨이브 시작', btnStyle)
			.setOrigin(0.5)
			.setDepth(100)
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', () => this.playerWaves.skipCountdown());

		this.add
			.text(ISO_CANVAS_W * 0.85, hudY, '초기화', {
				...btnStyle,
				color: '#94a1b2',
			})
			.setOrigin(0.5)
			.setDepth(100)
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', () => EventBus.emit('request-reset-run'));

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
			.text(8, 8, `AI HP ${this.aiHp}`, { ...style, color: '#e53170' })
			.setDepth(100);
		this.aiGoldText = this.add
			.text(8, 20, `AI 골드 ${this.aiGold}`, { ...style, color: '#f0d060' })
			.setDepth(100);
	}

	private handleBuyTower(): void {
		if (this.gold < RANDOM_TOWER_COST) return;
		if (this.playerWaves.getPhase() !== 'building') return;
		if (this.selectedTowerId) return;

		const rolledTower = this.playerRandomTower.rollRandomTower();
		this.selectedTowerId = rolledTower.id;
		this.spendGold(RANDOM_TOWER_COST);
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
			phase === 'building' &&
			this.gold >= RANDOM_TOWER_COST &&
			!this.selectedTowerId;
		this.hudBuyBtn.setAlpha(canBuy ? 1 : 0.4);

		this.hudWaveBtn.setText(phase === 'building' ? '웨이브 시작' : '전투 중');
		this.hudWaveBtn.setAlpha(phase === 'building' ? 1 : 0.4);

		if (!this.selectedTowerId) {
			this.hudRolledInfo.setText('');
		}
	}

	private renderMergeHighlights(currentGridPos: {
		x: number;
		y: number;
	}): void {
		if (!this.dragFrom) return;
		this.mergeHighlights.clear();

		for (const tower of this.playerTowers.getTowers()) {
			if (
				tower.position.x === this.dragFrom.x &&
				tower.position.y === this.dragFrom.y
			)
				continue;
			if (!this.playerMerge.canMerge(this.dragFrom, tower.position)) continue;

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
				guardFailure === 'combat_phase' ? '건설 페이즈 전용' : '배치 불가',
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
		EventBus.emit('tower-placed', {
			col: gridX,
			row: gridY,
			towerId: towerDefId,
			success: true,
		});
		this.playerUnits.setPath(FOREST_GATE_MAP.path);
		this.renderPath(this.playerGrid, false);
		EventBus.emit('path-updated', { path: FOREST_GATE_MAP.path });
		this.updateHUD();
	}

	private aiBuildPhase(): void {
		let attempts = 0;
		while (
			this.aiGold >= RANDOM_TOWER_COST &&
			attempts < AI_MAX_BUILD_ATTEMPTS
		) {
			attempts++;
			const tower = this.aiRandomTower.rollRandomTower();
			const pos = this.findAIPlacement();
			if (pos) {
				this.aiGold -= RANDOM_TOWER_COST;
				this.aiTowers.placeTower(pos.x, pos.y, tower.id);
			}
		}

		if (Math.random() < AI_MERGE_CHANCE) {
			this.tryAIMerge();
		}
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
		onKill: (unitDefId: string, bounty: number) => void,
	): string[] {
		const unitPositions = unitSystem.getUnitPositions();
		const damageEvents = towerSystem.update(time, delta, unitPositions);
		const exitedUnitIds: string[] = [];

		for (const evt of damageEvents) {
			const unitDefId = unitSystem.getUnitDefId(evt.unitId);
			const result = unitSystem.applyDamage(evt.unitId, evt.damage);
			if (result?.killed && unitDefId) {
				onKill(unitDefId, result.bounty);
			}
			if (evt.slow) {
				unitSystem.applySlow(evt.unitId, evt.slow.factor, evt.slow.duration);
			}
		}

		const { reachedExit } = unitSystem.update(time, delta);
		for (const uid of reachedExit) {
			exitedUnitIds.push(uid);
		}

		return exitedUnitIds;
	}

	update(time: number, delta: number) {
		if (this.gameOver) return;

		this.playerWaves.update(delta);

		// Player field
		const playerExits = this.processCombatField(
			this.playerTowers,
			this.playerUnits,
			time,
			delta,
			(unitDefId, bounty) => {
				this.earnGold(bounty);
				soundGenerator.playUnitDeath();
				this.aiUnits.queueTransferUnits(unitDefId, 1);
				EventBus.emit('kill-transfer', { unitType: unitDefId, count: 1 });
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
			(unitDefId, bounty) => {
				this.aiGold += bounty;
				this.playerUnits.queueTransferUnits(unitDefId, 1);
			},
		);

		for (const _uid of aiExits) {
			this.aiHp = Math.max(0, this.aiHp - 1);
			if (this.aiHp <= 0) {
				this.endGame('local');
				return;
			}
		}

		// Update overlays only when values change
		if (this.aiHp !== this.lastAiHp) {
			this.lastAiHp = this.aiHp;
			this.aiHpText.setText(`AI HP ${this.aiHp}`);
		}
		if (this.aiGold !== this.lastAiGold) {
			this.lastAiGold = this.aiGold;
			this.aiGoldText.setText(`AI 골드 ${this.aiGold}`);
		}

		// Emit opponent state only on change
		const aiTowerCount = this.aiTowers.getTowers().length;
		if (
			this.aiHp !== this.lastAiHp ||
			this.aiGold !== this.lastAiGold ||
			aiTowerCount !== this.lastAiTowerCount
		) {
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
			if (this.playerHp > this.aiHp) {
				this.endGame('local');
			} else if (this.aiHp > this.playerHp) {
				this.endGame('opponent');
			} else {
				this.endGame(this.gold >= this.aiGold ? 'local' : 'opponent');
			}
		}
	}

	private cleanup() {
		EventBus.off('request-select-tower', this.onSelectTower);
		EventBus.off('request-clear-tower-selection', this.onClearTowerSelection);
		EventBus.off('game-won', this.onGameWon);
		EventBus.off('wave-started', this.onWaveStartedLifecycle);

		this.playerTowers.destroy();
		this.playerUnits.destroy();
		this.playerWaves.destroy();
		this.playerMerge.destroy();
		this.playerRandomTower.reset();

		this.aiTowers.destroy();
		this.aiUnits.destroy();
		this.aiRandomTower.reset();
		this.aiMerge.destroy();
	}
}
