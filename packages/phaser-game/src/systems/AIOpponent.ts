import type { TowerDef, Position } from '@gld/shared';
import {
  INITIAL_PLAYER_HP,
  INITIAL_GOLD,
  RANDOM_TOWER_COST,
  FOREST_GATE_MAP,
  TILE_SIZE,
  UNITS,
  EMOTES,
  getTowersByTier,
} from '@gld/shared';
import { GridManager } from './GridManager';
import { RandomTowerSystem } from './RandomTowerSystem';
import { EventBus } from '../EventBus';

// Lightweight TowerSystem for AI (no Phaser graphics)
interface AITower {
  id: string;
  defId: string;
  def: TowerDef;
  position: Position;
  lastAttackTime: number;
}

interface AIUnit {
  id: string;
  defId: string;
  hp: number;
  maxHp: number;
  speed: number;
  armor: number;
  pathIndex: number;
  worldX: number;
  worldY: number;
  bounty: number;
}

export class AIOpponent {
  private gridManager: GridManager;
  private randomTowerSystem: RandomTowerSystem;
  private towers: AITower[] = [];
  private units: AIUnit[] = [];
  private spawnQueue: Array<{ defId: string; hp: number; maxHp: number; speed: number; armor: number; bounty: number; remaining: number }> = [];
  private spawnTimer = 0;
  private readonly SPAWN_INTERVAL = 300;
  private nextTowerId = 0;
  private nextUnitId = 0;
  private emoteTimer = 0;
  private readonly EMOTE_INTERVAL = 15000; // 15 seconds between possible emotes

  hp = INITIAL_PLAYER_HP;
  gold = INITIAL_GOLD;
  towerCount = 0;

  constructor() {
    this.gridManager = new GridManager(FOREST_GATE_MAP);
    this.randomTowerSystem = new RandomTowerSystem();
  }

  /** AI build phase: spend gold on random towers */
  buildPhase(): void {
    // Buy towers while affordable
    let attempts = 0;
    while (this.gold >= RANDOM_TOWER_COST && attempts < 10) {
      attempts++;
      const tower = this.randomTowerSystem.rollRandomTower();

      // Find a valid placement position
      const pos = this.findRandomPlacement();
      if (pos) {
        this.gold -= RANDOM_TOWER_COST;
        this.placeTower(pos.x, pos.y, tower);
      }
    }

    // 20% chance to try merging
    if (Math.random() < 0.2 && this.towers.length >= 2) {
      this.tryMerge();
    }

    this.emitState();
  }

