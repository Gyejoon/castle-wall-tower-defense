import Phaser from 'phaser';
import {
  ALL_TOWERS,
  TILE_SIZE,
  INITIAL_PLAYER_HP,
  INITIAL_GOLD,
  BASE_TOWERS,
  GHOST_BATTLE_WAVES,
  type GhostRecord,
  type PressureChoice,
} from '@gld/shared';
import { GridManager } from '../systems/GridManager';
import { TowerSystem } from '../systems/TowerSystem';
import { UnitSystem } from '../systems/UnitSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { PressureSystem } from '../systems/PressureSystem';
import { GhostRecorder } from '../systems/GhostRecorder';
import { GhostPlayer } from '../systems/GhostPlayer';
import { EventBus } from '../EventBus';
import { getPlacementGuardFailure } from '../placementRules';
import { soundGenerator } from '../audio/SoundGenerator';

export class GameScene extends Phaser.Scene {
  private gridManager!: GridManager;
  private towerSystem!: TowerSystem;
  private unitSystem!: UnitSystem;
  private waveSystem!: WaveSystem;
  private pressureSystem!: PressureSystem;
  private ghostRecorder!: GhostRecorder;
  private ghostPlayer!: GhostPlayer;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private hoverGraphics!: Phaser.GameObjects.Graphics;
  private placementGraphics!: Phaser.GameObjects.Graphics;

  private playerHp = INITIAL_PLAYER_HP;
  private gold = INITIAL_GOLD;
  private selectedTowerId: string | null = null;
  private gameOver = false;
  private ghostBattleActive = false;
  private boardBackground?: Phaser.GameObjects.TileSprite;
  private spawnMarker?: Phaser.GameObjects.Image;
  private exitMarker?: Phaser.GameObjects.Image;
  private onPlaceTower!: (data: { col: number; row: number; towerDefId: string }) => void;
  private onSellTower!: (data: { col: number; row: number }) => void;
  private onSelectTower!: (data: { towerDefId: string }) => void;
  private onClearTowerSelection!: () => void;
  private onStartWave!: () => void;
  private onGameWon!: () => void;
  private onStartGhostBattle!: (data: { ghost: GhostRecord }) => void;
  private onPressureChoice!: (data: { choice: PressureChoice }) => void;
  private onWaveStartedLifecycle!: (data: { wave: number; totalWaves: number }) => void;
  private onWaveCompletedLifecycle!: (data: { wave: number; totalWaves: number }) => void;

  constructor() {
    super('Game');
  }

