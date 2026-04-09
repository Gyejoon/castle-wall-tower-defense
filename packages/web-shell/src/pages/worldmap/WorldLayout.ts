/**
 * 월드맵 세로 S-curve 레이아웃.
 * 플레이어는 화면 하단(W1 숲의 성문)에서 시작해 상단(W6 마왕의 왕좌)으로 올라간다.
 *
 * #112 월드 재편이 들어오면 `stageIds`만 교체하면 되며, 좌표/테마/ambientFxKind는
 * 이 테이블을 그대로 읽는다.
 */

import type { UI_COLORS } from '@gld/shared';

export type ThemeToken = keyof typeof UI_COLORS;

/**
 * UI 파티클 스타일 태그. 게임 로직 `systems/world-gimmicks/`(#113)의
 * GimmickSystem과 **의도적으로 이름이 다르다** (CSS 파티클 vs 런타임 기믹).
 */
export type AmbientFxKind =
	| 'forest'
	| 'lava'
	| 'storm'
	| 'crypt'
	| 'plague'
	| 'throne';

export type WorldSlot = {
	worldId: 'w1' | 'w2' | 'w3' | 'w4' | 'w5' | 'w6';
	displayName: string;
	/** 랜드마크 중심 좌표 (MAP_CONTENT_WIDTH × MAP_CONTENT_HEIGHT 기준 px) */
	position: { top: number; left: number };
	/** `@gld/shared` UI_COLORS 토큰 키. hex 리터럴 금지. */
	themeToken: ThemeToken;
	ambientFxKind: AmbientFxKind;
	/** 랜드마크 이미지 경로. placeholder면 미사용. */
	landmarkAsset: string;
	/** 이 월드에 속한 스테이지 ID 배열. 오늘 0~1개, 내일(#112) 최대 8개. */
	stageIds: string[];
	/** W4-W6 실루엣 Coming Soon 슬롯 */
	placeholder?: boolean;
};

export const MAP_CONTENT_WIDTH = 430;
export const MAP_CONTENT_HEIGHT = 800;

/**
 * 월드 슬롯 6개. S-curve: 하단 W1 → 상단 W6.
 * 좌표는 32px 그리드 리듬을 염두에 두고 결정.
 */
export const WORLD_LAYOUT: readonly WorldSlot[] = [
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
	{
		worldId: 'w5',
		displayName: '몰락한 왕국',
		position: { top: 168, left: 134 },
		themeToken: 'bossPhase1',
		ambientFxKind: 'plague',
		landmarkAsset: 'assets/ui/landmark-lava_fortress.webp',
		stageIds: [],
		placeholder: true,
	},
	{
		worldId: 'w6',
		displayName: '마왕의 왕좌',
		position: { top: 56, left: 300 },
		themeToken: 'gold',
		ambientFxKind: 'throne',
		landmarkAsset: 'assets/ui/landmark-forest_gate.webp',
		stageIds: [],
		placeholder: true,
	},
] as const;

/** 월드 노드를 잇는 경로 연결. idx는 WORLD_LAYOUT 순서(W1→W6). */
export const WORLD_PATH_CONNECTIONS: ReadonlyArray<{
	fromIdx: number;
	toIdx: number;
}> = [
	{ fromIdx: 0, toIdx: 1 },
	{ fromIdx: 1, toIdx: 2 },
	{ fromIdx: 2, toIdx: 3 },
	{ fromIdx: 3, toIdx: 4 },
	{ fromIdx: 4, toIdx: 5 },
];
