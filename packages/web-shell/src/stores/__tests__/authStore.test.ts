import type { SubmitRunPayload } from '@gld/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function installMemoryLocalStorage() {
	const store = new Map<string, string>();
	const impl: Storage = {
		get length() {
			return store.size;
		},
		clear: () => store.clear(),
		getItem: (k) => (store.has(k) ? (store.get(k) as string) : null),
		key: (i) => Array.from(store.keys())[i] ?? null,
		removeItem: (k) => {
			store.delete(k);
		},
		setItem: (k, v) => {
			store.set(k, String(v));
		},
	};
	Object.defineProperty(globalThis, 'localStorage', {
		configurable: true,
		value: impl,
	});
	Object.defineProperty(globalThis.window, 'localStorage', {
		configurable: true,
		value: impl,
	});
}

const subscriptionMock = { unsubscribe: vi.fn() };
const authMock = {
	getSession: vi.fn(),
	onAuthStateChange: vi.fn(() => ({
		data: { subscription: subscriptionMock },
	})),
	signInWithPassword: vi.fn(),
	signUp: vi.fn(),
	signOut: vi.fn(),
};
const fromMock = vi.fn();
const rpcMock = vi.fn();
const mockSupabase = {
	auth: authMock,
	from: fromMock,
	rpc: rpcMock,
};

vi.mock('../../lib/supabase', () => ({
	supabase: mockSupabase,
	supabaseConfigured: true,
}));

const invalidateMock = vi.fn();
vi.mock('../rankingStore', () => ({
	useRankingStore: {
		getState: () => ({ invalidate: invalidateMock }),
	},
}));

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	installMemoryLocalStorage();
	// profiles lookup during hydrate() — unrelated to run submission, but
	// hydrate() awaits it on every signed-in test.
	fromMock.mockReturnValue({
		insert: vi.fn().mockResolvedValue({ error: null }),
		select: vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
			}),
		}),
	});
});

const SESSION_ID = '11111111-2222-3333-4444-555555555555';

const PAYLOAD: SubmitRunPayload = {
	waveReached: 10,
	remainingHp: 0,
	initialHp: 20,
	result: 'defeat',
	towersPlaced: 5,
	durationSec: 120,
	goldEarned: 100,
};

/**
 * Route the two run RPCs independently. start_run hands back a session id;
 * submit_run resolves to whatever error the test is exercising.
 */
function mockRunRpcs(submitError: { message: string; code?: string } | null) {
	rpcMock.mockImplementation((fn: string) => {
		if (fn === 'start_run') {
			return Promise.resolve({ data: SESSION_ID, error: null });
		}
		if (fn === 'submit_run') {
			return Promise.resolve({ data: null, error: submitError });
		}
		return Promise.resolve({ data: null, error: null });
	});
}

async function signedInStoreWithSession(
	submitError: { message: string; code?: string } | null,
) {
	authMock.getSession.mockResolvedValue({
		data: { session: { user: { id: 'u1' } } },
		error: null,
	});
	mockRunRpcs(submitError);
	const { useAuthStore } = await import('../authStore');
	await useAuthStore.getState().hydrate();
	await useAuthStore.getState().startRunSession();
	return useAuthStore;
}

