import { spawnSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import type { IncomingMessage } from 'node:http';
import { dirname, extname, join, relative, resolve } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

type AssetManifestType = 'image' | 'spritesheet' | 'tilemapTiledJSON';
type AssetManifestSection =
	| 'preload'
	| 'ui'
	| 'vfx'
	| 'projectiles'
	| 'mobile'
	| 'icons'
	| 'boss'
	| 'reward'
	| 'tutorial'
	| 'gacha';
type AssetPolishLevel = 'canvas-only' | 'libresprite-polished';

interface AssetManifestEntry {
	key: string;
	type: AssetManifestType;
	path: string;
	section?: AssetManifestSection;
	frameWidth?: number;
	frameHeight?: number;
	frameCount?: number;
	polish?: AssetPolishLevel;
}

interface AssetManifest {
	generated: string;
	assets: AssetManifestEntry[];
}

interface CatalogEntry extends AssetManifestEntry {
	section: AssetManifestSection;
	fileExists: boolean;
	webpExists: boolean | null;
	codeReferences: string[];
}

type AcrStatus = 'draft' | 'in_review' | 'blocked' | 'ready' | 'applied';
type CheckStatus = 'pending' | 'pass' | 'fail' | 'required';

interface AcrChecklistItem {
	id: string;
	label: string;
	status: CheckStatus;
}

interface AcrLogEntry {
	id: string;
	at: string;
	kind: 'info' | 'command' | 'apply';
	message: string;
	stdout?: string;
	stderr?: string;
	exitCode?: number;
}

interface AcrManifestUpdate {
	key: string;
	section?: AssetManifestSection;
	polish?: AssetPolishLevel;
}

interface AssetChangeRequest {
	id: string;
	title: string;
	assetKeys: string[];
	status: AcrStatus;
	checklist: AcrChecklistItem[];
	logs: AcrLogEntry[];
	manifestUpdates?: AcrManifestUpdate[];
	createdAt: string;
	updatedAt: string;
	appliedAt?: string;
}

interface StagingEntry {
	id: string;
	hasOriginal: boolean;
	hasPolished: boolean;
	metadata: Record<string, unknown> | null;
}

type TileKind = 'ground' | 'path' | 'platform' | 'wall' | 'foliage';

interface TilemapCell {
	x: number;
	y: number;
	kind: TileKind;
}

interface TilemapDocument {
	id: string;
	file: string;
	width: number;
	height: number;
	tileSize: number;
	cells: TilemapCell[];
	ruleTiles: Array<{
		layer: string;
		kind: TileKind;
		rule: 'fill' | 'path-neighbor-mask' | 'inverse-path';
	}>;
}

interface SceneRecord {
	key: string;
	className: string;
	file: string;
	order: number;
	enabled: boolean;
	view: 'boot' | 'preload' | 'top-down-game' | 'overlay';
	notes: string;
}

interface SceneSettings {
	scenes: SceneRecord[];
	updatedAt: string;
}

interface EnergyBalance {
	energyPerSecond: number;
	energyInitial: number;
	energyMax: number;
	energyPerKill: number;
	energyPerWaveClear: number;
	energyPerBossKill: number;
	energyPerBossFastClear: number;
	fastClearThresholdMs: number;
}

interface GachaBalance {
	tier2: { cost: number; successRate: number };
	tier3: { cost: number; successRate: number };
	tier4: { cost: number; successRate: number };
}

interface WaveScalingRow {
	slot: number;
	hp: number;
	speed: number;
}

interface TowerBalanceRow {
	id: string;
	name: string;
	tier: number;
	family: string;
	cost: number;
	damage?: number;
	range?: number;
	attackSpeed?: number;
}

interface BalanceSheet {
	energy: EnergyBalance;
	gacha: GachaBalance;
	hpSlope: number;
	waveScaling: WaveScalingRow[];
	towers: TowerBalanceRow[];
}

export interface ToolsPluginOptions {
	repoRoot?: string;
}

const CHECKS = {
	'asset-audit': {
		label: 'Asset audit',
		command: ['bun', 'gld-pipe', 'audit'],
	},
	'phaser-tests': {
		label: 'Phaser tests',
		command: ['bun', 'run', 'test:phaser'],
	},
	'web-build': {
		label: 'Web build',
		command: ['bun', 'run', 'build:web'],
	},
} as const;

type CheckId = keyof typeof CHECKS;

function inferAssetManifestSection(
	entry: Pick<AssetManifestEntry, 'key' | 'path'>,
): AssetManifestSection {
	if (entry.path.includes('/ui-mobile/')) return 'mobile';
	if (entry.path.includes('/icons/')) return 'icons';
	if (entry.path.includes('/projectiles/')) return 'projectiles';
	if (entry.path.includes('/vfx/')) return 'vfx';
	if (entry.path.includes('/boss/')) return 'boss';
	if (entry.path.includes('/reward/')) return 'reward';
	if (entry.path.includes('/tutorial/')) return 'tutorial';
	if (entry.path.includes('/gacha/')) return 'gacha';
	if (entry.path.includes('/ui/')) return 'ui';
	if (entry.path.includes('/towers/') && entry.key.endsWith('-fire')) {
		return 'vfx';
	}
	return 'preload';
}

// biome-ignore lint/suspicious/noExplicitAny: Vite middleware response is Node-compatible but loosely typed.
function sendJson(res: any, code: number, body: unknown): void {
	res.statusCode = code;
	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify(body));
}

