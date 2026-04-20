export interface StagingEntry {
	id: string;
	hasOriginal: boolean;
	hasPolished: boolean;
	metadata: StagingMetadata | null;
}

export interface StagingMetadata {
	assetId: string;
	sourcePath: string;
	destPath: string;
	forgedAt: string;
	polishLevel: 'canvas-only' | 'libresprite-polished';
	polish: {
		palette: boolean;
		rimLight: { strength: number; shadow: number };
		noise: { density: number; seed: number };
		animation?: { frameW: number; frameH: number; frameCount: number };
	};
	status: 'pending' | 'accepted' | 'rejected';
	warnings: string[];
	animation?: {
		frames?: Array<{ frame: number; cx: number; cy: number; alphaSum: number }>;
		warnings?: Array<{
			from: number;
			to: number;
			drift: number;
			maxDrift: number;
		}>;
		error?: string;
	};
	acceptedAt?: string;
}

const BASE = '/api/asset-review';

export async function listStaging(): Promise<StagingEntry[]> {
	const r = await fetch(`${BASE}/staging`, { cache: 'no-store' });
	if (!r.ok) throw new Error(`listStaging failed: ${r.status}`);
	const body = (await r.json()) as { entries: StagingEntry[] };
	return body.entries;
}

export interface ActionResult {
	ok: boolean;
	stdout: string;
	stderr: string;
}

async function postAction(id: string, action: string): Promise<ActionResult> {
	const r = await fetch(`${BASE}/staging/${id}/${action}`, { method: 'POST' });
	return (await r.json()) as ActionResult;
}

export const acceptAsset = (id: string) => postAction(id, 'accept');
export const rejectAsset = (id: string) => postAction(id, 'reject');
export const regenerateAsset = (id: string) => postAction(id, 'regenerate');

export function stagingFileUrl(id: string, file: string): string {
	return `${BASE}/staging/${id}/${file}?ts=${Date.now()}`;
}
