import { loadImage } from '@napi-rs/canvas';
import { mkdirSync, statSync, writeFileSync } from 'fs';
import { makeCanvas, saveCanvas, type ManifestEntry } from './shared';

const SOURCE_IMAGE = 'scripts/generate-assets/sources/main-long-reference.png';
const OUTPUT_DIR = 'packages/web-shell/public/assets/maps';
const OUTPUT_PNG = `${OUTPUT_DIR}/main-long-bg.png`;
const OUTPUT_WEBP = `${OUTPUT_DIR}/main-long-bg.webp`;
const CASTLE_PNG = `${OUTPUT_DIR}/main-long-central-castle.png`;
const CASTLE_WEBP = `${OUTPUT_DIR}/main-long-central-castle.webp`;

const CANVAS_W = 432;
const CANVAS_H = 960;
const CASTLE_CROP = {
	x: 300,
	y: 590,
	w: 340,
	h: 410,
} as const;

export async function generate(): Promise<ManifestEntry[]> {
	mkdirSync(OUTPUT_DIR, { recursive: true });

	const source = await loadImage(SOURCE_IMAGE);
	const { canvas, ctx } = makeCanvas(CANVAS_W, CANVAS_H);

	// Use the provided artwork itself as the field background. The source is
	// cover-cropped into the fixed portrait canvas to preserve the original
	// proportions instead of stretching the pixel art.
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	const scale = Math.max(CANVAS_W / source.width, CANVAS_H / source.height);
	const drawW = source.width * scale;
	const drawH = source.height * scale;
	ctx.drawImage(
		source,
		(CANVAS_W - drawW) / 2,
		(CANVAS_H - drawH) / 2,
		drawW,
		drawH,
	);

	saveCanvas(canvas, OUTPUT_PNG);
	writeFileSync(OUTPUT_WEBP, canvas.toBuffer('image/webp'));

	const { canvas: castleCanvas, ctx: castleCtx } = makeCanvas(
		CASTLE_CROP.w,
		CASTLE_CROP.h,
	);
	castleCtx.imageSmoothingEnabled = true;
	castleCtx.imageSmoothingQuality = 'high';
	castleCtx.drawImage(
		source,
		CASTLE_CROP.x,
		CASTLE_CROP.y,
		CASTLE_CROP.w,
		CASTLE_CROP.h,
		0,
		0,
		CASTLE_CROP.w,
		CASTLE_CROP.h,
	);
	saveCanvas(castleCanvas, CASTLE_PNG);
	writeFileSync(CASTLE_WEBP, castleCanvas.toBuffer('image/webp'));

	const pngSize = statSync(OUTPUT_PNG).size;
	const webpSize = statSync(OUTPUT_WEBP).size;
	console.log(
		`  wrote ${OUTPUT_WEBP} (${(webpSize / 1024).toFixed(1)}KB, png ${(
			pngSize / 1024
		).toFixed(1)}KB)`,
	);

	return [
		{
			key: 'field-main-long-bg',
			type: 'image',
			path: 'assets/maps/main-long-bg.png',
		},
		{
			key: 'main-long-central-castle',
			type: 'image',
			path: 'assets/maps/main-long-central-castle.png',
		},
	];
}

if (import.meta.main) {
	generate().then((entries) => console.log(JSON.stringify(entries, null, 2)));
}
