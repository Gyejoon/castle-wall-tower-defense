import { ALL_TOWERS } from '@gld/shared';
import { useMemo, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useMetaStore } from '../../stores/metaStore';
import { colors, TIER_LABELS } from '../../styles/tokens';
import { cn } from '../../utils/cn';
import { CloseButton } from '../ui/CloseButton';
import { PixelButton } from '../ui/PixelButton';

interface DeckEditSheetProps {
	open: boolean;
	onClose: () => void;
}

/** 덱 편집 맥락용 서브톤 티어 색상 (가차 공개보다 절제된 톤) */
const DECK_TIER_COLORS: Record<number, string> = {
	1: colors.textSecondary,
	2: colors.info,
	3: colors.gradeUnique,
	4: colors.gold,
	5: colors.tierBright,
};

export function DeckEditSheet({ open, onClose }: DeckEditSheetProps) {
	const savedDeck = useGameStore((s) => s.selectedDeck);
	const setSelectedDeck = useGameStore((s) => s.setSelectedDeck);
	const collection = useMetaStore((s) => s.collection);
	const ownedIds = useMemo(
		() => new Set(collection.map((t) => t.defId)),
		[collection],
	);
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
					<CloseButton onClick={handleClose} />
				</div>

				{/* === 상단 고정: 4슬롯 프리뷰 === */}
				<div className="shrink-0 px-4 py-3 bg-panel border-b-2 border-border">
					<div className="grid grid-cols-4 gap-2">
						{Array.from({ length: 4 }, (_, i) => {
							const towerId = selected[i];
							const tower = towerId
								? ALL_TOWERS.find((t) => t.id === towerId)
								: null;
							return (
								<div
									key={i}
									className={cn(
										'relative min-h-[64px] border-2 flex flex-col items-center justify-center gap-1 py-1.5 px-1',
										tower
											? 'border-gold bg-[rgba(240,208,96,0.08)]'
											: 'border-dashed border-border bg-[rgba(42,32,16,0.6)]',
									)}
								>
									{tower ? (
										<>
											<button
												type="button"
												aria-label={`${tower.name} 슬롯에서 제거`}
												onClick={(e) => {
													e.stopPropagation();
													setSelected((prev) =>
														prev.filter((x) => x !== tower.id),
													);
												}}
												className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center bg-danger border-2 border-bg font-pixel text-[10px] text-text hover:brightness-125 active:scale-90 transition-transform cursor-pointer"
											>
												×
											</button>
											<img
												src={`assets/towers/${tower.type}.webp`}
												alt={tower.name}
												width={28}
												height={28}
												className="[image-rendering:pixelated] shrink-0"
											/>
											<span className="font-pixel text-[9px] leading-tight text-gold text-center w-full truncate">
												{tower.name}
											</span>
										</>
									) : (
										<span className="font-pixel text-base text-border">
											{i + 1}
										</span>
									)}
								</div>
							);
						})}
					</div>
					<p className="mt-2 font-pixel text-[9px] text-text-secondary text-center">
						× 버튼으로 제거 · 하단에서 타워 선택
					</p>
				</div>

				{/* === 하단 스크롤: 소유 타워 리스트 === */}
				<div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
					{towersByTier.map(({ tier, towers }) => (
						<div key={tier}>
							<div
								className="font-pixel text-xs mb-2 tracking-[1px]"
								style={{ color: DECK_TIER_COLORS[tier] }}
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
												'relative flex items-center gap-2 px-2.5 py-2 border-2 text-left transition-transform',
												isSelected
													? 'bg-[rgba(240,208,96,0.12)] border-gold shadow-[0_0_6px_rgba(240,208,96,0.3)]'
													: 'bg-panel border-border',
												isFull
													? 'cursor-not-allowed opacity-35'
													: 'cursor-pointer opacity-100 active:scale-[0.98]',
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
													<span className="inline-flex items-center gap-[2px]">
														<img
															src="assets/ui/icon-energy.webp"
															alt=""
															width={10}
															height={10}
															className="[image-rendering:pixelated]"
														/>
														{tower.cost}
													</span>
												</span>
											</div>
										</button>
									);
								})}
							</div>
						</div>
					))}
				</div>

				{/* === 하단 고정: 확인 버튼 === */}
				<div className="shrink-0 px-4 py-3 bg-panel border-t-2 border-border">
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
