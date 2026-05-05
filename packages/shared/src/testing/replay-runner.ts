export type ReplayPlacementEvent = {
	tMs: number;
	towerId: string;
	col: number;
	row: number;
};

export type ReplayFixture = {
	fixtureId: string;
	seed: number;
	durationMs: number;
	tickMs: number;
	phase4_dependent?: boolean;
	continueAfterWaveClear?: boolean;
	speedMultiplier?: number;
	placements: ReplayPlacementEvent[];
	expected: ReplayMetrics;
};

export type ReplayMetrics = {
	kills: number;
	totalDamage: number;
	energyPeak: number;
	waveClearMs: number;
};

export type ReplayResult = {
	events: string[];
	metrics: ReplayMetrics;
	perWave: ReplayWaveMetrics[];
};

export type ReplayWaveMetrics = {
	fixtureId: string;
	seed: number;
	wave: number;
	tsDamage: number;
	tsKills: number;
	tsClearMs: number;
	phase4Dependent: boolean;
};

type Vec2 = { x: number; y: number };

type Unit = {
	id: string;
	hp: number;
	speed: number;
	position: Vec2;
	pathIndex: number;
	alive: boolean;
};

type Tower = {
	id: string;
	position: Vec2;
	damage: number;
	range: number;
	attackSpeed: number;
	cooldown: number;
};

const WIDTH = 9;
const HEIGHT = 18;
const PATH_CELLS: Vec2[] = [
	{ x: 0, y: 17 },
	{ x: 1, y: 17 },
	{ x: 2, y: 17 },
	{ x: 3, y: 17 },
	{ x: 3, y: 16 },
	{ x: 3, y: 15 },
	{ x: 3, y: 14 },
	{ x: 3, y: 13 },
	{ x: 4, y: 13 },
	{ x: 5, y: 13 },
	{ x: 5, y: 12 },
	{ x: 5, y: 11 },
	{ x: 5, y: 10 },
	{ x: 4, y: 10 },
	{ x: 3, y: 10 },
	{ x: 3, y: 11 },
	{ x: 3, y: 12 },
	{ x: 3, y: 13 },
	{ x: 3, y: 14 },
	{ x: 3, y: 15 },
	{ x: 3, y: 16 },
	{ x: 3, y: 17 },
	{ x: 4, y: 17 },
	{ x: 5, y: 17 },
	{ x: 5, y: 16 },
	{ x: 5, y: 15 },
	{ x: 5, y: 14 },
	{ x: 5, y: 13 },
];

const PATH: Vec2[] = PATH_CELLS.map((cell) => gridToWorld(cell.x, cell.y));

function gridToWorld(col: number, row: number): Vec2 {
	return {
		x: col - (WIDTH - 1) * 0.5,
		y: (HEIGHT - 1) * 0.5 - row,
	};
}

function distance(a: Vec2, b: Vec2): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

function moveUnit(unit: Unit, deltaSeconds: number) {
	let remaining = unit.speed * deltaSeconds;
	while (remaining > 0 && unit.alive) {
		const nextIndex = unit.pathIndex + 1;
		if (nextIndex >= PATH.length) {
			unit.alive = false;
			return;
		}
		const next = PATH[nextIndex];
		const dx = next.x - unit.position.x;
		const dy = next.y - unit.position.y;
		const d = Math.hypot(dx, dy);
		if (d <= 0.0001) {
			unit.pathIndex = nextIndex;
			continue;
		}
		if (remaining >= d) {
			unit.position = { ...next };
			unit.pathIndex = nextIndex;
			remaining -= d;
		} else {
			unit.position = {
				x: unit.position.x + (dx / d) * remaining,
				y: unit.position.y + (dy / d) * remaining,
			};
			remaining = 0;
		}
	}
}

