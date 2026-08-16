import type { ProfileRow, SubmitRunPayload } from '@gld/shared';
import { create } from 'zustand';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { useRankingStore } from './rankingStore';

export type SubmitResult =
	| { kind: 'ok' }
	| { kind: 'queued' }
	| { kind: 'unauthenticated' }
	| { kind: 'disabled' }
	| { kind: 'rejected'; reason: string }
	| { kind: 'invalid'; reason: string };

export type CreateProfileResult =
	| { ok: true }
	| { ok: false; error: string; code?: 'nickname_taken' | 'unknown' };

interface PendingRunEnvelope {
	userId: string;
	/** The run session this payload was produced under. Carried through the
	 *  offline queue because submit_run() will only accept the score against
	 *  the session that was open when the run actually started. */
	sessionId: string;
	payload: SubmitRunPayload;
}

interface AuthState {
	userId: string | null;
	profile: ProfileRow | null;
	ready: boolean;
	authModalOpen: boolean;
	profileSetupOpen: boolean;
	submitInFlight: boolean;
	/** Server-issued, single-use handle for the run currently in progress.
	 *  Null when no run is open, when the player is signed out, or when
	 *  start_run() failed — in all three cases the run simply is not ranked. */
	runSessionId: string | null;

	hydrate: () => Promise<void>;
	signIn: (
		email: string,
		pw: string,
	) => Promise<{ ok: boolean; error?: string }>;
	signUp: (
		email: string,
		pw: string,
	) => Promise<{ ok: boolean; error?: string }>;
	signOut: () => Promise<void>;
	setProfile: (p: ProfileRow) => void;
	createProfile: (
		nickname: string,
		avatarKey: string,
	) => Promise<CreateProfileResult>;
	startRunSession: () => Promise<void>;
	submitRun: (
		payload: SubmitRunPayload,
		sessionIdOverride?: string,
	) => Promise<SubmitResult>;
	openAuthModal: (open: boolean) => void;
	openProfileSetup: (open: boolean) => void;
	flushPendingRun: () => Promise<void>;
}

const PENDING_KEY = 'gld:pending_run';

// Single-flight + generation guard for auth state changes.
// `authChangeGen` monotonically increments for each onAuthStateChange fire;
// async profile loads compare their captured gen to the latest before applying
// state so that fast user switches don't leak stale profile into store.
let authChangeGen = 0;
let authSubscribed = false;

async function loadProfile(userId: string): Promise<ProfileRow | null> {
	const { data, error } = await supabase
		.from('profiles')
		.select('id, nickname, avatar_key, created_at, updated_at')
		.eq('id', userId)
		.maybeSingle();
	if (error || !data) return null;
	return {
		id: data.id,
		nickname: data.nickname,
		avatarKey: data.avatar_key,
		createdAt: data.created_at,
		updatedAt: data.updated_at,
	};
}

