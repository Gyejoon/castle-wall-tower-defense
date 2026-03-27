import Phaser from 'phaser';
import type { TowerDef, PlacedTower, Position } from '@gld/shared';
import { ALL_TOWERS, TILE_SIZE } from '@gld/shared';
import { GridManager } from './GridManager';
import { PathfindingSystem } from './PathfindingSystem';
import { EventBus } from '../EventBus';

interface TowerInstance {
  data: PlacedTower;
  def: TowerDef;
  graphics: Phaser.GameObjects.Graphics;
  lastAttackTime: number;
}

export class TowerSystem {
  private towers: Map<string, TowerInstance> = new Map();
  private scene: Phaser.Scene;
  private gridManager: GridManager;
  private pathfinding: PathfindingSystem;
  private nextId = 0;
  private attackGraphics: Phaser.GameObjects.Graphics;
  private attackLines: Array<{ x1: number; y1: number; x2: number; y2: number; color: number; ttl: number }> = [];

  constructor(scene: Phaser.Scene, gridManager: GridManager, pathfinding: PathfindingSystem) {
    this.scene = scene;
    this.gridManager = gridManager;
    this.pathfinding = pathfinding;
    this.attackGraphics = scene.add.graphics();
    this.attackGraphics.setDepth(10);
  }

  placeTower(gridX: number, gridY: number, towerDefId: string): PlacedTower | null {
    const def = ALL_TOWERS.find((t) => t.id === towerDefId);
    if (!def) return null;

    // Check if placement would block the path
    const placed = this.gridManager.placeTower(gridX, gridY, towerDefId);
    if (!placed) return null;

    // Verify path still exists
    this.pathfinding.invalidateCache();
    const walkGrid = this.gridManager.getWalkabilityGrid();
    const path = this.pathfinding.findPath(
      walkGrid,
      this.gridManager.spawnPoint,
      this.gridManager.exitPoint,
    );

    if (!path) {
      // Revert placement — would block all paths
      this.gridManager.removeTower(gridX, gridY);
      this.pathfinding.invalidateCache();
      EventBus.emit('tower-placed', { col: gridX, row: gridY, towerId: towerDefId, success: false });
      return null;
    }

    const instanceId = `tower_${this.nextId++}`;
    const worldPos = this.gridManager.gridToWorld(gridX, gridY);

    const towerData: PlacedTower = {
      instanceId,
      defId: towerDefId,
      position: { x: gridX, y: gridY },
      level: 1,
    };

    const graphics = this.scene.add.graphics();
    this.renderTower(graphics, worldPos, def);

    this.towers.set(instanceId, {
      data: towerData,
      def,
      graphics,
      lastAttackTime: 0,
    });

    EventBus.emit('tower-placed', { col: gridX, row: gridY, towerId: towerDefId, success: true });
    EventBus.emit('path-updated', { path });

    return towerData;
  }

  private renderTower(graphics: Phaser.GameObjects.Graphics, pos: Position, def: TowerDef): void {
    const color = parseInt(def.color.replace('#', ''), 16);
    const size = TILE_SIZE * 0.35;

    graphics.clear();

    // Base platform (dark circle)
    graphics.fillStyle(0x0a0a14, 0.8);
    graphics.fillCircle(pos.x, pos.y, TILE_SIZE * 0.45);
    graphics.lineStyle(1, color, 0.3);
    graphics.strokeCircle(pos.x, pos.y, TILE_SIZE * 0.45);

    // Glow under tower
    graphics.fillStyle(color, 0.08);
    graphics.fillCircle(pos.x, pos.y, TILE_SIZE * 0.6);

    // Tower shape with outline
    graphics.fillStyle(color, 0.9);

    switch (def.shape) {
      case 'diamond':
        this.drawShape(graphics, pos, size, 4, -Math.PI / 4);
        break;
      case 'circle':
        graphics.fillCircle(pos.x, pos.y, size * 0.8);
        graphics.lineStyle(2, color, 1);
        graphics.strokeCircle(pos.x, pos.y, size * 0.8);
        // Inner ring
        graphics.lineStyle(1, 0xffffff, 0.3);
        graphics.strokeCircle(pos.x, pos.y, size * 0.4);
        break;
      case 'hexagon':
        this.drawShape(graphics, pos, size, 6, -Math.PI / 6);
        break;
      case 'shield':
        // Shield: rounded rectangle with chevron
        graphics.fillRoundedRect(pos.x - size * 0.65, pos.y - size * 0.85, size * 1.3, size * 1.7, 3);
        graphics.lineStyle(2, color, 1);
        graphics.strokeRoundedRect(pos.x - size * 0.65, pos.y - size * 0.85, size * 1.3, size * 1.7, 3);
        // Chevron mark
        graphics.lineStyle(2, 0xffffff, 0.4);
        graphics.beginPath();
        graphics.moveTo(pos.x - 3, pos.y - 2);
        graphics.lineTo(pos.x, pos.y + 3);
        graphics.lineTo(pos.x + 3, pos.y - 2);
        graphics.strokePath();
        break;
      case 'star':
        this.drawShape(graphics, pos, size, 5, -Math.PI / 2, true);
        break;
    }

    // Range indicator (dashed circle feel via dots)
    const rangePx = def.stats.range * TILE_SIZE;
    if (rangePx > 0) {
      const dots = 32;
      graphics.fillStyle(color, 0.1);
      for (let i = 0; i < dots; i++) {
        const a = (Math.PI * 2 / dots) * i;
        graphics.fillCircle(pos.x + rangePx * Math.cos(a), pos.y + rangePx * Math.sin(a), 1);
      }
    }
  }