  create() {
    this.gridManager = new GridManager(FOREST_GATE_MAP);
    this.towerSystem = new TowerSystem(this, this.gridManager);
    this.unitSystem = new UnitSystem(this, this.gridManager);
    this.waveSystem = new WaveSystem(this.unitSystem);
    this.pressureSystem = new PressureSystem();
    this.ghostRecorder = new GhostRecorder();
    this.ghostPlayer = new GhostPlayer();
    this.ghostBattleActive = false;

    this.events.on('shutdown', this.cleanup, this);

    // Draw grid
    this.boardBackground = this.add.tileSprite(
      (this.gridManager.width * TILE_SIZE) / 2,
      (this.gridManager.height * TILE_SIZE) / 2,
      this.gridManager.width * TILE_SIZE,
      this.gridManager.height * TILE_SIZE,
      'grid-floor',
    );
    this.boardBackground.setAlpha(0.22);
    this.gridGraphics = this.add.graphics();
    this.gridManager.render(this.gridGraphics);

    const spawnWorld = this.gridManager.gridToWorld(
      this.gridManager.spawnPoint.x,
      this.gridManager.spawnPoint.y,
    );
    this.spawnMarker = this.add.image(spawnWorld.x, spawnWorld.y, 'spawn-tile');
    this.spawnMarker.setDisplaySize(TILE_SIZE, TILE_SIZE);
    this.spawnMarker.setAlpha(0.9);

    const exitWorld = this.gridManager.gridToWorld(
      this.gridManager.exitPoint.x,
      this.gridManager.exitPoint.y,
    );
    this.exitMarker = this.add.image(exitWorld.x, exitWorld.y, 'exit-tile');
    this.exitMarker.setDisplaySize(TILE_SIZE, TILE_SIZE);
    this.exitMarker.setAlpha(0.9);

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
    this.onSelectTower = (data) => {
      this.selectedTowerId = data.towerDefId;
    };
    this.onClearTowerSelection = () => {
      this.selectedTowerId = null;
    };

    this.onStartWave = () => {
      this.waveSystem.skipCountdown();
    };

    this.onGameWon = () => {
      this.endGame('local');
    };

    this.onStartGhostBattle = (data) => {
      this.ghostBattleActive = true;
      this.ghostPlayer.loadGhost(data.ghost);
      this.pressureSystem.setGhostPressures(data.ghost.waves);
      this.ghostRecorder.startRecording('Player');
      this.waveSystem.setMaxWaves(GHOST_BATTLE_WAVES);
    };

    this.onPressureChoice = (data) => {
      this.pressureSystem.setChoice(data.choice);
      this.ghostRecorder.recordPressure(data.choice);
    };

    this.onSellTower = (data) => {
      if (this.waveSystem.getPhase() !== 'building') return;
      const result = this.towerSystem.sellTower(data.col, data.row);
      if (result.success) {
        this.earnGold(result.refund);
        // Recalculate and update path
        const walkGrid = this.gridManager.getWalkabilityGrid();
        const path = this.pathfinding.findPath(walkGrid, this.gridManager.spawnPoint, this.gridManager.exitPoint);
        if (path) {
          this.unitSystem.setPath(path);
          this.drawPath(path);
          EventBus.emit('path-updated', { path });
        }
        EventBus.emit('tower-sold', { col: data.col, row: data.row, refund: result.refund });
      }
    };

    EventBus.on('request-select-tower', this.onSelectTower);
    EventBus.on('request-clear-tower-selection', this.onClearTowerSelection);
    EventBus.on('request-place-tower', this.onPlaceTower);
    EventBus.on('request-sell-tower', this.onSellTower);
    EventBus.on('request-start-wave', this.onStartWave);
    EventBus.on('game-won', this.onGameWon);
    EventBus.on('start-ghost-battle', this.onStartGhostBattle);
    EventBus.on('request-pressure-choice', this.onPressureChoice);

    // Keyboard tower selection (1-4)
    const keyNames = ['ONE', 'TWO', 'THREE', 'FOUR'] as const;
    keyNames.forEach((key, i) => {
      if (BASE_TOWERS[i]) {
        this.input.keyboard?.on(`keydown-${key}`, () => { this.selectedTowerId = BASE_TOWERS[i].id; });
      }
    });

    this.onWaveStartedLifecycle = (data) => {
      soundGenerator.playWaveStart();

      if (!this.ghostBattleActive) return;

      const waveNum = data.wave;

      // Apply player pressure (gold delta)
      const goldDelta = this.pressureSystem.applyPlayerPressure(waveNum, this.gold);
      if (goldDelta > 0) {
        this.earnGold(goldDelta);
      } else if (goldDelta < 0) {
        this.spendGold(Math.abs(goldDelta));
      }

      // Apply ghost pressure (may spawn extra units)
      this.pressureSystem.applyGhostPressure(waveNum, this.unitSystem);
      const ghostPressure = this.ghostPlayer.getWavePressure(waveNum);
      if (ghostPressure === 'attack') {
        soundGenerator.playPressureAttackSend();
      }

      // Record wave start
      this.ghostRecorder.startWave(waveNum);
    };

    this.onWaveCompletedLifecycle = (data) => {
      if (!this.ghostBattleActive) return;
      this.ghostRecorder.endWave(data.wave);
      // Consume bounty multiplier after wave
      this.pressureSystem.consumeBountyMultiplier();
    };

    // Ghost battle wave lifecycle hooks
    EventBus.on('wave-started', this.onWaveStartedLifecycle);
    EventBus.on('wave-completed', this.onWaveCompletedLifecycle);

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

    if (this.ghostBattleActive) {
      const wavesCompleted = winnerId === 'local'
        ? this.waveSystem.getCurrentWave()
        : Math.max(0, this.waveSystem.getCurrentWave() - 1);
      const playerRecord = this.ghostRecorder.finalize(wavesCompleted, this.gold);
      this.ghostRecorder.saveToLocalStorage(playerRecord);
      EventBus.emit('ghost-battle-result', { playerRecord });
    }

    EventBus.emit('game-over', { winnerId });
  }

