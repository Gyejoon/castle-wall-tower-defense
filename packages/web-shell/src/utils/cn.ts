type ClassValue =
	| string
	| false
	| null
	| undefined
	| Record<string, boolean | undefined>;

export function cn(...classes: ClassValue[]): string {
	const result: string[] = [];
	for (const cls of classes) {
		if (!cls) continue;
		if (typeof cls === 'string') {
			result.push(cls);
		} else {
			for (const [key, val] of Object.entries(cls)) {
				if (val) result.push(key);
			}
		}
	}
	return result.join(' ');
}
