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
const mockSupabase = {
	auth: authMock,
	from: fromMock,
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
});

const PAYLOAD: SubmitRunPayload = {
	waveReached: 10,
	remainingHp: 15,
	initialHp: 20,
	result: 'defeat',
	towersPlaced: 5,
	durationSec: 120,
	goldEarned: 100,
};

function mockInsert(error: { message: string } | null) {
	fromMock.mockReturnValue({
		insert: vi.fn().mockResolvedValue({ error }),
		select: vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
			}),
		}),
	});
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

	it('submitRun returns ok on success and clears pending queue', async () => {
		authMock.getSession.mockResolvedValue({
			data: { session: { user: { id: 'u1' } } },
			error: null,
		});
		mockInsert(null);
		localStorage.setItem('gld:pending_run', JSON.stringify(PAYLOAD));
		const { useAuthStore } = await import('../authStore');
		await useAuthStore.getState().hydrate();
		const result = await useAuthStore.getState().submitRun(PAYLOAD);
		expect(result.kind).toBe('ok');
		expect(localStorage.getItem('gld:pending_run')).toBeNull();
	});

	it('submitRun queues to localStorage on network failure', async () => {
		authMock.getSession.mockResolvedValue({
			data: { session: { user: { id: 'u1' } } },
			error: null,
		});
		mockInsert({ message: 'network error' });
		const { useAuthStore } = await import('../authStore');
		await useAuthStore.getState().hydrate();
		const result = await useAuthStore.getState().submitRun(PAYLOAD);
		expect(result.kind).toBe('queued');
		expect(localStorage.getItem('gld:pending_run')).not.toBeNull();
	});

	it('submitRun reports rejected on rate_limit', async () => {
		authMock.getSession.mockResolvedValue({
			data: { session: { user: { id: 'u1' } } },
			error: null,
		});
		mockInsert({ message: 'rate_limit: too soon since last run' });
		const { useAuthStore } = await import('../authStore');
		await useAuthStore.getState().hydrate();
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
		authMock.getSession.mockResolvedValue({
			data: { session: { user: { id: 'u1' } } },
			error: null,
		});
		fromMock.mockReturnValue({
			insert: vi.fn().mockResolvedValue({
				error: { message: 'check violation', code: '23514' },
			}),
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
				}),
			}),
		});
		const { useAuthStore } = await import('../authStore');
		await useAuthStore.getState().hydrate();
		const result = await useAuthStore.getState().submitRun(PAYLOAD);
		expect(result.kind).toBe('invalid');
		// invalid must NOT queue — permanent failures would re-fail forever
		expect(localStorage.getItem('gld:pending_run')).toBeNull();
	});

	it('pending queue stores userId envelope and drops cross-tenant payloads', async () => {
		const otherEnvelope = JSON.stringify({
			userId: 'OTHER_USER',
			payload: PAYLOAD,
		});
		localStorage.setItem('gld:pending_run', otherEnvelope);
		authMock.getSession.mockResolvedValue({
			data: { session: { user: { id: 'u1' } } },
			error: null,
		});
		mockInsert(null);
		const { useAuthStore } = await import('../authStore');
		await useAuthStore.getState().hydrate();
		// hydrate triggers flushPendingRun; cross-tenant payload should be
		// dropped without being submitted as u1.
		expect(localStorage.getItem('gld:pending_run')).toBeNull();
		const insertMock = fromMock.mock.results[0]?.value.insert;
		// insert is only called if flush attempted — cross-tenant drop means
		// no insert should have fired for the other user's payload.
		expect(insertMock).not.toHaveBeenCalled();
	});
});
