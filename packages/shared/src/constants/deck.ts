export interface DeckCardDef {
	readonly towerDefId: string;
	readonly energyCost: number;
	readonly role: 'attacker' | 'splash' | 'slow' | 'stun';
	readonly cooldownMs?: number;
	readonly maxUses?: number;
}

export const DEFAULT_DECK: readonly DeckCardDef[] = [
	{ towerDefId: 'laser', energyCost: 10, role: 'attacker' },
	{ towerDefId: 'plasma', energyCost: 10, role: 'splash' },
	{ towerDefId: 'emp', energyCost: 20, role: 'slow' },
	{ towerDefId: 'shield', energyCost: 20, role: 'stun' },
] as const;