// biome-ignore lint/suspicious/noExplicitAny: Vite middleware response is Node-compatible but loosely typed.
function sendFile(res: any, path: string): void {
	const ext = extname(path).toLowerCase();
	const mime =
		ext === '.png'
			? 'image/png'
			: ext === '.webp'
				? 'image/webp'
				: ext === '.json'
					? 'application/json'
					: 'application/octet-stream';
	res.setHeader('Content-Type', mime);
	res.setHeader('Cache-Control', 'no-store');
	res.end(readFileSync(path));
}

function ensureDir(path: string): void {
	mkdirSync(path, { recursive: true });
}

function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function writeJson(path: string, value: unknown): void {
	ensureDir(dirname(path));
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function sanitizeId(raw: string): string | null {
	if (!/^[a-z0-9_-]+$/i.test(raw)) return null;
	return raw;
}

function sanitizeFile(raw: string): string | null {
	if (!/^[a-z0-9._/-]+$/i.test(raw)) return null;
	if (raw.includes('..')) return null;
	return raw;
}

function safeResolve(root: string, rawPath: string): string | null {
	const clean = sanitizeFile(rawPath);
	if (!clean) return null;
	const full = resolve(root, clean);
	const normalizedRoot = resolve(root);
	if (full !== normalizedRoot && !full.startsWith(`${normalizedRoot}/`)) {
		return null;
	}
	return full;
}

function listFilesRecursive(dir: string, suffixes: string[]): string[] {
	const out: string[] = [];
	if (!existsSync(dir)) return out;
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			out.push(...listFilesRecursive(full, suffixes));
		} else if (suffixes.some((suffix) => entry.endsWith(suffix))) {
			out.push(full);
		}
	}
	return out;
}

function loadSourceIndex(
	repoRoot: string,
): Array<{ path: string; text: string }> {
	const dirs = [
		'packages/phaser-game/src',
		'packages/shared/src',
		'packages/web-shell/src',
		'scripts/generate-assets',
	];
	return dirs.flatMap((dir) =>
		listFilesRecursive(join(repoRoot, dir), ['.ts', '.tsx']).map((path) => ({
			path: relative(repoRoot, path),
			text: readFileSync(path, 'utf8'),
		})),
	);
}

function findCodeReferences(
	entry: AssetManifestEntry,
	sources: Array<{ path: string; text: string }>,
): string[] {
	const needles = new Set([entry.key]);
	const fileBase = entry.path
		.split('/')
		.pop()
		?.replace(/\.(png|webp|json)$/i, '');
	if (fileBase) needles.add(fileBase);

	const refs: string[] = [];
	for (const source of sources) {
		for (const needle of needles) {
			if (needle && source.text.includes(needle)) {
				refs.push(source.path);
				break;
			}
		}
		if (refs.length >= 6) break;
	}
	return refs;
}

interface UiComponent {
	key: string;
	file: string;
	exports: string[];
	sectionId: string;
	codeReferences: string[];
}

function readUiComponents(repoRoot: string): UiComponent[] {
	const dsRoot = join(repoRoot, 'packages/web-shell/src/components/ds');
	if (!existsSync(dsRoot)) return [];
	const files = readdirSync(dsRoot).filter(
		(name) => name.endsWith('.tsx') && !name.startsWith('__'),
	);
	const sources = loadSourceIndex(repoRoot);
	const dsRelative = relative(repoRoot, dsRoot);
	const exportRegex =
		/export\s+(?:function|const|class|type|interface)\s+([A-Za-z0-9_]+)/g;

	return files
		.map((name) => {
			const fullPath = join(dsRoot, name);
			const text = readFileSync(fullPath, 'utf8');
			const exports = Array.from(text.matchAll(exportRegex), (m) => m[1]);
			const key = name.replace(/\.tsx$/, '');
			const refs: string[] = [];
			for (const source of sources) {
				if (source.path.startsWith(`${dsRelative}/`)) continue;
				if (source.text.includes(key)) refs.push(source.path);
				if (refs.length >= 8) break;
			}
			return {
				key,
				file: relative(repoRoot, fullPath),
				exports,
				sectionId: `ds-${key.toLowerCase()}`,
				codeReferences: refs,
			};
		})
		.sort((a, b) => a.key.localeCompare(b.key));
}

