import type { UnitType } from '../types/unit';

export interface WaveGroup {
	unitId: UnitType;
	count: number;
}

export type WaveSlotKind = 'normal' | 'pre_boss' | 'boss';

export interface WaveDef {
	slotIndex: number;
	kind: WaveSlotKind;
	groups: WaveGroup[];
	/** Seconds to wait after this wave is cleared before spawning next */
	delayAfterClearSec: number;
}

/** forest_gate: 입문 — 아키타입 학습 */
export const WAVE_DEFS: WaveDef[] = [
	{
		slotIndex: 1,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [{ unitId: 'scout_drone', count: 4 }],
	},
	{
		slotIndex: 2,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [{ unitId: 'scout_drone', count: 8 }],
	},
	{
		slotIndex: 3,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'battle_robot', count: 3 },
			{ unitId: 'heavy_walker', count: 1 },
		],
	},
	{
		slotIndex: 4,
		kind: 'normal',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'stealth_drone', count: 4 },
			{ unitId: 'scout_drone', count: 3 },
		],
	},
	{
		slotIndex: 5,
		kind: 'boss',
		delayAfterClearSec: 5,
		groups: [{ unitId: 'titan', count: 1 }],
	},
	{
		slotIndex: 6,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'scout_drone', count: 6 },
			{ unitId: 'stealth_drone', count: 3 },
		],
	},
	{
		slotIndex: 7,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'battle_robot', count: 2 },
		],
	},
	{
		slotIndex: 8,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'scout_drone', count: 4 },
			{ unitId: 'battle_robot', count: 3 },
			{ unitId: 'stealth_drone', count: 2 },
		],
	},
	{
		slotIndex: 9,
		kind: 'pre_boss',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'battle_robot', count: 4 },
			{ unitId: 'stealth_drone', count: 2 },
		],
	},
	{
		slotIndex: 10,
		kind: 'boss',
		delayAfterClearSec: 0,
		groups: [
			{ unitId: 'titan', count: 1 },
			{ unitId: 'heavy_walker', count: 2 },
			{ unitId: 'battle_robot', count: 3 },
		],
	},
];

/** lava_fortress: 탱크 중심 — 지속 딜/CC 필요 */
export const LAVA_FORTRESS_WAVES: WaveDef[] = [
	{
		slotIndex: 1,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [{ unitId: 'scout_drone', count: 5 }],
	},
	{
		slotIndex: 2,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'battle_robot', count: 4 },
			{ unitId: 'heavy_walker', count: 1 },
		],
	},
	{
		slotIndex: 3,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'scout_drone', count: 5 },
			{ unitId: 'stealth_drone', count: 3 },
		],
	},
	{
		slotIndex: 4,
		kind: 'normal',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'battle_robot', count: 3 },
		],
	},
	{
		slotIndex: 5,
		kind: 'boss',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'titan', count: 1 },
			{ unitId: 'heavy_walker', count: 2 },
		],
	},
	{
		slotIndex: 6,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'stealth_drone', count: 6 },
			{ unitId: 'scout_drone', count: 4 },
		],
	},
	{
		slotIndex: 7,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'heavy_walker', count: 4 },
			{ unitId: 'battle_robot', count: 2 },
		],
	},
	{
		slotIndex: 8,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'scout_drone', count: 4 },
			{ unitId: 'battle_robot', count: 3 },
			{ unitId: 'heavy_walker', count: 2 },
			{ unitId: 'stealth_drone', count: 3 },
		],
	},
	{
		slotIndex: 9,
		kind: 'pre_boss',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'heavy_walker', count: 4 },
			{ unitId: 'battle_robot', count: 4 },
			{ unitId: 'stealth_drone', count: 2 },
		],
	},
	{
		slotIndex: 10,
		kind: 'boss',
		delayAfterClearSec: 0,
		groups: [
			{ unitId: 'titan', count: 1 },
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'battle_robot', count: 4 },
		],
	},
];

