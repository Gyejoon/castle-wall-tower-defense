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
