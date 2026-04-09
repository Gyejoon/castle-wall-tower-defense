import { describe, expect, it } from 'vitest';
import type { WorldSlot } from '../WorldLayout';
import {
	getRecommendedStageId,
	getStageStars,
	isStageUnlocked,
	isWorldUnlocked,
	type UnlockContext,
} from '../worldLogic';

// 테스트용 월드 3종 — 실제 `MAP_REGISTRY`의 stage id에 매핑
const testWorlds: WorldSlot[] = [
	{
		worldId: 'w1',
		displayName: '숲의 성문',
		position: { top: 680, left: 120 },
		themeToken: 'success',
		ambientFxKind: 'forest',
		landmarkAsset: 'assets/ui/landmark-forest_gate.webp',
		stageIds: ['forest_gate'],
	},
	{
		worldId: 'w2',
		displayName: '용암 요새',
		position: { top: 544, left: 310 },
		themeToken: 'danger',
		ambientFxKind: 'lava',
		landmarkAsset: 'assets/ui/landmark-lava_fortress.webp',
		stageIds: ['lava_fortress'],
	},
	{
		worldId: 'w3',
		displayName: '폭풍 성채',
		position: { top: 408, left: 140 },
		themeToken: 'info',
		ambientFxKind: 'storm',
		landmarkAsset: 'assets/ui/landmark-storm_citadel.webp',
		stageIds: ['storm_citadel'],
	},
	{
		worldId: 'w4',
		displayName: '왕가의 지하묘지',
		position: { top: 288, left: 306 },
		themeToken: 'gradeUnique',
		ambientFxKind: 'crypt',
		landmarkAsset: 'assets/ui/landmark-storm_citadel.webp',
		stageIds: [],
		placeholder: true,
	},
];

const makeCtx = (over: Partial<UnlockContext> = {}): UnlockContext => ({
	playerLevel: 1,
	stagesCleared: [],
	stageStars: {},
	...over,
});

describe('isStageUnlocked', () => {
	it('forest_gate는 레벨 1에서 해금', () => {
		expect(isStageUnlocked('forest_gate', makeCtx({ playerLevel: 1 }))).toBe(
			true,
		);
	});

	it('lava_fortress는 레벨 2에서 잠김, 3에서 해금', () => {
		expect(isStageUnlocked('lava_fortress', makeCtx({ playerLevel: 2 }))).toBe(
			false,
		);
		expect(isStageUnlocked('lava_fortress', makeCtx({ playerLevel: 3 }))).toBe(
			true,
		);
	});

	it('storm_citadel은 레벨 6에서 잠김, 7에서 해금', () => {
		expect(isStageUnlocked('storm_citadel', makeCtx({ playerLevel: 6 }))).toBe(
			false,
		);
		expect(isStageUnlocked('storm_citadel', makeCtx({ playerLevel: 7 }))).toBe(
			true,
		);
	});

	it('존재하지 않는 stage id는 false', () => {
		expect(isStageUnlocked('nonexistent_stage', makeCtx())).toBe(false);
	});
});

describe('isWorldUnlocked', () => {
	it('placeholder 월드는 항상 잠김', () => {
		const ctx = makeCtx({ playerLevel: 99 });
		expect(isWorldUnlocked(testWorlds[3], ctx)).toBe(false);
	});

	it('활성 월드는 첫 스테이지의 unlockLevel로 판정', () => {
		expect(isWorldUnlocked(testWorlds[0], makeCtx({ playerLevel: 1 }))).toBe(
			true,
		);
		expect(isWorldUnlocked(testWorlds[1], makeCtx({ playerLevel: 2 }))).toBe(
			false,
		);
		expect(isWorldUnlocked(testWorlds[1], makeCtx({ playerLevel: 3 }))).toBe(
			true,
		);
		expect(isWorldUnlocked(testWorlds[2], makeCtx({ playerLevel: 7 }))).toBe(
			true,
		);
	});

	it('stageIds가 비어있는 월드는 잠김', () => {
		const emptyWorld: WorldSlot = { ...testWorlds[0], stageIds: [] };
		expect(isWorldUnlocked(emptyWorld, makeCtx({ playerLevel: 99 }))).toBe(
			false,
		);
	});
});

describe('getRecommendedStageId', () => {
	it('첫 미클리어 해금 stage를 추천', () => {
		const ctx = makeCtx({ playerLevel: 7, stagesCleared: [] });
		expect(getRecommendedStageId(testWorlds, ctx)).toBe('forest_gate');
	});

	it('첫 스테이지 클리어 후 다음 해금 스테이지 추천', () => {
		const ctx = makeCtx({
			playerLevel: 7,
			stagesCleared: ['forest_gate'],
		});
		expect(getRecommendedStageId(testWorlds, ctx)).toBe('lava_fortress');
	});

	it('전부 클리어 시 마지막 해금 스테이지 반환', () => {
		const ctx = makeCtx({
			playerLevel: 7,
			stagesCleared: ['forest_gate', 'lava_fortress', 'storm_citadel'],
		});
		expect(getRecommendedStageId(testWorlds, ctx)).toBe('storm_citadel');
	});

	it('placeholder 월드는 후보에서 제외', () => {
		const ctx = makeCtx({
			playerLevel: 99,
			stagesCleared: ['forest_gate', 'lava_fortress', 'storm_citadel'],
		});
		expect(getRecommendedStageId(testWorlds, ctx)).toBe('storm_citadel');
	});

	it('아무 스테이지도 해금 안됐으면 undefined', () => {
		const onlyPlaceholder: WorldSlot[] = [testWorlds[3]];
		expect(getRecommendedStageId(onlyPlaceholder, makeCtx())).toBeUndefined();
	});
});

describe('getStageStars', () => {
	it('stageStars에 명시값이 있으면 그 값 반환', () => {
		const ctx = makeCtx({
			stageStars: { forest_gate: 3, lava_fortress: 2 },
			stagesCleared: ['forest_gate'],
		});
		expect(getStageStars('forest_gate', ctx)).toBe(3);
		expect(getStageStars('lava_fortress', ctx)).toBe(2);
	});

	it('stageStars 없어도 stagesCleared 포함 시 1 반환', () => {
		const ctx = makeCtx({
			stagesCleared: ['forest_gate'],
			stageStars: {},
		});
		expect(getStageStars('forest_gate', ctx)).toBe(1);
	});

	it('클리어 안한 스테이지는 0 반환', () => {
		const ctx = makeCtx({ stagesCleared: [], stageStars: {} });
		expect(getStageStars('forest_gate', ctx)).toBe(0);
	});

	it('명시 stars=1이어도 우선 반환', () => {
		const ctx = makeCtx({
			stageStars: { forest_gate: 1 },
			stagesCleared: ['forest_gate'],
		});
		expect(getStageStars('forest_gate', ctx)).toBe(1);
	});
});
