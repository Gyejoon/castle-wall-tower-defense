import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('supabase client', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.unstubAllEnvs();
	});

	it('flags supabaseConfigured=false when env is missing', async () => {
		vi.stubEnv('VITE_SUPABASE_URL', '');
		vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const mod = await import('../supabase');
		expect(mod.supabaseConfigured).toBe(false);
		expect(mod.supabase).toBeDefined();
		expect(warnSpy).toHaveBeenCalled();
		warnSpy.mockRestore();
	});

	it('flags supabaseConfigured=true and returns a singleton when env is present', async () => {
		vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
		vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
		const mod = await import('../supabase');
		expect(mod.supabaseConfigured).toBe(true);
		expect(mod.supabase).toBeDefined();
		const again = await import('../supabase');
		expect(mod.supabase).toBe(again.supabase);
	});
});
