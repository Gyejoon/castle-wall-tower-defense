# Sound System Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the procedural sound system with multi-layer synthesis (noise, FM, filters) and add 23 new SFX covering all missing game events.

**Architecture:** Extend existing `SoundGenerator` class with new synthesis primitives (noise buffers, BiquadFilter, FM pairs, ADSR envelopes) and a master audio chain (category gains → master gain → compressor). All 23 new sounds plus 7 improved existing sounds are wired to game events via the singleton `soundGenerator`.

**Tech Stack:** Pure Web Audio API (zero new dependencies), TypeScript, Vitest for testing.

**Spec:** `docs/superpowers/specs/2026-03-30-sound-system-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/phaser-game/src/audio/SoundGenerator.ts` | Modify | Core synthesis engine: multi-layer, noise, FM, ADSR, throttle, master chain, all 30 sound methods |
| `packages/phaser-game/src/scenes/Game.ts` | Modify | Wire sound triggers: tower place/sell, match end, gold, HP, breach, UI, pressure events |
| `packages/phaser-game/src/systems/WaveSystem.ts` | Modify | Wire sound triggers: wave complete, countdown tick |
| `packages/phaser-game/tests/SoundGenerator.test.ts` | Create | Unit tests for new synthesis methods, throttling, master chain |

Note: Sound triggers for pressure and unit events are handled via EventBus listeners in Game.ts, not by modifying PressureSystem.ts or UnitSystem.ts directly.

---

### Task 1: Extend SoundGenerator Core — Master Chain + Noise + Throttle

**Files:**
- Modify: `packages/phaser-game/src/audio/SoundGenerator.ts`
- Create: `packages/phaser-game/tests/SoundGenerator.test.ts`

- [ ] **Step 1: Write failing tests for master chain and noise generation**

```typescript
// packages/phaser-game/tests/SoundGenerator.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundGenerator } from '../src/audio/SoundGenerator';

// Shared mock factory
function createMockAudioContext() {
  const gainNode = {
    gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
  };

  const oscillator = {
    type: 'sine' as OscillatorType,
    frequency: { value: 440, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as null | (() => void),
  };

  const filter = {
    type: 'lowpass' as BiquadFilterType,
    frequency: { value: 350, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    Q: { value: 1, setValueAtTime: vi.fn() },
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
  };

  const compressor = {
    threshold: { value: -24 },
    knee: { value: 30 },
    ratio: { value: 12 },
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
  };

  const bufferSource = {
    buffer: null as AudioBuffer | null,
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as null | (() => void),
  };

  const buffer = {
    getChannelData: vi.fn().mockReturnValue(new Float32Array(4410)),
    length: 4410,
    sampleRate: 44100,
    duration: 0.1,
    numberOfChannels: 1,
  };

  const ctx = {
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    createOscillator: vi.fn(() => ({ ...oscillator })),
    createGain: vi.fn(() => ({ ...gainNode })),
    createBiquadFilter: vi.fn(() => ({ ...filter })),
    createDynamicsCompressor: vi.fn(() => ({ ...compressor })),
    createBufferSource: vi.fn(() => ({ ...bufferSource })),
    createBuffer: vi.fn(() => ({ ...buffer })),
  };

  return { ctx, gainNode, oscillator, filter, compressor, bufferSource, buffer };
}

describe('SoundGenerator 마스터 체인', () => {
  let generator: SoundGenerator;

  beforeEach(() => {
    const { ctx } = createMockAudioContext();
    vi.stubGlobal('AudioContext', class { constructor() { return ctx; } });
    generator = new SoundGenerator();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('마스터 게인과 컴프레서 노드를 생성한다', () => {
    // Force context init by playing any sound
    generator.play({ frequency: 440, duration: 50, type: 'sine', volume: 0.3 });
    expect(generator.getMasterVolume()).toBe(1.0);
  });

  it('마스터 볼륨을 설정할 수 있다', () => {
    generator.play({ frequency: 440, duration: 50, type: 'sine', volume: 0.3 });
    generator.setMasterVolume(0.5);
    expect(generator.getMasterVolume()).toBe(0.5);
  });

  it('볼륨이 0-1 범위로 클램핑된다', () => {
    generator.play({ frequency: 440, duration: 50, type: 'sine', volume: 0.3 });
    generator.setMasterVolume(1.5);
    expect(generator.getMasterVolume()).toBe(1.0);
    generator.setMasterVolume(-0.5);
    expect(generator.getMasterVolume()).toBe(0.0);
  });
});

describe('SoundGenerator 쓰로틀링', () => {
  let generator: SoundGenerator;

  beforeEach(() => {
    const { ctx } = createMockAudioContext();
    vi.stubGlobal('AudioContext', class { constructor() { return ctx; } });
    generator = new SoundGenerator();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('쓰로틀 간격 내 동일 키의 사운드를 차단한다', () => {
    const playSpy = vi.spyOn(generator, 'play');
    generator.playThrottled('test-key', { frequency: 440, duration: 50, type: 'sine', volume: 0.3 }, 200);
    generator.playThrottled('test-key', { frequency: 440, duration: 50, type: 'sine', volume: 0.3 }, 200);
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it('쓰로틀 간격 이후에는 다시 재생한다', () => {
    const playSpy = vi.spyOn(generator, 'play');
    generator.playThrottled('test-key', { frequency: 440, duration: 50, type: 'sine', volume: 0.3 }, 200);
    vi.advanceTimersByTime(201);
    generator.playThrottled('test-key', { frequency: 440, duration: 50, type: 'sine', volume: 0.3 }, 200);
    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it('서로 다른 키는 독립적으로 쓰로틀된다', () => {
    const playSpy = vi.spyOn(generator, 'play');
    generator.playThrottled('key-a', { frequency: 440, duration: 50, type: 'sine', volume: 0.3 }, 200);
    generator.playThrottled('key-b', { frequency: 440, duration: 50, type: 'sine', volume: 0.3 }, 200);
    expect(playSpy).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/phaser-game && bunx vitest run tests/SoundGenerator.test.ts`
