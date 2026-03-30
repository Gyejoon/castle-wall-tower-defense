import Phaser from 'phaser';
import type { UnitDef, ActiveUnit, Position } from '@gld/shared';
import { UNITS, TILE_SIZE } from '@gld/shared';
import { GridManager } from './GridManager';
import { EventBus } from '../EventBus';

interface UnitInstance {
  data: ActiveUnit;
  def: UnitDef;
  sprite: Phaser.GameObjects.Sprite;
  hpBar: Phaser.GameObjects.Graphics;
  worldX: number;
  worldY: number;
  slowFactor: number;       // 1.0 = normal, 0.7 = 30% slow
  slowRemaining: number;    // ms remaining
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

    const sprite = this.scene.add.sprite(startWorld.x, startWorld.y, `unit-${def.id}`);
    sprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
    sprite.play(`${def.id}-walk`);
    sprite.setDepth(6);

    const hpBar = this.scene.add.graphics();
    this.renderHpBar(hpBar, startWorld.x, startWorld.y, def, def.stats.hp);

    this.units.set(instanceId, {
      data: unitData,
      def,
      sprite,
      hpBar,
      worldX: startWorld.x,
      worldY: startWorld.y,
      slowFactor: 1.0,
      slowRemaining: 0,
    });
  }

  private renderHpBar(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    def: UnitDef,
    hp: number,
  ): void {
    graphics.clear();
    // HP bar
    const barWidth = TILE_SIZE * 0.7;
    const barHeight = 2;
    const barY = y - TILE_SIZE * 0.5 - 6;
    // BG
    graphics.fillStyle(0x0a0a14, 0.8);
    graphics.fillRect(x - barWidth / 2 - 1, barY - 1, barWidth + 2, barHeight + 2);
    // Fill
    const hpRatio = Math.max(0, hp / def.stats.hp);
    const barColor = hpRatio > 0.5 ? 0x2cb67d : hpRatio > 0.25 ? 0xe2b714 : 0xe53170;
    graphics.fillStyle(barColor, 1);
    graphics.fillRect(x - barWidth / 2, barY, barWidth * hpRatio, barHeight);
  }

  applySlow(unitId: string, factor: number, durationMs: number): void {
    const unit = this.units.get(unitId);
    if (!unit) return;
    unit.slowFactor = factor;
    unit.slowRemaining = durationMs;
    unit.sprite.setTint(0x88ccff); // blue tint for slow
  }

  applyDamage(unitId: string, rawDamage: number): { killed: boolean; bounty: number } | null {
    const unit = this.units.get(unitId);
    if (!unit) return null;

    const armor = unit.def.stats.armor;
    const damage = Math.max(1, rawDamage - armor);
    unit.data.hp -= damage;

    if (unit.data.hp <= 0) {
      unit.sprite.destroy();
      unit.hpBar.destroy();
      const deathFx = this.scene.add.sprite(unit.worldX, unit.worldY, 'unit-death');
      deathFx.setDisplaySize(TILE_SIZE, TILE_SIZE);
      deathFx.play('unit-death');
      deathFx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => deathFx.destroy());
      this.units.delete(unitId);
      return { killed: true, bounty: unit.def.bounty };
    }

    this.renderHpBar(unit.hpBar, unit.worldX, unit.worldY, unit.def, unit.data.hp);
    return { killed: false, bounty: 0 };
  }

  hasActiveUnits(): boolean {
    return this.units.size > 0;
  }

  hasQueuedUnits(): boolean {
    return this.spawnQueue.length > 0;
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
        unit.sprite.destroy();
        unit.hpBar.destroy();
        this.units.delete(id);
        continue;
      }

      // Decay slow effect
      if (unit.slowRemaining > 0) {
        unit.slowRemaining -= delta;
        if (unit.slowRemaining <= 0) {
          unit.slowFactor = 1.0;
          unit.slowRemaining = 0;
          unit.sprite.clearTint();
        }
      }

      // Move toward next waypoint
      const nextGrid = this.currentPath[pathIdx + 1];
      const targetWorld = this.gridManager.gridToWorld(nextGrid.x, nextGrid.y);
      const speed = unit.def.stats.speed * TILE_SIZE * unit.slowFactor; // pixels per second

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

      unit.sprite.setPosition(unit.worldX, unit.worldY);
      this.renderHpBar(unit.hpBar, unit.worldX, unit.worldY, unit.def, unit.data.hp);
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
      unit.sprite.destroy();
      unit.hpBar.destroy();
    }
    this.units.clear();
    this.spawnQueue = [];
  }
}