function readCatalog(repoRoot: string): CatalogEntry[] {
	const assetsRoot = join(repoRoot, 'packages/web-shell/public/assets');
	const manifest = readJson<AssetManifest>(
		join(assetsRoot, 'asset-manifest.json'),
	);
	const sources = loadSourceIndex(repoRoot);

	return manifest.assets.map((entry) => {
		const section = entry.section ?? inferAssetManifestSection(entry);
		const filePath = join(assetsRoot, entry.path.replace(/^assets\//, ''));
		const webpPath = filePath.replace(/\.(png)$/i, '.webp');
		const needsWebp = entry.type === 'image' || entry.type === 'spritesheet';
		return {
			...entry,
			section,
			fileExists: existsSync(filePath),
			webpExists: needsWebp ? existsSync(webpPath) : null,
			codeReferences: findCodeReferences(entry, sources),
		};
	});
}

function defaultChecklist(): AcrChecklistItem[] {
	return [
		{
			id: 'manifest',
			label: 'Manifest entry reviewed',
			status: 'pending',
		},
		{
			id: 'files',
			label: 'PNG/WebP files verified',
			status: 'pending',
		},
		{
			id: 'docs',
			label: 'docs/game-spec/07-asset-definition.md reviewed',
			status: 'required',
		},
		{
			id: 'tests',
			label: 'Allowlisted validation run',
			status: 'pending',
		},
	];
}

function acrPath(acrRoot: string, id: string): string {
	return join(acrRoot, `${id}.json`);
}

function listAcrs(acrRoot: string): AssetChangeRequest[] {
	if (!existsSync(acrRoot)) return [];
	return readdirSync(acrRoot)
		.filter((file) => file.endsWith('.json'))
		.map((file) => readJson<AssetChangeRequest>(join(acrRoot, file)))
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function createAcr(
	acrRoot: string,
	input: Partial<Pick<AssetChangeRequest, 'title' | 'assetKeys'>>,
): AssetChangeRequest {
	const now = new Date().toISOString();
	const safeTitle =
		typeof input.title === 'string' && input.title.trim()
			? input.title.trim()
			: 'Asset change request';
	const existing = listAcrs(acrRoot).length + 1;
	const id = `ACR-${String(existing).padStart(3, '0')}-${Date.now().toString(36)}`;
	const acr: AssetChangeRequest = {
		id,
		title: safeTitle,
		assetKeys: Array.isArray(input.assetKeys) ? input.assetKeys : [],
		status: 'draft',
		checklist: defaultChecklist(),
		logs: [
			{
				id: `log-${Date.now().toString(36)}`,
				at: now,
				kind: 'info',
				message: 'ACR created',
			},
		],
		createdAt: now,
		updatedAt: now,
	};
	writeJson(acrPath(acrRoot, id), acr);
	return acr;
}

function updateAcr(
	acrRoot: string,
	id: string,
	patch: Partial<AssetChangeRequest>,
): AssetChangeRequest | null {
	const safeId = sanitizeId(id);
	if (!safeId) return null;
	const path = acrPath(acrRoot, safeId);
	if (!existsSync(path)) return null;
	const current = readJson<AssetChangeRequest>(path);
	const next: AssetChangeRequest = {
		...current,
		...patch,
		id: current.id,
		createdAt: current.createdAt,
		updatedAt: new Date().toISOString(),
	};
	writeJson(path, next);
	return next;
}

function appendAcrLog(
	acrRoot: string,
	id: string,
	log: Omit<AcrLogEntry, 'id' | 'at'>,
): AssetChangeRequest | null {
	const safeId = sanitizeId(id);
	if (!safeId) return null;
	const path = acrPath(acrRoot, safeId);
	if (!existsSync(path)) return null;
	const current = readJson<AssetChangeRequest>(path);
	const next: AssetChangeRequest = {
		...current,
		logs: [
			{
				id: `log-${Date.now().toString(36)}`,
				at: new Date().toISOString(),
				...log,
			},
			...current.logs,
		],
		updatedAt: new Date().toISOString(),
	};
	writeJson(path, next);
	return next;
}

function runAllowlistedCheck(repoRoot: string, checkId: string) {
	if (!Object.hasOwn(CHECKS, checkId)) return null;
	const check = CHECKS[checkId as CheckId];
	const [cmd, ...args] = check.command;
	const result = spawnSync(cmd, args, {
		cwd: repoRoot,
		encoding: 'utf8',
		timeout: 180_000,
	});
	return {
		label: check.label,
		exitCode: result.status ?? -1,
		stdout: result.stdout ?? '',
		stderr: result.stderr ?? '',
	};
}

function applyManifestUpdates(
	repoRoot: string,
	updates: AcrManifestUpdate[] | undefined,
): { changed: boolean; message: string } {
	if (!updates?.length) {
		return {
			changed: false,
			message: 'No manifest updates declared for this ACR.',
		};
	}

	const manifestPath = join(
		repoRoot,
		'packages/web-shell/public/assets/asset-manifest.json',
	);
	const manifest = readJson<AssetManifest>(manifestPath);
	let changed = false;

	for (const update of updates) {
		const entry = manifest.assets.find((asset) => asset.key === update.key);
		if (!entry) continue;
		if (update.section && entry.section !== update.section) {
			entry.section = update.section;
			changed = true;
		}
		if (update.polish && entry.polish !== update.polish) {
			entry.polish = update.polish;
			changed = true;
		}
	}

	if (changed) writeJson(manifestPath, manifest);
	return {
		changed,
		message: changed
			? 'Applied manifest updates.'
			: 'Manifest already matched declared updates.',
	};
}

function readMetadata(stagingDir: string): Record<string, unknown> | null {
	const path = join(stagingDir, 'metadata.json');
	if (!existsSync(path)) return null;
	try {
		return readJson<Record<string, unknown>>(path);
	} catch {
		return null;
	}
}

function listStaging(stagingRoot: string): StagingEntry[] {
	if (!existsSync(stagingRoot)) return [];
	return readdirSync(stagingRoot)
		.filter((id) => statSync(join(stagingRoot, id)).isDirectory())
		.map((id) => {
			const dir = join(stagingRoot, id);
			return {
				id,
				hasOriginal: existsSync(join(dir, 'original.png')),
				hasPolished: existsSync(join(dir, 'polished.png')),
				metadata: readMetadata(dir),
			};
		});
}

function tileLayerData(
	map: { layers?: unknown[] },
	names: string | string[],
	width: number,
	height: number,
): number[] {
	const candidates = Array.isArray(names) ? names : [names];
	const layer = (map.layers ?? []).find(
		(entry): entry is { name: string; data: number[] } =>
			typeof entry === 'object' &&
			entry !== null &&
			candidates.includes(String((entry as { name?: unknown }).name)) &&
			Array.isArray((entry as { data?: unknown }).data),
	);
	return layer?.data ?? Array.from({ length: width * height }, () => 0);
}

function hasLayer(map: { layers?: unknown[] }, name: string): boolean {
	return (map.layers ?? []).some(
		(entry) =>
			typeof entry === 'object' &&
			entry !== null &&
			(entry as { name?: unknown }).name === name,
	);
}

function tilemapRuleTiles(raw: { layers?: unknown[] }, tileSize: number) {
	const legacy = hasLayer(raw, 'path') || tileSize <= 32;
	if (legacy) {
		return [
			{ layer: 'ground', kind: 'ground' as const, rule: 'fill' as const },
			{
				layer: 'path',
				kind: 'path' as const,
				rule: 'path-neighbor-mask' as const,
			},
		];
	}

	return [
		{ layer: 'ground_base', kind: 'ground' as const, rule: 'fill' as const },
		{
			layer: 'road_low',
			kind: 'path' as const,
			rule: 'path-neighbor-mask' as const,
		},
		{
			layer: 'platform_high',
			kind: 'platform' as const,
			rule: 'inverse-path' as const,
		},
		{
			layer: 'cliff_faces',
			kind: 'wall' as const,
			rule: 'path-neighbor-mask' as const,
		},
		{
			layer: 'foliage_low',
			kind: 'foliage' as const,
			rule: 'path-neighbor-mask' as const,
		},
	];
}

export function parseTilemapFile(
	repoRoot: string,
	file: string,
): TilemapDocument {
	const fullPath = join(
		repoRoot,
		'packages/web-shell/public/assets/maps',
		file,
	);
	const raw = readJson<{
		width: number;
		height: number;
		tilewidth: number;
		layers?: unknown[];
	}>(fullPath);
	const width = raw.width;
	const height = raw.height;
	const road = tileLayerData(raw, ['road_low', 'path'], width, height);
	const platform = tileLayerData(raw, ['platform_high'], width, height);
	const wall = tileLayerData(raw, ['cliff_faces'], width, height);
	const foliage = tileLayerData(raw, ['foliage_low'], width, height);
	const cells: TilemapCell[] = [];

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = y * width + x;
			const kind: TileKind =
				road[index] > 0
					? 'path'
					: wall[index] > 0
						? 'wall'
						: foliage[index] > 0
							? 'foliage'
							: platform[index] > 0
								? 'platform'
								: 'ground';
			cells.push({ x, y, kind });
		}
	}

	return {
		id: file.replace(/\.json$/i, ''),
		file,
		width,
		height,
		tileSize: raw.tilewidth,
		cells,
		ruleTiles: tilemapRuleTiles(raw, raw.tilewidth),
	};
}

function listTilemaps(repoRoot: string): TilemapDocument[] {
	const mapsRoot = join(repoRoot, 'packages/web-shell/public/assets/maps');
	if (!existsSync(mapsRoot)) return [];
	return readdirSync(mapsRoot)
		.filter((file) => file.endsWith('.json'))
		.map((file) => parseTilemapFile(repoRoot, file));
}

function neighborMask(
	cells: TilemapCell[],
	width: number,
	height: number,
	x: number,
	y: number,
	kind: TileKind,
): number {
	const key = new Set(
		cells
			.filter((cell) => cell.kind === kind)
			.map((cell) => `${cell.x},${cell.y}`),
	);
	let mask = 0;
	if (y > 0 && key.has(`${x},${y - 1}`)) mask |= 1;
	if (x < width - 1 && key.has(`${x + 1},${y}`)) mask |= 2;
	if (y < height - 1 && key.has(`${x},${y + 1}`)) mask |= 4;
	if (x > 0 && key.has(`${x - 1},${y}`)) mask |= 8;
	return mask;
}

function legacyPathTile(mask: number): number {
	const vertical = (mask & 1) !== 0 || (mask & 4) !== 0;
	const horizontal = (mask & 2) !== 0 || (mask & 8) !== 0;
	if (vertical && horizontal) return 6;
	if (!vertical && !horizontal) return 5;
	return 3;
}

export function buildTilemapJson(input: {
	id: string;
	width: number;
	height: number;
	tileSize: number;
	cells: TilemapCell[];
}) {
	const { id, width, height, tileSize, cells } = input;
	const byPos = new Map(
		cells.map((cell) => [`${cell.x},${cell.y}`, cell.kind]),
	);
	const dataFor = (kind: TileKind, baseTile: number, useMask = false) =>
		Array.from({ length: width * height }, (_, index) => {
			const x = index % width;
			const y = Math.floor(index / width);
			const cellKind = byPos.get(`${x},${y}`) ?? 'ground';
			if (kind === 'platform' && cellKind !== 'path') return baseTile;
			if (cellKind !== kind) return 0;
			return useMask
				? baseTile + neighborMask(cells, width, height, x, y, kind)
				: baseTile;
		});
	const legacyPathData = () =>
		Array.from({ length: width * height }, (_, index) => {
			const x = index % width;
			const y = Math.floor(index / width);
			const cellKind = byPos.get(`${x},${y}`) ?? 'ground';
			if (cellKind !== 'path') return 0;
			return legacyPathTile(neighborMask(cells, width, height, x, y, 'path'));
		});
	const checkerGround = Array.from({ length: width * height }, (_, index) =>
		(index + Math.floor(index / width)) % 2 === 0 ? 1 : 2,
	);

	const layer = (name: string, data: number[]) => ({
		name,
		type: 'tilelayer',
		width,
		height,
		data,
		visible: true,
		opacity: 1,
		x: 0,
		y: 0,
	});

	if (tileSize <= 32) {
		return {
			compressionlevel: -1,
			height,
			width,
			infinite: false,
			orientation: 'orthogonal',
			renderorder: 'right-down',
			tileheight: tileSize,
			tilewidth: tileSize,
			tiledversion: '1.10.2',
			type: 'map',
			version: '1.10',
			layers: [
				layer('ground', checkerGround),
				layer('path', legacyPathData()),
				{
					name: 'decorations',
					type: 'objectgroup',
					objects: [],
					visible: true,
					opacity: 1,
					x: 0,
					y: 0,
				},
				{
					name: 'objects',
					type: 'objectgroup',
					objects: [],
					visible: true,
					opacity: 1,
					x: 0,
					y: 0,
				},
			],
			tilesets: [
				{
					firstgid: 1,
					name: 'tiny-swords-primary-tileset',
					tilewidth: tileSize,
					tileheight: tileSize,
					tilecount: 6,
					columns: 6,
					imagewidth: tileSize * 6,
					imageheight: tileSize,
					image: '../tilesets/tiny-swords-primary.png',
				},
			],
			properties: [
				{ name: 'generatedBy', type: 'string', value: 'tools-app' },
				{ name: 'mapId', type: 'string', value: id },
			],
		};
	}

	return {
		compressionlevel: -1,
		height,
		width,
		infinite: false,
		orientation: 'orthogonal',
		renderorder: 'right-down',
		tileheight: tileSize,
		tilewidth: tileSize,
		tiledversion: '1.10.2',
		type: 'map',
		version: '1.10',
		layers: [
			layer(
				'ground_base',
				Array.from({ length: width * height }, () => 1),
			),
			layer('road_low', dataFor('path', 2, true)),
			layer('platform_high', dataFor('platform', 3)),
			layer('cliff_faces', dataFor('wall', 24, true)),
			layer('foliage_low', dataFor('foliage', 40, true)),
			{
				name: 'decorations',
				type: 'objectgroup',
				objects: [],
				visible: true,
				opacity: 1,
			},
			{
				name: 'objects',
				type: 'objectgroup',
				objects: [],
				visible: true,
				opacity: 1,
			},
		],
		tilesets: [
			{
				firstgid: 1,
				name: 'tiny-swords-runtime-markers',
				tilewidth: tileSize,
				tileheight: tileSize,
				tilecount: 64,
				columns: 8,
			},
		],
		properties: [
			{ name: 'generatedBy', type: 'string', value: 'tools-app' },
			{ name: 'mapId', type: 'string', value: id },
		],
	};
}

function saveTilemapDraft(
	repoRoot: string,
	input: {
		id: string;
		width: number;
		height: number;
		tileSize: number;
		cells: TilemapCell[];
	},
): TilemapDocument {
	const safeId = sanitizeId(input.id)?.toLowerCase() ?? 'tool-map';
	const normalized = { ...input, id: safeId };
	const draftPath = join(
		repoRoot,
		'staging/tool-hub/tilemaps',
		`${safeId}.json`,
	);
	writeJson(draftPath, buildTilemapJson(normalized));
	return {
		id: safeId,
		file: `${safeId}.json`,
		width: input.width,
		height: input.height,
		tileSize: input.tileSize,
		cells: input.cells,
		ruleTiles: tilemapRuleTiles({}, input.tileSize),
	};
}

function applyTilemap(
	repoRoot: string,
	input: {
		id: string;
		width: number;
		height: number;
		tileSize: number;
		cells: TilemapCell[];
	},
): string {
	const safeId = sanitizeId(input.id)?.toLowerCase() ?? 'tool-map';
	const outPath = join(
		repoRoot,
		'packages/web-shell/public/assets/maps',
		`${safeId}.json`,
	);
	writeJson(outPath, buildTilemapJson({ ...input, id: safeId }));
	return relative(repoRoot, outPath);
}

function readSceneSettings(repoRoot: string): SceneSettings {
	const settingsPath = join(repoRoot, 'staging/tool-hub/scenes.json');
	if (existsSync(settingsPath)) return readJson<SceneSettings>(settingsPath);

	const sceneFiles = listFilesRecursive(
		join(repoRoot, 'packages/phaser-game/src/scenes'),
		['.ts'],
	);
	const configText = readFileSync(
		join(repoRoot, 'packages/phaser-game/src/config.ts'),
		'utf8',
	);
	const orderNames =
		configText
			.match(/scene:\s*\[([^\]]+)\]/s)?.[1]
			.split(',')
			.map((name) => name.trim())
			.filter(Boolean) ?? [];

	const scenes = sceneFiles
		.map((file) => {
			const text = readFileSync(file, 'utf8');
			const className = text.match(
				/export class\s+(\w+)\s+extends Phaser\.Scene/,
			)?.[1];
			const key = text.match(/super\(['"`]([^'"`]+)['"`]\)/)?.[1];
			if (!className || !key) return null;
			const order = orderNames.indexOf(className);
			const view: SceneRecord['view'] =
				key === 'Boot'
					? 'boot'
					: key === 'Preloader'
						? 'preload'
						: key === 'Game'
							? 'top-down-game'
							: 'overlay';
			return {
				key,
				className,
				file: relative(repoRoot, file),
				order: order >= 0 ? order : 999,
				enabled: order >= 0,
				view,
				notes: view === 'top-down-game' ? 'Top-down combat scene' : '',
			};
		})
		.filter((scene): scene is SceneRecord => scene !== null)
		.sort((a, b) => a.order - b.order);

	return { scenes, updatedAt: new Date().toISOString() };
}

function writeSceneSettings(
	repoRoot: string,
	settings: SceneSettings,
): SceneSettings {
	const next = { ...settings, updatedAt: new Date().toISOString() };
	writeJson(join(repoRoot, 'staging/tool-hub/scenes.json'), next);
	return next;
}

function numberConst(text: string, name: string): number {
	const match = text.match(new RegExp(`export const ${name} = ([0-9_.]+)`));
	return match ? Number(match[1].replaceAll('_', '')) : 0;
}

function readBalanceSheet(repoRoot: string): BalanceSheet {
	const energyText = readFileSync(
		join(repoRoot, 'packages/shared/src/constants/energy.ts'),
		'utf8',
	);
	const wavesText = readFileSync(
		join(repoRoot, 'packages/shared/src/constants/waves.ts'),
		'utf8',
	);
	const towersText = readFileSync(
		join(repoRoot, 'packages/shared/src/constants/towers.ts'),
		'utf8',
	);
	const gacha = (tier: 'tier2' | 'tier3' | 'tier4') => {
		const match = energyText.match(
			new RegExp(`${tier}: \\{ cost: ([0-9.]+), successRate: ([0-9.]+) \\}`),
		);
		return {
			cost: match ? Number(match[1]) : 0,
			successRate: match ? Number(match[2]) : 0,
		};
	};
	const waveBlock =
		wavesText.match(
			/export const WAVE_SCALING: readonly \{ hp: number; speed: number \}\[] = \[([\s\S]*?)\];/,
		)?.[1] ?? '';
	const waveScaling = Array.from(
		waveBlock.matchAll(/\{ hp: ([0-9.]+), speed: ([0-9.]+) \}/g),
	).map((match, index) => ({
		slot: index + 1,
		hp: Number(match[1]),
		speed: Number(match[2]),
	}));
	const tierCosts = Object.fromEntries(
		Array.from(towersText.matchAll(/(\d+): ([0-9]+),/g)).map((match) => [
			Number(match[1]),
			Number(match[2]),
		]),
	) as Record<number, number>;
	const towerBlock =
		towersText.match(
			/export const TOWER_DEFS: readonly TowerDef\[] = \[([\s\S]*?)\];/,
		)?.[1] ?? '';
	const towers = Array.from(
		towerBlock.matchAll(
			/id: '([^']+)'[\s\S]*?name: '([^']+)'[\s\S]*?family: '([^']+)'[\s\S]*?tier: ([0-9]+)[\s\S]*?stats: \{([^}]+)\}[\s\S]*?cost: ([^,\n]+)/g,
		),
	).map((match) => {
		const stat = (name: string) => {
			const m = match[5].match(new RegExp(`${name}: ([0-9.]+)`));
			return m ? Number(m[1]) : undefined;
		};
		return {
			id: match[1],
			name: match[2],
			family: match[3],
			tier: Number(match[4]),
			damage: stat('damage'),
			range: stat('range'),
			attackSpeed: stat('attackSpeed'),
			cost: tierCosts[Number(match[6].match(/\d+/)?.[0] ?? 0)] ?? 0,
		};
	});

	return {
		energy: {
			energyPerSecond: numberConst(energyText, 'ENERGY_PER_SECOND'),
			energyInitial: numberConst(energyText, 'ENERGY_INITIAL'),
			energyMax: numberConst(energyText, 'ENERGY_MAX'),
			energyPerKill: numberConst(energyText, 'ENERGY_PER_KILL'),
			energyPerWaveClear: numberConst(energyText, 'ENERGY_PER_WAVE_CLEAR'),
			energyPerBossKill: numberConst(energyText, 'ENERGY_PER_BOSS_KILL'),
			energyPerBossFastClear: numberConst(
				energyText,
				'ENERGY_PER_BOSS_FAST_CLEAR',
			),
			fastClearThresholdMs: numberConst(energyText, 'FAST_CLEAR_THRESHOLD_MS'),
		},
		gacha: {
			tier2: gacha('tier2'),
			tier3: gacha('tier3'),
			tier4: gacha('tier4'),
		},
		hpSlope: numberConst(wavesText, 'HP_SLOPE'),
		waveScaling,
		towers,
	};
}

function applyBalanceSheet(repoRoot: string, sheet: BalanceSheet): void {
	const energyPath = join(repoRoot, 'packages/shared/src/constants/energy.ts');
	const wavesPath = join(repoRoot, 'packages/shared/src/constants/waves.ts');
	const current = readBalanceSheet(repoRoot);
	let energyText = readFileSync(energyPath, 'utf8');
	const replaceConst = (text: string, name: string, value: number) =>
		text.replace(
			new RegExp(`export const ${name} = ([0-9_.]+);`),
			(full, raw: string) =>
				Number(raw.replaceAll('_', '')) === value
					? full
					: `export const ${name} = ${value};`,
		);

	energyText = replaceConst(
		energyText,
		'ENERGY_PER_SECOND',
		sheet.energy.energyPerSecond,
	);
	energyText = replaceConst(
		energyText,
		'ENERGY_INITIAL',
		sheet.energy.energyInitial,
	);
	energyText = replaceConst(energyText, 'ENERGY_MAX', sheet.energy.energyMax);
	energyText = replaceConst(
		energyText,
		'ENERGY_PER_KILL',
		sheet.energy.energyPerKill,
	);
	energyText = replaceConst(
		energyText,
		'ENERGY_PER_WAVE_CLEAR',
		sheet.energy.energyPerWaveClear,
	);
	energyText = replaceConst(
		energyText,
		'ENERGY_PER_BOSS_KILL',
		sheet.energy.energyPerBossKill,
	);
	energyText = replaceConst(
		energyText,
		'ENERGY_PER_BOSS_FAST_CLEAR',
		sheet.energy.energyPerBossFastClear,
	);
	energyText = replaceConst(
		energyText,
		'FAST_CLEAR_THRESHOLD_MS',
		sheet.energy.fastClearThresholdMs,
	);
	if (JSON.stringify(current.gacha) !== JSON.stringify(sheet.gacha)) {
		energyText = energyText.replace(
			/export const INGAME_GACHA = \{[\s\S]*?\} as const;/,
			`export const INGAME_GACHA = {
\ttier2: { cost: ${sheet.gacha.tier2.cost}, successRate: ${sheet.gacha.tier2.successRate} },
\ttier3: { cost: ${sheet.gacha.tier3.cost}, successRate: ${sheet.gacha.tier3.successRate} },
\ttier4: { cost: ${sheet.gacha.tier4.cost}, successRate: ${sheet.gacha.tier4.successRate} },
} as const;`,
		);
	}
	writeFileSync(energyPath, energyText);

	let wavesText = readFileSync(wavesPath, 'utf8');
	wavesText = replaceConst(wavesText, 'HP_SLOPE', sheet.hpSlope);
	const currentWaveScaling = current.waveScaling.slice(0, 10);
	const nextWaveScaling = sheet.waveScaling.slice(0, 10);
	const waveScalingChanged =
		currentWaveScaling.length !== nextWaveScaling.length ||
		currentWaveScaling.some(
			(row, index) =>
				row.hp !== nextWaveScaling[index]?.hp ||
				row.speed !== nextWaveScaling[index]?.speed,
		);
	if (waveScalingChanged) {
		const rows = nextWaveScaling
			.map((row) => `\t{ hp: ${row.hp}, speed: ${row.speed} },`)
			.join('\n');
		wavesText = wavesText.replace(
			/export const WAVE_SCALING: readonly \{ hp: number; speed: number \}\[] = \[[\s\S]*?\];/,
			`export const WAVE_SCALING: readonly { hp: number; speed: number }[] = [
${rows}
];`,
		);
	}
	writeFileSync(wavesPath, wavesText);
}

function runPipe(
	repoRoot: string,
	subcommand: string,
	args: string[],
): { code: number; stdout: string; stderr: string } {
	const result = spawnSync('bun', ['gld-pipe', subcommand, ...args], {
		cwd: repoRoot,
		encoding: 'utf8',
		timeout: 120_000,
	});
	return {
		code: result.status ?? -1,
		stdout: result.stdout ?? '',
		stderr: result.stderr ?? '',
	};
}

function parseBody<T>(req: IncomingMessage): Promise<T> {
	return new Promise((resolveBody, reject) => {
		let raw = '';
		req.on('data', (chunk: Buffer) => {
			raw += chunk.toString('utf8');
		});
		req.on('end', () => {
			if (!raw.trim()) {
				resolveBody({} as T);
				return;
			}
			try {
				resolveBody(JSON.parse(raw) as T);
			} catch (err) {
				reject(err);
			}
		});
		req.on('error', reject);
	});
}

export function toolsPlugin(opts: ToolsPluginOptions = {}): Plugin {
	const repoRoot = resolve(opts.repoRoot ?? process.cwd(), '../..');
	const assetsRoot = join(repoRoot, 'packages/web-shell/public/assets');
	const stagingRoot = join(repoRoot, 'staging/assets');
	const acrRoot = join(repoRoot, 'staging/tool-hub/acr');

	return {
		name: 'gld:tools-app',
		apply: 'serve',
		configureServer(server: ViteDevServer) {
			server.middlewares.use(async (req, res, next) => {
				const rawUrl = req.url ?? '/';
				const url = new URL(rawUrl, 'http://tools.local');
				const path = url.pathname;
				const method = req.method ?? 'GET';

				try {
					if (method === 'GET' && path === '/api/tools/assets/catalog') {
						return sendJson(res, 200, { entries: readCatalog(repoRoot) });
					}

					if (
						method === 'GET' &&
						path.startsWith('/api/tools/assets/public/')
					) {
						const assetPath = decodeURIComponent(
							path.replace('/api/tools/assets/public/', ''),
						);
						const fullPath = safeResolve(assetsRoot, assetPath);
						if (!fullPath) return sendJson(res, 400, { error: 'invalid path' });
						if (!existsSync(fullPath)) {
							return sendJson(res, 404, { error: 'not found' });
						}
						return sendFile(res, fullPath);
					}

					if (method === 'GET' && path === '/api/tools/assets/acr') {
						return sendJson(res, 200, { acrs: listAcrs(acrRoot) });
					}

					if (method === 'POST' && path === '/api/tools/assets/acr') {
						const body =
							await parseBody<
								Partial<Pick<AssetChangeRequest, 'title' | 'assetKeys'>>
							>(req);
						return sendJson(res, 201, { acr: createAcr(acrRoot, body) });
					}

					let match = path.match(/^\/api\/tools\/assets\/acr\/([^/]+)$/);
					if (method === 'PATCH' && match) {
						const id = match[1];
						const body = await parseBody<Partial<AssetChangeRequest>>(req);
						const acr = updateAcr(acrRoot, id, body);
						if (!acr) return sendJson(res, 404, { error: 'not found' });
						return sendJson(res, 200, { acr });
					}

					match = path.match(/^\/api\/tools\/assets\/acr\/([^/]+)\/run-check$/);
					if (method === 'POST' && match) {
						const id = match[1];
						const body = await parseBody<{ checkId?: string }>(req);
						if (!body.checkId || !Object.hasOwn(CHECKS, body.checkId)) {
							return sendJson(res, 400, { error: 'check is not allowlisted' });
						}
						const result = runAllowlistedCheck(repoRoot, body.checkId);
						if (!result) {
							return sendJson(res, 400, { error: 'check is not allowlisted' });
						}
						const acr = appendAcrLog(acrRoot, id, {
							kind: 'command',
							message: result.label,
							stdout: result.stdout,
							stderr: result.stderr,
							exitCode: result.exitCode,
						});
						if (!acr) return sendJson(res, 404, { error: 'not found' });
						return sendJson(res, result.exitCode === 0 ? 200 : 500, {
							ok: result.exitCode === 0,
							acr,
							...result,
						});
					}

					match = path.match(/^\/api\/tools\/assets\/acr\/([^/]+)\/apply$/);
					if (method === 'POST' && match) {
						const id = sanitizeId(match[1]);
						if (!id) return sendJson(res, 400, { error: 'invalid id' });
						const acrFile = acrPath(acrRoot, id);
						if (!existsSync(acrFile)) {
							return sendJson(res, 404, { error: 'not found' });
						}
						const current = readJson<AssetChangeRequest>(acrFile);
						const applied = applyManifestUpdates(
							repoRoot,
							current.manifestUpdates,
						);
						const now = new Date().toISOString();
						const next: AssetChangeRequest = {
							...current,
							status: 'applied',
							appliedAt: now,
							updatedAt: now,
							logs: [
								{
									id: `log-${Date.now().toString(36)}`,
									at: now,
									kind: 'apply',
									message: applied.message,
								},
								...current.logs,
							],
						};
						writeJson(acrFile, next);
						return sendJson(res, 200, {
							ok: true,
							changed: applied.changed,
							acr: next,
						});
					}

					if (method === 'GET' && path === '/api/tools/tilemaps') {
						return sendJson(res, 200, { tilemaps: listTilemaps(repoRoot) });
					}

					if (method === 'POST' && path === '/api/tools/tilemaps/generate') {
						const body = await parseBody<{
							id?: string;
							width?: number;
							height?: number;
							tileSize?: number;
							cells?: TilemapCell[];
						}>(req);
						const width = body.width ?? 9;
						const height = body.height ?? 18;
						const cells =
							body.cells ??
							Array.from({ length: width * height }, (_, index) => ({
								x: index % width,
								y: Math.floor(index / width),
								kind: 'ground' as TileKind,
							}));
						const tilemap = saveTilemapDraft(repoRoot, {
							id: body.id ?? 'tool-map',
							width,
							height,
							tileSize: body.tileSize ?? 48,
							cells,
						});
						return sendJson(res, 201, { tilemap });
					}

					match = path.match(/^\/api\/tools\/tilemaps\/([^/]+)\/apply$/);
					if (method === 'POST' && match) {
						const body = await parseBody<{
							width: number;
							height: number;
							tileSize: number;
							cells: TilemapCell[];
						}>(req);
						const writtenPath = applyTilemap(repoRoot, {
							id: match[1],
							width: body.width,
							height: body.height,
							tileSize: body.tileSize,
							cells: body.cells,
						});
						return sendJson(res, 200, { ok: true, path: writtenPath });
					}

					if (method === 'GET' && path === '/api/tools/scenes') {
						return sendJson(res, 200, readSceneSettings(repoRoot));
					}

					if (method === 'PATCH' && path === '/api/tools/scenes') {
						const body = await parseBody<SceneSettings>(req);
						return sendJson(res, 200, writeSceneSettings(repoRoot, body));
					}

					if (method === 'GET' && path === '/api/tools/balance') {
						return sendJson(res, 200, { sheet: readBalanceSheet(repoRoot) });
					}

					if (method === 'POST' && path === '/api/tools/balance/apply') {
						const body = await parseBody<{ sheet: BalanceSheet }>(req);
						applyBalanceSheet(repoRoot, body.sheet);
						return sendJson(res, 200, {
							ok: true,
							sheet: readBalanceSheet(repoRoot),
						});
					}

					if (method === 'GET' && path === '/api/tools/ui/components') {
						return sendJson(res, 200, {
							components: readUiComponents(repoRoot),
						});
					}

					if (method === 'GET' && path === '/api/asset-review/staging') {
						return sendJson(res, 200, { entries: listStaging(stagingRoot) });
					}

					match = path.match(
						/^\/api\/asset-review\/staging\/([^/]+)\/([^/]+)$/,
					);
					if (method === 'GET' && match) {
						const id = sanitizeId(match[1]);
						const file = sanitizeFile(match[2]);
						if (!id || !file) {
							return sendJson(res, 400, { error: 'invalid id/file' });
						}
						const fullPath = safeResolve(join(stagingRoot, id), file);
						if (!fullPath) return sendJson(res, 400, { error: 'invalid path' });
						if (!existsSync(fullPath)) {
							return sendJson(res, 404, { error: 'not found' });
						}
						return sendFile(res, fullPath);
					}

					match = path.match(
						/^\/api\/asset-review\/staging\/([^/]+)\/(accept|reject|regenerate)$/,
					);
					if (method === 'POST' && match) {
						const id = sanitizeId(match[1]);
						const action = match[2];
						if (!id) return sendJson(res, 400, { error: 'invalid id' });
						const subcmd = action === 'regenerate' ? 'forge' : action;
						const args =
							action === 'regenerate'
								? [
										id,
										'--force',
										'--seed',
										String(Math.floor(Math.random() * 0xffffffff)),
									]
								: [id];
						const result = runPipe(repoRoot, subcmd, args);
						return sendJson(res, result.code === 0 ? 200 : 500, {
							ok: result.code === 0,
							stdout: result.stdout,
							stderr: result.stderr,
						});
					}
				} catch (err) {
					return sendJson(res, 500, { error: String(err) });
				}

				next();
			});
		},
	};
}