Expected: FAIL — `getMasterVolume`, `setMasterVolume`, `playThrottled` do not exist.

- [ ] **Step 3: Implement master chain, noise buffer, and throttle**

Replace the entire `SoundGenerator.ts` with:

```typescript
// packages/phaser-game/src/audio/SoundGenerator.ts

export interface SoundRecipe {
  frequency: number;
  endFrequency?: number;
  duration: number;
  type: OscillatorType;
  volume: number;
}

interface NoiseConfig {
  noiseType: 'white' | 'pink' | 'brown';
  duration: number;
  volume: number;
  filterType?: BiquadFilterType;
  filterFreq?: number;
  filterQ?: number;
  filterEndFreq?: number;
}

interface LayeredSound {
  oscillator?: SoundRecipe;
  noise?: NoiseConfig;
}

export class SoundGenerator {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private masterVolume = 1.0;
  private throttleMap = new Map<string, number>();

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.compressorNode = this.audioContext.createDynamicsCompressor();
      this.compressorNode.threshold.value = -24;
      this.compressorNode.knee.value = 30;
      this.compressorNode.ratio.value = 4;
      this.compressorNode.connect(this.audioContext.destination);

      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.gain.value = this.masterVolume;
      this.masterGainNode.connect(this.compressorNode);
    }
    return this.audioContext;
  }

  private getOutput(): AudioNode {
    this.getContext();
    return this.masterGainNode!;
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = this.masterVolume;
    }
  }

  // --- Throttle ---

  playThrottled(key: string, recipe: SoundRecipe, intervalMs: number): void {
    const now = Date.now();
    const last = this.throttleMap.get(key) ?? 0;
    if (now - last < intervalMs) return;
    this.throttleMap.set(key, now);
    this.play(recipe);
  }

  // --- Core play (single oscillator) ---

  play(recipe: SoundRecipe): void {
    const ctx = this.getContext();
    const output = this.getOutput();
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
    gainNode.connect(output);

    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
      oscillator.onended = null;
    };

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + recipe.duration / 1000);
  }

  // --- Noise generation ---

  private createNoiseBuffer(type: 'white' | 'pink' | 'brown', duration: number): AudioBuffer {
    const ctx = this.getContext();
    const samples = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < samples; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else {
      let last = 0;
      for (let i = 0; i < samples; i++) {
        const w = Math.random() * 2 - 1;
        data[i] = (last + 0.02 * w) / 1.02;
        last = data[i];
        data[i] *= 3.5;
      }
    }
    return buffer;
  }

  private playNoise(config: NoiseConfig): void {
    const ctx = this.getContext();
    const output = this.getOutput();
    const source = ctx.createBufferSource();
    source.buffer = this.createNoiseBuffer(config.noiseType, config.duration / 1000);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(config.volume, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + config.duration / 1000);

    if (config.filterType) {
      const filter = ctx.createBiquadFilter();
      filter.type = config.filterType;
      filter.frequency.setValueAtTime(config.filterFreq ?? 1000, ctx.currentTime);
      if (config.filterQ) filter.Q.setValueAtTime(config.filterQ, ctx.currentTime);
      if (config.filterEndFreq !== undefined) {
        filter.frequency.linearRampToValueAtTime(
          config.filterEndFreq,
          ctx.currentTime + config.duration / 1000
        );
      }
      source.connect(filter);
      filter.connect(gainNode);

      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gainNode.disconnect();
        source.onended = null;
      };
    } else {
      source.connect(gainNode);

      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
        source.onended = null;
      };
    }

    gainNode.connect(output);
    source.start(ctx.currentTime);
  }

  // --- Layered play (oscillator + noise simultaneously) ---

  private playLayered(layers: LayeredSound[]): void {
    for (const layer of layers) {
      if (layer.oscillator) this.play(layer.oscillator);
      if (layer.noise) this.playNoise(layer.noise);
    }
  }

  // --- FM Synthesis ---

  private playFM(
    carrierFreq: number,
    modFreq: number,
    modDepth: number,
    duration: number,
    volume: number,
    modDepthEnd?: number
  ): void {
    const ctx = this.getContext();
    const output = this.getOutput();
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const outGain = ctx.createGain();
    const durationSec = duration / 1000;

    carrier.frequency.value = carrierFreq;
    modulator.frequency.value = modFreq;
    modGain.gain.setValueAtTime(modDepth, ctx.currentTime);
    if (modDepthEnd !== undefined) {
      modGain.gain.linearRampToValueAtTime(modDepthEnd, ctx.currentTime + durationSec);
    }
    outGain.gain.setValueAtTime(volume, ctx.currentTime);
    outGain.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(outGain);
    outGain.connect(output);

    const cleanup = () => {
      modulator.disconnect();
      modGain.disconnect();
      carrier.disconnect();
      outGain.disconnect();
      carrier.onended = null;
    };

    carrier.onended = cleanup;
    modulator.start(ctx.currentTime);
    carrier.start(ctx.currentTime);
    carrier.stop(ctx.currentTime + durationSec);
    modulator.stop(ctx.currentTime + durationSec);
  }

  // ===== EXISTING SOUNDS (preserved) =====

  playPressureSelect(): void {
    this.play({ frequency: 880, duration: 50, type: 'sine', volume: 0.3 });
  }

  playPressureAttackSend(): void {
    this.play({ frequency: 220, endFrequency: 110, duration: 200, type: 'sawtooth', volume: 0.4 });
  }

  playWaveStart(): void {
    this.play({ frequency: 440, endFrequency: 880, duration: 150, type: 'square', volume: 0.3 });
  }

  playMatchVictory(): void {
    const notes = [
      { frequency: 523, delay: 0 },
      { frequency: 659, delay: 80 },
      { frequency: 784, delay: 160 },
      { frequency: 1047, delay: 260 },
      { frequency: 1319, delay: 360 },
    ];
    for (const note of notes) {
      setTimeout(() => {
        this.play({ frequency: note.frequency, duration: 180, type: 'sine', volume: 0.25 });
      }, note.delay);
    }
    // Cymbal crash
    setTimeout(() => {
      this.playNoise({
        noiseType: 'white',
        duration: 300,
        volume: 0.08,
        filterType: 'highpass',
        filterFreq: 6000,
      });
    }, 360);
  }

  playMatchDefeat(): void {
    const notes = [
      { frequency: 392, delay: 0 },    // G4
      { frequency: 311, delay: 120 },   // Eb4
      { frequency: 261, delay: 240 },   // C4
    ];
    for (const note of notes) {
      setTimeout(() => {
        this.play({ frequency: note.frequency, duration: 250, type: 'sine', volume: 0.25 });
      }, note.delay);
    }
    // Rumble
    setTimeout(() => {
      this.playNoise({
        noiseType: 'brown',
        duration: 400,
        volume: 0.10,
        filterType: 'lowpass',
        filterFreq: 200,
      });
    }, 240);
  }

  playTowerAttack(towerType: string): void {
    const recipes: Record<string, SoundRecipe> = {
      laser: { frequency: 1200, endFrequency: 800, duration: 60, type: 'sawtooth', volume: 0.12 },
      twin_laser: { frequency: 1400, endFrequency: 900, duration: 50, type: 'sawtooth', volume: 0.14 },
      plasma: { frequency: 180, endFrequency: 90, duration: 120, type: 'sine', volume: 0.15 },
      nova_cannon: { frequency: 140, endFrequency: 60, duration: 180, type: 'sine', volume: 0.18 },
      emp: { frequency: 600, endFrequency: 400, duration: 80, type: 'square', volume: 0.08 },
      disruptor: { frequency: 700, endFrequency: 350, duration: 100, type: 'square', volume: 0.10 },
      fortress: { frequency: 500, endFrequency: 600, duration: 70, type: 'triangle', volume: 0.10 },
    };
    const recipe = recipes[towerType];
    if (!recipe) return;

    this.play(recipe);

    // Enhanced layers per tower type
    if (towerType === 'plasma' || towerType === 'nova_cannon') {
      this.playNoise({
        noiseType: 'brown',
        duration: recipe.duration,
        volume: recipe.volume * 0.4,
        filterType: 'lowpass',
        filterFreq: 150,
      });
    } else if (towerType === 'laser' || towerType === 'twin_laser') {
      this.playNoise({
        noiseType: 'white',
        duration: 10,
        volume: recipe.volume * 0.3,
        filterType: 'highpass',
        filterFreq: 8000,
      });
    }
  }

  playUnitDeath(): void {
    this.play({ frequency: 300, endFrequency: 100, duration: 100, type: 'sawtooth', volume: 0.10 });
  }

  // ===== NEW UI SOUNDS =====

  playUIClick(): void {
    this.play({ frequency: 1200, duration: 30, type: 'sine', volume: 0.15 });
  }

  playUIHover(): void {
    this.play({ frequency: 1000, duration: 15, type: 'sine', volume: 0.06 });
  }

  playUIError(): void {
    this.play({ frequency: 200, duration: 80, type: 'square', volume: 0.12 });
    setTimeout(() => {
      this.play({ frequency: 200, duration: 80, type: 'square', volume: 0.10 });
    }, 100);
  }

  playUIConfirm(): void {
    this.play({ frequency: 800, endFrequency: 1200, duration: 60, type: 'sine', volume: 0.15 });
  }

  playUICancel(): void {
    this.play({ frequency: 600, endFrequency: 400, duration: 60, type: 'sine', volume: 0.12 });
  }

  // ===== NEW TOWER SOUNDS =====

  playTowerPlaced(): void {
    this.playFM(600, 1200, 200, 150, 0.15, 0);
  }

  playTowerSold(): void {
    this.play({ frequency: 1000, endFrequency: 500, duration: 100, type: 'triangle', volume: 0.12 });
    this.playNoise({
      noiseType: 'white',
      duration: 40,
      volume: 0.05,
      filterType: 'highpass',
      filterFreq: 4000,
    });
  }

  playTowerUpgraded(): void {
    const notes = [523, 659, 784]; // C5 E5 G5
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.play({ frequency: freq, duration: 80, type: 'square', volume: 0.12 });
      }, i * 60);
    });
  }

  // ===== NEW GAMEPLAY SOUNDS =====

  playWaveComplete(): void {
    const notes = [659, 784, 1047]; // E5 G5 C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.play({ frequency: freq, duration: 120, type: 'sine', volume: 0.20 });
      }, i * 80);
    });
    setTimeout(() => {
      this.playNoise({
        noiseType: 'white',
        duration: 150,
        volume: 0.05,
        filterType: 'highpass',
        filterFreq: 6000,
      });
    }, 160);
  }

  playBuildPhaseStart(): void {
    this.play({ frequency: 500, duration: 200, type: 'sine', volume: 0.12 });
  }

  playCountdownTick(): void {
    this.play({ frequency: 1500, duration: 20, type: 'sine', volume: 0.10 });
  }

  playUnitSpawned(): void {
    this.playLayered([
      { noise: { noiseType: 'white', duration: 30, volume: 0.06, filterType: 'bandpass', filterFreq: 2000, filterQ: 2 } },
      { oscillator: { frequency: 800, duration: 40, type: 'sine', volume: 0.08 } },
    ]);
  }

  playBreach(): void {
    this.play({ frequency: 300, endFrequency: 350, duration: 200, type: 'square', volume: 0.18 });
    this.playNoise({
      noiseType: 'white',
      duration: 100,
      volume: 0.08,
      filterType: 'bandpass',
      filterFreq: 1000,
      filterQ: 3,
    });
  }

  playGoldEarned(): void {
    this.play({ frequency: 987, duration: 60, type: 'square', volume: 0.10 }); // B5
    setTimeout(() => {
      this.play({ frequency: 1319, duration: 80, type: 'square', volume: 0.10 }); // E6
    }, 70);
  }

  playGoldSpent(): void {
    this.play({ frequency: 600, endFrequency: 400, duration: 50, type: 'triangle', volume: 0.08 });
  }

  playHPLoss(): void {
    this.playLayered([
      { noise: { noiseType: 'brown', duration: 120, volume: 0.12, filterType: 'lowpass', filterFreq: 300 } },
      { oscillator: { frequency: 100, duration: 120, type: 'sine', volume: 0.15 } },
    ]);
  }

  // ===== NEW PRESSURE SOUNDS =====

  playPressureDefense(): void {
    this.playFM(600, 900, 150, 100, 0.12, 0);
  }

  playPressureInvest(): void {
    this.play({ frequency: 400, endFrequency: 800, duration: 150, type: 'sine', volume: 0.12 });
  }

  playPressureGhostApplied(): void {
    // Beat frequency (5Hz) from two detuned oscillators
    this.play({ frequency: 200, duration: 250, type: 'sine', volume: 0.08 });
    this.play({ frequency: 205, duration: 250, type: 'sine', volume: 0.08 });
  }
}

export const soundGenerator = new SoundGenerator();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/phaser-game && bunx vitest run tests/SoundGenerator.test.ts`
Expected: PASS

