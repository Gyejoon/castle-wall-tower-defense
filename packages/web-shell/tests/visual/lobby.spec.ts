import { expect, test } from '@playwright/test';

test.describe('로비 스냅샷', () => {
	test.beforeEach(async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		await page.waitForSelector('[role="tabpanel"][aria-label="마당"]');
	});

	test('home tab baseline', async ({ page }) => {
		await expect(page).toHaveScreenshot('lobby-home.png', {
			animations: 'disabled',
			maxDiffPixelRatio: 0.02,
		});
	});

	test('collection tab baseline', async ({ page }) => {
		await page.getByRole('tab', { name: '전쟁탁자' }).click();
		await page.waitForSelector('[role="tabpanel"][aria-label="전쟁탁자"]');
		await expect(page).toHaveScreenshot('lobby-collection.png', {
			animations: 'disabled',
			maxDiffPixelRatio: 0.02,
		});
	});

	test('settings tab baseline', async ({ page }) => {
		await page.getByRole('tab', { name: '설정' }).click();
		await page.waitForSelector('[role="tabpanel"][aria-label="설정"]');
		await expect(page).toHaveScreenshot('lobby-settings.png', {
			animations: 'disabled',
			maxDiffPixelRatio: 0.02,
		});
	});
});
