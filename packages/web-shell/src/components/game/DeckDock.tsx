import { EventBus } from '@gld/phaser-game';
import { ALL_TOWERS, type DeckCardDef } from '@gld/shared';
import { useCallback, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { cn } from '../../utils/cn';

const TOWER_NAME_MAP = new Map(ALL_TOWERS.map((t) => [t.id, t.name]));
const TOWER_TYPE_MAP = new Map(ALL_TOWERS.map((t) => [t.id, t.type]));

export function DeckDock() {
	const deckCards = useGameStore((s) => s.deckCards);
	const selectedCardIndex = useGameStore((s) => s.selectedCardIndex);
	const energy = useGameStore((s) => s.energy);
	const setSelectedCardIndex = useGameStore((s) => s.setSelectedCardIndex);
	const touchDragRef = useRef<{
		towerDefId: string;
		index: number;
		startX: number;
		startY: number;
		active: boolean;
		timer: ReturnType<typeof setTimeout> | null;
	} | null>(null);

	const handleCardTap = (index: number, card: DeckCardDef) => {
		if (selectedCardIndex === index) {
			setSelectedCardIndex(null);
			EventBus.emit('request-clear-tower-selection');
		} else {
			setSelectedCardIndex(index);
			EventBus.emit('request-select-tower', { towerDefId: card.towerDefId });
		}
	};

	const handleDragStart = useCallback(
		(e: React.DragEvent, card: DeckCardDef, index: number) => {
			e.dataTransfer.setData('towerDefId', card.towerDefId);
			e.dataTransfer.effectAllowed = 'move';
			setSelectedCardIndex(index);
			EventBus.emit('request-select-tower', { towerDefId: card.towerDefId });
		},
		[setSelectedCardIndex],
	);

	const handleTouchStart = useCallback(
		(e: React.TouchEvent, card: DeckCardDef, index: number) => {
			const touch = e.touches[0];
			const timer = setTimeout(() => {
				if (touchDragRef.current) {
					touchDragRef.current.active = true;
					setSelectedCardIndex(index);
					EventBus.emit('request-select-tower', {
						towerDefId: card.towerDefId,
					});
				}
			}, 300);
			touchDragRef.current = {
				towerDefId: card.towerDefId,
				index,
				startX: touch.clientX,
				startY: touch.clientY,
				active: false,
				timer,
			};
		},
		[setSelectedCardIndex],
	);

	const handleTouchMove = useCallback((e: React.TouchEvent) => {
		const drag = touchDragRef.current;
		if (!drag?.active) return;
		e.preventDefault();
		const touch = e.touches[0];
		EventBus.emit('drag-hover', {
			clientX: touch.clientX,
			clientY: touch.clientY,
		});
	}, []);

	const handleTouchEnd = useCallback((e: React.TouchEvent) => {
		const drag = touchDragRef.current;
		if (drag?.timer) clearTimeout(drag.timer);
		if (!drag?.active) {
			touchDragRef.current = null;
			return;
		}
		const touch = e.changedTouches[0];
		EventBus.emit('drag-drop', {
			towerDefId: drag.towerDefId,
			clientX: touch.clientX,
			clientY: touch.clientY,
		});
		touchDragRef.current = null;
	}, []);

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
						draggable
						data-testid={`deck-card-${i}`}
						onClick={() => handleCardTap(i, card)}
						onDragStart={(e) => handleDragStart(e, card, i)}
						onTouchStart={(e) => handleTouchStart(e, card, i)}
						onTouchMove={handleTouchMove}
						onTouchEnd={handleTouchEnd}
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
							<span className="inline-flex items-center gap-[2px]">
								<img
									src="assets/ui/icon-energy.webp"
									alt=""
									width={10}
									height={10}
									className="[image-rendering:pixelated]"
								/>
								{card.energyCost}
							</span>
						</span>
					</button>
				);
			})}
		</div>
	);
}
