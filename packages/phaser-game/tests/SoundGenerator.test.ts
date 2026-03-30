import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundGenerator } from '../src/audio/SoundGenerator';

function createMockAudioContext() {
	const oscillator = {
		type: 'sine' as OscillatorType,
		frequency: {
			setValueAtTime: vi.fn(),
			linearRampToValueAtTime: vi.fn(),
			value: 0,
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
			value: 1,
		},
		connect: vi.fn(),
		disconnect: vi.fn(),
	};

	const compressorNode = {
		threshold: { setValueAtTime: vi.fn(), value: -24 },
		knee: { setValueAtTime: vi.fn(), value: 30 },
		ratio: { setValueAtTime: vi.fn(), value: 12 },
		connect: vi.fn(),
		disconnect: vi.fn(),
	};

	const bufferSourceNode = {
		buffer: null as AudioBuffer | null,
		connect: vi.fn(),
		disconnect: vi.fn(),
		start: vi.fn(),
		stop: vi.fn(),
		onended: null as null | (() => void),
	};

	const biquadFilter = {
		type: 'lowpass' as BiquadFilterType,
		frequency: {
			setValueAtTime: vi.fn(),
			value: 350,
		},
		Q: {
			setValueAtTime: vi.fn(),
			value: 1,
		},
		connect: vi.fn(),
		disconnect: vi.fn(),
	};

	const audioBuffer = {
		getChannelData: vi.fn(() => new Float32Array(44100)),
		length: 44100,
		sampleRate: 44100,
		duration: 1,
		numberOfChannels: 1,
	};

	class MockAudioContext {
		currentTime = 0;
		destination = {};
		sampleRate = 44100;
		state: AudioContextState = 'running';
		resume = vi.fn().mockResolvedValue(undefined);

		createOscillator() {
			return oscillator;
		}

		createGain() {
			return { ...gainNode, gain: { ...gainNode.gain } };
		}

		createDynamicsCompressor() {
			return compressorNode;
		}

		createBuffer = vi.fn(
			(_channels: number, length: number, _sampleRate: number) => ({
				...audioBuffer,
				getChannelData: vi.fn(() => new Float32Array(length)),
				length,
			}),
		);

		createBufferSource() {
			return { ...bufferSourceNode, onended: null };
		}

		createBiquadFilter() {
			return { ...biquadFilter, type: 'lowpass' as BiquadFilterType };
		}
	}

	return { MockAudioContext, oscillator, gainNode, compressorNode };
}

