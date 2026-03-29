import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WAVE_DEFS, type GhostRecord } from '@gld/shared';
import { GhostRecorder } from '../src/systems/GhostRecorder';
import { SoundGenerator } from '../src/audio/SoundGenerator';

vi.mock('../src/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
  },
}));

import { WaveSystem } from '../src/systems/WaveSystem';

class LocalStorageMock implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('runtime safety fixes', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new LocalStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('skips malformed ghost records in localStorage and keeps valid ones', () => {
    const validRecord: GhostRecord = {
      id: 'ghost-1',
      playerName: 'Tester',
      timestamp: 1,
      totalWaves: 1,
      waves: [
        {
          waveNumber: 1,
          pressure: 'defend',
          towersPlaced: [],
          goldSpent: 0,
        },
      ],
      result: {
        wavesCompleted: 1,
        goldRemaining: 100,
        score: 200,
      },
    };

    localStorage.setItem('gld-ghost-valid', JSON.stringify(validRecord));
    localStorage.setItem('gld-ghost-bad', '{not-json');

    expect(GhostRecorder.loadFromLocalStorage()).toEqual([validRecord]);
  });

  it('clamps max waves to the supported wave definitions', () => {
    const unitSystem = {
      queueUnits: vi.fn(),
      hasActiveUnits: vi.fn(() => false),
      hasQueuedUnits: vi.fn(() => false),
    };

    const waveSystem = new WaveSystem(unitSystem as never, WAVE_DEFS.length + 5);
    expect((waveSystem as { maxWaves: number }).maxWaves).toBe(WAVE_DEFS.length);

    waveSystem.setMaxWaves(0);
    expect((waveSystem as { maxWaves: number }).maxWaves).toBe(1);

    waveSystem.setMaxWaves(WAVE_DEFS.length + 10);
    expect((waveSystem as { maxWaves: number }).maxWaves).toBe(WAVE_DEFS.length);
  });

  it('disconnects audio nodes once playback ends', () => {
    const oscillator = {
      type: 'sine' as OscillatorType,
      frequency: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as null | (() => void),
    };
    const gainNode = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    class MockAudioContext {
      currentTime = 0;
      destination = {};

      createOscillator() {
        return oscillator;
      }

      createGain() {
        return gainNode;
      }
    }

    vi.stubGlobal('AudioContext', MockAudioContext);

    const generator = new SoundGenerator();
    generator.play({
      frequency: 440,
      duration: 100,
      type: 'sine',
      volume: 0.2,
    });

    expect(oscillator.onended).toBeTypeOf('function');
    oscillator.onended?.();

    expect(oscillator.disconnect).toHaveBeenCalledOnce();
    expect(gainNode.disconnect).toHaveBeenCalledOnce();
  });
});
