import type {
	AssetChangeRequest,
	BalanceSheet,
	CatalogEntry,
	CheckId,
	SceneSettings,
	StagingEntry,
	TilemapCell,
	TilemapDocument,
	UiComponent,
} from './types';

async function readJson<T>(response: Response): Promise<T> {
	const body = (await response.json()) as T;
	if (!response.ok) {
		const message =
			typeof body === 'object' && body && 'error' in body
				? String((body as { error: unknown }).error)
				: `Request failed: ${response.status}`;
		throw new Error(message);
	}
	return body;
}

export async function listCatalog(): Promise<CatalogEntry[]> {
	const response = await fetch('/api/tools/assets/catalog', {
		cache: 'no-store',
	});
	const body = await readJson<{ entries: CatalogEntry[] }>(response);
	return body.entries;
}

export async function listAcrs(): Promise<AssetChangeRequest[]> {
	const response = await fetch('/api/tools/assets/acr', { cache: 'no-store' });
	const body = await readJson<{ acrs: AssetChangeRequest[] }>(response);
	return body.acrs;
}

export async function createAcr(input: {
	title: string;
	assetKeys: string[];
}): Promise<AssetChangeRequest> {
	const response = await fetch('/api/tools/assets/acr', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	});
	const body = await readJson<{ acr: AssetChangeRequest }>(response);
	return body.acr;
}

export async function updateAcr(
	id: string,
	patch: Partial<AssetChangeRequest>,
): Promise<AssetChangeRequest> {
	const response = await fetch(`/api/tools/assets/acr/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(patch),
	});
	const body = await readJson<{ acr: AssetChangeRequest }>(response);
	return body.acr;
}

export async function runAcrCheck(
	id: string,
	checkId: CheckId,
): Promise<{
	ok: boolean;
	acr: AssetChangeRequest;
	stdout: string;
	stderr: string;
}> {
	const response = await fetch(`/api/tools/assets/acr/${id}/run-check`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ checkId }),
	});
	return readJson(response);
}

export async function applyAcr(id: string): Promise<{
	ok: boolean;
	changed: boolean;
	acr: AssetChangeRequest;
}> {
	const response = await fetch(`/api/tools/assets/acr/${id}/apply`, {
		method: 'POST',
	});
	return readJson(response);
}

export async function listTilemaps(): Promise<TilemapDocument[]> {
	const response = await fetch('/api/tools/tilemaps', { cache: 'no-store' });
	const body = await readJson<{ tilemaps: TilemapDocument[] }>(response);
	return body.tilemaps;
}

export async function generateTilemap(input: {
	id: string;
	width: number;
	height: number;
	tileSize: number;
	cells: TilemapCell[];
}): Promise<TilemapDocument> {
	const response = await fetch('/api/tools/tilemaps/generate', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	});
	const body = await readJson<{ tilemap: TilemapDocument }>(response);
	return body.tilemap;
}

export async function applyTilemap(input: {
	id: string;
	width: number;
	height: number;
	tileSize: number;
	cells: TilemapCell[];
}): Promise<{ ok: boolean; path: string }> {
	const response = await fetch(`/api/tools/tilemaps/${input.id}/apply`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	});
	return readJson(response);
}

export async function getScenes(): Promise<SceneSettings> {
	const response = await fetch('/api/tools/scenes', { cache: 'no-store' });
	return readJson(response);
}

export async function saveScenes(
	settings: SceneSettings,
): Promise<SceneSettings> {
	const response = await fetch('/api/tools/scenes', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(settings),
	});
	return readJson(response);
}

export async function getBalance(): Promise<BalanceSheet> {
	const response = await fetch('/api/tools/balance', { cache: 'no-store' });
	const body = await readJson<{ sheet: BalanceSheet }>(response);
	return body.sheet;
}

export async function applyBalance(
	sheet: BalanceSheet,
): Promise<{ ok: boolean; sheet: BalanceSheet }> {
	const response = await fetch('/api/tools/balance/apply', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ sheet }),
	});
	return readJson(response);
}

export async function listUiComponents(): Promise<UiComponent[]> {
	const response = await fetch('/api/tools/ui/components', {
		cache: 'no-store',
	});
	const body = await readJson<{ components: UiComponent[] }>(response);
	return body.components;
}

export async function listStaging(): Promise<StagingEntry[]> {
	const response = await fetch('/api/asset-review/staging', {
		cache: 'no-store',
	});
	const body = await readJson<{ entries: StagingEntry[] }>(response);
	return body.entries;
}

async function postStagingAction(
	id: string,
	action: 'accept' | 'reject' | 'regenerate',
): Promise<{ ok: boolean; stdout: string; stderr: string }> {
	const response = await fetch(`/api/asset-review/staging/${id}/${action}`, {
		method: 'POST',
	});
	return readJson(response);
}

export const acceptAsset = (id: string) => postStagingAction(id, 'accept');
export const rejectAsset = (id: string) => postStagingAction(id, 'reject');
export const regenerateAsset = (id: string) =>
	postStagingAction(id, 'regenerate');

export function publicAssetUrl(path: string): string {
	const clean = path.replace(/^assets\//, '');
	return `/api/tools/assets/public/${encodeURIComponent(clean).replaceAll('%2F', '/')}`;
}

export function stagingFileUrl(id: string, file: string): string {
	return `/api/asset-review/staging/${id}/${file}?ts=${Date.now()}`;
}
