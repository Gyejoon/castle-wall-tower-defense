import Phaser from 'phaser';
import {
  ALL_TOWERS,
  TILE_SIZE,
  INITIAL_PLAYER_HP,
  INITIAL_GOLD,
  RANDOM_TOWER_COST,
  FOREST_GATE_MAP,
  WAVE_DEFS,
} from '@gld/shared';
import { GridManager } from '../systems/GridManager';
import { PathfindingSystem } from '../systems/PathfindingSystem';
import { TowerSystem } from '../systems/TowerSystem';
import { UnitSystem } from '../systems/UnitSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { RandomTowerSystem } from '../systems/RandomTowerSystem';
import { MergeSystem } from '../systems/MergeSystem';
import { AIOpponent } from '../systems/AIOpponent';
import { EventBus } from '../EventBus';
import { getPlacementGuardFailure } from '../placementRules';
import { soundGenerator } from '../audio/SoundGenerator';

export class GameScene extends Phaser.Scene {
  private gridManager!: GridManager;
  private pathfinding!: PathfindingSystem;
  private towerSystem!: TowerSystem;
  private unitSystem!: UnitSystem;
  private waveSystem!: WaveSystem;
  private randomTowerSystem!: RandomTowerSystem;
  private mergeSystem!: MergeSystem;
  private aiOpponent!: AIOpponent;
  private hoverGraphics!: Phaser.GameObjects.Graphics;

  private playerHp = INITIAL_PLAYER_HP;
  private gold = INITIAL_GOLD;
  private selectedTowerId: string | null = null;
  private gameOver = false;

  // Drag state for merge
  private isDragging = false;
  private dragFrom: { x: number; y: number } | null = null;
  private dragGhost: Phaser.GameObjects.Graphics | null = null;
  private mergeHighlights: Phaser.GameObjects.Graphics | null = null;

  private onPlaceTower!: (data: { col: number; row: number; towerDefId: string }) => void;
  private onSellTower!: (data: { col: number; row: number }) => void;
  private onSelectTower!: (data: { towerDefId: string }) => void;
  private onClearTowerSelection!: () => void;
  private onBuyRandomTower!: () => void;
  private onStartWave!: () => void;
  private onGameWon!: () => void;
  private onWaveStartedLifecycle!: (data: { wave: number; totalWaves: number }) => void;

  constructor() {
    super('Game');
  }

