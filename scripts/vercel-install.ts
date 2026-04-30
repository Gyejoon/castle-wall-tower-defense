import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const packageJsonPath = join(repoRoot, 'package.json');
const webShellPackageJsonPath = join(
	repoRoot,
	'packages/web-shell/package.json',
);
const lockfilePath = join(repoRoot, 'bun.lock');
const originalPackageJson = readFileSync(packageJsonPath, 'utf8');
const originalWebShellPackageJson = readFileSync(webShellPackageJsonPath, 'utf8');
const originalLockfile = readFileSync(lockfilePath, 'utf8');
const packageJson = JSON.parse(originalPackageJson) as {
	devDependencies?: Record<string, string>;
};
const webShellPackageJson = JSON.parse(originalWebShellPackageJson) as {
	dependencies?: Record<string, string>;
};
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

	const install = Bun.spawnSync({
		cmd: ['bun', 'install', '--no-progress'],
		cwd: repoRoot,
		stdout: 'inherit',
		stderr: 'inherit',
		stdin: 'inherit',
	});

	if (!install.success) {
		exitCode = install.exitCode ?? 1;
	}
} finally {
	writeFileSync(packageJsonPath, originalPackageJson);
	writeFileSync(webShellPackageJsonPath, originalWebShellPackageJson);
	writeFileSync(lockfilePath, originalLockfile);
}

if (exitCode !== 0) {
	process.exit(exitCode);
}
