import { GACHA_COSTS, PITY_THRESHOLD } from '@gld/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useMetaStore } from '../stores/metaStore';
import type { RevealedResult } from './gacha/GachaRevealPhase';
import { GachaRevealPhase } from './gacha/GachaRevealPhase';
import { GachaSelectPhase } from './gacha/GachaSelectPhase';

type BoxType = 'free' | 'ad' | 'diamond_single' | 'diamond_ten';

export function GachaScreen({ onClose }: { onClose: () => void }) {
	const diamond = useMetaStore((s) => s.profile.diamond);
	const pityCount = useMetaStore((s) => s.progress.gachaPityCount);
	const dailyFreeBoxClaimedAt = useMetaStore(
		(s) => s.progress.dailyFreeBoxClaimedAt,
	);
	const dailyAdBoxCount = useMetaStore((s) => s.progress.dailyAdBoxCount);
	const openGacha = useMetaStore((s) => s.openGacha);
	const collection = useMetaStore((s) => s.collection);
	const collectionIds = useMemo(
		() => collection.map((t) => t.defId),
		[collection],
	);
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
			const seenInBatch = new Set(currentCollectionSnapshot);
			const revealedResults: RevealedResult[] = res.map((r) => {
				const isDuplicate = seenInBatch.has(r.towerId);
				if (!isDuplicate) seenInBatch.add(r.towerId);
				return { ...r, isDuplicate };
			});
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

	const isOpenDisabled =
		(is10Pull && isTenPullDisabled) ||
		(!is10Pull && selectedBox === 'free' && isFreeOnCooldown) ||
		(!is10Pull && selectedBox === 'ad' && isAdLimitReached) ||
		(!is10Pull &&
			selectedBox === 'diamond_single' &&
			diamond < GACHA_COSTS.diamond_single.diamond);

	return (
		<div className="fixed inset-0 z-10 bg-overlay-heavy flex flex-col items-center justify-start pt-8 gap-4 p-5 overflow-auto">
			<h2 className="text-gold font-pixel text-lg">소환의 제단</h2>

			{/* Pity 진행 바 */}
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
				<div className="flex flex-col items-center justify-center gap-3">
					<div
						className="flex h-16 w-16 items-center justify-center border-2 border-gold text-[28px] animate-[gachaPulse_0.8s_ease-in-out_infinite]"
						style={{ background: 'rgba(240,208,96,0.12)' }}
					>
						🗝️
					</div>
					<span className="font-pixel text-[10px] text-gold animate-pulse">
						개봉 중...
					</span>
				</div>
			)}

			{phase === 'reveal' && results.length > 0 && (
				<GachaRevealPhase
					results={results}
					flippedCards={flippedCards}
					allFlipped={allFlipped}
					onFlipCard={(i) => setFlippedCards((prev) => new Set([...prev, i]))}
					onCollect={handleCollect}
				/>
			)}

			{phase === 'select' && (
				<GachaSelectPhase
					selectedBox={selectedBox}
					is10Pull={is10Pull}
					diamond={diamond}
					isFreeOnCooldown={isFreeOnCooldown}
					isAdLimitReached={isAdLimitReached}
					isTenPullDisabled={isTenPullDisabled}
					errorMsg={errorMsg}
					onSelectBox={(box) => setSelectedBox(box)}
					onSetIs10Pull={setIs10Pull}
					onOpen={handleOpen}
					onClose={onClose}
					onGoToMissions={handleGoToMissions}
					isOpenDisabled={isOpenDisabled}
				/>
			)}
		</div>
	);
}