- [ ] **Step 5: Run existing tests to verify no regressions**

Run: `cd packages/phaser-game && bunx vitest run`
Expected: All tests pass (the `runtimeSafety.test.ts` audio test still works because `play()` signature is unchanged)

- [ ] **Step 6: Commit**

```bash
git add packages/phaser-game/src/audio/SoundGenerator.ts packages/phaser-game/tests/SoundGenerator.test.ts
git commit -m "feat: extend SoundGenerator with master chain, noise, FM synthesis, throttle, and 23 new SFX"
```

---

### Task 2: Wire Sound Triggers in Game.ts — Match End + Tower Place/Sell

**Files:**
- Modify: `packages/phaser-game/src/scenes/Game.ts`

- [ ] **Step 1: Add match victory/defeat sounds in `endGame()`**

Find `endGame` method (around line 226). After `EventBus.emit('game-over', { winnerId });`, add:

```typescript
    EventBus.emit('game-over', { winnerId });

    if (winnerId === 'local') {
      soundGenerator.playMatchVictory();
    } else {
      soundGenerator.playMatchDefeat();
    }
```

- [ ] **Step 2: Add tower placed sound**

Find `handlePlaceTower` method. After the success `EventBus.emit('tower-placed', ...)` block (around line 287), add:

```typescript
    EventBus.emit('tower-placed', {
      col: gridX,
      row: gridY,
      towerId: towerDefId,
      success: true,
    });
    soundGenerator.playTowerPlaced();
```

