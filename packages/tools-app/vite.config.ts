import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { toolsPlugin } from './plugins/tools-plugin';

export default defineConfig({
	plugins: [react(), toolsPlugin()],
	server: {
		port: 3001,
	},
	test: {
		environment: 'jsdom',
		globals: true,
	},
});
