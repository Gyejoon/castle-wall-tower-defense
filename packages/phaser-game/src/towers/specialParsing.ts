export function parseSlowFactor(special: string): number {
	const match = special.match(/slow_(\d+)%/);
	if (!match) return 0.7;
	return 1 - parseInt(match[1], 10) / 100;
}

export function hasSplash(special?: string): boolean {
	if (!special) return false;
	return special === 'splash' || special.startsWith('splash_');
}

export function isStunSpecial(special?: string): boolean {
	return special?.startsWith('stun') ?? false;
}

export function isSlowSpecial(special?: string): boolean {
	return special?.startsWith('slow_') ?? false;
}
