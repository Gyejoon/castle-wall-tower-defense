import { existsSync } from 'fs';
import { loadImage } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { generate } from '../generate-main-long-background';

const PNG_PATH = 'packages/web-shell/public/assets/maps/main-long-bg.png';
const WEBP_PATH = 'packages/web-shell/public/assets/maps/main-long-bg.webp';
const WEBP_HQ_PATH =
	'packages/web-shell/public/assets/maps/main-long-bg-hq.webp';
const CASTLE_PATH =
	'packages/web-shell/public/assets/maps/main-long-central-castle.png';

describe('generate-main-long-background', () => {
	it('emits the main_long illustrated background at the fixed game resolution', async () => {
		const entries = await generate();

		expect(entries).toEqual([
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
		]);
		expect(existsSync(PNG_PATH)).toBe(true);
		expect(existsSync(WEBP_PATH)).toBe(true);
		expect(existsSync(WEBP_HQ_PATH)).toBe(true);
		expect(existsSync(CASTLE_PATH)).toBe(true);

		const image = await loadImage(PNG_PATH);
		expect(image.width).toBe(432);
		expect(image.height).toBe(960);

		const hqImage = await loadImage(WEBP_HQ_PATH);
		expect(hqImage.width).toBe(752);
		expect(hqImage.height).toBe(1672);

		const castle = await loadImage(CASTLE_PATH);
		expect(castle.width).toBe(340);
		expect(castle.height).toBe(410);
	});
});
