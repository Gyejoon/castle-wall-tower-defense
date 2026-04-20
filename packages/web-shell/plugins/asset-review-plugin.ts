import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

/**
 * Dev-only asset-review API.
 *
 *   GET  /api/asset-review/staging                       list all staged assets
 *   GET  /api/asset-review/staging/:id/:file             serve original.png / polished.png / etc.
 *   POST /api/asset-review/staging/:id/accept            copy polished → public/assets
 *   POST /api/asset-review/staging/:id/reject            delete staging/<id>
 *   POST /api/asset-review/staging/:id/regenerate        re-run forge with fresh seed
 *
 * The plugin does NOT import game code — it shells out to gld-pipe for the
 * mutating operations so the CLI and dashboard share the same logic.
 */

export interface AssetReviewPluginOptions {
	repoRoot?: string;
}

interface StagingEntry {
	id: string;
	hasOriginal: boolean;
	hasPolished: boolean;
	metadata: Record<string, unknown> | null;
}

function readMetadata(stagingDir: string): Record<string, unknown> | null {
	const p = join(stagingDir, 'metadata.json');
	if (!existsSync(p)) return null;
	try {
		return JSON.parse(readFileSync(p, 'utf8'));
	} catch {
		return null;
	}
}

// biome-ignore lint/suspicious/noExplicitAny: Node http response types vary
function sendJson(res: any, code: number, body: unknown): void {
	res.statusCode = code;
	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify(body));
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

function sanitizeId(raw: string): string | null {
	if (!/^[a-z0-9_-]+$/i.test(raw)) return null;
	return raw;
}

function sanitizeFile(raw: string): string | null {
	if (!/^[a-z0-9._-]+$/i.test(raw)) return null;
	if (raw.includes('..')) return null;
	return raw;
}

export function assetReviewPlugin(opts: AssetReviewPluginOptions = {}): Plugin {
	const repoRoot = resolve(opts.repoRoot ?? process.cwd(), '../..');
	const stagingRoot = join(repoRoot, 'staging/assets');

	return {
		name: 'gld:asset-review',
		apply: 'serve',
		configureServer(server: ViteDevServer) {
			server.middlewares.use('/api/asset-review', (req, res, next) => {
				const url = req.url ?? '/';
				const method = req.method ?? 'GET';

				// GET /staging → list
				if (method === 'GET' && url === '/staging') {
					if (!existsSync(stagingRoot))
						return sendJson(res, 200, { entries: [] });
					const ids = readdirSync(stagingRoot).filter((id) =>
						statSync(join(stagingRoot, id)).isDirectory(),
					);
					const entries: StagingEntry[] = ids.map((id) => {
						const dir = join(stagingRoot, id);
						return {
							id,
							hasOriginal: existsSync(join(dir, 'original.png')),
							hasPolished: existsSync(join(dir, 'polished.png')),
							metadata: readMetadata(dir),
						};
					});
					return sendJson(res, 200, { entries });
				}

				// GET /staging/:id/:file
				let m = url.match(/^\/staging\/([^/]+)\/([^/?]+)(?:\?.*)?$/);
				if (method === 'GET' && m) {
					const id = sanitizeId(m[1]);
					const file = sanitizeFile(m[2]);
					if (!id || !file)
						return sendJson(res, 400, { error: 'invalid id/file' });
					const fullPath = join(stagingRoot, id, file);
					if (!existsSync(fullPath))
						return sendJson(res, 404, { error: 'not found' });
					const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
					const mime =
						ext === '.png'
							? 'image/png'
							: ext === '.json'
								? 'application/json'
								: ext === '.webp'
									? 'image/webp'
									: 'application/octet-stream';
					res.setHeader('Content-Type', mime);
					res.setHeader('Cache-Control', 'no-store');
					res.end(readFileSync(fullPath));
					return;
				}

				// POST /staging/:id/accept | reject | regenerate
				m = url.match(/^\/staging\/([^/]+)\/(accept|reject|regenerate)$/);
				if (method === 'POST' && m) {
					const id = sanitizeId(m[1]);
					const action = m[2];
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

				next();
			});
		},
	};
}
