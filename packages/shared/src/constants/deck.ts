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

export const DEFAULT_DECK_IDS = [
	'archer',
	'nova_cannon',
	'emp',
	'shield',
] as const;

export const DEFAULT_DECK: readonly DeckCardDef[] = [
	{ towerDefId: 'archer', energyCost: 20, role: 'attacker' },
	{ towerDefId: 'nova_cannon', energyCost: 20, role: 'splash' },
	{ towerDefId: 'emp', energyCost: 20, role: 'slow' },
	{ towerDefId: 'shield', energyCost: 20, role: 'stun' },
] as const;

export function buildDeckCardsSafe(
	towerIds: readonly string[],
): readonly DeckCardDef[] {
	const valid: DeckCardDef[] = [];
	for (const id of towerIds) {
		const tower = ALL_TOWERS.find((t) => t.id === id);
		if (!tower) {
			console.warn(`[buildDeckCardsSafe] Unknown tower id dropped: ${id}`);
			continue;
		}
		valid.push({
			towerDefId: id,
			energyCost: tower.cost,
			role: towerToRole(tower),
		});
	}
	return valid.length > 0 ? valid : DEFAULT_DECK;
}