/** storm_citadel: 스피드/스텔스 중심 — 빠른 타게팅 필요 */
export const STORM_CITADEL_WAVES: WaveDef[] = [
	{
		slotIndex: 1,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [{ unitId: 'scout_drone', count: 6 }],
	},
	{
		slotIndex: 2,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'stealth_drone', count: 5 },
			{ unitId: 'scout_drone', count: 3 },
		],
	},
	{
		slotIndex: 3,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'heavy_walker', count: 1 },
			{ unitId: 'battle_robot', count: 3 },
			{ unitId: 'scout_drone', count: 4 },
		],
	},
	{
		slotIndex: 4,
		kind: 'normal',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'scout_drone', count: 8 },
			{ unitId: 'stealth_drone', count: 4 },
		],
	},
	{
		slotIndex: 5,
		kind: 'boss',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'titan', count: 2 },
			{ unitId: 'stealth_drone', count: 3 },
		],
	},
	{
		slotIndex: 6,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'stealth_drone', count: 7 },
			{ unitId: 'scout_drone', count: 5 },
		],
	},
	{
		slotIndex: 7,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'battle_robot', count: 4 },
		],
	},
	{
		slotIndex: 8,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'scout_drone', count: 6 },
			{ unitId: 'stealth_drone', count: 4 },
			{ unitId: 'battle_robot', count: 3 },
		],
	},
	{
		slotIndex: 9,
		kind: 'pre_boss',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'battle_robot', count: 5 },
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'stealth_drone', count: 4 },
		],
	},
	{
		slotIndex: 10,
		kind: 'boss',
		delayAfterClearSec: 0,
		groups: [
			{ unitId: 'titan', count: 2 },
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'battle_robot', count: 4 },
			{ unitId: 'stealth_drone', count: 3 },
		],
	},
];

export const WAVE_SCALING: readonly { hp: number; speed: number }[] = [
	{ hp: 1.0, speed: 1.0 }, // Wave 1  — 성공 경험
	{ hp: 1.0, speed: 1.0 }, // Wave 2  — 여전히 쉬움
	{ hp: 1.1, speed: 1.0 }, // Wave 3  — 미세 증가
	{ hp: 1.2, speed: 1.0 }, // Wave 4  — 약간 도전
	{ hp: 1.5, speed: 1.05 }, // Wave 5  — 보스, 본격 상승
	{ hp: 1.8, speed: 1.05 }, // Wave 6
	{ hp: 2.2, speed: 1.1 }, // Wave 7
	{ hp: 2.6, speed: 1.1 }, // Wave 8
	{ hp: 3.0, speed: 1.15 }, // Wave 9  — 최종 러시
	{ hp: 3.5, speed: 1.15 }, // Wave 10 — 최종보스
];

// ── Stage-keyed waves (new) ──────────────────────────────────

