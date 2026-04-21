/** Parse "#a3ff00" (or "a3ff00") → 0xa3ff00. Single source of truth for
 *  tower color parsing — consumed by every emitter (arrow/arc/beam/
 *  multi-shot) and by `TowerSystem.renderTowerBase` for the tower base
 *  ring. The legacy TowerSystem.parseHexColor static method was removed
 *  in Phase 2.Final now that no legacy projectile paths remain. */
export function parseHexColor(hex: string): number {
	return parseInt(hex.replace('#', ''), 16);
}