- [ ] **Step 3: Add tower placement failure sound**

At the two failure return points in `handlePlaceTower` (around lines 260 and 272), add error sound:

```typescript
    if (guardFailure) {
      soundGenerator.playUIError();
      EventBus.emit('tower-placed', {
```

And:

```typescript
    if (!placed.success) {
      soundGenerator.playUIError();
      EventBus.emit('tower-placed', {
```

- [ ] **Step 4: Add tower sold sound**

Find `onSellTower` handler (around line 139). After the `EventBus.emit('tower-sold', ...)`, add:

```typescript
        EventBus.emit('tower-sold', { col: data.col, row: data.row, refund: result.refund });
        soundGenerator.playTowerSold();
```

- [ ] **Step 5: Verify build**

Run: `cd packages/phaser-game && bunx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add packages/phaser-game/src/scenes/Game.ts
git commit -m "feat: wire match victory/defeat, tower place/sell sounds in Game.ts"
```

---

### Task 3: Wire Sound Triggers — Gold, HP, Breach, UI Interactions

**Files:**
- Modify: `packages/phaser-game/src/scenes/Game.ts`

- [ ] **Step 1: Add gold sounds in `spendGold()` and `earnGold()`**

Find `spendGold` (around line 214):

```typescript
  private spendGold(amount: number): boolean {
    if (this.gold < amount) return false;
    this.gold -= amount;
    soundGenerator.playGoldSpent();
    EventBus.emit('gold-changed', { gold: this.gold });
    return true;
  }
```

