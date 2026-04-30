import { copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const WEB_TOWER_DIR = join(
	REPO_ROOT,
	'packages/web-shell/public/assets/towers',
);
const UNITY_TOWER_DIR = join(
	REPO_ROOT,
	'packages/unity-game/Assets/Art/Sprites/towers',
);

const PNG_RE = /\.png$/i;
const WEBP_QUALITY = 92;
const STATIC_COLOURS = 48;
const FIRE_COLOURS = 72;

const PALETTE_BIAS = {
	dark: [42, 35, 22],
	grass: [73, 96, 48],
	bark: [87, 62, 34],
	stone: [92, 89, 74],
	gold: [145, 111, 45],
	magic: [68, 100, 94],
};

function clamp(value, min = 0, max = 255) {
	return Math.max(min, Math.min(max, value));
}

function mix(a, b, t) {
	return a + (b - a) * t;
}

function rgbToHsl(r, g, b) {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;
	const d = max - min;

	if (d !== 0) {
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			default:
				h = (r - g) / d + 4;
				break;
		}
		h *= 60;
	}

	return { h, s, l };
}

function hueToRgb(p, q, t) {
	let localT = t;
	if (localT < 0) localT += 1;
	if (localT > 1) localT -= 1;
	if (localT < 1 / 6) return p + (q - p) * 6 * localT;
	if (localT < 1 / 2) return q;
	if (localT < 2 / 3) return p + (q - p) * (2 / 3 - localT) * 6;
	return p;
}

function hslToRgb(h, s, l) {
	const normalizedHue = ((h % 360) + 360) / 360;
	let r;
	let g;
	let b;

	if (s === 0) {
		r = l;
		g = l;
		b = l;
	} else {
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hueToRgb(p, q, normalizedHue + 1 / 3);
		g = hueToRgb(p, q, normalizedHue);
		b = hueToRgb(p, q, normalizedHue - 1 / 3);
	}

	return [r * 255, g * 255, b * 255];
}

function targetBias(h, s) {
	if (s < 0.08) return PALETTE_BIAS.stone;
	if (h >= 175 && h <= 275) return PALETTE_BIAS.magic;
	if (h >= 65 && h < 170) return PALETTE_BIAS.grass;
	if (h >= 28 && h < 65) return PALETTE_BIAS.gold;
	return PALETTE_BIAS.bark;
}

function quantize(value, step) {
	return Math.round(value / step) * step;
}

function harmonizePixel(r, g, b, a, isFireSheet) {
	if (a < (isFireSheet ? 18 : 42)) return [0, 0, 0, 0];

	const alpha = isFireSheet ? clamp(quantize(a, 32), 64, 255) : 255;
	const { h, s, l } = rgbToHsl(r, g, b);
	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

	if (!isFireSheet && luminance < 34) {
		return [...PALETTE_BIAS.dark, alpha];
	}

	const saturationScale = isFireSheet ? 0.78 : 0.56;
	const contrastScale = isFireSheet ? 0.88 : 0.74;
	const adjustedS = clamp(s * saturationScale, 0, 1);
	const adjustedL = clamp(0.5 + (l - 0.5) * contrastScale, 0.08, 0.86);
	let [nr, ng, nb] = hslToRgb(h, adjustedS, adjustedL);

	const bias = targetBias(h, s);
	const biasAmount = isFireSheet ? 0.1 : s > 0.22 ? 0.24 : 0.14;
	nr = mix(nr, bias[0], biasAmount);
	ng = mix(ng, bias[1], biasAmount);
	nb = mix(nb, bias[2], biasAmount);

	const step = isFireSheet ? 10 : 16;
	return [
		clamp(quantize(nr, step)),
		clamp(quantize(ng, step)),
		clamp(quantize(nb, step)),
		alpha,
	];
}

async function harmonizePng(file) {
	const metadata = await sharp(file).metadata();
	const width = metadata.width;
	const height = metadata.height;
	if (!width || !height) throw new Error(`Missing dimensions: ${file}`);

	if (metadata.isPalette) {
		await writeWebpFromPng(file);
		return;
	}

	const isFireSheet = basename(file).includes('-fire');
	const downWidth = Math.max(1, Math.round(width / 2));
	const downHeight = Math.max(1, Math.round(height / 2));
	const { data, info } = await sharp(file)
		.ensureAlpha()
		.resize(downWidth, downHeight, { kernel: 'cubic' })
		.resize(width, height, { kernel: 'nearest' })
		.raw()
		.toBuffer({ resolveWithObject: true });

	for (let i = 0; i < data.length; i += 4) {
		const [r, g, b, a] = harmonizePixel(
			data[i],
			data[i + 1],
			data[i + 2],
			data[i + 3],
			isFireSheet,
		);
		data[i] = r;
		data[i + 1] = g;
		data[i + 2] = b;
		data[i + 3] = a;
	}

	const png = await sharp(data, { raw: info })
		.png({
			compressionLevel: 9,
			dither: isFireSheet ? 0.32 : 0.12,
			palette: true,
			colours: isFireSheet ? FIRE_COLOURS : STATIC_COLOURS,
		})
		.toBuffer();
	await writeFile(file, png);

	await writeWebpFromPng(file);
}

async function writeWebpFromPng(file) {
	const webpPath = file.replace(/\.png$/i, '.webp');
	const webp = await sharp(file)
		.webp({ quality: WEBP_QUALITY, nearLossless: true })
		.toBuffer();
	await writeFile(webpPath, webp);
}

async function main() {
	const entries = await readdir(WEB_TOWER_DIR);
	const pngFiles = entries
		.filter((name) => PNG_RE.test(name))
		.map((name) => join(WEB_TOWER_DIR, name))
		.sort();

	for (const file of pngFiles) {
		await harmonizePng(file);
	}

	await mkdir(UNITY_TOWER_DIR, { recursive: true });
	for (const file of pngFiles) {
		await copyFile(file, join(UNITY_TOWER_DIR, basename(file)));
	}

	console.log(
		`harmonized ${pngFiles.length} tower PNGs and regenerated WebP variants`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