export const useAuthStore = create<AuthState>((set, get) => ({
	userId: null,
	profile: null,
	ready: false,
	authModalOpen: false,
	profileSetupOpen: false,
	submitInFlight: false,
	runSessionId: null,

	async hydrate() {
		if (get().ready) return; // idempotent — StrictMode/HMR safe
		if (!supabaseConfigured) {
			set({ ready: true });
			return;
		}
		const { data } = await supabase.auth.getSession();
		const user = data.session?.user ?? null;
		const userId = user?.id ?? null;
		set({ userId, ready: true });
		if (userId) {
			const profile = await loadProfile(userId);
			set({ profile, profileSetupOpen: profile === null });
			await get().flushPendingRun();
		}
		if (authSubscribed) return;
		authSubscribed = true;
		supabase.auth.onAuthStateChange(async (_event, session) => {
			const nextId = session?.user?.id ?? null;
			const thisGen = ++authChangeGen;
			set({ userId: nextId });
			if (nextId) {
				const p = await loadProfile(nextId);
				// drop result if a newer auth change has fired in the meantime
				if (thisGen !== authChangeGen) return;
				set({ profile: p, profileSetupOpen: p === null });
			} else {
				set({ profile: null });
			}
		});
	},

	async signIn(email, pw) {
		if (!supabaseConfigured) {
			return { ok: false, error: '서버 연결 설정이 누락되었습니다' };
		}
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password: pw,
		});
		if (error) return { ok: false, error: error.message };
		return { ok: true };
	},

	async signUp(email, pw) {
		if (!supabaseConfigured) {
			return { ok: false, error: '서버 연결 설정이 누락되었습니다' };
		}
		const { data, error } = await supabase.auth.signUp({
			email,
			password: pw,
		});
		if (error) return { ok: false, error: error.message };
		const userId = data.user?.id ?? data.session?.user?.id ?? null;
		if (userId) set({ userId, profileSetupOpen: true, authModalOpen: false });
		return { ok: true };
	},

	async signOut() {
		await supabase.auth.signOut();
		// Drop the run session too — it is bound to the outgoing auth.uid() and
		// submit_run() would reject it for whoever signs in next anyway.
		set({ userId: null, profile: null, runSessionId: null });
	},

	setProfile(p) {
		set({ profile: p, profileSetupOpen: false });
	},

	async createProfile(nickname, avatarKey) {
		if (!supabaseConfigured) {
			return {
				ok: false,
				error: '서버 연결 설정이 누락되었습니다',
				code: 'unknown',
			};
		}
		const { userId } = get();
		if (!userId)
			return { ok: false, error: '세션이 없습니다. 다시 로그인해주세요' };
		const { error } = await supabase
			.from('profiles')
			.insert({ id: userId, nickname, avatar_key: avatarKey });
		if (error) {
			const msg = error.message ?? '';
			const code = (error as unknown as { code?: string }).code;
			if (code === '23505' || msg.includes('duplicate key')) {
				return {
					ok: false,
					error: '이미 사용 중인 닉네임입니다',
					code: 'nickname_taken',
				};
			}
			return { ok: false, error: msg || '프로필 생성 실패', code: 'unknown' };
		}
		const now = new Date().toISOString();
		set({
			profile: {
				id: userId,
				nickname,
				avatarKey,
				createdAt: now,
				updatedAt: now,
			},
			profileSetupOpen: false,
		});
		return { ok: true };
	},

	openAuthModal(open) {
		set({ authModalOpen: open });
	},

	openProfileSetup(open) {
		set({ profileSetupOpen: open });
	},

	async startRunSession() {
		if (!supabaseConfigured) return;
		if (!get().userId) {
			set({ runSessionId: null });
			return;
		}
		const { data, error } = await supabase.rpc('start_run');
		if (error || typeof data !== 'string') {
			// Non-fatal: the run is playable, it just won't be rankable because
			// submit_run() has no session to claim. Better than blocking play on
			// a ranking-server hiccup.
			console.warn(
				'[GLD] start_run failed — this run will not be ranked',
				error?.message,
			);
			set({ runSessionId: null });
			return;
		}
		set({ runSessionId: data });
	},

	async submitRun(payload, sessionIdOverride) {
		if (!supabaseConfigured) return { kind: 'disabled' };
		const { userId, submitInFlight } = get();
		if (!userId) return { kind: 'unauthenticated' };
		// Scores are only accepted against a session opened when the run began.
		// No session means the run started signed-out or start_run() failed, so
		// there is nothing the server can validate against — drop it rather
		// than queue a payload that can never succeed.
		const sessionId = sessionIdOverride ?? get().runSessionId;
		if (!sessionId) return { kind: 'invalid', reason: 'no_run_session' };
		// Coalesce: if another submit is already pending, drop this one instead
		// of racing the pending_run key. Caller sees 'queued' semantics.
		if (submitInFlight) {
			writePending({ userId, sessionId, payload });
			return { kind: 'queued' };
		}
		set({ submitInFlight: true });
		try {
			const { error } = await supabase.rpc('submit_run', {
				p_session_id: sessionId,
				p_wave_reached: payload.waveReached,
				p_remaining_hp: payload.remainingHp,
				p_initial_hp: payload.initialHp,
				p_result: payload.result,
				p_towers_placed: payload.towersPlaced,
				p_duration_sec: payload.durationSec,
				p_gold_earned: payload.goldEarned,
			});
			if (error) {
				if (error.message.includes('rate_limit')) {
					return { kind: 'rejected', reason: 'rate_limit' };
				}
				// Distinguish permanent validation failures (RLS, CHECK, PK
				// violations) from transient network errors. Permanent failures
				// must NOT queue — they'd re-fail on every hydrate forever.
				const code = (error as unknown as { code?: string }).code ?? '';
				if (isPermanentErrorCode(code)) {
					return { kind: 'invalid', reason: code || error.message };
				}
				writePending({ userId, sessionId, payload });
				return { kind: 'queued' };
			}
			clearPending();
			// The server consumed the session on success — it is single-use, so
			// clear it rather than leave a spent id that would come back as
			// invalid_session on any stray re-submit.
			if (!sessionIdOverride) set({ runSessionId: null });
			// New personal record may have landed — nuke cached leaderboard/
			// myRuns so the next tab mount re-fetches. Cheap and correct beats
			// optimistic merge for MVP.
			useRankingStore.getState().invalidate();
			return { kind: 'ok' };
		} finally {
			set({ submitInFlight: false });
		}
	},

	async flushPendingRun() {
		if (!supabaseConfigured) return;
		// Don't race an in-flight submit — the current submit owns the key.
		if (get().submitInFlight) return;
		const envelope = readPending();
		if (!envelope) return;
		// Cross-tenant guard: if the pending payload was queued by a different
		// user (device shared between accounts), drop it rather than
		// attributing someone else's run to the current session.
		const { userId } = get();
		if (!userId || envelope.userId !== userId) {
			clearPending();
			return;
		}
		// Consume before submitting so a concurrent submitRun can't also pick
		// it up. If submit fails transiently, submitRun re-queues via its own
		// error path.
		clearPending();
		// Replay against the session the run was actually played under, not
		// whatever session happens to be open now. run_session_ttl() (24h) is
		// what bounds how long a queued run stays redeemable.
		await get().submitRun(envelope.payload, envelope.sessionId);
	},
}));

