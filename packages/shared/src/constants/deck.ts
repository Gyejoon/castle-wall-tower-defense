import type { TowerDef } from '../types/tower';
import { ALL_TOWERS } from './towers';

export function towerToRole(tower: TowerDef): DeckCardDef['role'] {
	const s = tower.stats.special ?? '';
	if (s.includes('stun')) return 'stun';
	if (s.includes('slow')) return 'slow';
	if (s.includes('splash')) return 'splash';
	return 'attacker';
}

export function buildDeckCards(towerIds: readonly string[]): DeckCardDef[] {
	return towerIds.map((id) => {
		const tower = ALL_TOWERS.find((t) => t.id === id);
		if (!tower) throw new Error(`Unknown tower: ${id}`);
		return { towerDefId: id, energyCost: tower.cost, role: towerToRole(tower) };
	});
}

export interface DeckCardDef {
	readonly towerDefId: string;
	readonly energyCost: number;
	readonly role: 'attacker' | 'splash' | 'slow' | 'stun';
	readonly cooldownMs?: number;
	readonly maxUses?: number;
}

export const DEFAULT_DECK: readonly DeckCardDef[] = [
	{ towerDefId: 'archer', energyCost: 10, role: 'attacker' },
	{ towerDefId: 'plasma', energyCost: 10, role: 'splash' },
	{ towerDefId: 'emp', energyCost: 20, role: 'slow' },
	{ towerDefId: 'shield', energyCost: 20, role: 'stun' },
] as const;