  create() {
    this.gridManager = new GridManager(FOREST_GATE_MAP);
    this.pathfinding = new PathfindingSystem();
    this.towerSystem = new TowerSystem(this, this.gridManager, this.pathfinding);
    this.unitSystem = new UnitSystem(this, this.gridManager);
    this.waveSystem = new WaveSystem(this.unitSystem);
    this.randomTowerSystem = new RandomTowerSystem();
    this.mergeSystem = new MergeSystem(this.towerSystem);
    this.aiOpponent = new AIOpponent();

    this.events.on('shutdown', this.cleanup, this);

    this.renderField();

    // Graphics
    this.hoverGraphics = this.add.graphics();
    this.dragGhost = this.add.graphics();
    this.dragGhost.setDepth(20);
    this.mergeHighlights = this.add.graphics();
    this.mergeHighlights.setDepth(15);

    this.unitSystem.setPath(FOREST_GATE_MAP.path);
    this.renderPath(FOREST_GATE_MAP.path);

    // Input: hover
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const gridPos = this.gridManager.worldToGrid(pointer.worldX, pointer.worldY);
      this.hoverGraphics.clear();

      if (this.isDragging && this.dragGhost) {
        this.dragGhost.clear();
        this.dragGhost.fillStyle(0xffffff, 0.3);
        this.dragGhost.fillRect(
          pointer.worldX - TILE_SIZE / 2,
          pointer.worldY - TILE_SIZE / 2,
          TILE_SIZE,
          TILE_SIZE,
        );
        this.renderMergeHighlights(gridPos);
        return;
      }

      if (this.gridManager.isInBounds(gridPos.x, gridPos.y)) {
        const isOccupied = !this.gridManager.isWalkable(gridPos.x, gridPos.y);
        this.hoverGraphics.fillStyle(isOccupied ? 0xe53170 : 0x7f5af0, 0.2);
        this.hoverGraphics.fillRect(gridPos.x * TILE_SIZE, gridPos.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    });

    // Input: pointerdown
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const gridPos = this.gridManager.worldToGrid(pointer.worldX, pointer.worldY);

      if (this.selectedTowerId) {
        this.handlePlaceTower(gridPos.x, gridPos.y, this.selectedTowerId);
        return;
      }

      if (this.waveSystem.getPhase() === 'building' && this.towerSystem.hasTowerAt(gridPos.x, gridPos.y)) {
        this.isDragging = true;
        this.dragFrom = { x: gridPos.x, y: gridPos.y };
      }
    });

    // Input: pointerup (merge)
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.dragFrom) return;

      const gridPos = this.gridManager.worldToGrid(pointer.worldX, pointer.worldY);

      if (gridPos.x !== this.dragFrom.x || gridPos.y !== this.dragFrom.y) {
        if (this.mergeSystem.canMerge(this.dragFrom, gridPos)) {
          const fromPos = { ...this.dragFrom };
          const result = this.mergeSystem.merge(fromPos, gridPos);
          if (result) {
            EventBus.emit('tower-merged', { fromPos, toPos: gridPos, newTowerId: result.id, newTowerDef: result });
            this.unitSystem.setPath(FOREST_GATE_MAP.path);
            this.renderPath(FOREST_GATE_MAP.path);
            EventBus.emit('path-updated', { path: FOREST_GATE_MAP.path });
          }
        } else {
          EventBus.emit('tower-merge-failed', { reason: 'invalid_merge' });
        }
      }

      this.isDragging = false;
      this.dragFrom = null;
      this.dragGhost?.clear();
      this.mergeHighlights?.clear();
    });

    // Event handlers
    this.onPlaceTower = (data) => this.handlePlaceTower(data.col, data.row, data.towerDefId);
    this.onSelectTower = (data) => { this.selectedTowerId = data.towerDefId; };
    this.onClearTowerSelection = () => { this.selectedTowerId = null; };

    this.onBuyRandomTower = () => {
      if (this.gold < RANDOM_TOWER_COST) return;
      if (this.waveSystem.getPhase() !== 'building') return;
      const rolledTower = this.randomTowerSystem.rollRandomTower();
      this.selectedTowerId = rolledTower.id;
      this.spendGold(RANDOM_TOWER_COST);
      EventBus.emit('random-tower-rolled', { towerId: rolledTower.id, towerDef: rolledTower });
    };

    this.onStartWave = () => { this.waveSystem.skipCountdown(); };
    this.onGameWon = () => { this.endGame('local'); };

    this.onSellTower = (data) => {
      if (this.waveSystem.getPhase() !== 'building') return;
      const result = this.towerSystem.sellTower(data.col, data.row);
      if (result.success) {
        this.earnGold(result.refund);
        this.unitSystem.setPath(FOREST_GATE_MAP.path);
        this.renderPath(FOREST_GATE_MAP.path);
        EventBus.emit('path-updated', { path: FOREST_GATE_MAP.path });
        EventBus.emit('tower-sold', { col: data.col, row: data.row, refund: result.refund });
      }
    };

    EventBus.on('request-select-tower', this.onSelectTower);
    EventBus.on('request-clear-tower-selection', this.onClearTowerSelection);
    EventBus.on('request-place-tower', this.onPlaceTower);
    EventBus.on('request-sell-tower', this.onSellTower);
    EventBus.on('request-buy-random-tower', this.onBuyRandomTower);
    EventBus.on('request-start-wave', this.onStartWave);
    EventBus.on('game-won', this.onGameWon);

    this.onWaveStartedLifecycle = (data) => {
      soundGenerator.playWaveStart();
      // Queue same wave units for AI opponent
      const waveDef = WAVE_DEFS[data.wave - 1];
      if (waveDef) {
        for (const group of waveDef.groups) {
          this.aiOpponent.queueUnits(group.unitId, group.count);
        }
      }
      // AI builds during wave start
      this.aiOpponent.buildPhase();
    };

    EventBus.on('wave-started', this.onWaveStartedLifecycle);

    EventBus.emit('game-ready');
    EventBus.emit('gold-changed', { gold: this.gold });
    EventBus.emit('current-scene-ready', this);

    this.waveSystem.start();
  }

  private renderField(): void {
    for (let y = 0; y < FOREST_GATE_MAP.height; y++) {
      for (let x = 0; x < FOREST_GATE_MAP.width; x++) {
        const world = this.gridManager.gridToWorld(x, y);
        const frameX = (x + y) % 2 === 0 ? world.x - TILE_SIZE : world.x;
        this.add.sprite(frameX, world.y - TILE_SIZE / 2, 'grid-floor').setDepth(0);
      }
    }

    for (const point of FOREST_GATE_MAP.path) {
      const world = this.gridManager.gridToWorld(point.x, point.y);
      this.add.image(world.x, world.y, 'path-tile').setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(1);
    }

    const spawnWorld = this.gridManager.gridToWorld(
      FOREST_GATE_MAP.spawnPoint.x,
      FOREST_GATE_MAP.spawnPoint.y,
    );
    this.add.image(spawnWorld.x, spawnWorld.y, 'spawn-tile').setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(2);

    const exitWorld = this.gridManager.gridToWorld(
      FOREST_GATE_MAP.exitPoint.x,
      FOREST_GATE_MAP.exitPoint.y,
    );
    this.add.image(exitWorld.x, exitWorld.y, 'exit-tile').setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(2);
  }

  private renderMergeHighlights(currentGridPos: { x: number; y: number }): void {
    if (!this.mergeHighlights || !this.dragFrom) return;
    this.mergeHighlights.clear();

    const towers = this.towerSystem.getTowers();
    for (const tower of towers) {
      if (tower.position.x === this.dragFrom.x && tower.position.y === this.dragFrom.y) continue;
      const canMerge = this.mergeSystem.canMerge(this.dragFrom, tower.position);
      if (canMerge) {
        const isHover = tower.position.x === currentGridPos.x && tower.position.y === currentGridPos.y;
        this.mergeHighlights.fillStyle(0x2cb67d, isHover ? 0.4 : 0.15);
        this.mergeHighlights.fillRect(tower.position.x * TILE_SIZE, tower.position.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
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

  private handlePlaceTower(gridX: number, gridY: number, towerDefId: string): void {
    const towerDef = ALL_TOWERS.find((t) => t.id === towerDefId);
    if (!towerDef) return;

    const guardFailure = getPlacementGuardFailure({
      phase: this.waveSystem.getPhase(),
      gold: this.gold,
      towerCost: 0,
    });

    if (guardFailure) {
      EventBus.emit('tower-placed', { col: gridX, row: gridY, towerId: towerDefId, success: false, reason: guardFailure });
      return;
    }

    const placed = this.towerSystem.placeTower(gridX, gridY, towerDefId);
    if (!placed.success) {
      EventBus.emit('tower-placed', { col: gridX, row: gridY, towerId: towerDefId, success: false, reason: placed.reason });
      return;
    }

    this.selectedTowerId = null;
    EventBus.emit('tower-placed', { col: gridX, row: gridY, towerId: towerDefId, success: true });
    this.unitSystem.setPath(FOREST_GATE_MAP.path);
    this.renderPath(FOREST_GATE_MAP.path);
    EventBus.emit('path-updated', { path: FOREST_GATE_MAP.path });
  }

  private pathGraphics?: Phaser.GameObjects.Graphics;

  private renderPath(path: { x: number; y: number }[]): void {
    if (!this.pathGraphics) {
      this.pathGraphics = this.add.graphics();
    }
    this.pathGraphics.clear();
    if (path.length < 2) return;

    this.pathGraphics.lineStyle(6, 0xb8956a, 0.08);
    this.pathGraphics.beginPath();
    const first = this.gridManager.gridToWorld(path[0].x, path[0].y);
    this.pathGraphics.moveTo(first.x, first.y);
    for (let i = 1; i < path.length; i++) {
      const pt = this.gridManager.gridToWorld(path[i].x, path[i].y);
      this.pathGraphics.lineTo(pt.x, pt.y);
    }
    this.pathGraphics.strokePath();

    this.pathGraphics.fillStyle(0xb8956a, 0.4);
    for (let i = 0; i < path.length - 1; i++) {
      const a = this.gridManager.gridToWorld(path[i].x, path[i].y);
      const b = this.gridManager.gridToWorld(path[i + 1].x, path[i + 1].y);
      const steps = 4;
      for (let s = 0; s < steps; s++) {
        if (s % 2 === 1) continue;
        const t = s / steps;
        const dx = a.x + (b.x - a.x) * t;
        const dy = a.y + (b.y - a.y) * t;
        this.pathGraphics.fillCircle(dx, dy, 1.5);
      }
    }
    const last = this.gridManager.gridToWorld(path[path.length - 1].x, path[path.length - 1].y);
    this.pathGraphics.fillCircle(last.x, last.y, 1.5);
  }

  update(time: number, delta: number) {
    if (this.gameOver) return;

    this.waveSystem.update(delta);

    // Player towers attack
    const unitPositions = this.unitSystem.getUnitPositions();
    const damageEvents = this.towerSystem.update(time, delta, unitPositions);

    let bountyTotal = 0;
    for (const evt of damageEvents) {
      // Get defId before damage (unit may be removed on kill)
      const unitDefId = this.unitSystem.getUnitDefId(evt.unitId);
      const result = this.unitSystem.applyDamage(evt.unitId, evt.damage);
      if (result?.killed) {
        bountyTotal += result.bounty;
        soundGenerator.playUnitDeath();
        // Kill transfer: send same unit to opponent
        if (unitDefId) {
          this.aiOpponent.queueTransferUnits(unitDefId, 1);
          EventBus.emit('kill-transfer', { unitType: unitDefId, count: 1 });
        }
      }
      if (evt.slow) {
        this.unitSystem.applySlow(evt.unitId, evt.slow.factor, evt.slow.duration);
      }
    }
    if (bountyTotal > 0) {
      this.earnGold(bountyTotal);
    }

    // Player units move
    const { reachedExit } = this.unitSystem.update(time, delta);
    for (const _unitId of reachedExit) {
      this.playerHp = Math.max(0, this.playerHp - 1);
      EventBus.emit('player-damaged', { playerId: 'local', damage: 1, remainingHp: this.playerHp });
      if (this.playerHp <= 0) {
        this.endGame('opponent');
        return;
      }
    }

    // AI opponent update
    const aiResult = this.aiOpponent.update(time, delta);
    // Transfer killed units from AI to player
    for (const killedDefId of aiResult.killedUnits) {
      this.unitSystem.queueTransferUnits(killedDefId, 1);
    }
    // Check AI death
    if (this.aiOpponent.hp <= 0) {
      this.endGame('local');
      return;
    }

    // Check win condition: all 20 waves cleared for both sides
    if (this.waveSystem.getPhase() === 'ended' && !this.aiOpponent.hasActiveUnits() && !this.unitSystem.hasActiveUnits() && !this.unitSystem.hasQueuedUnits()) {
      // Both survived — higher HP wins
      if (this.playerHp > this.aiOpponent.hp) {
        this.endGame('local');
      } else if (this.aiOpponent.hp > this.playerHp) {
        this.endGame('opponent');
      } else {
        // Tiebreak: gold
        this.endGame(this.gold >= this.aiOpponent.gold ? 'local' : 'opponent');
      }
    }
  }

  private cleanup() {
    EventBus.off('request-select-tower', this.onSelectTower);
    EventBus.off('request-clear-tower-selection', this.onClearTowerSelection);
    EventBus.off('request-place-tower', this.onPlaceTower);
    EventBus.off('request-sell-tower', this.onSellTower);
    EventBus.off('request-buy-random-tower', this.onBuyRandomTower);
    EventBus.off('request-start-wave', this.onStartWave);
    EventBus.off('game-won', this.onGameWon);
    EventBus.off('wave-started', this.onWaveStartedLifecycle);
    this.towerSystem.destroy();
    this.unitSystem.destroy();
    this.waveSystem.destroy();
    this.aiOpponent.destroy();
    this.mergeSystem.destroy();
    this.randomTowerSystem.destroy();
  }
}
