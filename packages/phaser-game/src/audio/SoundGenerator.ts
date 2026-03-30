export interface SoundRecipe {
  frequency: number;
  endFrequency?: number;
  duration: number;
  type: OscillatorType;
  volume: number;
}

export class SoundGenerator {
  private audioContext: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  play(recipe: SoundRecipe): void {
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = recipe.type;
    oscillator.frequency.setValueAtTime(recipe.frequency, ctx.currentTime);

    if (recipe.endFrequency !== undefined) {
      oscillator.frequency.linearRampToValueAtTime(
        recipe.endFrequency,
        ctx.currentTime + recipe.duration / 1000
      );
    }

    gainNode.gain.setValueAtTime(recipe.volume, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + recipe.duration / 1000);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
      oscillator.onended = null;
    };

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + recipe.duration / 1000);
  }

  playPressureSelect(): void {
    this.play({
      frequency: 880,
      duration: 50,
      type: 'sine',
      volume: 0.3,
    });
  }

  playPressureAttackSend(): void {
    this.play({
      frequency: 220,
      endFrequency: 110,
      duration: 200,
      type: 'sawtooth',
      volume: 0.4,
    });
  }

  playWaveStart(): void {
    this.play({
      frequency: 440,
      endFrequency: 880,
      duration: 150,
      type: 'square',
      volume: 0.3,
    });
  }

  playMatchVictory(): void {
    const notes: Array<{ frequency: number; delay: number }> = [
      { frequency: 523, delay: 0 },
      { frequency: 659, delay: 100 },
      { frequency: 784, delay: 200 },
    ];

    for (const note of notes) {
      setTimeout(() => {
        this.play({
          frequency: note.frequency,
          duration: 150,
          type: 'sine',
          volume: 0.3,
        });
      }, note.delay);
    }
  }

  playMatchDefeat(): void {
    this.play({
      frequency: 440,
      endFrequency: 220,
      duration: 200,
      type: 'sine',
      volume: 0.3,
    });
  }

  // Tower attack sounds — each tower type has a distinct sound
  playTowerAttack(towerType: string): void {
    const recipes: Record<string, SoundRecipe> = {
      // Laser: sharp zap, high pitch
      laser: { frequency: 1200, endFrequency: 800, duration: 60, type: 'sawtooth', volume: 0.12 },
      twin_laser: { frequency: 1400, endFrequency: 900, duration: 50, type: 'sawtooth', volume: 0.14 },
      // Plasma: deep thump, low pitch
      plasma: { frequency: 180, endFrequency: 90, duration: 120, type: 'sine', volume: 0.15 },
      nova_cannon: { frequency: 140, endFrequency: 60, duration: 180, type: 'sine', volume: 0.18 },
      // EMP: electric crackle, mid pitch wobble
      emp: { frequency: 600, endFrequency: 400, duration: 80, type: 'square', volume: 0.08 },
      disruptor: { frequency: 700, endFrequency: 350, duration: 100, type: 'square', volume: 0.10 },
      // Shield: soft hum (no attack sound, shield doesn't deal damage)
      fortress: { frequency: 500, endFrequency: 600, duration: 70, type: 'triangle', volume: 0.10 },
    };
    const recipe = recipes[towerType];
    if (recipe) {
      this.play(recipe);
    }
  }

  // Random tower roll — slot machine rising pitch
  playRandomRoll(): void {
    const notes = [
      { frequency: 400, delay: 0 },
      { frequency: 500, delay: 40 },
      { frequency: 600, delay: 80 },
      { frequency: 800, delay: 120 },
    ];
    for (const note of notes) {
      setTimeout(() => {
        this.play({ frequency: note.frequency, duration: 40, type: 'sine', volume: 0.15 });
      }, note.delay);
    }
  }

  // Merge success — ascending chime
  playMerge(): void {
    const notes = [
      { frequency: 523, delay: 0 },
      { frequency: 784, delay: 80 },
      { frequency: 1047, delay: 160 },
    ];
    for (const note of notes) {
      setTimeout(() => {
        this.play({ frequency: note.frequency, duration: 100, type: 'triangle', volume: 0.2 });
      }, note.delay);
    }
  }

  // Merge fail — short buzz
  playMergeFail(): void {
    this.play({ frequency: 200, endFrequency: 150, duration: 100, type: 'sawtooth', volume: 0.15 });
  }

  // Kill transfer — ominous whoosh
  playKillTransfer(): void {
    this.play({ frequency: 300, endFrequency: 600, duration: 200, type: 'sine', volume: 0.12 });
  }

  // Emote sent — short pop
  playEmote(): void {
    this.play({ frequency: 800, endFrequency: 1200, duration: 50, type: 'sine', volume: 0.1 });
  }

  // T3+ tower attack sounds
  playTowerAttackByTier(towerType: string): void {
    const recipes: Record<string, SoundRecipe> = {
      flame_tower: { frequency: 250, endFrequency: 400, duration: 100, type: 'sawtooth', volume: 0.12 },
      wind_spire: { frequency: 900, endFrequency: 1200, duration: 60, type: 'triangle', volume: 0.10 },
      earth_golem: { frequency: 100, endFrequency: 60, duration: 150, type: 'sine', volume: 0.18 },
      dragon_nest: { frequency: 200, endFrequency: 500, duration: 150, type: 'sawtooth', volume: 0.16 },
      arcane_spire: { frequency: 1000, endFrequency: 600, duration: 80, type: 'square', volume: 0.10 },
      celestial: { frequency: 600, endFrequency: 1200, duration: 120, type: 'triangle', volume: 0.14 },
    };
    const recipe = recipes[towerType];
    if (recipe) this.play(recipe);
  }

  playUnitDeath(): void {
    this.play({
      frequency: 300,
      endFrequency: 100,
      duration: 100,
      type: 'sawtooth',
      volume: 0.10,
    });
  }
}

export const soundGenerator = new SoundGenerator();
