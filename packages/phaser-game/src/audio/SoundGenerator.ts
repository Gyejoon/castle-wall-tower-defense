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
}

interface LayerOsc {
	kind: 'osc';
	recipe: SoundRecipe;
}

interface LayerNoise {
	kind: 'noise';
	config: NoiseConfig;
}

type Layer = LayerOsc | LayerNoise;

export class SoundGenerator {
	private audioContext: AudioContext | null = null;
	private masterGainNode: GainNode | null = null;
	private compressorNode: DynamicsCompressorNode | null = null;
	private masterVolume = 1;
	private throttleMap: Map<string, number> = new Map();
	private pendingTimers = new Set<ReturnType<typeof setTimeout>>();

	unlock(): void {
		const ctx = this.getContext();
		if (ctx.state === 'suspended') {
			void ctx.resume();
		}
	}

	private getContext(): AudioContext {
		if (!this.audioContext) {
			this.audioContext = new AudioContext();
		}
		if (!this.masterGainNode) {
			const ctx = this.audioContext;
			this.masterGainNode = ctx.createGain();
			this.masterGainNode.gain.setValueAtTime(
				this.masterVolume,
				ctx.currentTime,
			);
			this.compressorNode = ctx.createDynamicsCompressor();
			this.masterGainNode.connect(this.compressorNode);
			this.compressorNode.connect(ctx.destination);
		}
		return this.audioContext;
	}

	/** Returns the master gain node. Must be called after getContext(). */
	private getOutput(): GainNode {
		// getContext() always initializes masterGainNode
		return this.masterGainNode as GainNode;
	}

	getMasterVolume(): number {
		return this.masterVolume;
	}

