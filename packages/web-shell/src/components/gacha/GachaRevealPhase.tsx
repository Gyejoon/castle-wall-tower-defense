import { TIER_NAMES, type GachaResult } from '@gld/shared';
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

export function GachaRevealPhase({
	results,
	flippedCards,
	allFlipped,
	onFlipCard,
	onCollect,
}: GachaRevealPhaseProps) {
	return (
		<div className="flex flex-col items-center gap-4 w-full max-w-[320px]">
			{results.length === 1 ? (
				// 1연차 공개
				<div className="flex flex-col items-center gap-3 animate-[fadeIn_500ms_ease-out]">
					<p
						className="font-pixel text-sm"
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
				// 10연차: 카드 뒷면 → 탭하여 공개
				<div className="grid grid-cols-5 gap-2 w-full">
					{results.map((r, i) => (
						<button
							key={`${r.towerId}-${i}`}
							type="button"
							onClick={() => onFlipCard(i)}
							className={cn(
								'aspect-square border-2 flex flex-col items-center justify-center p-1 transition-all duration-200',
								flippedCards.has(i)
									? 'border-gold bg-[rgba(240,208,96,0.1)]'
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
										<span className="font-pixel text-[7px] text-text-secondary">
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
					))}
				</div>
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
