import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, 'build-unit-sheets.py');
const bundledPython = join(
	process.env.HOME ?? '',
	'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',
);

const candidates = ['python3'];
if (existsSync(bundledPython)) candidates.push(bundledPython);

for (const python of candidates) {
	const probe = spawnSync(python, ['-c', 'import PIL'], { stdio: 'ignore' });
	if (probe.status !== 0) continue;

	const result = spawnSync(python, [script], { stdio: 'inherit' });
	process.exit(result.status ?? 1);
}

console.error(
	'Pillow is required. Install it for python3 or use the bundled Codex Python runtime.',
);
process.exit(1);