export function runReplay(fixture: ReplayFixture): ReplayResult {
	const tickMs = fixture.tickMs || 16.6667;
	const durationMs = fixture.durationMs || 60_000;
	const speedMultiplier = fixture.speedMultiplier || 1;
	const placements = [...(fixture.placements ?? [])].sort(
		(a, b) => a.tMs - b.tMs,
	);
	const events: string[] = [`seed:${fixture.seed}`, 'wave:1:start@0'];
	const units: Unit[] = [];
	const towers: Tower[] = [];
	let energy = 40;
	let energyPeak = energy;
	let totalDamage = 0;
	let kills = 0;
	let elapsedMs = 0;
	let placementIndex = 0;
	let spawned = 0;
	let spawnTimer = 0;
	let waveClearMs = durationMs;
	let waveCompleted = false;

	while (elapsedMs <= durationMs) {
		while (
			placementIndex < placements.length &&
			placements[placementIndex].tMs <= elapsedMs
		) {
			const p = placements[placementIndex++];
			if (energy >= 10) {
				energy -= 10;
				towers.push({
					id: p.towerId,
					position: gridToWorld(p.col, p.row),
					damage: 20,
					range: 4,
					attackSpeed: 1,
					cooldown: 0,
				});
				events.push(
					`tower:${p.towerId}@${p.col},${p.row}:${Math.round(elapsedMs)}`,
				);
			}
		}

		const dt = (tickMs / 1000) * speedMultiplier;
		spawnTimer -= dt;
		while (spawned < 5 && spawnTimer <= 0) {
			spawned++;
			units.push({
				id: `unit-${spawned}`,
				hp: 30,
				speed: 3,
				position: { ...PATH[0] },
				pathIndex: 0,
				alive: true,
			});
			events.push(`spawn:${spawned}:${Math.round(elapsedMs)}`);
			spawnTimer += 0.75;
		}

		energy = Math.min(200, energy + dt);
		energyPeak = Math.max(energyPeak, energy);

		for (const unit of units) moveUnit(unit, dt);

		for (const tower of towers) {
			tower.cooldown -= dt;
			if (tower.cooldown > 0) continue;
			const target = units
				.filter(
					(unit) =>
						unit.alive &&
						distance(tower.position, unit.position) <= tower.range,
				)
				.sort(
					(a, b) =>
						distance(tower.position, a.position) -
						distance(tower.position, b.position),
				)[0];
			if (!target) continue;
			const applied = Math.min(target.hp, tower.damage);
			target.hp -= applied;
			totalDamage += applied;
			events.push(`hit:${target.id}:${applied}:${Math.round(elapsedMs)}`);
			if (target.hp <= 0) {
				target.alive = false;
				kills++;
				energy = Math.min(200, energy + 1);
				energyPeak = Math.max(energyPeak, energy);
				events.push(`kill:${target.id}:${Math.round(elapsedMs)}`);
			}
			tower.cooldown += 1 / tower.attackSpeed;
		}

		if (!waveCompleted && spawned >= 5 && units.every((unit) => !unit.alive)) {
			waveCompleted = true;
			waveClearMs = Math.round(elapsedMs);
			events.push(`wave:1:complete@${waveClearMs}`);
			if (fixture.continueAfterWaveClear !== true) break;
		}

		elapsedMs += tickMs;
	}

	const metrics = {
		kills,
		totalDamage,
		energyPeak: Number(energyPeak.toFixed(4)),
		waveClearMs,
	};

	return {
		events,
		metrics,
		perWave: [
			{
				fixtureId: fixture.fixtureId,
				seed: fixture.seed,
				wave: 1,
				tsDamage: metrics.totalDamage,
				tsKills: metrics.kills,
				tsClearMs: metrics.waveClearMs,
				phase4Dependent: fixture.phase4_dependent === true,
			},
		],
	};
}

export function replayMetricsToCsv(rows: ReplayWaveMetrics[]): string {
	const header =
		'fixture_id,seed,wave,ts_damage,ts_kills,ts_clear_ms,phase4_dependent';
	const body = rows.map((row) =>
		[
			row.fixtureId,
			row.seed,
			row.wave,
			row.tsDamage,
			row.tsKills,
			row.tsClearMs,
			row.phase4Dependent,
		].join(','),
	);
	return [header, ...body].join('\n');
}

async function runCli() {
	const { mkdir, readdir, readFile, writeFile } = await import(
		'node:fs/promises'
	);
	const { dirname } = await import('node:path');
	const outPath = process.argv[2] ?? 'phase-3-replay-metrics.csv';
	const fixturesDir = new URL('./replay-fixtures/', import.meta.url);
	const names = (await readdir(fixturesDir))
		.filter((name) => name.endsWith('.json'))
		.sort();
	const rows: ReplayWaveMetrics[] = [];

	for (const name of names) {
		const raw = await readFile(new URL(name, fixturesDir), 'utf8');
		const fixture = JSON.parse(raw) as ReplayFixture;
		rows.push(...runReplay(fixture).perWave);
	}

	await mkdir(dirname(outPath), { recursive: true });
	await writeFile(outPath, `${replayMetricsToCsv(rows)}\n`);
}

if (import.meta.main) {
	await runCli();
}
