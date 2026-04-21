export class BgmPlayer {
	private audio: HTMLAudioElement | null = null;
	private currentSrc: string | null = null;
	private volume = 0.7;

	private ensure(src: string): HTMLAudioElement {
		if (!this.audio) {
			const a = new Audio(src);
			a.loop = true;
			a.preload = 'auto';
			a.volume = this.volume;
			this.audio = a;
			this.currentSrc = src;
		} else if (this.currentSrc !== src) {
			this.audio.src = src;
			this.currentSrc = src;
		}
		return this.audio;
	}

	play(src: string): void {
		const a = this.ensure(src);
		a.volume = this.volume;
		const result = a.play();
		if (result && typeof result.catch === 'function') {
			result.catch(() => {
				/* autoplay blocked — will retry on next user gesture */
			});
		}
	}

	stop(): void {
		if (!this.audio) return;
		this.audio.pause();
		this.audio.currentTime = 0;
	}

	setVolume(v: number): void {
		this.volume = Math.max(0, Math.min(1, v));
		if (this.audio) this.audio.volume = this.volume;
	}
}

export const bgmPlayer = new BgmPlayer();