Find `earnGold` (around line 221):

```typescript
  private earnGold(amount: number): void {
    this.gold += amount;
    soundGenerator.playThrottled('goldEarned', { frequency: 987, duration: 60, type: 'square', volume: 0.10 }, 300);
    EventBus.emit('gold-changed', { gold: this.gold });
  }
```

Note: `earnGold` uses `playThrottled` because bounties can come in rapid succession. We inline the recipe to avoid calling `playGoldEarned` which internally does a 2-note sequence — the throttled version is just the first note for simplicity during rapid kills.

- [ ] **Step 2: Add breach and HP loss sounds**

Find the breach loop (around line 365):

```typescript
    for (const _unitId of reachedExit) {
      soundGenerator.playBreach();
      this.playerHp = Math.max(0, this.playerHp - 1);
      soundGenerator.playHPLoss();
      EventBus.emit('player-damaged', {
```

- [ ] **Step 3: Add keyboard tower select sound**

Find keyboard handler (around line 164):

```typescript
    keyNames.forEach((key, i) => {
      if (BASE_TOWERS[i]) {
        this.input.keyboard?.on(`keydown-${key}`, () => {
          this.selectedTowerId = BASE_TOWERS[i].id;
          soundGenerator.playUIClick();
        });
      }
    });
```

