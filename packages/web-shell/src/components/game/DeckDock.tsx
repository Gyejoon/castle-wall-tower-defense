import { EventBus } from '@gld/phaser-game';
import { ALL_TOWERS, type DeckCardDef } from '@gld/shared';
import { useCallback, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { cn } from '../../utils/cn';

const TOWER_NAME_MAP = new Map(ALL_TOWERS.map((t) => [t.id, t.name]));
const TOWER_TYPE_MAP = new Map(ALL_TOWERS.map((t) => [t.id, t.type]));

function getTowerSrc(towerDefId: string): string {
	return `assets/towers/${TOWER_TYPE_MAP.get(towerDefId) ?? towerDefId}.webp`;
}

export function DeckDock() {
	const deckCards = useGameStore((s) => s.deckCards);
	const selectedCardIndex = useGameStore((s) => s.selectedCardIndex);
	const energy = useGameStore((s) => s.energy);
	const setSelectedCardIndex = useGameStore((s) => s.setSelectedCardIndex);
	const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

	// Floating ghost element for touch drag
	const ghostRef = useRef<HTMLImageElement | null>(null);
	const touchDragRef = useRef<{
		towerDefId: string;
		index: number;
		active: boolean;
		timer: ReturnType<typeof setTimeout> | null;
	} | null>(null);

	const createGhost = useCallback((src: string, x: number, y: number) => {
		const img = document.createElement('img');
		img.src = src;
		img.style.cssText = `
			position:fixed;pointer-events:none;z-index:9999;
			width:48px;height:48px;image-rendering:pixelated;
			filter:drop-shadow(0 0 6px rgba(240,208,96,0.6));
			transform:translate(-50%,-50%) scale(1);
			transition:transform 0.1s ease-out;
		`;
		img.style.left = `${x}px`;
		img.style.top = `${y}px`;
		document.body.appendChild(img);
		// Pop-in
		requestAnimationFrame(() => {
			img.style.transform = 'translate(-50%,-50%) scale(1.2)';
			requestAnimationFrame(() => {
				img.style.transform = 'translate(-50%,-50%) scale(1)';
			});
		});
		return img;
	}, []);

	const removeGhost = useCallback(() => {
		if (ghostRef.current) {
			const el = ghostRef.current;
			el.style.transition = 'transform 0.15s ease-in, opacity 0.15s ease-in';
			el.style.transform = 'translate(-50%,-50%) scale(0.5)';
			el.style.opacity = '0';
			setTimeout(() => el.remove(), 150);
			ghostRef.current = null;
		}
	}, []);

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
			// Custom drag image: tower asset only
			const img = new Image();
			img.src = getTowerSrc(card.towerDefId);
			e.dataTransfer.setDragImage(img, 24, 24);
			e.dataTransfer.setData('towerDefId', card.towerDefId);
			e.dataTransfer.effectAllowed = 'move';
			setSelectedCardIndex(index);
			setDraggingIndex(index);
			EventBus.emit('request-select-tower', { towerDefId: card.towerDefId });
		},
		[setSelectedCardIndex],
	);

	const handleDragEnd = useCallback(() => {
		setDraggingIndex(null);
	}, []);

	const handleTouchStart = useCallback(
		(e: React.TouchEvent, card: DeckCardDef, index: number) => {
			const touch = e.touches[0];
			const timer = setTimeout(() => {
				const drag = touchDragRef.current;
				if (!drag) return;
				drag.active = true;
				setSelectedCardIndex(index);
				setDraggingIndex(index);
				EventBus.emit('request-select-tower', {
					towerDefId: card.towerDefId,
				});
				ghostRef.current = createGhost(
					getTowerSrc(card.towerDefId),
					touch.clientX,
					touch.clientY,
				);
			}, 300);
			touchDragRef.current = {
				towerDefId: card.towerDefId,
				index,
				active: false,
				timer,
			};
		},
		[setSelectedCardIndex, createGhost],
	);

	const handleTouchMove = useCallback((e: React.TouchEvent) => {
		const drag = touchDragRef.current;
		if (!drag?.active) return;
		e.preventDefault();
		const touch = e.touches[0];
		if (ghostRef.current) {
			ghostRef.current.style.left = `${touch.clientX}px`;
			ghostRef.current.style.top = `${touch.clientY}px`;
		}
		EventBus.emit('drag-hover', {
			clientX: touch.clientX,
			clientY: touch.clientY,
		});
	}, []);

	const handleTouchEnd = useCallback(
		(e: React.TouchEvent) => {
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
			removeGhost();
			setDraggingIndex(null);
			touchDragRef.current = null;
		},
		[removeGhost],
	);

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
				const isDragging = draggingIndex === i;
				return (
					<button
						key={card.towerDefId}
						type="button"
						draggable
						data-testid={`deck-card-${i}`}
						onClick={() => handleCardTap(i, card)}
						onDragStart={(e) => handleDragStart(e, card, i)}
						onDragEnd={handleDragEnd}
						onTouchStart={(e) => handleTouchStart(e, card, i)}
						onTouchMove={handleTouchMove}
						onTouchEnd={handleTouchEnd}
						className={cn(
							'flex-1 min-w-0 h-[86px] bg-panel flex flex-col items-center justify-center gap-1 cursor-pointer p-0 border-2 transition-all duration-150',
							isSelected
								? 'border-gold shadow-[0_0_8px_var(--color-gold)]'
								: 'border-border shadow-[2px_2px_0px_var(--color-border)]',
							!canAfford && 'opacity-40',
							isDragging && 'opacity-30 scale-90',
						)}
					>
						<img
							src={getTowerSrc(card.towerDefId)}
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
