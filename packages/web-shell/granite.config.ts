import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
	appName: 'castle-tower-defense',
	brand: {
		displayName: '성벽 타워 디펜스',
		primaryColor: '#c8a04a',
		icon: '{콘솔 내 icon 이미지 주소}', // TODO: 콘솔 앱 정보에서 업로드한 이미지의 절대 URL로 교체
	},
	web: {
		host: 'localhost',
		port: 5173,
		commands: {
			dev: 'vite',
			build: 'tsc -b && vite build',
		},
	},
	permissions: [],
	outdir: 'dist',
});