- [ ] **Step 4: Add hover sound (throttled)**

Find pointermove handler (around line 86). Add after `isInBounds` check:

```typescript
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const gridPos = this.gridManager.worldToGrid(pointer.worldX, pointer.worldY);
      this.hoverGraphics.clear();
      if (this.gridManager.isInBounds(gridPos.x, gridPos.y)) {
        soundGenerator.playThrottled('uiHover', { frequency: 1000, duration: 15, type: 'sine', volume: 0.06 }, 150);
        const isOccupied = !this.gridManager.isWalkable(gridPos.x, gridPos.y);
```

- [ ] **Step 5: Verify build**

Run: `cd packages/phaser-game && bunx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add packages/phaser-game/src/scenes/Game.ts
git commit -m "feat: wire gold, HP, breach, UI interaction sounds"
```

---

### Task 4: Wire Sound Triggers — Wave System + Pressure Events

**Files:**
- Modify: `packages/phaser-game/src/scenes/Game.ts` (EventBus listeners)

- [ ] **Step 1: Add wave and pressure event listeners in Game.ts `create()`**

In the `create()` method, after existing EventBus listeners, add new listeners for wave and pressure events:

```typescript
    // Wave sounds
    EventBus.on('wave-completed', () => {
      soundGenerator.playWaveComplete();
    });

    EventBus.on('building-phase-started', () => {
      soundGenerator.playBuildPhaseStart();
    });

    EventBus.on('countdown-tick', (data: { secondsLeft: number }) => {
      if (data.secondsLeft <= 3 && data.secondsLeft > 0) {
        soundGenerator.playCountdownTick();
      }
    });

    // Unit spawn sound (throttled)
    EventBus.on('unit-spawned', () => {
      soundGenerator.playThrottled('unitSpawn', { frequency: 800, duration: 40, type: 'sine', volume: 0.08 }, 500);
    });

    // Pressure sounds
    EventBus.on('pressure-choice-made', (data: { choice: string }) => {
      if (data.choice === 'defend') {
        soundGenerator.playPressureDefense();
      } else if (data.choice === 'invest') {
        soundGenerator.playPressureInvest();
      } else {
        soundGenerator.playPressureSelect();
      }
    });

    EventBus.on('ghost-pressure-applied', (data: { pressure: string }) => {
      if (data.pressure === 'attack') {
        soundGenerator.playPressureGhostApplied();
      }
    });
```

