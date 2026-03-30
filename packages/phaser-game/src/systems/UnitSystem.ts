import Phaser from 'phaser';
import type { UnitDef, ActiveUnit, Position } from '@gld/shared';
import { UNITS, TILE_SIZE } from '@gld/shared';
import { GridManager } from './GridManager';
import { EventBus } from '../EventBus';

interface UnitInstance {
  data: ActiveUnit;
  def: UnitDef;
  graphics: Phaser.GameObjects.Graphics;
  worldX: number;
  worldY: number;
}

export class UnitSystem {
  private units: Map<string, UnitInstance> = new Map();
  private scene: Phaser.Scene;
  private gridManager: GridManager;
  private currentPath: Position[] = [];
  private nextId = 0;
  private spawnQueue: Array<{ def: UnitDef; remaining: number }> = [];
  private spawnTimer = 0;
  private readonly SPAWN_INTERVAL = 300; // ms between spawns

  constructor(scene: Phaser.Scene, gridManager: GridManager) {
    this.scene = scene;
    this.gridManager = gridManager;
  }

  setPath(path: Position[]): void {
    const oldPath = this.currentPath;
    this.currentPath = path;

    // Remap in-flight units to nearest cell on the new path
    if (oldPath.length > 0 && path.length > 0) {
      for (const unit of this.units.values()) {
        const unitGrid = unit.data.position;
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < path.length; i++) {
          const dx = path[i].x - unitGrid.x;
          const dy = path[i].y - unitGrid.y;
          const d = dx * dx + dy * dy;
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }
        unit.data.pathIndex = Math.min(bestIdx, path.length - 2);
      }
    }
  }

  queueUnits(unitDefId: string, count: number): void {
    const def = UNITS.find((u) => u.id === unitDefId);
    if (!def) return;
    this.spawnQueue.push({ def, remaining: count });
    EventBus.emit('unit-spawned', { unitType: def.type, count });
  }

  private spawnUnit(def: UnitDef): void {
    if (this.currentPath.length === 0) return;

    const instanceId = `unit_${this.nextId++}`;
    const startGrid = this.currentPath[0];
    const startWorld = this.gridManager.gridToWorld(startGrid.x, startGrid.y);

    const unitData: ActiveUnit = {
      instanceId,
      defId: def.id,
      position: { x: startGrid.x, y: startGrid.y },
      hp: def.stats.hp,
      pathIndex: 0,
    };

    const graphics = this.scene.add.graphics();
    this.renderUnit(graphics, startWorld.x, startWorld.y, def, def.stats.hp);

    this.units.set(instanceId, {
      data: unitData,
      def,
      graphics,
      worldX: startWorld.x,
      worldY: startWorld.y,
    });
  }

  private static readonly UNIT_COLORS: Record<string, number> = {
    scout_drone: 0x72f1b8,
    battle_robot: 0x5b8cff,
    heavy_walker: 0xff8c42,
    stealth_drone: 0xb388ff,
    titan: 0xff4757,
  };

  private renderUnit(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    def: UnitDef,
    hp: number,
  ): void {
    graphics.clear();
    const size = TILE_SIZE * 0.28;
    const color = UnitSystem.UNIT_COLORS[def.type] ?? 0x72f1b8;

    // Shadow
    graphics.fillStyle(0x000000, 0.2);
    graphics.fillEllipse(x, y + size + 2, size * 2, size * 0.6);

    // Body glow
    graphics.fillStyle(color, 0.1);
    graphics.fillCircle(x, y, size * 1.6);

    // Unit body — shape per type
    graphics.fillStyle(color, 0.9);
    switch (def.type) {
      case 'scout_drone':
        // Small triangle (fast)
        graphics.fillTriangle(x, y - size, x + size, y + size * 0.6, x - size, y + size * 0.6);
        graphics.lineStyle(1, 0xffffff, 0.3);
        graphics.strokeTriangle(x, y - size, x + size, y + size * 0.6, x - size, y + size * 0.6);
        break;
      case 'battle_robot':
        // Square with notch
        graphics.fillRect(x - size, y - size, size * 2, size * 2);
        graphics.fillStyle(0x0a0a14, 1);
        graphics.fillRect(x - size * 0.3, y - size * 1.1, size * 0.6, size * 0.4);
        break;
      case 'heavy_walker':
        // Thick hexagon
        this.drawPoly(graphics, x, y, size * 1.1, 6);
        graphics.lineStyle(2, 0xffffff, 0.2);
        this.strokePoly(graphics, x, y, size * 1.1, 6);
        break;
      case 'stealth_drone':
        // Diamond (stealthy)
        graphics.fillStyle(color, 0.6);
        this.drawPoly(graphics, x, y, size, 4);
        // Flicker effect via partial alpha
        graphics.lineStyle(1, color, 0.5);
        this.strokePoly(graphics, x, y, size * 1.2, 4);
        break;
      case 'titan':
        // Large octagon (boss)
        this.drawPoly(graphics, x, y, size * 1.3, 8);
        graphics.lineStyle(2, 0xffffff, 0.3);
        this.strokePoly(graphics, x, y, size * 1.3, 8);
        // Inner core
        graphics.fillStyle(0xffffff, 0.15);
        graphics.fillCircle(x, y, size * 0.5);
        break;
      default:
        graphics.fillCircle(x, y, size);
    }

    // HP bar
    const barWidth = TILE_SIZE * 0.7;
    const barHeight = 2;
    const barY = y - size - 7;
    // BG
    graphics.fillStyle(0x0a0a14, 0.8);
    graphics.fillRect(x - barWidth / 2 - 1, barY - 1, barWidth + 2, barHeight + 2);
    // Fill
    const hpRatio = Math.max(0, hp / def.stats.hp);
    const barColor = hpRatio > 0.5 ? 0x2cb67d : hpRatio > 0.25 ? 0xe2b714 : 0xe53170;
    graphics.fillStyle(barColor, 1);
    graphics.fillRect(x - barWidth / 2, barY, barWidth * hpRatio, barHeight);
  }

  private drawPoly(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, sides: number): void {
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < sides; i++) {
      const a = (Math.PI * 2 / sides) * i - Math.PI / 2;
      points.push(new Phaser.Geom.Point(cx + r * Math.cos(a), cy + r * Math.sin(a)));
    }
    g.fillPoints(points, true);
  }

  private strokePoly(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, sides: number): void {
    g.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = (Math.PI * 2 / sides) * (i % sides) - Math.PI / 2;
      const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }

  applyDamage(unitId: string, rawDamage: number): void {
    const unit = this.units.get(unitId);
    if (!unit) return;

    const armor = unit.def.stats.armor;
    const damage = Math.max(1, rawDamage - armor);
    unit.data.hp -= damage;

    if (unit.data.hp <= 0) {
      unit.graphics.destroy();
      this.units.delete(unitId);
    }
  }

  update(time: number, delta: number): { reachedExit: string[] } {
    const reachedExit: string[] = [];

    // Process spawn queue
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.SPAWN_INTERVAL && this.spawnQueue.length > 0) {
      this.spawnTimer = 0;
      const front = this.spawnQueue[0];
      this.spawnUnit(front.def);
      front.remaining--;
      if (front.remaining <= 0) {
        this.spawnQueue.shift();
      }
    }

    // Move units along path
    const dt = delta / 1000;

    for (const [id, unit] of this.units) {
      const pathIdx = unit.data.pathIndex;
      if (pathIdx >= this.currentPath.length - 1) {
        // Reached exit
        reachedExit.push(id);
        unit.graphics.destroy();
        this.units.delete(id);
        continue;
      }

      // Move toward next waypoint
      const nextGrid = this.currentPath[pathIdx + 1];
      const targetWorld = this.gridManager.gridToWorld(nextGrid.x, nextGrid.y);
      const speed = unit.def.stats.speed * TILE_SIZE; // pixels per second

      const dx = targetWorld.x - unit.worldX;
      const dy = targetWorld.y - unit.worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < speed * dt) {
        // Reached waypoint
        unit.worldX = targetWorld.x;
        unit.worldY = targetWorld.y;
        unit.data.pathIndex++;
        unit.data.position = { x: nextGrid.x, y: nextGrid.y };
      } else {
        // Interpolate
        unit.worldX += (dx / dist) * speed * dt;
        unit.worldY += (dy / dist) * speed * dt;
      }

      this.renderUnit(unit.graphics, unit.worldX, unit.worldY, unit.def, unit.data.hp);
    }

    return { reachedExit };
  }

  getUnitPositions(): Array<{ instanceId: string; x: number; y: number; hp: number }> {
    return Array.from(this.units.values()).map((u) => ({
      instanceId: u.data.instanceId,
      x: u.worldX,
      y: u.worldY,
      hp: u.data.hp,
    }));
  }

  getActiveUnits(): ActiveUnit[] {
    return Array.from(this.units.values()).map((u) => u.data);
  }

  destroy(): void {
    for (const unit of this.units.values()) {
      unit.graphics.destroy();
    }
    this.units.clear();
    this.spawnQueue = [];
  }
}
