import { ALL_TOWERS } from '@gld/shared';
import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useMetaStore } from '../../stores/metaStore';
import { colors } from '../../styles/tokens';
import { cn } from '../../utils/cn';
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
		<div className="fixed inset-0 z-200 flex justify-center bg-[rgba(10,8,4,1)]">
			<div className="w-full max-w-[430px] flex flex-col bg-bg">
				{/* Header */}
				<div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-border bg-panel shrink-0">
					<span className="font-pixel text-base text-gold">덱 편집</span>
					<button
						type="button"
						aria-label="닫기"
						onClick={handleClose}
						className="bg-transparent border border-border text-text-secondary font-pixel text-sm cursor-pointer px-2 py-1 min-h-[44px] min-w-[44px]"
					>
						✕
					</button>
				</div>

				{/* Tower list */}
				<div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
					{towersByTier.map(({ tier, towers }) => (
						<div key={tier}>
							<div
								className="font-pixel text-xs mb-2 tracking-[1px]"
								style={{ color: TIER_COLORS[tier] }}
							>
								T{tier} {TIER_LABELS[tier]}
							</div>
							<div className="grid grid-cols-2 gap-1.5">
								{towers.map((tower) => {
									const isSelected = selected.includes(tower.id);
									const slotNum = selected.indexOf(tower.id) + 1;
									const isFull = selected.length >= 4 && !isSelected;

									return (
										<button
											key={tower.id}
											type="button"
											onClick={() => !isFull && toggle(tower.id)}
											className={cn(
												'relative flex items-center gap-2 px-2.5 py-2 border-2 text-left',
												isSelected
													? 'bg-[rgba(240,208,96,0.12)] border-gold shadow-[0_0_6px_rgba(240,208,96,0.3)]'
													: 'bg-panel border-border shadow-none',
												isFull
													? 'cursor-not-allowed opacity-35'
													: 'cursor-pointer opacity-100',
											)}
										>
											{isSelected && (
												<span className="absolute top-[3px] right-[5px] font-pixel text-xs text-gold">
													{slotNum}
												</span>
											)}
											<img
												src={`assets/towers/${tower.type}.webp`}
												alt={tower.name}
												width={28}
												height={28}
												className="[image-rendering:pixelated] shrink-0"
											/>
											<div className="flex flex-col gap-0.5 min-w-0">
												<span
													className={cn(
														'font-pixel text-xs whitespace-nowrap overflow-hidden text-ellipsis',
														isSelected ? 'text-gold' : 'text-text',
													)}
												>
													{tower.name}
												</span>
												<span className="font-pixel text-[11px] text-text-secondary">
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
				<div className="shrink-0 px-4 py-3 bg-panel border-t-2 border-border flex flex-col gap-2.5">
					{/* 4 slot preview */}
					<div className="grid grid-cols-4 gap-1.5">
						{Array.from({ length: 4 }, (_, i) => {
							const towerId = selected[i];
							const tower = towerId
								? ALL_TOWERS.find((t) => t.id === towerId)
								: null;
							return (
								<div
									key={i}
									className={cn(
										'h-[52px] border-2 flex flex-col items-center justify-center gap-1 p-1',
										tower
											? 'border-gold bg-[rgba(240,208,96,0.08)]'
											: 'border-border bg-[rgba(42,32,16,0.6)]',
									)}
								>
									{tower ? (
										<>
											<img
												src={`assets/towers/${tower.type}.webp`}
												alt={tower.name}
												width={24}
												height={24}
												className="[image-rendering:pixelated]"
											/>
											<span className="font-pixel text-[10px] text-gold text-center overflow-hidden max-w-full whitespace-nowrap text-ellipsis">
												{tower.name}
											</span>
										</>
									) : (
										<span className="font-pixel text-xs text-border">
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