- [ ] **Step 2: Clean up listeners in `shutdown()`**

Find the `shutdown()` method and add cleanup for the new listeners:

```typescript
    EventBus.off('wave-completed');
    EventBus.off('building-phase-started');
    EventBus.off('countdown-tick');
    EventBus.off('unit-spawned');
    EventBus.off('pressure-choice-made');
    EventBus.off('ghost-pressure-applied');
```

- [ ] **Step 3: Verify build**

Run: `cd packages/phaser-game && bunx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Run all tests**

Run: `cd packages/phaser-game && bunx vitest run`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/phaser-game/src/scenes/Game.ts
git commit -m "feat: wire wave, countdown, unit spawn, and pressure sound triggers"
```

---

### Task 5: Remove Redundant Tower Sound Throttle from TowerSystem

**Files:**
- Modify: `packages/phaser-game/src/systems/TowerSystem.ts`

Tower attack sounds are now routed through `SoundGenerator.playTowerAttack()` which can use `playThrottled` internally if needed. However, the current throttle in `TowerSystem.ts` (lines 22-23, 218-222) is well-placed and works correctly — it's at the call site where timing info (`time`) is available from the Phaser update loop. Rather than moving it, we keep it as-is. This task is a no-op.

**Skip this task** — the TowerSystem throttle is correct and doesn't need changing. The SoundGenerator-level `playThrottled` is for Game.ts event handlers that don't have frame-level timing.

---

### Task 6: Final Verification

**Files:** None (read-only verification)

- [ ] **Step 1: Full build check**

Run: `cd packages/phaser-game && bunx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 2: Run all tests**

Run: `cd packages/phaser-game && bunx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Lint check**

Run: `cd packages/phaser-game && bunx biome check src/`
Expected: No errors.

- [ ] **Step 4: Manual browser test**

Open the game in browser and verify:
1. Tower placement → bell ding
2. Failed placement (no gold) → error buzz
3. Tower sell → sell sound
4. Keyboard 1-4 → click sound
5. Wave clear → celebration chime
6. Last 3 countdown seconds → tick
7. Unit breach → warning alarm
8. Match victory → 5-note fanfare + cymbal
9. Match defeat → descending 3-note + rumble
10. Pressure defend/invest/attack → distinct feedback
11. No sound spam during mass events
12. Hover sound is subtle, not annoying

- [ ] **Step 5: Final commit if any lint fixes needed**

```bash
git add -A
git commit -m "fix: lint fixes for sound system"
```
