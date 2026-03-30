import Phaser from 'phaser';
import { ALL_TOWERS, UNITS, TILE_SIZE, INITIAL_PLAYER_HP, INITIAL_GOLD, BASE_TOWERS, FOREST_GATE_MAP } from '@gld/shared';
import { GridManager } from '../systems/GridManager';
import { TowerSystem } from '../systems/TowerSystem';
import { UnitSystem } from '../systems/UnitSystem';
import { EventBus } from '../EventBus';

export class GameScene extends Phaser.Scene {
  private gridManager!: GridManager;
  private towerSystem!: TowerSystem;
  private unitSystem!: UnitSystem;
  private hoverGraphics!: Phaser.GameObjects.Graphics;
  private placementGraphics!: Phaser.GameObjects.Graphics;

  private playerHp = INITIAL_PLAYER_HP;
  private gold = INITIAL_GOLD;
  private selectedTowerId: string | null = null;
  private gameOver = false;
  private onSelectTower!: (data: { towerDefId: string }) => void;
  private onPlaceTower!: (data: { col: number; row: number; towerDefId: string }) => void;
  private onSendUnit!: (data: { unitDefId: string; count: number }) => void;

  constructor() {
    super('Game');
  }

  create() {
    this.gridManager = new GridManager(FOREST_GATE_MAP);
    this.towerSystem = new TowerSystem(this, this.gridManager);
    this.unitSystem = new UnitSystem(this, this.gridManager);
    this.unitSystem.setPath(this.gridManager.getPath());

    this.events.on('shutdown', this.cleanup, this);

    // Load and render tilemap
    const map = this.make.tilemap({ key: 'tilemap-forest-gate' });
    const tileset = map.addTilesetImage('tileset', 'tileset-forest');
    if (tileset) {
      map.createLayer('ground', tileset);
      map.createLayer('path', tileset);
      map.createLayer('decoration', tileset);
    }

    // Render placement points (gold circles on empty points)
    this.placementGraphics = this.add.graphics();
    this.placementGraphics.setDepth(1);
    this.redrawPlacementPoints();

    // Hover highlight
    this.hoverGraphics = this.add.graphics();

    // Input: hover highlight — only on placement points
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const gridPos = this.gridManager.worldToGrid(pointer.worldX, pointer.worldY);
      this.hoverGraphics.clear();
      if (this.gridManager.isValidPlacementPoint(gridPos.x, gridPos.y)) {
        const isEmpty = this.gridManager.isPlacementPointEmpty(gridPos.x, gridPos.y);
        this.hoverGraphics.fillStyle(isEmpty ? 0x7f5af0 : 0xe53170, 0.25);
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

    this.onSelectTower = (data) => {
      this.selectedTowerId = data.towerDefId;
    };

    this.onPlaceTower = (data) => {
      this.handlePlaceTower(data.col, data.row, data.towerDefId);
    };

    this.onSendUnit = (data) => {
      const unitDef = UNITS.find((u) => u.id === data.unitDefId);
      if (!unitDef) return;
      const affordable = Math.min(data.count, Math.floor(this.gold / unitDef.sendCost));
      if (affordable <= 0) return;
      this.spendGold(unitDef.sendCost * affordable);
      this.unitSystem.queueUnits(data.unitDefId, affordable);
    };

    EventBus.on('request-select-tower', this.onSelectTower);
    EventBus.on('request-place-tower', this.onPlaceTower);
    EventBus.on('request-send-unit', this.onSendUnit);

    // Keyboard tower selection (1-4)
    const keyNames = ['ONE', 'TWO', 'THREE', 'FOUR'] as const;
    keyNames.forEach((key, i) => {
      if (BASE_TOWERS[i]) {
        this.input.keyboard?.on(`keydown-${key}`, () => { this.selectedTowerId = BASE_TOWERS[i].id; });
      }
    });

    EventBus.emit('game-ready');
    EventBus.emit('gold-changed', { gold: this.gold });
    EventBus.emit('current-scene-ready', this);
  }

  private spendGold(amount: number): boolean {
    if (this.gold < amount) return false;
    this.gold -= amount;
    EventBus.emit('gold-changed', { gold: this.gold });
    return true;
  }

  private handlePlaceTower(gridX: number, gridY: number, towerDefId: string): void {
    const towerDef = ALL_TOWERS.find((t) => t.id === towerDefId);
    if (!towerDef) return;
    if (this.gold < towerDef.cost) return;
    const placed = this.towerSystem.placeTower(gridX, gridY, towerDefId);
    if (placed) {
      this.spendGold(towerDef.cost);
      this.redrawPlacementPoints();
    }
  }

  private redrawPlacementPoints(): void {
    this.placementGraphics.clear();
    for (const pp of this.gridManager.getPlacementPoints()) {
      if (!this.gridManager.isPlacementPointEmpty(pp.x, pp.y)) continue;
      const world = this.gridManager.gridToWorld(pp.x, pp.y);
      this.placementGraphics.fillStyle(0xe2b714, 0.25);
      this.placementGraphics.fillCircle(world.x, world.y, TILE_SIZE * 0.4);
      this.placementGraphics.lineStyle(1, 0xe2b714, 0.5);
      this.placementGraphics.strokeCircle(world.x, world.y, TILE_SIZE * 0.4);
    }
  }

  update(time: number, delta: number) {
    if (this.gameOver) return;

    const unitPositions = this.unitSystem.getUnitPositions();
    const damageEvents = this.towerSystem.update(time, delta, unitPositions);

    for (const evt of damageEvents) {
      this.unitSystem.applyDamage(evt.unitId, evt.damage);
    }

    const { reachedExit } = this.unitSystem.update(time, delta);

    for (const _unitId of reachedExit) {
      this.playerHp = Math.max(0, this.playerHp - 1);
      EventBus.emit('player-damaged', {
        playerId: 'local',
        damage: 1,
        remainingHp: this.playerHp,
      });

      if (this.playerHp <= 0) {
        this.gameOver = true;
        this.unitSystem.destroy();
        EventBus.emit('game-over', { winnerId: 'opponent' });
        return;
      }
    }
  }

  private cleanup() {
    EventBus.off('request-select-tower', this.onSelectTower);
    EventBus.off('request-place-tower', this.onPlaceTower);
    EventBus.off('request-send-unit', this.onSendUnit);
    this.towerSystem.destroy();
    this.unitSystem.destroy();
  }
}
