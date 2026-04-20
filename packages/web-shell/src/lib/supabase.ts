import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured: boolean = Boolean(url && anon);

if (!supabaseConfigured) {
	console.warn(
		'[GLD] VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY missing — ranking features disabled. App runs offline.',
	);
}

// Client is always constructed so downstream imports don't need to branch,
// but if env is missing we point at a noop URL. All network calls will fail
// with a clear error surface rather than crashing module import.
export const supabase: SupabaseClient = createClient(
	url || 'http://127.0.0.1:54321',
	anon || 'public-anon-placeholder',
	{
		auth: {
			persistSession: supabaseConfigured,
			autoRefreshToken: supabaseConfigured,
			detectSessionInUrl: false,
		},
	},
);