  private drawShape(
    g: Phaser.GameObjects.Graphics,
    pos: Position,
    size: number,
    sides: number,
    startAngle: number,
    star = false,
  ): void {
    const color = g.defaultFillColor;
    const count = star ? sides * 2 : sides;
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < count; i++) {
      const angle = startAngle + (Math.PI * 2 / count) * i;
      const r = star && i % 2 === 1 ? size * 0.45 : size;
      points.push(new Phaser.Geom.Point(pos.x + r * Math.cos(angle), pos.y + r * Math.sin(angle)));
    }
    g.fillPoints(points, true);
    // Outline
    g.lineStyle(1.5, 0xffffff, 0.25);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.closePath();
    g.strokePath();
  }

  /**
   * Update towers: find targets and attack.
   * Returns damage events to apply to units.
   */
  private damageEventsBuffer: Array<{ unitId: string; damage: number }> = [];

  update(
    time: number,
    delta: number,
    unitPositions: Array<{ instanceId: string; x: number; y: number; hp: number }>,
  ): Array<{ unitId: string; damage: number }> {
    this.damageEventsBuffer.length = 0;

    for (const tower of this.towers.values()) {
      const { def, data } = tower;
      if (def.stats.attackSpeed <= 0) continue;

      const attackInterval = 1000 / def.stats.attackSpeed;
      if (time - tower.lastAttackTime < attackInterval) continue;

      const towerWorld = this.gridManager.gridToWorld(data.position.x, data.position.y);
      const rangeSq = (def.stats.range * TILE_SIZE) ** 2;

      let closestUnit: (typeof unitPositions)[0] | null = null;
      let closestDistSq = Infinity;

      for (const unit of unitPositions) {
        if (unit.hp <= 0) continue;
        const dx = towerWorld.x - unit.x;
        const dy = towerWorld.y - unit.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= rangeSq && distSq < closestDistSq) {
          closestDistSq = distSq;
          closestUnit = unit;
        }
      }

      if (closestUnit) {
        tower.lastAttackTime = time;
        this.damageEventsBuffer.push({
          unitId: closestUnit.instanceId,
          damage: def.stats.damage,
        });
        const color = parseInt(def.color.replace('#', ''), 16);
        this.attackLines.push({
          x1: towerWorld.x, y1: towerWorld.y,
          x2: closestUnit.x, y2: closestUnit.y,
          color, ttl: 80,
        });
      }
    }

    // Render attack lines with in-place compaction
    this.attackGraphics.clear();
    let write = 0;
    for (let i = 0; i < this.attackLines.length; i++) {
      const line = this.attackLines[i];
      line.ttl -= delta;
      if (line.ttl <= 0) continue;
      const alpha = line.ttl / 80;
      this.attackGraphics.lineStyle(2, line.color, alpha * 0.8);
      this.attackGraphics.beginPath();
      this.attackGraphics.moveTo(line.x1, line.y1);
      this.attackGraphics.lineTo(line.x2, line.y2);
      this.attackGraphics.strokePath();
      this.attackGraphics.lineStyle(4, line.color, alpha * 0.2);
      this.attackGraphics.beginPath();
      this.attackGraphics.moveTo(line.x1, line.y1);
      this.attackGraphics.lineTo(line.x2, line.y2);
      this.attackGraphics.strokePath();
      if (line.ttl > 50) {
        this.attackGraphics.fillStyle(0xffffff, alpha * 0.6);
        this.attackGraphics.fillCircle(line.x2, line.y2, 4);
      }
      this.attackLines[write++] = line;
    }
    this.attackLines.length = write;

    return this.damageEventsBuffer;
  }

  getTowers(): PlacedTower[] {
    return Array.from(this.towers.values()).map((t) => t.data);
  }

  destroy(): void {
    for (const tower of this.towers.values()) {
      tower.graphics.destroy();
    }
    this.towers.clear();
    this.attackGraphics.destroy();
    this.attackLines = [];
  }
}
