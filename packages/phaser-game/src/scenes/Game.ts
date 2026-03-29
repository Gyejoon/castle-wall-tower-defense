import Phaser from 'phaser';
import { ALL_TOWERS, TILE_SIZE, INITIAL_PLAYER_HP, INITIAL_GOLD, BASE_TOWERS } from '@gld/shared';
import { GridManager } from '../systems/GridManager';
import { PathfindingSystem } from '../systems/PathfindingSystem';
import { TowerSystem } from '../systems/TowerSystem';
import { UnitSystem } from '../systems/UnitSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { EventBus } from '../EventBus';

export class GameScene extends Phaser.Scene {
  private gridManager!: GridManager;
  private pathfinding!: PathfindingSystem;
  private towerSystem!: TowerSystem;
  private unitSystem!: UnitSystem;
  private waveSystem!: WaveSystem;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private hoverGraphics!: Phaser.GameObjects.Graphics;

  private playerHp = INITIAL_PLAYER_HP;
  private gold = INITIAL_GOLD;
  private selectedTowerId: string | null = null;
  private gameOver = false;
  private onPlaceTower!: (data: { col: number; row: number; towerDefId: string }) => void;
  private onStartWave!: () => void;
  private onGameWon!: () => void;

  constructor() {
    super('Game');
  }

  create() {
    this.gridManager = new GridManager();
    this.pathfinding = new PathfindingSystem();
    this.towerSystem = new TowerSystem(this, this.gridManager, this.pathfinding);
    this.unitSystem = new UnitSystem(this, this.gridManager);
    this.waveSystem = new WaveSystem(this.unitSystem);

    this.events.on('shutdown', this.cleanup, this);

    // Draw grid
    this.gridGraphics = this.add.graphics();
    this.gridManager.render(this.gridGraphics);

    // Hover highlight
    this.hoverGraphics = this.add.graphics();

    // Compute initial path
    const walkGrid = this.gridManager.getWalkabilityGrid();
    const path = this.pathfinding.findPath(
      walkGrid,
      this.gridManager.spawnPoint,
      this.gridManager.exitPoint,
    );
    if (path) {
      this.unitSystem.setPath(path);
      this.renderPath(path);
    }

    // Input: hover highlight
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const gridPos = this.gridManager.worldToGrid(pointer.worldX, pointer.worldY);
      this.hoverGraphics.clear();
      if (this.gridManager.isInBounds(gridPos.x, gridPos.y)) {
        const isOccupied = !this.gridManager.isWalkable(gridPos.x, gridPos.y);
        this.hoverGraphics.fillStyle(isOccupied ? 0xe53170 : 0x7f5af0, 0.2);
        this.hoverGraphics.fillRect(
          gridPos.x * TILE_SIZE,
          gridPos.y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE,
        );
      }
    });

    // Input: place tower on click
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.selectedTowerId) return;
      const gridPos = this.gridManager.worldToGrid(pointer.worldX, pointer.worldY);
      this.handlePlaceTower(gridPos.x, gridPos.y, this.selectedTowerId);
    });

    this.onPlaceTower = (data) => {
      if (data.col < 0 || data.row < 0) {
        this.selectedTowerId = data.towerDefId;
        return;
      }
      this.handlePlaceTower(data.col, data.row, data.towerDefId);
    };

    this.onStartWave = () => {
      this.waveSystem.skipCountdown();
    };

    this.onGameWon = () => {
      this.endGame('local');
    };

    EventBus.on('request-place-tower', this.onPlaceTower);
    EventBus.on('request-start-wave', this.onStartWave);
    EventBus.on('game-won', this.onGameWon);

    // Keyboard tower selection (1-4)
    const keyNames = ['ONE', 'TWO', 'THREE', 'FOUR'] as const;
    keyNames.forEach((key, i) => {
      if (BASE_TOWERS[i]) {
        this.input.keyboard?.on(`keydown-${key}`, () => { this.selectedTowerId = BASE_TOWERS[i].id; });
      }
    });

    // Notify React
    EventBus.emit('game-ready');
    EventBus.emit('gold-changed', { gold: this.gold });
    EventBus.emit('current-scene-ready', this);

    // Start the wave system (first building phase)
    this.waveSystem.start();
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
    if (this.gold < towerDef.cost) return;

    const placed = this.towerSystem.placeTower(gridX, gridY, towerDefId);
    if (placed) {
      this.spendGold(towerDef.cost);
      // TowerSystem already recomputed and cached the path
      const path = this.pathfinding.getCachedPath();
      if (path) {
        this.unitSystem.setPath(path);
        this.renderPath(path);
      }
    }
  }

  private pathGraphics?: Phaser.GameObjects.Graphics;

  private renderPath(path: { x: number; y: number }[]): void {
    if (!this.pathGraphics) {
      this.pathGraphics = this.add.graphics();
    }
    this.pathGraphics.clear();

    if (path.length < 2) return;

    // Glow layer
    this.pathGraphics.lineStyle(6, 0x7f5af0, 0.06);
    this.pathGraphics.beginPath();
    const first = this.gridManager.gridToWorld(path[0].x, path[0].y);
    this.pathGraphics.moveTo(first.x, first.y);
    for (let i = 1; i < path.length; i++) {
      const pt = this.gridManager.gridToWorld(path[i].x, path[i].y);
      this.pathGraphics.lineTo(pt.x, pt.y);
    }
    this.pathGraphics.strokePath();

    // Dotted path
    this.pathGraphics.fillStyle(0x7f5af0, 0.35);
    for (let i = 0; i < path.length - 1; i++) {
      const a = this.gridManager.gridToWorld(path[i].x, path[i].y);
      const b = this.gridManager.gridToWorld(path[i + 1].x, path[i + 1].y);
      const steps = 4;
      for (let s = 0; s < steps; s++) {
        if (s % 2 === 1) continue; // skip every other for dashes
        const t = s / steps;
        const dx = a.x + (b.x - a.x) * t;
        const dy = a.y + (b.y - a.y) * t;
        this.pathGraphics.fillCircle(dx, dy, 1.5);
      }
    }
    // End dot
    const last = this.gridManager.gridToWorld(path[path.length - 1].x, path[path.length - 1].y);
    this.pathGraphics.fillCircle(last.x, last.y, 1.5);
  }

  update(time: number, delta: number) {
    if (this.gameOver) return;

    // Update wave system (countdown / wave-clear detection)
    this.waveSystem.update(delta);

    // Update towers — get damage events
    const unitPositions = this.unitSystem.getUnitPositions();
    const damageEvents = this.towerSystem.update(time, delta, unitPositions);

    // Apply damage to units — handle bounty
    let bountyTotal = 0;
    for (const evt of damageEvents) {
      const result = this.unitSystem.applyDamage(evt.unitId, evt.damage);
      if (result?.killed) {
        bountyTotal += result.bounty;
      }
    }
    if (bountyTotal > 0) {
      this.earnGold(bountyTotal);
    }

    // Update units — move along path
    const { reachedExit } = this.unitSystem.update(time, delta);

    // Units reaching exit damage the player
    for (const _unitId of reachedExit) {
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
  }

  private cleanup() {
    EventBus.off('request-place-tower', this.onPlaceTower);
    EventBus.off('request-start-wave', this.onStartWave);
    EventBus.off('game-won', this.onGameWon);
    this.towerSystem.destroy();
    this.unitSystem.destroy();
    this.waveSystem.destroy();
  }
}
