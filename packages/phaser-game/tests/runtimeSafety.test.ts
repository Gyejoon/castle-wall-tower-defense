import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WAVE_DEFS } from '@gld/shared';
import { SoundGenerator } from '../src/audio/SoundGenerator';

vi.mock('../src/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
  },
}));

import { WaveSystem } from '../src/systems/WaveSystem';

describe('runtime safety fixes', () => {
  beforeEach(() => {
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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
