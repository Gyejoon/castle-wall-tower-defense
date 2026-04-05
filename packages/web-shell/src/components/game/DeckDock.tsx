import { EventBus } from '@gld/phaser-game';
import { ALL_TOWERS, type DeckCardDef } from '@gld/shared';
import type { CSSProperties } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { colors, fonts } from '../../styles/tokens';

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
			style={{
				height: '110px',
				flexShrink: 0,
				background: 'rgba(26, 18, 8, 0.95)',
				borderTop: `1px solid ${colors.border}`,
				padding: '8px 12px',
				paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: '8px',
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
						style={cardStyle(isSelected, canAfford)}
					>
						<img
							src={`assets/towers/${TOWER_TYPE_MAP.get(card.towerDefId) ?? card.towerDefId}.webp`}
							alt={TOWER_NAME_MAP.get(card.towerDefId) ?? card.towerDefId}
							width={32}
							height={32}
							style={{ imageRendering: 'pixelated' }}
						/>
						<span
							style={{
								fontSize: '9px',
								color: colors.text,
								fontFamily: fonts.pixel,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
								maxWidth: '100%',
							}}
						>
							{TOWER_NAME_MAP.get(card.towerDefId) ?? card.towerDefId}
						</span>
						<span
							style={{
								fontSize: '11px',
								color: canAfford ? colors.gold : colors.danger,
								fontFamily: fonts.pixel,
							}}
						>
							⚡{card.energyCost}
						</span>
					</button>
				);
			})}
		</div>
	);
}

function cardStyle(isSelected: boolean, canAfford: boolean): CSSProperties {
	return {
		flex: 1,
		minWidth: 0,
		height: '86px',
		background: colors.panel,
		border: `2px solid ${isSelected ? colors.gold : colors.border}`,
		boxShadow: isSelected
			? `0 0 8px ${colors.gold}`
			: `2px 2px 0px ${colors.border}`,
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		gap: '4px',
		cursor: 'pointer',
		opacity: canAfford ? 1 : 0.4,
		padding: 0,
		transition: 'border-color 0.15s, box-shadow 0.15s, opacity 0.2s',
	};
}
