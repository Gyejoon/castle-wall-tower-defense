// packages/shared/src/constants/stages.ts
import type { StageDef, WorldId } from '../types/stage';

const W1_STAGES: StageDef[] = [
	{
		id: 'w1_s1',
		worldId: 'w1_forest',
		stageNumber: 1,
		name: '첫 침공',
		mapId: 'w1_forest_a',
		waveSetId: 'w1_s1',
		isBossStage: false,
		recommendedPower: 80,
	},
	{
		id: 'w1_s2',
		worldId: 'w1_forest',
		stageNumber: 2,
		name: '야간 순찰',
		mapId: 'w1_forest_a',
		waveSetId: 'w1_s2',
		isBossStage: false,
		recommendedPower: 100,
	},
	{
		id: 'w1_s3',
		worldId: 'w1_forest',
		stageNumber: 3,
		name: '오크의 북소리',
		mapId: 'w1_forest_a',
		waveSetId: 'w1_s3',
		isBossStage: false,
		recommendedPower: 130,
	},
	{
		id: 'w1_s4',
		worldId: 'w1_forest',
		stageNumber: 4,
		name: '흩어진 진영',
		mapId: 'w1_forest_a',
		waveSetId: 'w1_s4',
		isBossStage: false,
		recommendedPower: 160,
	},
	{
		id: 'w1_s5',
		worldId: 'w1_forest',
		stageNumber: 5,
		name: '외곽의 비명',
		mapId: 'w1_forest_b',
		waveSetId: 'w1_s5',
		isBossStage: false,
		recommendedPower: 190,
	},
	{
		id: 'w1_s6',
		worldId: 'w1_forest',
		stageNumber: 6,
		name: '숲의 기습',
		mapId: 'w1_forest_b',
		waveSetId: 'w1_s6',
		isBossStage: false,
		recommendedPower: 220,
	},
	{
		id: 'w1_s7',
		worldId: 'w1_forest',
		stageNumber: 7,
		name: '전쟁 북소리',
		mapId: 'w1_forest_b',
		waveSetId: 'w1_s7',
		isBossStage: false,
		recommendedPower: 250,
	},
	{
		id: 'w1_s8',
		worldId: 'w1_forest',
		stageNumber: 8,
		name: '오크 전쟁 대장',
		mapId: 'w1_forest_a',
		waveSetId: 'w1_s8',
		isBossStage: true,
		bossUnitId: 'orc_warlord',
		recommendedPower: 300,
	},
];

const W2_STAGES: StageDef[] = [
	{
		id: 'w2_s1',
		worldId: 'w2_forge',
		stageNumber: 1,
		name: '단조장 외곽',
		mapId: 'w2_forge_a',
		waveSetId: 'w2_s1',
		isBossStage: false,
		recommendedPower: 360,
	},
	{
		id: 'w2_s2',
		worldId: 'w2_forge',
		stageNumber: 2,
		name: '용광로 회랑',
		mapId: 'w2_forge_a',
		waveSetId: 'w2_s2',
		isBossStage: false,
		recommendedPower: 420,
	},
	{
		id: 'w2_s3',
		worldId: 'w2_forge',
		stageNumber: 3,
		name: '불의 심장부',
		mapId: 'w2_forge_a',
		waveSetId: 'w2_s3',
		isBossStage: false,
		recommendedPower: 490,
	},
	{
		id: 'w2_s4',
		worldId: 'w2_forge',
		stageNumber: 4,
		name: '용암 광장',
		mapId: 'w2_forge_a',
		waveSetId: 'w2_s4',
		isBossStage: false,
		recommendedPower: 560,
	},
	{
		id: 'w2_s5',
		worldId: 'w2_forge',
		stageNumber: 5,
		name: '용암 통로',
		mapId: 'w2_forge_b',
		waveSetId: 'w2_s5',
		isBossStage: false,
		recommendedPower: 640,
	},
	{
		id: 'w2_s6',
		worldId: 'w2_forge',
		stageNumber: 6,
		name: '제련의 공방',
		mapId: 'w2_forge_b',
		waveSetId: 'w2_s6',
		isBossStage: false,
		recommendedPower: 720,
	},
	{
		id: 'w2_s7',
		worldId: 'w2_forge',
		stageNumber: 7,
		name: '화염의 밀물',
		mapId: 'w2_forge_b',
		waveSetId: 'w2_s7',
		isBossStage: false,
		recommendedPower: 800,
	},
	{
		id: 'w2_s8',
		worldId: 'w2_forge',
		stageNumber: 8,
		name: '단조장의 군주',
		mapId: 'w2_forge_a',
		waveSetId: 'w2_s8',
		isBossStage: true,
		bossUnitId: 'forge_master',
		recommendedPower: 900,
	},
];

