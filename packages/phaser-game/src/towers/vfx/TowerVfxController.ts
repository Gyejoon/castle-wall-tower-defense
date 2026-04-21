import type Phaser from 'phaser';

/** Phase 1: empty shell. Phase 2 will port TowerSystem's spawnMuzzleVfx /
 *  spawnImpactVfx / attackLines push logic into this class. For now it
 *  exists so `types.ts` can reference it without circular pulls. */
export class TowerVfxController {
	constructor(private readonly _scene: Phaser.Scene) {}
	spawnMuzzleVfx(_x: number, _y: number, _key?: string): void {}
	spawnImpactVfx(_x: number, _y: number, _key?: string): void {}
	pushAttackLine(_payload: unknown): void {}
	destroy(): void {}
}
