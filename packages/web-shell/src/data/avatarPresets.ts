export interface AvatarPreset {
	key: string;
	label: string;
}

export const AVATAR_PRESETS: readonly AvatarPreset[] = [
	{ key: 'tower/archer', label: '궁수탑' },
	{ key: 'tower/wind_spire', label: '바람첨탑' },
	{ key: 'tower/flame_tower', label: '화염탑' },
	{ key: 'tower/arcane_spire', label: '비전첨탑' },
	{ key: 'tower/nova_cannon', label: '투석기' },
	{ key: 'tower/fortress', label: '공성대포' },
	{ key: 'tower/earth_golem', label: '대지골렘' },
	{ key: 'tower/celestial', label: '천상의탑' },
	{ key: 'tower/emp', label: '눈보라탑' },
	{ key: 'tower/stasis_field', label: '서리마탑' },
	{ key: 'tower/disruptor', label: '빙하제단' },
	{ key: 'tower/world_tree', label: '세계수' },
	{ key: 'tower/shield', label: '성기사제단' },
	{ key: 'tower/holy_shrine', label: '신성제단' },
	{ key: 'tower/divine_throne', label: '신의 옥좌' },
	{ key: 'tower/ultimate', label: '세계의 끝' },
] as const;

const VALID_KEYS = new Set(AVATAR_PRESETS.map((p) => p.key));

export function isValidAvatarKey(key: string): boolean {
	return VALID_KEYS.has(key);
}

export const DEFAULT_AVATAR_KEY: string = AVATAR_PRESETS[0].key;
