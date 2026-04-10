import { type GachaResult, TIER_NAMES } from '@gld/shared';
import { useEffect, useState } from 'react';
import { colors, TIER_COLORS } from '../../styles/tokens';
import { cn } from '../../utils/cn';
import { PixelButton } from '../ui/PixelButton';

export interface RevealedResult extends GachaResult {
	isDuplicate: boolean;
}

export interface GachaRevealPhaseProps {
	results: RevealedResult[];
	flippedCards: Set<number>;
	allFlipped: boolean;
	onFlipCard: (index: number) => void;
	onCollect: () => void;
}

function animationForTier(tier: number, visible: boolean): string {
	if (!visible) return '';
	if (tier >= 5) return 'animate-[cardFlipInLegend_520ms_ease-out]';
	if (tier === 4) return 'animate-[cardFlipInEpic_420ms_ease-out]';
	if (tier === 3) return 'animate-[cardFlipInRare_320ms_ease-out]';
	return 'animate-[cardFlipIn_260ms_ease-out]';
}

export function GachaRevealPhase({
	results,
	flippedCards,
	allFlipped,
	onFlipCard,
	onCollect,
}: GachaRevealPhaseProps) {
	const [visibleCount, setVisibleCount] = useState(
		results.length === 1 ? 1 : 0,
	);

	// 10연 stagger 등장
	useEffect(() => {
		if (results.length === 1) return;
		setVisibleCount(0);
		const interval = setInterval(() => {
			setVisibleCount((c) => {
				if (c >= results.length) {
					clearInterval(interval);
					return c;
				}
				return c + 1;
			});
		}, 180);
		return () => clearInterval(interval);
	}, [results]);

	const allVisible = visibleCount >= results.length;

	return (
		<div className="flex flex-col items-center gap-4 w-full max-w-[320px]">
			{results.length === 1 ? (
				// 단일 공개
				<div className="flex flex-col items-center gap-3 animate-[fadeIn_500ms_ease-out]">
					<p
						className="font-pixel text-[13px]"
						style={{ color: TIER_COLORS[results[0].tier] ?? colors.text }}
					>
						{results[0].towerName}
					</p>
					<p className="font-pixel text-[11px] text-text-secondary">
						{TIER_NAMES[results[0].tier] ?? '일반'}
					</p>
					{results[0].isPityReward && (
						<span className="font-pixel text-[10px] text-gold">
							★ 천장 보장
						</span>
					)}
					{results[0].isDuplicate && (
						<span className="font-pixel text-[11px] text-text-secondary">
							보유 중 → +50G 전환
						</span>
					)}
				</div>
			) : (
				// 10연속: 스태거 등장 → 탭/전체 뒤집기
				<div className="grid grid-cols-5 gap-2 w-full">
					{results.map((r, i) => {
						const isVisible = i < visibleCount;
						return (
							<button
								key={i}
								type="button"
								disabled={!isVisible}
								onClick={() => isVisible && onFlipCard(i)}
								className={cn(
									'aspect-square border-2 flex flex-col items-center justify-center p-1',
									isVisible
										? `transition-[border-color,background-color] duration-200 ${animationForTier(r.tier, isVisible)}`
										: 'opacity-0 scale-90',
									flippedCards.has(i)
										? 'border-gold bg-gold/10'
										: 'border-border bg-panel-90 cursor-pointer',
								)}
							>
								{flippedCards.has(i) ? (
									<>
										<span
											className="font-pixel text-[8px] text-center leading-tight"
											style={{ color: TIER_COLORS[r.tier] ?? colors.text }}
										>
											{r.towerName}
										</span>
										{r.isDuplicate && (
											<span className="font-pixel text-[8px] text-text-secondary">
												+50G
											</span>
										)}
									</>
								) : (
									<span className="font-pixel text-[10px] text-text-secondary">
										?
									</span>
								)}
							</button>
						);
					})}
				</div>
			)}

			{results.length > 1 && allVisible && !allFlipped && (
				<PixelButton
					variant="secondary"
					onClick={() => {
						for (let i = 0; i < results.length; i++) {
							if (!flippedCards.has(i)) onFlipCard(i);
						}
					}}
				>
					전체 뒤집기
				</PixelButton>
			)}
			<PixelButton
				variant="gold"
				onClick={onCollect}
				style={{ opacity: allFlipped ? 1 : 0.4 }}
				disabled={!allFlipped}
			>
				수령
			</PixelButton>
		</div>
	);
}
