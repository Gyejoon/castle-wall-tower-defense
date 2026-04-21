/** Parse "#a3ff00" (or "a3ff00") → 0xa3ff00. Mirrors
 *  TowerSystem.parseHexColor, which Phase 2.Final will delete once all
 *  legacy projectile paths are gone. */
export function parseHexColor(hex: string): number {
	return parseInt(hex.replace('#', ''), 16);
}