// Pending-run queue helpers — co-located with the store so the envelope shape
// stays private. Envelope binds the payload to the userId that produced it so
// a device used by multiple accounts cannot cross-attribute a queued run.
//
// Two-tier storage: localStorage is the durable primary (survives page reload),
// but when localStorage throws (quota exceeded, private mode, disabled) we
// fall back to an in-memory slot so a queued run at least survives within the
// current session and can be flushed on the next submitRun / navigation.
let inMemoryPending: PendingRunEnvelope | null = null;

function writePending(envelope: PendingRunEnvelope): void {
	inMemoryPending = envelope;
	try {
		localStorage.setItem(PENDING_KEY, JSON.stringify(envelope));
		// localStorage accepted the write — drop the in-memory mirror so it
		// doesn't drift out of sync with subsequent clear/write operations.
		inMemoryPending = null;
	} catch {
		// keep the in-memory copy as our only record; warn once so a user in
		// private mode has some diagnostic signal if they inspect the console.
		console.warn(
			'[GLD] localStorage unavailable — run queued to memory only (will be lost on reload)',
		);
	}
}

function readPending(): PendingRunEnvelope | null {
	let raw: string | null = null;
	try {
		raw = localStorage.getItem(PENDING_KEY);
	} catch {
		// storage access failed — fall back to in-memory only
		return inMemoryPending;
	}
	if (raw) {
		try {
			const parsed = JSON.parse(raw);
			if (
				parsed &&
				typeof parsed === 'object' &&
				typeof parsed.userId === 'string' &&
				typeof parsed.sessionId === 'string' &&
				parsed.payload &&
				typeof parsed.payload === 'object'
			) {
				return parsed as PendingRunEnvelope;
			}
			// Legacy envelope from an earlier shape — discard. Pre-sessionId
			// payloads can never be submitted now (submit_run needs a session to
			// claim), and the userId binding is required for cross-tenant safety.
			clearPending();
		} catch {
			clearPending();
		}
	}
	// localStorage was empty/malformed — in-memory may still hold a payload
	// that failed to persist on its original write attempt.
	return inMemoryPending;
}

function clearPending(): void {
	inMemoryPending = null;
	try {
		localStorage.removeItem(PENDING_KEY);
	} catch {
		// noop
	}
}

// Postgres error codes for permanent validation failures. These should surface
// to the user as "invalid" rather than queue for retry.
// 23xxx = integrity constraint violations, 42xxx = syntax/access, PGRST* =
// PostgREST layer errors including RLS denials.
function isPermanentErrorCode(code: string): boolean {
	if (!code) return false;
	if (code.startsWith('23')) return true; // check_violation, unique_violation, fk_violation, not_null
	if (code.startsWith('42')) return true; // undefined_table, insufficient_privilege
	if (code === 'PGRST301' || code === '42501') return true; // RLS denial
	// submit_run() rejections: 22023 = invalid_session / implausible_run,
	// 28000 = unauthenticated. Both are verdicts on the payload itself, so
	// retrying the identical submit can only fail the same way.
	if (code === '22023' || code === '28000') return true;
	return false;
}