	setMasterVolume(v: number): void {
		this.masterVolume = Math.max(0, Math.min(1, v));
		if (this.masterGainNode && this.audioContext) {
			this.masterGainNode.gain.setValueAtTime(
				this.masterVolume,
				this.audioContext.currentTime,
			);
		}
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
				ctx.currentTime + recipe.duration / 1000,
			);
		}

		gainNode.gain.setValueAtTime(recipe.volume, ctx.currentTime);
		gainNode.gain.linearRampToValueAtTime(
			0,
			ctx.currentTime + recipe.duration / 1000,
		);

		oscillator.connect(gainNode);
		gainNode.connect(this.getOutput());

		oscillator.onended = () => {
			oscillator.disconnect();
			gainNode.disconnect();
			oscillator.onended = null;
		};

		oscillator.start(ctx.currentTime);
		oscillator.stop(ctx.currentTime + recipe.duration / 1000);
	}

	playThrottled(key: string, recipe: SoundRecipe, intervalMs: number): void {
		const now = Date.now();
		const last = this.throttleMap.get(key);
		if (last !== undefined && now - last < intervalMs) {
			return;
		}
		this.throttleMap.set(key, now);
		this.play(recipe);
	}

	reset(): void {
		for (const timer of this.pendingTimers) {
			clearTimeout(timer);
		}
		this.pendingTimers.clear();
		if (this.audioContext) {
			void this.audioContext.close();
			this.audioContext = null;
			this.masterGainNode = null;
			this.compressorNode = null;
		}
	}

	private schedule(delayMs: number, action: () => void): void {
		const timer = setTimeout(() => {
			this.pendingTimers.delete(timer);
			action();
		}, delayMs);
		this.pendingTimers.add(timer);
	}

	// ── Private synthesis helpers ──

	private createNoiseBuffer(
		type: 'white' | 'pink' | 'brown',
		duration: number,
	): AudioBuffer {
		const ctx = this.getContext();
		const sampleRate = ctx.sampleRate;
		const length = Math.ceil((sampleRate * duration) / 1000);
		const buffer = ctx.createBuffer(1, length, sampleRate);
		const data = buffer.getChannelData(0);

		if (type === 'white') {
			for (let i = 0; i < length; i++) {
				data[i] = Math.random() * 2 - 1;
			}
		} else if (type === 'pink') {
			let b0 = 0,
				b1 = 0,
				b2 = 0,
				b3 = 0,
				b4 = 0,
				b5 = 0,
				b6 = 0;
			for (let i = 0; i < length; i++) {
				const white = Math.random() * 2 - 1;
				b0 = 0.99886 * b0 + white * 0.0555179;
				b1 = 0.99332 * b1 + white * 0.0750759;
				b2 = 0.969 * b2 + white * 0.153852;
				b3 = 0.8665 * b3 + white * 0.3104856;
				b4 = 0.55 * b4 + white * 0.5329522;
				b5 = -0.7616 * b5 - white * 0.016898;
				data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
				b6 = white * 0.115926;
			}
		} else {
			// brown
			let lastOut = 0;
			for (let i = 0; i < length; i++) {
				const white = Math.random() * 2 - 1;
				lastOut = (lastOut + 0.02 * white) / 1.02;
				data[i] = lastOut * 3.5;
			}
		}

		return buffer;
	}

	private playNoise(config: NoiseConfig): void {
		const ctx = this.getContext();
		const buffer = this.createNoiseBuffer(config.noiseType, config.duration);
		const source = ctx.createBufferSource();
		source.buffer = buffer;

		const gainNode = ctx.createGain();
		gainNode.gain.setValueAtTime(config.volume, ctx.currentTime);
		gainNode.gain.linearRampToValueAtTime(
			0,
			ctx.currentTime + config.duration / 1000,
		);

		if (config.filterType && config.filterFreq !== undefined) {
			const filter = ctx.createBiquadFilter();
			filter.type = config.filterType;
			filter.frequency.setValueAtTime(config.filterFreq, ctx.currentTime);
			if (config.filterQ !== undefined) {
				filter.Q.setValueAtTime(config.filterQ, ctx.currentTime);
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

		gainNode.connect(this.getOutput());
		source.start(ctx.currentTime);
		source.stop(ctx.currentTime + config.duration / 1000);
	}

	private playFM(
		carrierFreq: number,
		modFreq: number,
		modDepth: number,
		duration: number,
		volume: number,
		modDepthEnd?: number,
	): void {
		const ctx = this.getContext();
		const carrier = ctx.createOscillator();
		const modulator = ctx.createOscillator();
		const modGain = ctx.createGain();
		const outputGain = ctx.createGain();

		carrier.frequency.setValueAtTime(carrierFreq, ctx.currentTime);
		modulator.frequency.setValueAtTime(modFreq, ctx.currentTime);
		modGain.gain.setValueAtTime(modDepth, ctx.currentTime);
		if (modDepthEnd !== undefined) {
			modGain.gain.linearRampToValueAtTime(
				modDepthEnd,
				ctx.currentTime + duration / 1000,
			);
		}

		outputGain.gain.setValueAtTime(volume, ctx.currentTime);
		outputGain.gain.linearRampToValueAtTime(
			0,
			ctx.currentTime + duration / 1000,
		);

		modulator.connect(modGain);
		modGain.connect(carrier.frequency);
		carrier.connect(outputGain);
		outputGain.connect(this.getOutput());

		carrier.onended = () => {
			carrier.disconnect();
			modulator.disconnect();
			modGain.disconnect();
			outputGain.disconnect();
			carrier.onended = null;
		};

		carrier.start(ctx.currentTime);
		modulator.start(ctx.currentTime);
		carrier.stop(ctx.currentTime + duration / 1000);
		modulator.stop(ctx.currentTime + duration / 1000);
	}

	private playLayered(layers: Layer[]): void {
		for (const layer of layers) {
			if (layer.kind === 'osc') {
				this.play(layer.recipe);
			} else {
				this.playNoise(layer.config);
			}
		}
	}

	// ── Existing sound methods (same signatures) ──

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
		// 5-note fanfare: C5-E5-G5-C6-E6 + white noise cymbal
		const notes: Array<{ frequency: number; delay: number }> = [
			{ frequency: 523, delay: 0 }, // C5
			{ frequency: 659, delay: 100 }, // E5
			{ frequency: 784, delay: 200 }, // G5
			{ frequency: 1047, delay: 300 }, // C6
			{ frequency: 1319, delay: 400 }, // E6
		];

		for (const note of notes) {
			this.schedule(note.delay, () => {
				this.play({
					frequency: note.frequency,
					duration: 150,
					type: 'sine',
					volume: 0.3,
				});
			});
		}

		// White noise cymbal
		this.schedule(400, () => {
			this.playNoise({
				noiseType: 'white',
				duration: 200,
				volume: 0.08,
				filterType: 'highpass',
				filterFreq: 6000,
			});
		});
	}

	playMatchDefeat(): void {
		// 3-note descending: G4-Eb4-C4 + brown noise rumble
		const notes: Array<{ frequency: number; delay: number }> = [
			{ frequency: 392, delay: 0 }, // G4
			{ frequency: 311, delay: 150 }, // Eb4
			{ frequency: 262, delay: 300 }, // C4
		];

		for (const note of notes) {
			this.schedule(note.delay, () => {
				this.play({
					frequency: note.frequency,
					duration: 200,
					type: 'sine',
					volume: 0.3,
				});
			});
		}

		// Brown noise rumble
		this.playNoise({
			noiseType: 'brown',
			duration: 500,
			volume: 0.1,
			filterType: 'lowpass',
			filterFreq: 200,
		});
	}

	playTowerAttack(towerType: string): void {
		const recipes: Record<string, SoundRecipe> = {
			archer: {
				frequency: 1200,
				endFrequency: 800,
				duration: 60,
				type: 'sawtooth',
				volume: 0.12,
			},
			twin_archer: {
				frequency: 1400,
				endFrequency: 900,
				duration: 50,
				type: 'sawtooth',
				volume: 0.14,
			},
			plasma: {
				frequency: 120,
				endFrequency: 60,
				duration: 80,
				type: 'triangle',
				volume: 0.18,
			},
			nova_cannon: {
				frequency: 90,
				endFrequency: 40,
				duration: 120,
				type: 'triangle',
				volume: 0.2,
			},
			emp: {
				frequency: 600,
				endFrequency: 400,
				duration: 80,
				type: 'square',
				volume: 0.08,
			},
			disruptor: {
				frequency: 700,
				endFrequency: 350,
				duration: 100,
				type: 'square',
				volume: 0.1,
			},
			fortress: {
				frequency: 500,
				endFrequency: 600,
				duration: 70,
				type: 'triangle',
				volume: 0.1,
			},
		};
		const recipe = recipes[towerType];
		if (recipe) {
			this.play(recipe);

			// Noise sub-layers for specific tower types
			if (towerType === 'plasma' || towerType === 'nova_cannon') {
				// Launch thump — short brown noise burst
				this.playNoise({
					noiseType: 'brown',
					duration: 40,
					volume: 0.15,
					filterType: 'lowpass',
					filterFreq: 300,
				});
				// Whoosh — white noise sweep for projectile in flight
				this.schedule(30, () => {
					this.playNoise({
						noiseType: 'white',
						duration: 60,
						volume: 0.04,
						filterType: 'bandpass',
						filterFreq: 600,
						filterQ: 2,
					});
				});
				// Impact thud — delayed brown noise
				this.schedule(80, () => {
					this.playNoise({
						noiseType: 'brown',
						duration: 50,
						volume: 0.1,
						filterType: 'lowpass',
						filterFreq: 200,
					});
				});
			} else if (towerType === 'archer' || towerType === 'twin_archer') {
				this.playNoise({
					noiseType: 'white',
					duration: 10,
					volume: 0.05,
					filterType: 'highpass',
					filterFreq: 8000,
				});
			}
		}
	}

	playUnitDeath(): void {
		this.playThrottled(
			'unitDeath',
			{
				frequency: 300,
				endFrequency: 100,
				duration: 100,
				type: 'sawtooth',
				volume: 0.1,
			},
			100,
		);
	}

	// ── UI sounds (5) ──

	playUIClick(): void {
		this.play({ frequency: 1200, duration: 30, type: 'sine', volume: 0.15 });
	}

	playUIHover(): void {
		this.playThrottled(
			'uiHover',
			{ frequency: 1000, duration: 15, type: 'sine', volume: 0.06 },
			150,
		);
	}

	playUITabSwitch(): void {
		this.play({ frequency: 900, duration: 20, type: 'triangle', volume: 0.08 });
	}

	playUIError(): void {
		this.play({ frequency: 200, duration: 80, type: 'square', volume: 0.12 });
		this.schedule(180, () => {
			this.play({ frequency: 200, duration: 80, type: 'square', volume: 0.1 });
		}); // 80ms duration + 100ms gap
	}

	playUIConfirm(): void {
		this.play({
			frequency: 800,
			endFrequency: 1200,
			duration: 60,
			type: 'sine',
			volume: 0.15,
		});
	}

	playUICancel(): void {
		this.play({
			frequency: 600,
			endFrequency: 400,
			duration: 60,
			type: 'sine',
			volume: 0.12,
		});
	}

	// ── Tower sounds (3) ──

	playTowerPlaced(): void {
		this.playFM(600, 1200, 200, 150, 0.15, 0);
	}

	playTowerSold(): void {
		this.play({
			frequency: 1000,
			endFrequency: 500,
			duration: 100,
			type: 'triangle',
			volume: 0.12,
		});
		this.playNoise({
			noiseType: 'white',
			duration: 40,
			volume: 0.05,
			filterType: 'highpass',
			filterFreq: 4000,
		});
	}

	playTowerUpgraded(): void {
		// 3-note arpeggio: C5-E5-G5 square 80ms each, 60ms gap
		const notes: Array<{ frequency: number; delay: number }> = [
			{ frequency: 523, delay: 0 }, // C5
			{ frequency: 659, delay: 140 }, // E5 (80ms + 60ms gap)
			{ frequency: 784, delay: 280 }, // G5
		];

		for (const note of notes) {
			this.schedule(note.delay, () => {
				this.play({
					frequency: note.frequency,
					duration: 80,
					type: 'square',
					volume: 0.12,
				});
			});
		}
	}

	// ── Gameplay sounds (8) ──

	playWaveComplete(): void {
		// 3-note E5-G5-C6 sine 120ms each + white noise shimmer
		const notes: Array<{ frequency: number; delay: number }> = [
			{ frequency: 659, delay: 0 }, // E5
			{ frequency: 784, delay: 140 }, // G5
			{ frequency: 1047, delay: 280 }, // C6
		];

		for (const note of notes) {
			this.schedule(note.delay, () => {
				this.play({
					frequency: note.frequency,
					duration: 120,
					type: 'sine',
					volume: 0.15,
				});
			});
		}

		this.playNoise({
			noiseType: 'white',
			duration: 200,
			volume: 0.04,
			filterType: 'highpass',
			filterFreq: 6000,
		});
	}

	playBuildPhaseStart(): void {
		this.play({ frequency: 500, duration: 200, type: 'sine', volume: 0.12 });
	}

	playCountdownTick(): void {
		this.play({ frequency: 1500, duration: 20, type: 'sine', volume: 0.1 });
	}

	playUnitSpawned(): void {
		const now = Date.now();
		const last = this.throttleMap.get('unitSpawn');
		if (last !== undefined && now - last < 500) {
			return;
		}
		this.throttleMap.set('unitSpawn', now);
		this.playLayered([
			{
				kind: 'noise',
				config: {
					noiseType: 'white',
					duration: 30,
					volume: 0.08,
					filterType: 'bandpass',
					filterFreq: 2000,
					filterQ: 2,
				},
			},
			{
				kind: 'osc',
				recipe: { frequency: 800, duration: 40, type: 'sine', volume: 0.1 },
			},
		]);
	}

	playBreach(): void {
		this.playLayered([
			{
				kind: 'osc',
				recipe: {
					frequency: 300,
					endFrequency: 350,
					duration: 200,
					type: 'square',
					volume: 0.18,
				},
			},
			{
				kind: 'noise',
				config: {
					noiseType: 'white',
					duration: 100,
					volume: 0.1,
					filterType: 'bandpass',
					filterFreq: 1000,
					filterQ: 3,
				},
			},
		]);
	}

	playGoldEarned(): void {
		const now = Date.now();
		const last = this.throttleMap.get('goldEarned');
		if (last !== undefined && now - last < 300) {
			return;
		}
		this.throttleMap.set('goldEarned', now);
		this.play({ frequency: 987, duration: 60, type: 'square', volume: 0.1 }); // B5
		this.schedule(130, () => {
			this.play({ frequency: 1319, duration: 80, type: 'square', volume: 0.1 }); // E6
		}); // 60ms + 70ms gap
	}

	playGoldSpent(): void {
		this.play({
			frequency: 600,
			endFrequency: 400,
			duration: 50,
			type: 'triangle',
			volume: 0.08,
		});
	}

	playHPLoss(): void {
		this.playLayered([
			{
				kind: 'noise',
				config: {
					noiseType: 'brown',
					duration: 120,
					volume: 0.1,
					filterType: 'lowpass',
					filterFreq: 300,
				},
			},
			{
				kind: 'osc',
				recipe: { frequency: 100, duration: 120, type: 'sine', volume: 0.12 },
			},
		]);
	}

	// ── Pressure sounds (3) ──

	playPressureDefense(): void {
		this.playFM(600, 900, 150, 100, 0.12, 0);
	}

	playPressureInvest(): void {
		this.play({
			frequency: 400,
			endFrequency: 800,
			duration: 150,
			type: 'sine',
			volume: 0.12,
		});
	}

	playPressureGhostApplied(): void {
		// Beat frequency: 200Hz + 205Hz sine, 250ms
		const ctx = this.getContext();

		const osc1 = ctx.createOscillator();
		const osc2 = ctx.createOscillator();
		const gain1 = ctx.createGain();
		const gain2 = ctx.createGain();

		osc1.type = 'sine';
		osc2.type = 'sine';
		osc1.frequency.setValueAtTime(200, ctx.currentTime);
		osc2.frequency.setValueAtTime(205, ctx.currentTime);

		gain1.gain.setValueAtTime(0.08, ctx.currentTime);
		gain1.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
		gain2.gain.setValueAtTime(0.08, ctx.currentTime);
		gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);

		osc1.connect(gain1);
		osc2.connect(gain2);
		gain1.connect(this.getOutput());
		gain2.connect(this.getOutput());

		osc1.onended = () => {
			osc1.disconnect();
			gain1.disconnect();
			osc1.onended = null;
		};
		osc2.onended = () => {
			osc2.disconnect();
			gain2.disconnect();
			osc2.onended = null;
		};

		osc1.start(ctx.currentTime);
		osc2.start(ctx.currentTime);
		osc1.stop(ctx.currentTime + 0.25);
		osc2.stop(ctx.currentTime + 0.25);
	}
}

export const soundGenerator = new SoundGenerator();
