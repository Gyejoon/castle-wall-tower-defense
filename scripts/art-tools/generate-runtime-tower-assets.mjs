import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const TOWER_DIR = join(REPO_ROOT, 'packages/web-shell/public/assets/towers');
const RUNTIME_SUFFIX = '-runtime';
const STATIC_SIZE = { width: 64, height: 80 };
const WEBP_QUALITY = 96;

const TOWER_IDS = [
	'archer',
	'wind_spire',
	'flame_tower',
	'arcane_spire',
	'nova_cannon',
	'fortress',
	'earth_golem',
	'celestial',
	'emp',
	'stasis_field',
	'disruptor',
	'world_tree',
	'shield',
	'twin_archer',
	'holy_shrine',
	'divine_throne',
	'hybrid_ab',
	'hybrid_cd',
	'ultimate',
];

async function writeRuntimeStatic(id) {
	const source = join(TOWER_DIR, `${id}.png`);
	const output = join(TOWER_DIR, `${id}${RUNTIME_SUFFIX}.png`);
	const png = await sharp(source)
		.ensureAlpha()
		.resize(STATIC_SIZE.width, STATIC_SIZE.height, {
			fit: 'contain',
			kernel: 'lanczos3',
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		})
		.sharpen({ sigma: 0.65, m1: 1.15, m2: 0.28 })
		.png({ compressionLevel: 9, palette: false })
		.toBuffer();
	await writeFile(output, png);

	const webp = await sharp(png)
		.webp({ quality: WEBP_QUALITY, nearLossless: true })
		.toBuffer();
	await writeFile(output.replace(/\.png$/i, '.webp'), webp);
}

async function main() {
	await mkdir(TOWER_DIR, { recursive: true });
	const entries = new Set(await readdir(TOWER_DIR));
	for (const id of TOWER_IDS) {
		if (!entries.has(`${id}.png`)) {
			throw new Error(`Missing source tower asset: ${id}.png`);
		}
		await writeRuntimeStatic(id);
	}
	console.log(`generated ${TOWER_IDS.length} runtime tower statics`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
