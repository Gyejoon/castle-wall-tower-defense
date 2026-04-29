import { loadImage } from '@napi-rs/canvas';
import { mkdirSync, statSync, writeFileSync } from 'fs';
import { makeCanvas, saveCanvas, type ManifestEntry } from './shared';

const SOURCE_IMAGE = 'scripts/generate-assets/sources/main-long-reference.png';
const OUTPUT_DIR = 'packages/web-shell/public/assets/maps';
const OUTPUT_PNG = `${OUTPUT_DIR}/main-long-bg.png`;
const OUTPUT_WEBP = `${OUTPUT_DIR}/main-long-bg.webp`;
const OUTPUT_HQ_WEBP = `${OUTPUT_DIR}/main-long-bg-hq.webp`;
const CASTLE_PNG = `${OUTPUT_DIR}/main-long-central-castle.png`;
const CASTLE_WEBP = `${OUTPUT_DIR}/main-long-central-castle.webp`;

const CANVAS_W = 432;
const CANVAS_H = 960;
const WEBP_QUALITY = 98;
const CASTLE_CROP = {
	x: 300,
	y: 590,
	w: 340,
	h: 410,
} as const;

export async function generate(): Promise<ManifestEntry[]> {
	mkdirSync(OUTPUT_DIR, { recursive: true });

	const source = await loadImage(SOURCE_IMAGE);

	// Use the provided artwork itself as the field background. The source is
	// cover-cropped into the fixed portrait canvas to preserve the original
	// proportions instead of stretching the pixel art.
	const canvas = renderCoveredBackground(source, CANVAS_W, CANVAS_H);

	saveCanvas(canvas, OUTPUT_PNG);
	writeFileSync(OUTPUT_WEBP, canvas.toBuffer('image/webp', WEBP_QUALITY));

	const hqScale = Math.min(source.width / CANVAS_W, source.height / CANVAS_H);
	const hqWidth = Math.floor(CANVAS_W * hqScale);
	const hqHeight = Math.floor(CANVAS_H * hqScale);
	const canvasHq = renderCoveredBackground(
		source,
		hqWidth,
		hqHeight,
	);
	writeFileSync(
		OUTPUT_HQ_WEBP,
		canvasHq.toBuffer('image/webp', WEBP_QUALITY),
	);

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
	writeFileSync(
		CASTLE_WEBP,
		castleCanvas.toBuffer('image/webp', WEBP_QUALITY),
	);

	const pngSize = statSync(OUTPUT_PNG).size;
	const webpSize = statSync(OUTPUT_WEBP).size;
	const webpHqSize = statSync(OUTPUT_HQ_WEBP).size;
	console.log(
		`  wrote ${OUTPUT_WEBP} (${(webpSize / 1024).toFixed(1)}KB, png ${(
			pngSize / 1024
		).toFixed(1)}KB)`,
	);
	console.log(
		`  wrote ${OUTPUT_HQ_WEBP} (${hqWidth}x${hqHeight}, ${(
			webpHqSize / 1024
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

function renderCoveredBackground(
	source: Awaited<ReturnType<typeof loadImage>>,
	width: number,
	height: number,
) {
	const { canvas, ctx } = makeCanvas(width, height);
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	const scale = Math.max(width / source.width, height / source.height);
	const drawW = source.width * scale;
	const drawH = source.height * scale;
	ctx.drawImage(source, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
	return canvas;
}

if (import.meta.main) {
	generate().then((entries) => console.log(JSON.stringify(entries, null, 2)));
}
