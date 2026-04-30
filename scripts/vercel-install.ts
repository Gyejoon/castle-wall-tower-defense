#!/usr/bin/env bun
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isDryRun = process.env.VERCEL_INSTALL_DRY_RUN === '1';

const args = [
	'install',
	'--frozen-lockfile',
	'--production',
	'--no-progress',
	'--concurrent-scripts',
	'1',
	'--network-concurrency',
	'8',
	'--filter',
	'web-shell',
	'--filter',
	'@gld/phaser-game',
	'--filter',
	'@gld/shared',
];

if (isDryRun) {
	args.push('--dry-run');
}

console.log(
	`[vercel-install] Installing filtered workspaces only (${isDryRun ? 'dry-run' : 'live'})`,
);
console.log(`[vercel-install] cwd=${repoRoot}`);
console.log(`[vercel-install] bun ${args.join(' ')}`);

const child = spawn('bun', args, {
	cwd: repoRoot,
	env: {
		...process.env,
		// Keep install-time child processes tame in Vercel's smaller build
		// containers. The build itself can still use the normal Vite command.
		BUN_CONFIG_CONCURRENT_SCRIPTS:
			process.env.BUN_CONFIG_CONCURRENT_SCRIPTS ?? '1',
	},
	stdio: 'inherit',
});

child.on('exit', (code, signal) => {
	if (signal) {
		console.error(`[vercel-install] bun install terminated by ${signal}`);
		process.exit(1);
	}
	process.exit(code ?? 0);
});

child.on('error', (error) => {
	console.error('[vercel-install] failed to start bun install');
	console.error(error);
	process.exit(1);
});