export const STAGE_WAVES: Record<string, WaveDef[]> = {
	// W1 — Forest (no gimmick) --------------------------------
	w1_s1: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'scout_drone', count: 3 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'scout_drone', count: 5 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'scout_drone', count: 4 },
				{ unitId: 'battle_robot', count: 2 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'battle_robot', count: 4 }],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'scout_drone', count: 6 },
				{ unitId: 'battle_robot', count: 3 },
			],
		},
	],
	w1_s2: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'scout_drone', count: 5 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 3 },
				{ unitId: 'scout_drone', count: 2 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'stealth_drone', count: 3 }],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 4 },
				{ unitId: 'heavy_walker', count: 1 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'scout_drone', count: 6 },
				{ unitId: 'stealth_drone', count: 3 },
			],
		},
	],
	w1_s3: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'scout_drone', count: 6 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'battle_robot', count: 4 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 2 },
				{ unitId: 'battle_robot', count: 2 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'stealth_drone', count: 4 },
				{ unitId: 'scout_drone', count: 4 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 5 },
				{ unitId: 'heavy_walker', count: 2 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'scout_drone', count: 8 }],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 4 },
				{ unitId: 'stealth_drone', count: 4 },
				{ unitId: 'heavy_walker', count: 1 },
			],
		},
	],
	w1_s4: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'battle_robot', count: 5 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'stealth_drone', count: 5 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'heavy_walker', count: 3 }],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'scout_drone', count: 6 },
				{ unitId: 'battle_robot', count: 4 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 2 },
				{ unitId: 'battle_robot', count: 4 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'stealth_drone', count: 6 }],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'scout_drone', count: 10 },
				{ unitId: 'battle_robot', count: 5 },
			],
		},
	],
	w1_s5: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'scout_drone', count: 8 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 5 },
				{ unitId: 'stealth_drone', count: 3 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 3 },
				{ unitId: 'battle_robot', count: 3 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'stealth_drone', count: 6 },
				{ unitId: 'scout_drone', count: 4 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 6 },
				{ unitId: 'heavy_walker', count: 2 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 3 },
				{ unitId: 'stealth_drone', count: 4 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 7 },
				{ unitId: 'scout_drone', count: 6 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'stealth_drone', count: 5 },
				{ unitId: 'heavy_walker', count: 3 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 8 },
				{ unitId: 'heavy_walker', count: 3 },
				{ unitId: 'scout_drone', count: 5 },
			],
		},
	],
	w1_s6: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'battle_robot', count: 6 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 3 },
				{ unitId: 'scout_drone', count: 4 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'stealth_drone', count: 7 }],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 7 },
				{ unitId: 'heavy_walker', count: 2 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'heavy_walker', count: 4 }],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'scout_drone', count: 10 },
				{ unitId: 'battle_robot', count: 5 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'stealth_drone', count: 6 },
				{ unitId: 'heavy_walker', count: 3 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 6 },
				{ unitId: 'heavy_walker', count: 3 },
				{ unitId: 'stealth_drone', count: 4 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 5 },
				{ unitId: 'battle_robot', count: 6 },
			],
		},
	],
	w1_s7: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'battle_robot', count: 7 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 4 },
				{ unitId: 'battle_robot', count: 3 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'stealth_drone', count: 8 }],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'heavy_walker', count: 5 }],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 8 },
				{ unitId: 'stealth_drone', count: 4 },
			],
		},
		{
			slotIndex: 6,
			kind: 'pre_boss',
			delayAfterClearSec: 5,
			groups: [
				{ unitId: 'heavy_walker', count: 4 },
				{ unitId: 'battle_robot', count: 6 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'scout_drone', count: 12 },
				{ unitId: 'stealth_drone', count: 6 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 5 },
				{ unitId: 'battle_robot', count: 6 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'titan', count: 1 },
				{ unitId: 'battle_robot', count: 4 },
			],
		},
	],
	w1_s8: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 4 },
				{ unitId: 'scout_drone', count: 4 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 3 },
				{ unitId: 'stealth_drone', count: 3 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 5 },
				{ unitId: 'heavy_walker', count: 2 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'stealth_drone', count: 5 },
				{ unitId: 'battle_robot', count: 3 },
			],
		},
		{
			slotIndex: 5,
			kind: 'boss',
			delayAfterClearSec: 5,
			groups: [
				{ unitId: 'titan', count: 1 },
				{ unitId: 'scout_drone', count: 2 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 3 },
				{ unitId: 'battle_robot', count: 4 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'stealth_drone', count: 6 },
				{ unitId: 'heavy_walker', count: 3 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 6 },
				{ unitId: 'heavy_walker', count: 2 },
			],
		},
		{
			slotIndex: 9,
			kind: 'pre_boss',
			delayAfterClearSec: 5,
			groups: [
				{ unitId: 'heavy_walker', count: 4 },
				{ unitId: 'battle_robot', count: 4 },
			],
		},
		{
			slotIndex: 10,
			kind: 'boss',
			delayAfterClearSec: 5,
			groups: [{ unitId: 'orc_warlord', count: 1 }],
		},
	],
	// W2 — Forge (flame_imp, lava_golem) ----------------------
	w2_s1: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 6 },
				{ unitId: 'flame_imp', count: 3 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'flame_imp', count: 6 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 3 },
				{ unitId: 'flame_imp', count: 4 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 1 },
				{ unitId: 'flame_imp', count: 5 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 8 },
				{ unitId: 'lava_golem', count: 2 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'flame_imp', count: 8 },
				{ unitId: 'heavy_walker', count: 3 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 2 },
				{ unitId: 'battle_robot', count: 6 },
				{ unitId: 'flame_imp', count: 4 },
			],
		},
	],
	w2_s2: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'flame_imp', count: 8 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 6 },
				{ unitId: 'flame_imp', count: 4 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 2 },
				{ unitId: 'flame_imp', count: 5 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 4 },
				{ unitId: 'lava_golem', count: 1 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'flame_imp', count: 10 },
				{ unitId: 'battle_robot', count: 5 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'lava_golem', count: 3 }],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 8 },
				{ unitId: 'flame_imp', count: 6 },
				{ unitId: 'lava_golem', count: 2 },
			],
		},
	],
	w2_s3: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'flame_imp', count: 10 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 2 },
				{ unitId: 'battle_robot', count: 5 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 5 },
				{ unitId: 'flame_imp', count: 5 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 3 },
				{ unitId: 'flame_imp', count: 6 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 9 },
				{ unitId: 'lava_golem', count: 2 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'flame_imp', count: 12 }],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 4 },
				{ unitId: 'lava_golem', count: 3 },
				{ unitId: 'flame_imp', count: 4 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 4 },
				{ unitId: 'battle_robot', count: 6 },
			],
		},
	],
	w2_s4: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 8 },
				{ unitId: 'flame_imp', count: 4 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'lava_golem', count: 3 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'flame_imp', count: 12 },
				{ unitId: 'heavy_walker', count: 3 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 5 },
				{ unitId: 'lava_golem', count: 3 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 10 },
				{ unitId: 'lava_golem', count: 2 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'flame_imp', count: 15 }],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 4 },
				{ unitId: 'battle_robot', count: 6 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'titan', count: 1 },
				{ unitId: 'lava_golem', count: 2 },
			],
		},
	],
	w2_s5: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'flame_imp', count: 10 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 3 },
				{ unitId: 'battle_robot', count: 5 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 5 },
				{ unitId: 'flame_imp', count: 6 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'lava_golem', count: 4 }],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 10 },
				{ unitId: 'flame_imp', count: 6 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 6 },
				{ unitId: 'lava_golem', count: 3 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'flame_imp', count: 15 },
				{ unitId: 'lava_golem', count: 2 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'lava_golem', count: 5 }],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'titan', count: 1 },
				{ unitId: 'battle_robot', count: 8 },
				{ unitId: 'flame_imp', count: 6 },
			],
		},
	],
	w2_s6: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 3 },
				{ unitId: 'flame_imp', count: 5 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 10 },
				{ unitId: 'flame_imp', count: 6 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'heavy_walker', count: 6 }],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 5 },
				{ unitId: 'flame_imp', count: 6 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'flame_imp', count: 18 }],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 12 },
				{ unitId: 'lava_golem', count: 3 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 7 },
				{ unitId: 'flame_imp', count: 8 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'lava_golem', count: 6 }],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'titan', count: 1 },
				{ unitId: 'lava_golem', count: 4 },
			],
		},
	],
	w2_s7: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'flame_imp', count: 15 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'lava_golem', count: 5 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 12 },
				{ unitId: 'heavy_walker', count: 4 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'flame_imp', count: 10 },
				{ unitId: 'lava_golem', count: 4 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'heavy_walker', count: 8 }],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'titan', count: 1 },
				{ unitId: 'flame_imp', count: 10 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 6 },
				{ unitId: 'battle_robot', count: 8 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'flame_imp', count: 20 }],
		},
		{
			slotIndex: 9,
			kind: 'pre_boss',
			delayAfterClearSec: 5,
			groups: [
				{ unitId: 'lava_golem', count: 7 },
				{ unitId: 'titan', count: 1 },
			],
		},
	],
	w2_s8: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'flame_imp', count: 12 },
				{ unitId: 'battle_robot', count: 8 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 4 },
				{ unitId: 'flame_imp', count: 8 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 6 },
				{ unitId: 'lava_golem', count: 3 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 14 },
				{ unitId: 'flame_imp', count: 8 },
			],
		},
		{
			slotIndex: 5,
			kind: 'pre_boss',
			delayAfterClearSec: 5,
			groups: [{ unitId: 'titan', count: 2 }],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 6 },
				{ unitId: 'flame_imp', count: 10 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 8 },
				{ unitId: 'battle_robot', count: 6 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'flame_imp', count: 20 },
				{ unitId: 'lava_golem', count: 4 },
			],
		},
		{
			slotIndex: 9,
			kind: 'pre_boss',
			delayAfterClearSec: 5,
			groups: [
				{ unitId: 'heavy_walker', count: 8 },
				{ unitId: 'lava_golem', count: 5 },
			],
		},
		{
			slotIndex: 10,
			kind: 'boss',
			delayAfterClearSec: 5,
			groups: [{ unitId: 'forge_master', count: 1 }],
		},
	],
	// W3 — Tower (arcane_mage, mana_shield) -------------------
	w3_s1: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 10 },
				{ unitId: 'arcane_mage', count: 2 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'mana_shield', count: 3 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'arcane_mage', count: 4 },
				{ unitId: 'battle_robot', count: 6 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 4 },
				{ unitId: 'mana_shield', count: 2 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'arcane_mage', count: 5 },
				{ unitId: 'stealth_drone', count: 5 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 4 },
				{ unitId: 'battle_robot', count: 8 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 5 },
				{ unitId: 'arcane_mage', count: 3 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 5 },
				{ unitId: 'arcane_mage', count: 4 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'titan', count: 1 },
				{ unitId: 'arcane_mage', count: 4 },
			],
		},
	],
	w3_s2: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'arcane_mage', count: 5 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 4 },
				{ unitId: 'battle_robot', count: 6 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 5 },
				{ unitId: 'arcane_mage', count: 4 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'mana_shield', count: 5 }],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 12 },
				{ unitId: 'arcane_mage', count: 4 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'stealth_drone', count: 8 },
				{ unitId: 'mana_shield', count: 3 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 6 },
				{ unitId: 'arcane_mage', count: 5 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 6 },
				{ unitId: 'battle_robot', count: 8 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'titan', count: 1 },
				{ unitId: 'mana_shield', count: 3 },
			],
		},
	],
	w3_s3: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 5 },
				{ unitId: 'arcane_mage', count: 3 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'arcane_mage', count: 7 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'battle_robot', count: 14 }],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 6 },
				{ unitId: 'mana_shield', count: 4 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'arcane_mage', count: 6 },
				{ unitId: 'stealth_drone', count: 6 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'mana_shield', count: 7 }],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 7 },
				{ unitId: 'arcane_mage', count: 5 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'titan', count: 1 },
				{ unitId: 'arcane_mage', count: 4 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 5 },
				{ unitId: 'heavy_walker', count: 5 },
			],
		},
	],
	w3_s4: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'arcane_mage', count: 8 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'mana_shield', count: 6 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 7 },
				{ unitId: 'arcane_mage', count: 5 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 7 },
				{ unitId: 'battle_robot', count: 8 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'arcane_mage', count: 7 },
				{ unitId: 'stealth_drone', count: 6 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 8 },
				{ unitId: 'mana_shield', count: 5 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 16 },
				{ unitId: 'arcane_mage', count: 4 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'titan', count: 1 },
				{ unitId: 'mana_shield', count: 4 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 8 },
				{ unitId: 'heavy_walker', count: 5 },
			],
		},
	],
	w3_s5: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 14 },
				{ unitId: 'arcane_mage', count: 4 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'mana_shield', count: 7 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'arcane_mage', count: 9 }],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 8 },
				{ unitId: 'mana_shield', count: 5 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'stealth_drone', count: 10 },
				{ unitId: 'arcane_mage', count: 5 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 8 },
				{ unitId: 'battle_robot', count: 10 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 10 },
				{ unitId: 'arcane_mage', count: 6 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'titan', count: 2 }],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 10 },
				{ unitId: 'arcane_mage', count: 6 },
			],
		},
	],
	w3_s6: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'arcane_mage', count: 10 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'mana_shield', count: 9 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 16 },
				{ unitId: 'heavy_walker', count: 5 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'arcane_mage', count: 8 },
				{ unitId: 'mana_shield', count: 5 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'heavy_walker', count: 12 }],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 10 },
				{ unitId: 'battle_robot', count: 10 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'arcane_mage', count: 12 },
				{ unitId: 'stealth_drone', count: 6 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'titan', count: 2 },
				{ unitId: 'mana_shield', count: 5 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 10 },
				{ unitId: 'arcane_mage', count: 8 },
			],
		},
	],
	w3_s7: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 10 },
				{ unitId: 'arcane_mage', count: 6 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'arcane_mage', count: 14 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 12 },
				{ unitId: 'battle_robot', count: 8 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'mana_shield', count: 12 }],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 18 },
				{ unitId: 'arcane_mage', count: 6 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'titan', count: 2 },
				{ unitId: 'arcane_mage', count: 6 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 12 },
				{ unitId: 'mana_shield', count: 8 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'arcane_mage', count: 12 },
				{ unitId: 'mana_shield', count: 8 },
			],
		},
		{
			slotIndex: 9,
			kind: 'pre_boss',
			delayAfterClearSec: 5,
			groups: [
				{ unitId: 'titan', count: 2 },
				{ unitId: 'heavy_walker', count: 10 },
			],
		},
	],
	w3_s8: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'arcane_mage', count: 10 },
				{ unitId: 'mana_shield', count: 6 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'mana_shield', count: 12 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'heavy_walker', count: 14 }],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'arcane_mage', count: 14 },
				{ unitId: 'battle_robot', count: 10 },
			],
		},
		{
			slotIndex: 5,
			kind: 'pre_boss',
			delayAfterClearSec: 5,
			groups: [{ unitId: 'titan', count: 3 }],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 14 },
				{ unitId: 'arcane_mage', count: 8 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 14 },
				{ unitId: 'arcane_mage', count: 8 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 20 },
				{ unitId: 'mana_shield', count: 10 },
			],
		},
		{
			slotIndex: 9,
			kind: 'pre_boss',
			delayAfterClearSec: 5,
			groups: [
				{ unitId: 'heavy_walker', count: 12 },
				{ unitId: 'arcane_mage', count: 10 },
				{ unitId: 'mana_shield', count: 6 },
			],
		},
		{
			slotIndex: 10,
			kind: 'boss',
			delayAfterClearSec: 5,
			groups: [{ unitId: 'corrupted_archmage', count: 1 }],
		},
	],
};

