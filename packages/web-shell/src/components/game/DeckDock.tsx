import { EventBus } from '@gld/phaser-game';
import { ALL_TOWERS, type DeckCardDef } from '@gld/shared';
import { useGameStore } from '../../stores/gameStore';
import { cn } from '../../utils/cn';

const TOWER_NAME_MAP = new Map(ALL_TOWERS.map((t) => [t.id, t.name]));
const TOWER_TYPE_MAP = new Map(ALL_TOWERS.map((t) => [t.id, t.type]));

export function DeckDock() {
	const deckCards = useGameStore((s) => s.deckCards);
	const selectedCardIndex = useGameStore((s) => s.selectedCardIndex);
	const energy = useGameStore((s) => s.energy);
	const setSelectedCardIndex = useGameStore((s) => s.setSelectedCardIndex);

	const handleCardTap = (index: number, card: DeckCardDef) => {
		if (selectedCardIndex === index) {
			setSelectedCardIndex(null);
			EventBus.emit('request-clear-tower-selection');
		} else {
			setSelectedCardIndex(index);
			EventBus.emit('request-select-tower', { towerDefId: card.towerDefId });
		}
	};

	return (
		<div
			data-testid="deck-dock"
			className="h-[110px] shrink-0 border-t border-border px-3 pt-2 flex items-center justify-center gap-2"
			style={{
				background: 'rgba(26, 18, 8, 0.95)',
				paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
			}}
		>
			{deckCards.map((card, i) => {
				const isSelected = selectedCardIndex === i;
				const canAfford = energy >= card.energyCost;
				return (
					<button
						key={card.towerDefId}
						type="button"
						data-testid={`deck-card-${i}`}
						onClick={() => handleCardTap(i, card)}
						className={cn(
							'flex-1 min-w-0 h-[86px] bg-panel flex flex-col items-center justify-center gap-1 cursor-pointer p-0 border-2 transition-[border-color,box-shadow,opacity] duration-150',
							isSelected
								? 'border-gold shadow-[0_0_8px_var(--color-gold)]'
								: 'border-border shadow-[2px_2px_0px_var(--color-border)]',
							!canAfford && 'opacity-40',
						)}
					>
						<img
							src={`assets/towers/${TOWER_TYPE_MAP.get(card.towerDefId) ?? card.towerDefId}.webp`}
							alt={TOWER_NAME_MAP.get(card.towerDefId) ?? card.towerDefId}
							width={32}
							height={32}
							className="[image-rendering:pixelated]"
						/>
						<span className="text-[10px] text-text font-pixel overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
							{TOWER_NAME_MAP.get(card.towerDefId) ?? card.towerDefId}
						</span>
						<span
							className={cn(
								'text-[11px] font-pixel',
								canAfford ? 'text-gold' : 'text-danger',
							)}
						>
							⚡{card.energyCost}
						</span>
					</button>
				);
			})}
		</div>
	);
}
