export function parseHexColor(hex: string): number {
	return parseInt(hex.replace('#', ''), 16);
}
