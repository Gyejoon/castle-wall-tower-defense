import { GACHA_COSTS } from '@gld/shared';
import { cn } from '../../utils/cn';
import { DiamondIcon } from '../ui/CurrencyIcon';
import { PixelButton } from '../ui/PixelButton';

export interface GachaSelectPhaseProps {
	selectedBox: 'free' | 'ad' | 'diamond_single' | 'diamond_ten';
	is10Pull: boolean;
	diamond: number;
	isFreeOnCooldown: boolean;
	isAdLimitReached: boolean;
	isTenPullDisabled: boolean;
	errorMsg: string | null;
	onSelectBox: (box: 'free' | 'ad' | 'diamond_single') => void;
	onSetIs10Pull: (value: boolean) => void;
	onOpen: () => void;
	onClose: () => void;
	onGoToMissions: () => void;
	isOpenDisabled: boolean;
}

export function GachaSelectPhase({
	selectedBox,
	is10Pull,
	diamond,
	isFreeOnCooldown,
	isAdLimitReached,
	isTenPullDisabled,
	errorMsg,
	onSelectBox,
	onSetIs10Pull,
	onOpen,
	onClose,
	onGoToMissions,
	isOpenDisabled,
}: GachaSelectPhaseProps) {
	return (
		<>
			{/* 에러/no_diamond 메시지 */}
			{errorMsg && (
				<div className="text-center">
					<p className="font-pixel text-xs text-error">{errorMsg}</p>
					{errorMsg.includes('다이아') && (
						<button
							type="button"
							onClick={onGoToMissions}
							className="font-pixel text-[11px] text-gold underline mt-1"
						>
							임무에서 획득 →
						</button>
					)}
				</div>
			)}

			{/* 상자 선택 */}
			<div className="grid grid-cols-2 gap-3 w-full max-w-[320px]">
				{(['free', 'ad', 'diamond_single'] as const).map((id) => {
					const isDisabled =
						(id === 'free' && isFreeOnCooldown) ||
						(id === 'ad' && isAdLimitReached) ||
						(id === 'diamond_single' &&
							diamond < GACHA_COSTS.diamond_single.diamond);
					const disabledReason =
						id === 'free' && isFreeOnCooldown
							? '쿨다운 중'
							: id === 'ad' && isAdLimitReached
								? '오늘 한도 초과'
								: id === 'diamond_single' &&
										diamond < GACHA_COSTS.diamond_single.diamond
									? '다이아 부족'
									: null;
					const label =
						id === 'free'
							? '무료 상자'
							: id === 'ad'
								? '광고 상자'
								: '다이아 상자';

					return (
						<button
							type="button"
							key={id}
							disabled={isDisabled}
							onClick={() => {
								onSelectBox(id);
								onSetIs10Pull(false);
							}}
							className={cn(
								'p-2 border-2 text-center',
								isDisabled
									? 'border-border bg-[rgba(20,14,6,0.8)] cursor-not-allowed'
									: selectedBox === id && !is10Pull
										? 'border-gold bg-[rgba(240,208,96,0.1)] cursor-pointer'
										: 'border-border bg-panel-90 cursor-pointer',
							)}
						>
							<p
								className={cn(
									'font-pixel text-xs',
									isDisabled ? 'text-text-secondary' : 'text-text',
								)}
							>
								{label}
							</p>
							{disabledReason ? (
								<p className="font-pixel text-[10px] text-error/70">
									{disabledReason}
								</p>
							) : GACHA_COSTS[id].diamond > 0 ? (
								<p className="font-pixel text-[11px] text-gold">
									{GACHA_COSTS[id].diamond} <DiamondIcon />
								</p>
							) : (
								<p className="font-pixel text-[11px] text-text-secondary">
									무료
								</p>
							)}
						</button>
					);
				})}
				{/* 10연차 버튼 (diamond_ten) */}
				<button
					type="button"
					disabled={isTenPullDisabled}
					onClick={() => {
						onSetIs10Pull(true);
						onSelectBox('diamond_single');
					}}
					className={cn(
						'p-2 border-2 text-center',
						isTenPullDisabled
							? 'border-border bg-[rgba(20,14,6,0.8)] cursor-not-allowed'
							: is10Pull
								? 'border-gold bg-[rgba(240,208,96,0.1)] cursor-pointer'
								: 'border-border bg-panel-90 cursor-pointer',
					)}
				>
					<p
						className={cn(
							'font-pixel text-xs',
							isTenPullDisabled ? 'text-text-secondary' : 'text-text',
						)}
					>
						10연차
					</p>
					{isTenPullDisabled ? (
						<p className="font-pixel text-[10px] text-error/70">다이아 부족</p>
					) : (
						<p className="font-pixel text-[11px] text-gold">
							{GACHA_COSTS.diamond_ten.diamond} <DiamondIcon />
						</p>
					)}
				</button>
			</div>

			{/* 다이아몬드 잔액 */}
			<p className="font-pixel text-xs text-gold">
				보유: {diamond} <DiamondIcon />
			</p>

			{/* 열기/닫기 버튼 */}
			<div className="flex gap-2">
				<PixelButton variant="gold" onClick={onOpen} disabled={isOpenDisabled}>
					열기
				</PixelButton>
				<PixelButton variant="secondary" onClick={onClose}>
					닫기
				</PixelButton>
			</div>
		</>
	);
}
