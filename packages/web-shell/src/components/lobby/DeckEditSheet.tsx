import { ALL_TOWERS } from '@gld/shared';
import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useMetaStore } from '../../stores/metaStore';
import { colors, fonts } from '../../styles/tokens';
import { PixelButton } from '../ui/PixelButton';

interface DeckEditSheetProps {
	open: boolean;
	onClose: () => void;
}

const TIER_LABELS: Record<number, string> = {
	1: '일반',
	2: '레어',
	3: '영웅',
	4: '전설',
	5: '신',
};

const TIER_COLORS: Record<number, string> = {
	1: colors.textSecondary,
	2: '#5bc8e8',
	3: '#c060f0',
	4: colors.gold,
	5: '#ffe870',
};

export function DeckEditSheet({ open, onClose }: DeckEditSheetProps) {
	const savedDeck = useGameStore((s) => s.selectedDeck);
	const setSelectedDeck = useGameStore((s) => s.setSelectedDeck);
	const collection = useMetaStore((s) => s.collection);
	const ownedIds = new Set(collection.map((t) => t.defId));
	const ownedTowers = ALL_TOWERS.filter((t) => ownedIds.has(t.id));
	const towersByTier = [1, 2, 3, 4, 5]
		.map((tier) => ({
			tier,
			towers: ownedTowers.filter((t) => t.tier === tier),
		}))
		.filter(({ towers }) => towers.length > 0);
	const [selected, setSelected] = useState<string[]>(
		savedDeck.filter((id) => ownedIds.has(id)),
	);

	if (!open) return null;

	const toggle = (id: string) => {
		setSelected((prev) => {
			if (prev.includes(id)) {
				return prev.filter((x) => x !== id);
			}
			if (prev.length >= 4) return prev;
			return [...prev, id];
		});
	};

	const handleConfirm = () => {
		if (selected.length === 4) {
			setSelectedDeck(selected);
		}
		onClose();
	};

	const handleClose = () => {
		setSelected(savedDeck.filter((id) => ownedIds.has(id)));
		onClose();
	};

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 200,
				display: 'flex',
				justifyContent: 'center',
				background: 'rgba(10, 8, 4, 1)',
			}}
		>
			<div
				style={{
					width: '100%',
					maxWidth: '430px',
					display: 'flex',
					flexDirection: 'column',
					background: colors.bg,
				}}
			>
				{/* Header */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						padding: '14px 16px 10px',
						borderBottom: `1px solid ${colors.border}`,
						background: colors.panel,
						flexShrink: 0,
					}}
				>
					<span
						style={{
							fontFamily: fonts.pixel,
							fontSize: '16px',
							color: colors.gold,
						}}
					>
						덱 편집
					</span>
					<button
						type="button"
						aria-label="닫기"
						onClick={handleClose}
						style={{
							background: 'none',
							border: `1px solid ${colors.border}`,
							color: colors.textSecondary,
							fontFamily: fonts.pixel,
							fontSize: '14px',
							cursor: 'pointer',
							padding: '4px 8px',
						}}
					>
						✕
					</button>
				</div>

				{/* Tower list */}
				<div
					style={{
						flex: 1,
						overflowY: 'auto',
						padding: '12px 16px',
						display: 'flex',
						flexDirection: 'column',
						gap: '16px',
					}}
				>
					{towersByTier.map(({ tier, towers }) => (
						<div key={tier}>
							<div
								style={{
									fontFamily: fonts.pixel,
									fontSize: '12px',
									color: TIER_COLORS[tier],
									marginBottom: '8px',
									letterSpacing: '1px',
								}}
							>
								T{tier} {TIER_LABELS[tier]}
							</div>
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(2, 1fr)',
									gap: '6px',
								}}
							>
								{towers.map((tower) => {
									const isSelected = selected.includes(tower.id);
									const slotNum = selected.indexOf(tower.id) + 1;
									const isFull = selected.length >= 4 && !isSelected;

									return (
										<button
											key={tower.id}
											type="button"
											onClick={() => !isFull && toggle(tower.id)}
											style={{
												position: 'relative',
												display: 'flex',
												alignItems: 'center',
												gap: '8px',
												padding: '8px 10px',
												background: isSelected
													? 'rgba(240,208,96,0.12)'
													: colors.panel,
												border: `2px solid ${isSelected ? colors.gold : colors.border}`,
												boxShadow: isSelected
													? `0 0 6px rgba(240,208,96,0.3)`
													: 'none',
												cursor: isFull ? 'not-allowed' : 'pointer',
												opacity: isFull ? 0.35 : 1,
												textAlign: 'left',
											}}
										>
											{isSelected && (
												<span
													style={{
														position: 'absolute',
														top: 3,
														right: 5,
														fontFamily: fonts.pixel,
														fontSize: '12px',
														color: colors.gold,
													}}
												>
													{slotNum}
												</span>
											)}
											<img
												src={`assets/towers/${tower.type}.webp`}
												alt={tower.name}
												width={28}
												height={28}
												style={{
													imageRendering: 'pixelated',
													flexShrink: 0,
												}}
											/>
											<div
												style={{
													display: 'flex',
													flexDirection: 'column',
													gap: '2px',
													minWidth: 0,
												}}
											>
												<span
													style={{
														fontFamily: fonts.pixel,
														fontSize: '12px',
														color: isSelected ? colors.gold : colors.text,
														whiteSpace: 'nowrap',
														overflow: 'hidden',
														textOverflow: 'ellipsis',
													}}
												>
													{tower.name}
												</span>
												<span
													style={{
														fontFamily: fonts.pixel,
														fontSize: '11px',
														color: colors.textSecondary,
													}}
												>
													⚡{tower.cost}
												</span>
											</div>
										</button>
									);
								})}
							</div>
						</div>
					))}
				</div>

				{/* Bottom preview + confirm */}
				<div
					style={{
						flexShrink: 0,
						padding: '12px 16px',
						background: colors.panel,
						borderTop: `2px solid ${colors.border}`,
						display: 'flex',
						flexDirection: 'column',
						gap: '10px',
					}}
				>
					{/* 4 slot preview */}
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(4, 1fr)',
							gap: '6px',
						}}
					>
						{Array.from({ length: 4 }, (_, i) => {
							const towerId = selected[i];
							const tower = towerId
								? ALL_TOWERS.find((t) => t.id === towerId)
								: null;
							return (
								<div
									key={i}
									style={{
										height: '52px',
										border: `2px solid ${tower ? colors.gold : colors.border}`,
										background: tower
											? 'rgba(240,208,96,0.08)'
											: 'rgba(42,32,16,0.6)',
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										justifyContent: 'center',
										gap: '4px',
										padding: '4px',
									}}
								>
									{tower ? (
										<>
											<img
												src={`assets/towers/${tower.type}.webp`}
												alt={tower.name}
												width={24}
												height={24}
												style={{ imageRendering: 'pixelated' }}
											/>
											<span
												style={{
													fontFamily: fonts.pixel,
													fontSize: '10px',
													color: colors.gold,
													textAlign: 'center',
													overflow: 'hidden',
													maxWidth: '100%',
													whiteSpace: 'nowrap',
													textOverflow: 'ellipsis',
												}}
											>
												{tower.name}
											</span>
										</>
									) : (
										<span
											style={{
												fontFamily: fonts.pixel,
												fontSize: '12px',
												color: colors.border,
											}}
										>
											{i + 1}
										</span>
									)}
								</div>
							);
						})}
					</div>

					<PixelButton
						variant="gold"
						disabled={selected.length !== 4}
						onClick={handleConfirm}
						style={{ width: '100%', fontSize: '14px', padding: '12px' }}
					>
						확인 ({selected.length}/4)
					</PixelButton>
				</div>
			</div>
		</div>
	);
}