describe('SoundGenerator', () => {
	let mockCtx: ReturnType<typeof createMockAudioContext>;

	beforeEach(() => {
		mockCtx = createMockAudioContext();
		vi.stubGlobal('AudioContext', mockCtx.MockAudioContext);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	describe('마스터 체인 초기화', () => {
		it('첫 사운드 재생 시 masterGainNode와 compressorNode가 생성된다', () => {
			const generator = new SoundGenerator();
			generator.play({
				frequency: 440,
				duration: 100,
				type: 'sine',
				volume: 0.2,
			});

			expect(mockCtx.compressorNode.connect).toHaveBeenCalled();
		});
	});

	describe('볼륨 제어', () => {
		it('기본 마스터 볼륨은 1이다', () => {
			const generator = new SoundGenerator();
			expect(generator.getMasterVolume()).toBe(1);
		});

		it('setMasterVolume으로 볼륨을 변경할 수 있다', () => {
			const generator = new SoundGenerator();
			generator.setMasterVolume(0.5);
			expect(generator.getMasterVolume()).toBe(0.5);
		});

		it('0 미만의 볼륨은 0으로 클램핑된다', () => {
			const generator = new SoundGenerator();
			generator.setMasterVolume(-0.5);
			expect(generator.getMasterVolume()).toBe(0);
		});

		it('1 초과의 볼륨은 1로 클램핑된다', () => {
			const generator = new SoundGenerator();
			generator.setMasterVolume(1.5);
			expect(generator.getMasterVolume()).toBe(1);
		});
	});

	describe('스로틀링', () => {
		it('동일 키를 intervalMs 내에 다시 호출하면 재생되지 않는다', () => {
			const generator = new SoundGenerator();
			const recipe = {
				frequency: 440,
				duration: 100,
				type: 'sine' as OscillatorType,
				volume: 0.2,
			};

			generator.playThrottled('test-key', recipe, 500);
			const playSpy = vi.spyOn(generator, 'play');
			generator.playThrottled('test-key', recipe, 500);
			expect(playSpy).not.toHaveBeenCalled();
		});

		it('intervalMs가 지나면 동일 키로 다시 재생할 수 있다', () => {
			const generator = new SoundGenerator();
			const recipe = {
				frequency: 440,
				duration: 100,
				type: 'sine' as OscillatorType,
				volume: 0.2,
			};

			const now = Date.now();
			vi.spyOn(Date, 'now').mockReturnValueOnce(now);
			generator.playThrottled('test-key', recipe, 500);

			vi.spyOn(Date, 'now').mockReturnValueOnce(now + 501);
			const playSpy = vi.spyOn(generator, 'play');
			generator.playThrottled('test-key', recipe, 500);
			expect(playSpy).toHaveBeenCalledOnce();
		});

		it('다른 키는 독립적으로 스로틀링된다', () => {
			const generator = new SoundGenerator();
			const recipe = {
				frequency: 440,
				duration: 100,
				type: 'sine' as OscillatorType,
				volume: 0.2,
			};

			generator.playThrottled('key-a', recipe, 500);
			const playSpy = vi.spyOn(generator, 'play');
			generator.playThrottled('key-b', recipe, 500);
			expect(playSpy).toHaveBeenCalledOnce();
		});
	});

	describe('오디오 unlock', () => {
		it('suspended AudioContext를 resume한다', () => {
			const resume = vi.fn().mockResolvedValue(undefined);

			class SuspendedAudioContext extends mockCtx.MockAudioContext {
				override state: AudioContextState = 'suspended';
				override resume = resume;
			}

			vi.stubGlobal('AudioContext', SuspendedAudioContext);

			const generator = new SoundGenerator();
			generator.unlock();

			expect(resume).toHaveBeenCalledOnce();
		});
	});

	describe('의미 단위 사운드 스로틀링', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.spyOn(Date, 'now').mockReturnValue(1000);
		});

		it('playGoldEarned는 빠른 연속 호출을 차단한다', () => {
			const generator = new SoundGenerator();
			const playSpy = vi.spyOn(generator, 'play');

			generator.playGoldEarned();
			generator.playGoldEarned();

			expect(playSpy).toHaveBeenCalledTimes(1);

			vi.advanceTimersByTime(130);
			expect(playSpy).toHaveBeenCalledTimes(2);
		});

		it('playUnitDeath는 빠른 연속 호출을 차단한다', () => {
			const generator = new SoundGenerator();
			const playSpy = vi.spyOn(generator, 'play');

			generator.playUnitDeath();
			generator.playUnitDeath();

			expect(playSpy).toHaveBeenCalledTimes(1);
		});

		it('playUnitSpawned는 빠른 연속 호출을 차단한다', () => {
			const generator = new SoundGenerator();
			const playSpy = vi.spyOn(generator, 'play');

			generator.playUnitSpawned();
			generator.playUnitSpawned();

			expect(playSpy).toHaveBeenCalledTimes(1);
		});

		it('playUIHover는 빠른 연속 호출을 차단한다', () => {
			const generator = new SoundGenerator();
			const playSpy = vi.spyOn(generator, 'play');

			generator.playUIHover();
			generator.playUIHover();

			expect(playSpy).toHaveBeenCalledTimes(1);
		});

		it('playUITabSwitch는 탭 전환용 짧은 triangle tick을 재생한다', () => {
			const generator = new SoundGenerator();
			const playSpy = vi.spyOn(generator, 'play');

			generator.playUITabSwitch();

			expect(playSpy).toHaveBeenCalledWith({
				frequency: 900,
				duration: 20,
				type: 'triangle',
				volume: 0.08,
			});
		});

		it('reset은 예약된 후속 노트를 취소한다', () => {
			const generator = new SoundGenerator();
			const playSpy = vi.spyOn(generator, 'play');

			generator.playGoldEarned();
			generator.reset();
			vi.advanceTimersByTime(130);

			expect(playSpy).toHaveBeenCalledTimes(1);
		});
	});
});
