import { PLATFORM_LIFT } from '../../fieldAssets';
import type {
	AttackContext,
	DamageEvent,
	ProjectileEmitter,
	TowerRuntimeRef,
	UnitSnapshot,
} from '../types';
import { parseHexColor } from '../vfx/colors';
import type { AttackLineEntry } from '../vfx/TowerVfxController';

/** Splash radius for all siege towers in grid-tile units squared.
 *  Matches legacy TowerSystem.SPLASH_RADIUS_SQ = 2.25 (= 1.5²). The
 *  per-tower `splash_X.X` suffix on def.stats.special is vestigial —
 *  legacy ignores it and uses this constant for every splash tower. */
const SPLASH_RADIUS_SQ = 2.25;

export interface ArcEmitterOpts {
	/** Override fire origin (e.g. nova_cannon's barrel tip). If undefined,
	 *  uses tower world center with platform-lift y offset. */
	fireOrigin?: (
		tower: TowerRuntimeRef,
		ctx: AttackContext,
	) => { x: number; y: number };
	/** Override muzzle VFX spawning (nova_cannon uses hit-flash at barrel
	 *  tip instead of animated muzzle spritesheet). Default: spawn muzzle
	 *  spritesheet via ctx.vfx.spawnMuzzleVfx. */
	spawnMuzzle?: (
		tower: TowerRuntimeRef,
		ctx: AttackContext,
		fireOrigin: { x: number; y: number },
	) => void;
}

/** Arc-style (parabolic) projectile emitter for siege towers. Authors
 *  damage events inline (main + splash) and defers them via
 *  `pendingDamage` on the attack line, matching legacy arc behavior
 *  where all damage lands on projectile impact (legacy mirror:
 *  TowerSystem.ts:689-728 splash branch + :730-825 attackLine build).
 *
 *  Siege towers compose with `behaviors: []` — this emitter owns all
 *  damage event creation (no separate SplashAttack behavior). */
export class ArcEmitter implements ProjectileEmitter {
	constructor(private readonly opts: ArcEmitterOpts = {}) {}

	emit(
		_origin: { x: number; y: number },
		target: UnitSnapshot,
		tower: TowerRuntimeRef,
		ctx: AttackContext,
	): void {
		const data = tower.data;
		const towerWorld = ctx.gridManager.gridToWorld(
			data.position.x,
			data.position.y,
		);
		const fireLift = ctx.gridManager.orthoTile * PLATFORM_LIFT;
		const fireOrigin = this.opts.fireOrigin
			? this.opts.fireOrigin(tower, ctx)
			: { x: towerWorld.x, y: towerWorld.y - fireLift };

		// Build pending damage batch
		const pending: DamageEvent[] = [];

		// Main-target damage. Legacy: `armorPierce = !def.stats.special`.
		// All siege towers have `splash_X.X` specials, so this is false.
		const armorPierce = !tower.def.stats.special;
		pending.push({
			unitId: target.instanceId,
			damage: ctx.resolveDamage(target),
			armorPierce,
		});

		// Splash: all other living units within SPLASH_RADIUS_SQ of the PRIMARY
		// TARGET's grid position. Each gets 0.5× damage via resolveSplashDamage.
		const targetGrid = ctx.gridManager.worldToGridFloat(target.x, target.y);
		for (const unit of ctx.units) {
			if (unit.instanceId === target.instanceId || unit.hp <= 0) continue;
			const unitGrid = ctx.gridManager.worldToGridFloat(unit.x, unit.y);
			const dx = targetGrid.x - unitGrid.x;
			const dy = targetGrid.y - unitGrid.y;
			if (dx * dx + dy * dy <= SPLASH_RADIUS_SQ) {
				pending.push({
					unitId: unit.instanceId,
					damage: ctx.resolveSplashDamage(unit),
				});
			}
		}

		// TTL: grid-space distance from tower grid to target grid (not pixels).
		// Mirrors ArrowEmitter / legacy TowerSystem.ts:842-851.
		const projSpeed = tower.def.stats.projectileSpeed;
		let maxTtl: number;
		if (projSpeed && projSpeed > 0) {
			const gdx = data.position.x - targetGrid.x;
			const gdy = data.position.y - targetGrid.y;
			const dist = Math.sqrt(gdx * gdx + gdy * gdy);
			maxTtl = Math.round((dist / projSpeed) * 1000);
			maxTtl = Math.max(40, Math.min(maxTtl, 500));
		} else {
			maxTtl = 120;
		}

		const color = parseHexColor(tower.def.color);

		const line: AttackLineEntry = {
			x1: fireOrigin.x,
			y1: fireOrigin.y,
			x2: target.x,
			y2: target.y,
			color,
			ttl: maxTtl,
			maxTtl,
			style: 'arc',
			towerType: tower.def.id,
			targetUnitId: target.instanceId,
			impactPending: true,
			pendingDamage: pending,
			impactVfxKey: 'vfx-explosion-sm',
		};
		ctx.vfx.pushAttackLine(line);

		// Muzzle VFX — nova_cannon overrides to render a hit-flash at the
		// barrel tip instead of the animated muzzle spritesheet.
		if (this.opts.spawnMuzzle) {
			this.opts.spawnMuzzle(tower, ctx, fireOrigin);
		} else {
			const gridPos = { x: data.position.x, y: data.position.y };
			ctx.vfx.spawnMuzzleVfx(tower.def.id, towerWorld, gridPos, tower.sprite);
		}

		ctx.vfx.playTowerAttackThrottled(tower.def.id, ctx.time);
	}
}
