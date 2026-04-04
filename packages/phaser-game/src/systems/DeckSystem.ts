import type { DeckCardDef, TowerDef } from '@gld/shared';
import { ALL_TOWERS, DEFAULT_DECK } from '@gld/shared';

export class DeckSystem {
	private readonly initialDeck: readonly DeckCardDef[];
	private deck: readonly DeckCardDef[];
	private byTowerId: Map<string, DeckCardDef>;

	constructor(deck: readonly DeckCardDef[] = DEFAULT_DECK) {
		this.initialDeck = deck;
		this.deck = deck;
		this.byTowerId = new Map(deck.map((c) => [c.towerDefId, c]));
	}

	getCards(): readonly DeckCardDef[] {
		return this.deck;
	}

	getCard(index: number): DeckCardDef | null {
		return this.deck[index] ?? null;
	}

	getCardByTowerId(towerDefId: string): DeckCardDef | null {
		return this.byTowerId.get(towerDefId) ?? null;
	}

	getTowerDef(towerDefId: string): TowerDef | null {
		return ALL_TOWERS.find((t) => t.id === towerDefId) ?? null;
	}

	reset(): void {
		this.deck = this.initialDeck;
		this.byTowerId = new Map(this.deck.map((c) => [c.towerDefId, c]));
	}
}