describe('authStore', () => {
	it('submitRun rejects when not signed in', async () => {
		authMock.getSession.mockResolvedValue({
			data: { session: null },
			error: null,
		});
		const { useAuthStore } = await import('../authStore');
		await useAuthStore.getState().hydrate();
		const result = await useAuthStore.getState().submitRun(PAYLOAD);
		expect(result.kind).toBe('unauthenticated');
	});

	it('submitRun refuses to submit a run that never opened a server session', async () => {
		authMock.getSession.mockResolvedValue({
			data: { session: { user: { id: 'u1' } } },
			error: null,
		});
		mockRunRpcs(null);
		const { useAuthStore } = await import('../authStore');
		await useAuthStore.getState().hydrate();
		// deliberately no startRunSession() — submit_run has nothing to claim
		const result = await useAuthStore.getState().submitRun(PAYLOAD);
		expect(result.kind).toBe('invalid');
		if (result.kind === 'invalid') expect(result.reason).toBe('no_run_session');
		// unverifiable scores must not sit in the queue retrying forever
		expect(localStorage.getItem('gld:pending_run')).toBeNull();
	});

	it('startRunSession leaves the run unranked when start_run fails', async () => {
		authMock.getSession.mockResolvedValue({
			data: { session: { user: { id: 'u1' } } },
			error: null,
		});
		rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
		const { useAuthStore } = await import('../authStore');
		await useAuthStore.getState().hydrate();
		await useAuthStore.getState().startRunSession();
		expect(useAuthStore.getState().runSessionId).toBeNull();
	});

	it('submitRun returns ok on success and clears pending queue', async () => {
		const useAuthStore = await signedInStoreWithSession(null);
		localStorage.setItem('gld:pending_run', JSON.stringify(PAYLOAD));
		const result = await useAuthStore.getState().submitRun(PAYLOAD);
		expect(result.kind).toBe('ok');
		expect(localStorage.getItem('gld:pending_run')).toBeNull();
		// the session is single-use — the server consumed it
		expect(useAuthStore.getState().runSessionId).toBeNull();
		expect(rpcMock).toHaveBeenCalledWith(
			'submit_run',
			expect.objectContaining({ p_session_id: SESSION_ID }),
		);
	});

	it('submitRun queues to localStorage on network failure', async () => {
		const useAuthStore = await signedInStoreWithSession({
			message: 'network error',
		});
		const result = await useAuthStore.getState().submitRun(PAYLOAD);
		expect(result.kind).toBe('queued');
		const raw = localStorage.getItem('gld:pending_run');
		expect(raw).not.toBeNull();
		// the queued envelope must carry the session, or the retry can never
		// be validated against the run it came from
		expect(JSON.parse(raw as string).sessionId).toBe(SESSION_ID);
	});

	it('submitRun reports rejected on rate_limit', async () => {
		const useAuthStore = await signedInStoreWithSession({
			message: 'rate_limit: too soon since last run',
		});
		const result = await useAuthStore.getState().submitRun(PAYLOAD);
		expect(result.kind).toBe('rejected');
		if (result.kind === 'rejected') expect(result.reason).toBe('rate_limit');
	});

	it('hydrate is idempotent — second call is a no-op', async () => {
		authMock.getSession.mockResolvedValue({
			data: { session: null },
			error: null,
		});
		const { useAuthStore } = await import('../authStore');
		await useAuthStore.getState().hydrate();
		expect(authMock.getSession).toHaveBeenCalledTimes(1);
		await useAuthStore.getState().hydrate();
		expect(authMock.getSession).toHaveBeenCalledTimes(1);
	});

	it('submitRun returns invalid on CHECK violation (permanent 23xxx)', async () => {
		const useAuthStore = await signedInStoreWithSession({
			message: 'check violation',
			code: '23514',
		});
		const result = await useAuthStore.getState().submitRun(PAYLOAD);
		expect(result.kind).toBe('invalid');
		// invalid must NOT queue — permanent failures would re-fail forever
		expect(localStorage.getItem('gld:pending_run')).toBeNull();
	});

	it('submitRun returns invalid on a server-side plausibility rejection (22023)', async () => {
		const useAuthStore = await signedInStoreWithSession({
			message: 'implausible_run: wave 50 claimed after only 2s of real time',
			code: '22023',
		});
		const result = await useAuthStore.getState().submitRun(PAYLOAD);
		expect(result.kind).toBe('invalid');
		// a forged payload is a verdict, not a transient fault — never retry it
		expect(localStorage.getItem('gld:pending_run')).toBeNull();
	});

	it('pending queue stores userId envelope and drops cross-tenant payloads', async () => {
		const otherEnvelope = JSON.stringify({
			userId: 'OTHER_USER',
			sessionId: SESSION_ID,
			payload: PAYLOAD,
		});
		localStorage.setItem('gld:pending_run', otherEnvelope);
		authMock.getSession.mockResolvedValue({
			data: { session: { user: { id: 'u1' } } },
			error: null,
		});
		mockRunRpcs(null);
		const { useAuthStore } = await import('../authStore');
		await useAuthStore.getState().hydrate();
		// hydrate triggers flushPendingRun; cross-tenant payload should be
		// dropped without being submitted as u1.
		expect(localStorage.getItem('gld:pending_run')).toBeNull();
		expect(rpcMock).not.toHaveBeenCalledWith('submit_run', expect.anything());
	});

	it('drops a legacy pending envelope that predates run sessions', async () => {
		localStorage.setItem(
			'gld:pending_run',
			JSON.stringify({ userId: 'u1', payload: PAYLOAD }),
		);
		authMock.getSession.mockResolvedValue({
			data: { session: { user: { id: 'u1' } } },
			error: null,
		});
		mockRunRpcs(null);
		const { useAuthStore } = await import('../authStore');
		await useAuthStore.getState().hydrate();
		// no sessionId means submit_run could never accept it — discard rather
		// than replay it forever.
		expect(localStorage.getItem('gld:pending_run')).toBeNull();
		expect(rpcMock).not.toHaveBeenCalledWith('submit_run', expect.anything());
	});

	it('flushPendingRun replays against the session the run was played under', async () => {
		const QUEUED_SESSION = '99999999-8888-7777-6666-555555555555';
		localStorage.setItem(
			'gld:pending_run',
			JSON.stringify({
				userId: 'u1',
				sessionId: QUEUED_SESSION,
				payload: PAYLOAD,
			}),
		);
		authMock.getSession.mockResolvedValue({
			data: { session: { user: { id: 'u1' } } },
			error: null,
		});
		mockRunRpcs(null);
		const { useAuthStore } = await import('../authStore');
		await useAuthStore.getState().hydrate();
		expect(rpcMock).toHaveBeenCalledWith(
			'submit_run',
			expect.objectContaining({ p_session_id: QUEUED_SESSION }),
		);
	});
});
