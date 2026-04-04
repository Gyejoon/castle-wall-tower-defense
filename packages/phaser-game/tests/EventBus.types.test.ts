import { describe, expect, it } from 'vitest';
import type { GameEventMap } from '../src/EventBus';

type Expect<T extends true> = T;
type HasKey<K extends PropertyKey> = K extends keyof GameEventMap
	? true
	: false;

type _HasGameOverResultEvent = Expect<HasKey<'game-over'>>;

describe('EventBus type contract', () => {
	it('keeps the PVE event surface available', () => {
		void (0 as _HasGameOverResultEvent | 0);
		expect(true).toBe(true);
	});
});