const W3_STAGES: StageDef[] = [
	{
		id: 'w3_s1',
		worldId: 'w3_tower',
		stageNumber: 1,
		name: '성채 입구',
		mapId: 'w3_tower_a',
		waveSetId: 'w3_s1',
		isBossStage: false,
		recommendedPower: 1000,
	},
	{
		id: 'w3_s2',
		worldId: 'w3_tower',
		stageNumber: 2,
		name: '마력의 회랑',
		mapId: 'w3_tower_a',
		waveSetId: 'w3_s2',
		isBossStage: false,
		recommendedPower: 1150,
	},
	{
		id: 'w3_s3',
		worldId: 'w3_tower',
		stageNumber: 3,
		name: '폭풍 성벽',
		mapId: 'w3_tower_a',
		waveSetId: 'w3_s3',
		isBossStage: false,
		recommendedPower: 1320,
	},
	{
		id: 'w3_s4',
		worldId: 'w3_tower',
		stageNumber: 4,
		name: '마법진의 방',
		mapId: 'w3_tower_a',
		waveSetId: 'w3_s4',
		isBossStage: false,
		recommendedPower: 1500,
	},
	{
		id: 'w3_s5',
		worldId: 'w3_tower',
		stageNumber: 5,
		name: '이중 회랑',
		mapId: 'w3_tower_b',
		waveSetId: 'w3_s5',
		isBossStage: false,
		recommendedPower: 1700,
	},
	{
		id: 'w3_s6',
		worldId: 'w3_tower',
		stageNumber: 6,
		name: '마력 폭주지대',
		mapId: 'w3_tower_b',
		waveSetId: 'w3_s6',
		isBossStage: false,
		recommendedPower: 1900,
	},
	{
		id: 'w3_s7',
		worldId: 'w3_tower',
		stageNumber: 7,
		name: '대마법사의 제자',
		mapId: 'w3_tower_b',
		waveSetId: 'w3_s7',
		isBossStage: false,
		recommendedPower: 2100,
	},
	{
		id: 'w3_s8',
		worldId: 'w3_tower',
		stageNumber: 8,
		name: '타락한 대마법사',
		mapId: 'w3_tower_a',
		waveSetId: 'w3_s8',
		isBossStage: true,
		bossUnitId: 'corrupted_archmage',
		recommendedPower: 2400,
	},
];

// Phase A pivot — single hidden lab stage that backs the random-summon
// + merge core loop. Not included in STAGE_ORDER so it stays out of the
// main worldmap's "next stage" navigation; reached only via the lobby
// "Phase A Lab" entry point.
const PHASE_A_STAGES: StageDef[] = [
	{
		id: 'phase_a_s1',
		worldId: 'phase_a_lab',
		stageNumber: 1,
		name: 'Phase A — 긴 회랑',
		mapId: 'phase_a_long',
		waveSetId: 'phase_a_s1',
		isBossStage: true,
		bossUnitId: 'orc_warlord',
		recommendedPower: 80,
	},
];

export const STAGES: Record<string, StageDef> = Object.fromEntries(
	[...W1_STAGES, ...W2_STAGES, ...W3_STAGES, ...PHASE_A_STAGES].map((s) => [
		s.id,
		s,
	]),
);

export const STAGE_ORDER: string[] = [
	...W1_STAGES.map((s) => s.id),
	...W2_STAGES.map((s) => s.id),
	...W3_STAGES.map((s) => s.id),
];

export function getStageById(id: string): StageDef {
	const stage = STAGES[id];
	if (!stage) throw new Error(`Unknown stage id: ${id}`);
	return stage;
}

export function getStagesByWorld(worldId: WorldId): StageDef[] {
	return STAGE_ORDER.map((id) => STAGES[id]).filter(
		(s) => s.worldId === worldId,
	);
}

export function getNextStageId(currentStageId: string): string | null {
	const idx = STAGE_ORDER.indexOf(currentStageId);
	if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
	return STAGE_ORDER[idx + 1];
}

export const DEFAULT_STAGE_ID = 'w1_s1';