  private handlePlaceTower(gridX: number, gridY: number, towerDefId: string): void {
    const towerDef = ALL_TOWERS.find((t) => t.id === towerDefId);
    if (!towerDef) return;

    const guardFailure = getPlacementGuardFailure({
      phase: this.waveSystem.getPhase(),
      gold: this.gold,
      towerCost: towerDef.cost,
    });

    if (guardFailure) {
      EventBus.emit('tower-placed', {
        col: gridX,
        row: gridY,
        towerId: towerDefId,
        success: false,
        reason: guardFailure,
      });
      return;
    }

    const placed = this.towerSystem.placeTower(gridX, gridY, towerDefId);
    if (!placed.success) {
      EventBus.emit('tower-placed', {
        col: gridX,
        row: gridY,
        towerId: towerDefId,
        success: false,
        reason: placed.reason,
      });
      return;
    }

    this.spendGold(towerDef.cost);

    if (this.ghostBattleActive) {
      this.ghostRecorder.recordTowerPlacement(gridX, gridY, towerDefId);
      this.ghostRecorder.recordGoldSpent(towerDef.cost);
    }

    EventBus.emit('tower-placed', {
      col: gridX,
      row: gridY,
      towerId: towerDefId,
      success: true,
    });

    // TowerSystem already recomputed and cached the path
    const path = this.pathfinding.getCachedPath();
    if (path) {
      this.unitSystem.setPath(path);
      this.renderPath(path);
      EventBus.emit('path-updated', { path });
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
    this.pathGraphics.clear();

    if (path.length < 2) return;

    // Glow layer (dirt path color)
    this.pathGraphics.lineStyle(6, 0xb8956a, 0.08);
    this.pathGraphics.beginPath();
    const first = this.gridManager.gridToWorld(path[0].x, path[0].y);
    this.pathGraphics.moveTo(first.x, first.y);
    for (let i = 1; i < path.length; i++) {
      const pt = this.gridManager.gridToWorld(path[i].x, path[i].y);
      this.pathGraphics.lineTo(pt.x, pt.y);
    }
    this.pathGraphics.strokePath();

    // Dotted path (dirt color)
    this.pathGraphics.fillStyle(0xb8956a, 0.4);
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

    // Apply damage to units — handle bounty (with pressure multiplier)
    let bountyTotal = 0;
    for (const evt of damageEvents) {
      const result = this.unitSystem.applyDamage(evt.unitId, evt.damage);
      if (result?.killed) {
        bountyTotal += result.bounty;
        soundGenerator.playUnitDeath();
      }
      // Apply slow effect from frost towers
      if (evt.slow) {
        this.unitSystem.applySlow(evt.unitId, evt.slow.factor, evt.slow.duration);
      }
    }
    if (bountyTotal > 0) {
      const multiplier = this.ghostBattleActive
        ? this.pressureSystem.getBountyMultiplier()
        : 1;
      this.earnGold(Math.round(bountyTotal * multiplier));
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
        this.endGame('opponent');
        return;
      }
    }
  }

  private cleanup() {
    EventBus.off('request-select-tower', this.onSelectTower);
    EventBus.off('request-clear-tower-selection', this.onClearTowerSelection);
    EventBus.off('request-place-tower', this.onPlaceTower);
    EventBus.off('request-sell-tower', this.onSellTower);
    EventBus.off('request-start-wave', this.onStartWave);
    EventBus.off('game-won', this.onGameWon);
    EventBus.off('start-ghost-battle', this.onStartGhostBattle);
    EventBus.off('request-pressure-choice', this.onPressureChoice);
    EventBus.off('wave-started', this.onWaveStartedLifecycle);
    EventBus.off('wave-completed', this.onWaveCompletedLifecycle);
    this.boardBackground?.destroy();
    this.spawnMarker?.destroy();
    this.exitMarker?.destroy();
    this.towerSystem.destroy();
    this.unitSystem.destroy();
    this.waveSystem.destroy();
    this.pressureSystem.resetForNewGame();
    this.ghostRecorder.reset();
    this.ghostPlayer.reset();
  }
}
