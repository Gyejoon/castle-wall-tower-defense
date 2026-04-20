/**
 * Z-index scale — 5 semantic layers, no raw `z-[N]` literals allowed.
 *
 * Layer order (low → high):
 *   board      → game canvas (default stacking)
 *   hud        → top/bottom HUD chrome (always visible over board)
 *   floating   → tower action sheet, in-canvas callouts
 *   overlay    → upgrade pick, summon reveal (dimmed backdrop)
 *   modal      → pause, game-over, major state gates
 *   toast      → transient notifications on top of everything
 */

export const zIndex = {
	board: 0,
	hud: 10,
	floating: 20,
	overlay: 30,
	modal: 40,
	toast: 50,
} as const;

export type ZIndexKey = keyof typeof zIndex;
