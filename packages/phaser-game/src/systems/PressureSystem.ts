import type { PressureChoice, GhostWaveAction } from '@gld/shared';
import type { UnitSystem } from './UnitSystem';
import { EventBus } from '../EventBus';

const DEFEND_BONUS_GOLD = 20;
const ATTACK_COST = 50;
const ATTACK_UNIT_ID = 'scout_drone';
const ATTACK_UNIT_COUNT = 3;
const INVEST_COST = 30;
const INVEST_BOUNTY_MULTIPLIER = 1.5;

export class PressureSystem {
  private currentChoice: PressureChoice = 'defend';
  private bountyMultiplier: number = 1;
  private ghostPressures: GhostWaveAction[] = [];

  setGhostPressures(waves: GhostWaveAction[]): void {
    this.ghostPressures = waves;
  }

  setChoice(choice: PressureChoice): void {
    this.currentChoice = choice;
    EventBus.emit('pressure-choice-made', { choice });
  }

  getChoice(): PressureChoice {
    return this.currentChoice;
  }

  getBountyMultiplier(): number {
    return this.bountyMultiplier;
  }

  /**
   * Called at wave start. Returns gold delta (positive = earn, negative = spend).
   * Also sets bounty multiplier for invest choices.
   */
  applyPlayerPressure(wave: number, currentGold: number): number {
    const choice = this.currentChoice;
    let goldDelta = 0;

    switch (choice) {
      case 'defend':
        goldDelta = DEFEND_BONUS_GOLD;
        break;

      case 'attack':
        if (currentGold >= ATTACK_COST) {
          goldDelta = -ATTACK_COST;
        } else {
          // Not enough gold — fall back to defend and sync the choice
          this.currentChoice = 'defend';
          EventBus.emit('pressure-choice-made', { choice: 'defend' });
          goldDelta = DEFEND_BONUS_GOLD;
        }
        break;

      case 'invest':
        if (currentGold >= INVEST_COST) {
          goldDelta = -INVEST_COST;
          // Bounty multiplier applies to the next wave, or current wave if wave 5
          this.bountyMultiplier = INVEST_BOUNTY_MULTIPLIER;
        } else {
          // Not enough gold — fall back to defend and sync the choice
          this.currentChoice = 'defend';
          EventBus.emit('pressure-choice-made', { choice: 'defend' });
          goldDelta = DEFEND_BONUS_GOLD;
        }
        break;
    }

    return goldDelta;
  }

  /**
   * Applies the ghost's pressure for the given wave.
   * Ghost 'attack' pressure spawns extra units via the unitSystem.
   */
  applyGhostPressure(wave: number, unitSystem: UnitSystem): void {
    const ghostWave = this.ghostPressures.find((w) => w.waveNumber === wave);
    if (!ghostWave) return;

    const pressure = ghostWave.pressure;

    if (pressure === 'attack') {
      unitSystem.queueUnits(ATTACK_UNIT_ID, ATTACK_UNIT_COUNT);
    }

    EventBus.emit('ghost-pressure-applied', { wave, pressure });
  }

  /**
   * Reset bounty multiplier after it has been consumed for a wave.
   * Called externally after bounty calculation.
   */
  consumeBountyMultiplier(): void {
    this.bountyMultiplier = 1;
  }

  resetForNewGame(): void {
    this.currentChoice = 'defend';
    this.bountyMultiplier = 1;
    this.ghostPressures = [];
  }
}
