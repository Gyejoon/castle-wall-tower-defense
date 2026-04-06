type ClassValue = string | false | null | undefined | Record<string, boolean | null | undefined>;

export function cn(...classes: ClassValue[]): string {
	return classes
		.flatMap((c) => {
			if (!c) return [];
			if (typeof c === 'string') return [c];
			return Object.entries(c)
				.filter(([, v]) => v)
				.map(([k]) => k);
		})
		.join(' ');
}
