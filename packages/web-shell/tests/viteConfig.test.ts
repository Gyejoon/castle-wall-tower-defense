import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viteConfigSource = readFileSync(
	resolve(__dirname, '../vite.config.ts'),
	'utf-8',
);

describe('vite PWA asset coverage', () => {
	it('precache includes webp assets for runtime-preferred art', () => {
		expect(viteConfigSource).toContain('includeAssets:');
		expect(viteConfigSource).toContain('disable: isVercelBuild');
		expect(viteConfigSource).toContain("'assets/**/*.png'");
		expect(viteConfigSource).toContain("'assets/**/*.webp'");
		expect(viteConfigSource).toContain("'assets/**/*.json'");
		expect(viteConfigSource).toContain("'manifest.json'");
		expect(viteConfigSource).toContain(
			"globPatterns: ['**/*.{js,css,html,png,webp,json,woff2}']",
		);
	});
});