  private findRandomPlacement(): Position | null {
    const candidates = FOREST_GATE_MAP.placementPoints.filter(
      (p) => this.gridManager.isWalkable(p.x, p.y),
    );
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private placeTower(x: number, y: number, def: TowerDef): void {
    if (!this.gridManager.placeTower(x, y, def.id)) return;

    this.towers.push({
      id: `ai_tower_${this.nextTowerId++}`,
      defId: def.id,
      def,
      position: { x, y },
      lastAttackTime: 0,
    });
    this.towerCount = this.towers.length;
  }

  private tryMerge(): void {
    for (let i = 0; i < this.towers.length; i++) {
      for (let j = i + 1; j < this.towers.length; j++) {
        if (this.towers[i].defId === this.towers[j].defId && this.towers[i].def.tier < 5) {
          const nextTier = this.towers[i].def.tier + 1;
          const nextTierTowers = getTowersByTier(nextTier);
          const rolledTower = nextTierTowers[Math.floor(Math.random() * nextTierTowers.length)];

          // Remove both towers from grid, then re-place merged tower
          const posJ = this.towers[j].position;
          this.gridManager.removeTower(this.towers[i].position.x, this.towers[i].position.y);
          this.gridManager.removeTower(posJ.x, posJ.y);
          this.gridManager.placeTower(posJ.x, posJ.y, rolledTower.id);

          this.towers[j] = {
            id: `ai_tower_${this.nextTowerId++}`,
            defId: rolledTower.id,
            def: rolledTower,
            position: posJ,
            lastAttackTime: 0,
          };
          this.towers.splice(i, 1);
          this.towerCount = this.towers.length;
          return;
        }
      }
    }
  }

  /** Queue wave units on AI field */
  queueUnits(unitDefId: string, count: number): void {
    const def = UNITS.find((u) => u.id === unitDefId);
    if (!def) return;
    this.spawnQueue.push({
      defId: def.id,
      hp: def.stats.hp,
      maxHp: def.stats.hp,
      speed: def.stats.speed,
      armor: def.stats.armor,
      bounty: def.bounty,
      remaining: count,
    });
  }

  /** Queue transfer units (50% HP) */
  queueTransferUnits(unitDefId: string, count: number): void {
    const def = UNITS.find((u) => u.id === unitDefId);
    if (!def) return;
    this.spawnQueue.push({
      defId: def.id,
      hp: Math.floor(def.stats.hp * 0.5),
      maxHp: def.stats.hp,
      speed: def.stats.speed,
      armor: def.stats.armor,
      bounty: def.bounty,
      remaining: count,
    });
  }

  /** Update AI simulation — returns killed unit defIds for kill transfer */
  update(time: number, delta: number): { reachedExit: number; killedUnits: string[] } {
    const killedUnits: string[] = [];
    let reachedExit = 0;
    const path = FOREST_GATE_MAP.path;
    const dt = delta / 1000;

    // Spawn
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.SPAWN_INTERVAL && this.spawnQueue.length > 0) {
      this.spawnTimer = 0;
      const front = this.spawnQueue[0];
      const startWorld = this.gridManager.gridToWorld(path[0].x, path[0].y);
      this.units.push({
        id: `ai_unit_${this.nextUnitId++}`,
        defId: front.defId,
        hp: front.hp,
        maxHp: front.maxHp,
        speed: front.speed,
        armor: front.armor,
        pathIndex: 0,
        worldX: startWorld.x,
        worldY: startWorld.y,
        bounty: front.bounty,
      });
      front.remaining--;
      if (front.remaining <= 0) this.spawnQueue.shift();
    }

    // Tower attacks
    for (const tower of this.towers) {
      if (tower.def.stats.attackSpeed <= 0) continue;
      const interval = 1000 / tower.def.stats.attackSpeed;
      if (time - tower.lastAttackTime < interval) continue;

      const towerWorld = this.gridManager.gridToWorld(tower.position.x, tower.position.y);
      const rangeSq = (tower.def.stats.range * TILE_SIZE) ** 2;
      let closestUnit: AIUnit | null = null;
      let closestDistSq = Infinity;

      for (const unit of this.units) {
        if (unit.hp <= 0) continue;
        const dx = towerWorld.x - unit.worldX;
        const dy = towerWorld.y - unit.worldY;
        const distSq = dx * dx + dy * dy;
        if (distSq <= rangeSq && distSq < closestDistSq) {
          closestDistSq = distSq;
          closestUnit = unit;
        }
      }

      if (closestUnit) {
        tower.lastAttackTime = time;
        const damage = Math.max(1, tower.def.stats.damage - closestUnit.armor);
        closestUnit.hp -= damage;
      }
    }

    // Remove dead units (in-place compaction), collect bounty
    let writeIdx = 0;
    for (let i = 0; i < this.units.length; i++) {
      const unit = this.units[i];
      if (unit.hp <= 0) {
        this.gold += unit.bounty;
        killedUnits.push(unit.defId);
        continue;
      }
      this.units[writeIdx++] = unit;
    }
    this.units.length = writeIdx;

    // Move units, track exits (in-place removal)
    writeIdx = 0;
    for (let i = 0; i < this.units.length; i++) {
      const unit = this.units[i];
      if (unit.pathIndex >= path.length - 1) {
        reachedExit++;
        continue;
      }

      const nextGrid = path[unit.pathIndex + 1];
      const targetWorld = this.gridManager.gridToWorld(nextGrid.x, nextGrid.y);
      const speed = unit.speed * TILE_SIZE;
      const dx = targetWorld.x - unit.worldX;
      const dy = targetWorld.y - unit.worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < speed * dt) {
        unit.worldX = targetWorld.x;
        unit.worldY = targetWorld.y;
        unit.pathIndex++;
      } else {
        unit.worldX += (dx / dist) * speed * dt;
        unit.worldY += (dy / dist) * speed * dt;
      }
      this.units[writeIdx++] = unit;
    }
    this.units.length = writeIdx;

    // Handle exit damage
    if (reachedExit > 0) {
      this.hp = Math.max(0, this.hp - reachedExit);
    }

    // Random emote
    this.emoteTimer += delta;
    if (this.emoteTimer >= this.EMOTE_INTERVAL) {
      this.emoteTimer = 0;
      if (Math.random() < 0.3) {
        const emote = EMOTES[Math.floor(Math.random() * EMOTES.length)];
        EventBus.emit('emote-received', { emoteId: emote.id, playerId: 'opponent' });
      }
    }

    this.emitState();
    return { reachedExit, killedUnits };
  }

  hasActiveUnits(): boolean {
    return this.units.length > 0 || this.spawnQueue.length > 0;
  }

  private emitState(): void {
    EventBus.emit('opponent-state', {
      gold: this.gold,
      hp: this.hp,
      towerCount: this.towerCount,
    });
  }

  destroy(): void {
    this.towers = [];
    this.units = [];
    this.spawnQueue = [];
  }
}
