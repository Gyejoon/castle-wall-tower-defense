#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJsonPath = resolve(repoRoot, 'package.json');
const webShellPackageJsonPath = resolve(
	repoRoot,
	'packages/web-shell/package.json',
);
const lockfilePath = resolve(repoRoot, 'bun.lock');
const isDryRun = process.env.VERCEL_INSTALL_DRY_RUN === '1';

const originalPackageJson = readFileSync(packageJsonPath, 'utf8');
const originalWebShellPackageJson = readFileSync(webShellPackageJsonPath, 'utf8');
const originalLockfile = readFileSync(lockfilePath, 'utf8');

const packageJson = JSON.parse(originalPackageJson) as {
	devDependencies?: Record<string, string>;
};
const webShellPackageJson = JSON.parse(originalWebShellPackageJson) as {
	dependencies?: Record<string, string>;
};

const args = [
	'install',
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

let exitCode = 0;

try {
	// Vercel builds web-shell through Vite. Root-only asset/test tooling and the
	// Granite/Toss toolchain are large enough to trigger preview build OOMs, so
	// exclude them from the ephemeral install.
	packageJson.devDependencies = {
		'web-shell': 'workspace:*',
	};
	delete webShellPackageJson.dependencies?.['@apps-in-toss/web-framework'];

	writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
	writeFileSync(
		webShellPackageJsonPath,
		`${JSON.stringify(webShellPackageJson, null, 2)}\n`,
	);

	console.log(
		`[vercel-install] Installing filtered web runtime dependencies (${isDryRun ? 'dry-run' : 'live'})`,
	);
	console.log(`[vercel-install] cwd=${repoRoot}`);
	console.log(`[vercel-install] bun ${args.join(' ')}`);

	const install = spawnSync('bun', args, {
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

	if (install.error) {
		console.error('[vercel-install] failed to start bun install');
		console.error(install.error);
		exitCode = 1;
	} else if (install.signal) {
		console.error(`[vercel-install] bun install terminated by ${install.signal}`);
		exitCode = 1;
	} else if (install.status !== 0) {
		exitCode = install.status ?? 1;
	}
} finally {
	writeFileSync(packageJsonPath, originalPackageJson);
	writeFileSync(webShellPackageJsonPath, originalWebShellPackageJson);
	writeFileSync(lockfilePath, originalLockfile);
}

if (exitCode !== 0) {
	process.exit(exitCode);
}
