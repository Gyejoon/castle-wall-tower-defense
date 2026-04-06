import {
	GACHA_COSTS,
	type GachaResult,
	PITY_THRESHOLD,
	TIER_NAMES,
} from '@gld/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useMetaStore } from '../stores/metaStore';
import { colors } from '../styles/tokens';
import { cn } from '../utils/cn';
import { PixelButton } from './ui/PixelButton';

type BoxType = 'free' | 'ad' | 'diamond_single' | 'diamond_ten';

interface RevealedResult extends GachaResult {
	isDuplicate: boolean;
}

const TIER_COLORS: Record<number, string> = {
	1: colors.text,
	2: '#5bc8e8',
	3: '#9060e0',
	4: '#f0d060',
	5: '#ff6b4a',
};

export function GachaScreen({ onClose }: { onClose: () => void }) {
	const diamond = useMetaStore((s) => s.profile.diamond);
	const pityCount = useMetaStore((s) => s.progress.gachaPityCount);
	const dailyFreeBoxClaimedAt = useMetaStore(
		(s) => s.progress.dailyFreeBoxClaimedAt,
	);
	const dailyAdBoxCount = useMetaStore((s) => s.progress.dailyAdBoxCount);
	const openGacha = useMetaStore((s) => s.openGacha);
	const collection = useMetaStore((s) => s.collection);
	const collectionIds = collection.map((t) => t.defId);
	const setLobbyTab = useGameStore((s) => s.setLobbyTab);
	const setRunStatus = useGameStore((s) => s.setRunStatus);

	const gachaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (gachaTimerRef.current) clearTimeout(gachaTimerRef.current);
		};
	}, []);

	const [selectedBox, setSelectedBox] = useState<BoxType>('free');
	const [is10Pull, setIs10Pull] = useState(false);
	const [phase, setPhase] = useState<'select' | 'opening' | 'reveal'>('select');
	const [results, setResults] = useState<RevealedResult[]>([]);
	const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	// 쿨다운/한도 체크
	const isFreeOnCooldown =
		!!dailyFreeBoxClaimedAt &&
		Date.now() - new Date(dailyFreeBoxClaimedAt).getTime() <
			GACHA_COSTS.free.cooldownMs;
	const isAdLimitReached = dailyAdBoxCount >= GACHA_COSTS.ad.dailyLimit;
	const isTenPullDisabled = diamond < GACHA_COSTS.diamond_ten.diamond;

	const handleOpen = useCallback(() => {
		const boxType: BoxType = is10Pull ? 'diamond_ten' : selectedBox;
		setPhase('opening');
		setErrorMsg(null);

		// 컬렉션 스냅샷 캡처 (openGacha 호출 전)
		const currentCollectionSnapshot = new Set(collectionIds);

		gachaTimerRef.current = setTimeout(() => {
			gachaTimerRef.current = null;
			const res = openGacha(boxType);
			if (typeof res === 'string') {
				setPhase('select');
				if (res === 'no_diamond') setErrorMsg('다이아몬드가 부족합니다');
				else if (res === 'cooldown') setErrorMsg('쿨다운 중입니다');
				else if (res === 'daily_limit')
					setErrorMsg('오늘 광고 상자를 모두 사용했습니다');
				return;
			}
			const revealedResults: RevealedResult[] = res.map((r) => ({
				...r,
				isDuplicate: currentCollectionSnapshot.has(r.towerId),
			}));
			setResults(revealedResults);
			setFlippedCards(res.length === 1 ? new Set([0]) : new Set());
			setPhase('reveal');
		}, 1000);
	}, [selectedBox, is10Pull, openGacha, collectionIds]);

	const handleCollect = useCallback(() => {
		setPhase('select');
		setResults([]);
		setFlippedCards(new Set());
		setErrorMsg(null);
	}, []);

	const handleGoToMissions = useCallback(() => {
		onClose();
		setRunStatus('lobby');
		setLobbyTab('missions');
	}, [onClose, setLobbyTab, setRunStatus]);

	const allFlipped = results.length > 0 && flippedCards.size === results.length;

	return (
		<div className="fixed inset-0 z-10 bg-[rgba(10,8,4,0.92)] flex flex-col items-center justify-start pt-8 gap-4 p-5 overflow-auto">
			<h2 className="text-gold font-pixel text-lg">소환의 제단</h2>

			{/* Amendment G: Pity 진행 바 */}
			<div className="w-full max-w-[320px]">
				<div className="flex justify-between items-center mb-1">
					<span className="font-pixel text-[10px] text-text-secondary">
						전설 보장
					</span>
					<span className="font-pixel text-[10px] text-gold">
						{pityCount}/{PITY_THRESHOLD}
					</span>
				</div>
				<div className="w-full h-1.5 bg-border rounded-[1px] overflow-hidden">
					<div
						className="h-full bg-gold transition-[width] duration-300"
						style={{ width: `${(pityCount / PITY_THRESHOLD) * 100}%` }}
					/>
				</div>
			</div>

			{phase === 'opening' && (
				<div className="w-[120px] h-[120px] flex items-center justify-center">
					<div className="w-16 h-16 border-4 border-gold animate-spin rounded-full" />
				</div>
			)}

			{phase === 'reveal' && results.length > 0 && (
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
						// 10연차: 카드 뒷면 → 탭하여 공개 (Amendment J)
						<div className="grid grid-cols-5 gap-2 w-full">
							{results.map((r, i) => (
								<button
									key={i}
									type="button"
									onClick={() =>
										setFlippedCards((prev) => new Set([...prev, i]))
									}
									className={cn(
										'aspect-square border-2 flex flex-col items-center justify-center p-1 transition-all duration-200',
										flippedCards.has(i)
											? 'border-gold bg-[rgba(240,208,96,0.1)]'
											: 'border-border bg-[rgba(42,32,16,0.9)] cursor-pointer',
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
						onClick={handleCollect}
						style={{ opacity: allFlipped ? 1 : 0.4 }}
						disabled={!allFlipped}
					>
						수령
					</PixelButton>
				</div>
			)}

			{phase === 'select' && (
				<>
					{/* 에러/no_diamond 메시지 (Amendment L) */}
					{errorMsg && (
						<div className="text-center">
							<p className="font-pixel text-xs text-error">{errorMsg}</p>
							{errorMsg.includes('다이아') && (
								<button
									type="button"
									onClick={handleGoToMissions}
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
								<div
									key={id}
									onClick={() => {
										if (!isDisabled) {
											setSelectedBox(id);
											setIs10Pull(false);
										}
									}}
									className={cn(
										'p-2 border-2 text-center',
										isDisabled
											? 'border-border bg-[rgba(20,14,6,0.8)] cursor-not-allowed'
											: selectedBox === id && !is10Pull
												? 'border-gold bg-[rgba(240,208,96,0.1)] cursor-pointer'
												: 'border-border bg-[rgba(42,32,16,0.9)] cursor-pointer',
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
											{GACHA_COSTS[id].diamond} 💎
										</p>
									) : (
										<p className="font-pixel text-[11px] text-text-secondary">
											무료
										</p>
									)}
								</div>
							);
						})}
						{/* 10연차 버튼 (diamond_ten) */}
						<div
							onClick={() => {
								if (!isTenPullDisabled) {
									setIs10Pull(true);
									setSelectedBox('diamond_single');
								}
							}}
							className={cn(
								'p-2 border-2 text-center',
								isTenPullDisabled
									? 'border-border bg-[rgba(20,14,6,0.8)] cursor-not-allowed'
									: is10Pull
										? 'border-gold bg-[rgba(240,208,96,0.1)] cursor-pointer'
										: 'border-border bg-[rgba(42,32,16,0.9)] cursor-pointer',
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
								<p className="font-pixel text-[10px] text-error/70">
									다이아 부족
								</p>
							) : (
								<p className="font-pixel text-[11px] text-gold">
									{GACHA_COSTS.diamond_ten.diamond} 💎
								</p>
							)}
						</div>
					</div>

					{/* 다이아몬드 잔액 */}
					<p className="font-pixel text-xs text-gold">보유: {diamond} 💎</p>

					{/* 열기/닫기 버튼 */}
					<div className="flex gap-2">
						<PixelButton
							variant="gold"
							onClick={handleOpen}
							disabled={
								(is10Pull && isTenPullDisabled) ||
								(!is10Pull && selectedBox === 'free' && isFreeOnCooldown) ||
								(!is10Pull && selectedBox === 'ad' && isAdLimitReached) ||
								(!is10Pull &&
									selectedBox === 'diamond_single' &&
									diamond < GACHA_COSTS.diamond_single.diamond)
							}
						>
							열기
						</PixelButton>
						<PixelButton variant="secondary" onClick={onClose}>
							닫기
						</PixelButton>
					</div>
				</>
			)}
		</div>
	);
}