// Legacy aliases + new map aliases
function getRequiredStageWaves(stageId: string): WaveDef[] {
	const waves = STAGE_WAVES[stageId];
	if (!waves) {
		throw new Error(`Missing stage waves for ${stageId}`);
	}
	return waves;
}

export const WAVE_REGISTRY: Record<string, WaveDef[]> = {
	// Legacy (pre-v5 map ids)
	forest_gate: getRequiredStageWaves('w1_s1'),
	lava_fortress: getRequiredStageWaves('w2_s1'),
	storm_citadel: getRequiredStageWaves('w3_s1'),
	// New map ids (default to first stage on that map)
	w1_forest_a: getRequiredStageWaves('w1_s1'),
	w1_forest_b: getRequiredStageWaves('w1_s5'),
	w2_forge_a: getRequiredStageWaves('w2_s1'),
	w2_forge_b: getRequiredStageWaves('w2_s5'),
	w3_tower_a: getRequiredStageWaves('w3_s1'),
	w3_tower_b: getRequiredStageWaves('w3_s5'),
};

export function getWavesForMap(mapId: string): WaveDef[] {
	const waves = WAVE_REGISTRY[mapId];
	if (!waves && mapId !== 'forest_gate') {
		console.warn(
			`[getWavesForMap] No wave definitions for map "${mapId}", falling back to forest_gate`,
		);
	}
	return waves ?? WAVE_DEFS;
}

export function getTotalWavesForMap(mapId: string): number {
	return getWavesForMap(mapId).length;
}

export function getWavesForStage(stageId: string): WaveDef[] {
	const waves = STAGE_WAVES[stageId];
	if (!waves) {
		console.warn(
			`[getWavesForStage] No wave definitions for stage "${stageId}", falling back to w1_s1`,
		);
	}
	return waves ?? STAGE_WAVES.w1_s1 ?? WAVE_DEFS;
}

export function getTotalWavesForStage(stageId: string): number {
	return getWavesForStage(stageId).length;
}

export const TOTAL_WAVES = WAVE_DEFS.length;

export const MAX_WAVE_DURATION_MS = 30_000;
