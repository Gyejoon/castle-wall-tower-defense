import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/visual',
	fullyParallel: false,
	retries: 0,
	timeout: 30_000,
	use: {
		baseURL: 'http://localhost:3000',
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'mobile',
			use: { ...devices['Pixel 5'], viewport: { width: 360, height: 640 } },
		},
		{
			name: 'desktop',
			use: { viewport: { width: 1440, height: 900 } },
		},
	],
	webServer: {
		command: 'bun dev',
		url: 'http://localhost:3000',
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
	},
});
