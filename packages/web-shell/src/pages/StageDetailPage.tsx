import {
	ALL_TOWERS,
	getMapPaths,
	getMaxGoldForMap,
	getMaxXpForMap,
	getTotalWavesForMap,
	getWavesForMap,
	MAP_REGISTRY,
	STAR_DIFFICULTY,
	type StarRating,
} from '@gld/shared';
import { lazy, Suspense, useEffect, useState } from 'react';
import { PixelButton } from '../components/ui/PixelButton';
import { useGameStore } from '../stores/gameStore';
import { useMetaStore } from '../stores/metaStore';

const DeckEditSheet = lazy(() =>
	import('../components/lobby/DeckEditSheet').then((m) => ({
		default: m.DeckEditSheet,
	})),
);

function isStarUnlocked(
	star: StarRating,
	mapId: string,
	stageStarsMap: Record<string, number>,
): boolean {
	if (star === 1) return true;
	if (star === 2) return (stageStarsMap[mapId] ?? 0) >= 1;
	return (stageStarsMap[mapId] ?? 0) >= 2;
}

const STAR_COLORS = {
	1: {
		bg: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
		border: 'var(--color-success)',
		text: 'var(--color-success)',
	},
	2: {
		bg: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
		border: 'var(--color-accent)',
		text: 'var(--color-accent)',
	},
	3: {
		bg: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
		border: 'var(--color-danger)',
		text: 'var(--color-danger)',
	},
} as const;

const MAP_THEMES: Record<string, { gradient: string; thumb: string }> = {
	forest_gate: {
		gradient: 'linear-gradient(135deg, #2d5a1e, #1a3a10)',
		thumb: 'assets/ui/stage-thumb-forest_gate.webp',
	},
	lava_fortress: {
		gradient: 'linear-gradient(135deg, #8a2a0a, #5a1a08)',
		thumb: 'assets/ui/stage-thumb-lava_fortress.webp',
	},
	storm_citadel: {
		gradient: 'linear-gradient(135deg, #2a3a6a, #1a2848)',
		thumb: 'assets/ui/stage-thumb-storm_citadel.webp',
	},
};

export function StageDetailPage() {
	const selectedMapId = useGameStore((s) => s.selectedMapId);
	const selectedStageId = useGameStore((s) => s.selectedStageId);
	const enterStageSelect = useGameStore((s) => s.enterStageSelect);
	const resetRun = useGameStore((s) => s.resetRun);
	const selectedDeck = useGameStore((s) => s.selectedDeck);
	const highestWave = useMetaStore((s) => s.progress.highestWave);
	const selectedStar = useGameStore((s) => s.selectedStar);
	const setSelectedStar = useGameStore((s) => s.setSelectedStar);
	const stageStars = useMetaStore((s) => s.progress.stageStars);
	const [showDeckEdit, setShowDeckEdit] = useState(false);

	// Guard: reset selectedStar if locked on current map
	const highestStar = (stageStars[selectedStageId] ?? 0) as 0 | 1 | 2 | 3;
	const maxUnlocked: StarRating =
		highestStar >= 2 ? 3 : highestStar >= 1 ? 2 : 1;
	useEffect(() => {
		if (selectedStar > maxUnlocked) {
			setSelectedStar(maxUnlocked);
		}
	}, [selectedStar, maxUnlocked, setSelectedStar]);

	const map = MAP_REGISTRY[selectedMapId];
	if (!map) return null;

	const theme = MAP_THEMES[selectedMapId] ?? { gradient: '#2a2010', thumb: '' };
	const maxXp = getMaxXpForMap(selectedMapId, selectedStar);
	const maxGold = getMaxGoldForMap(selectedMapId, selectedStar);
	const totalWaves = getTotalWavesForMap(selectedMapId);
	const waves = getWavesForMap(selectedMapId);
	const hasBoss = waves.some((w) => w.kind === 'boss');
	const lanes = getMapPaths(map).length;
	const starKey =
		selectedStar > 1 ? `${selectedMapId}:${selectedStar}` : selectedMapId;
	const best = highestWave[starKey] ?? 0;
	const isCleared = best >= totalWaves;
	const lvl = map.unlockLevel ?? 1;

	const infoCards = [
		{
			label: '최대 경험치',
			value: `${maxXp} XP`,
			sub: `★${selectedStar} 기준`,
		},
		{
			label: '최대 골드',
			value: `~${maxGold} G`,
			sub: `★${selectedStar} 기준`,
		},
		{
			label: '웨이브',
			value: `${totalWaves}`,
			sub: hasBoss ? '보스 포함' : '보스 없음',
		},
		{
			label: '경로',
			value: `${lanes} 레인`,
			sub: lanes === 1 ? '단일 경로' : '분기 경로',
		},
	];

	return (
		<div className="flex h-full w-full justify-center bg-bg">
			<div className="flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-bg shadow-[0_0_40px_rgba(0,0,0,0.5)]">
				{/* Header */}
				<div className="relative flex items-center justify-center px-3 py-4 bg-panel border-b-2 border-border z-10">
					<button
						type="button"
						className="absolute left-3 font-pixel text-[10px] text-accent cursor-pointer hover:text-gold transition-colors"
						onClick={enterStageSelect}
					>
						<span className="inline-flex items-center gap-1">
							<img
								src="assets/ui/icon-arrow-left.webp"
								alt=""
								width={10}
								height={10}
								className="[image-rendering:pixelated]"
							/>
							월드맵
						</span>
					</button>
					<span className="absolute left-1/2 -translate-x-1/2 font-pixel text-base text-gold">
						스테이지 정보
					</span>
				</div>

				{/* Scrollable content */}
				<div className="flex-1 min-h-0 overflow-auto flex flex-col">
					{/* Hero */}
					<div className="relative h-[140px] overflow-hidden flex-shrink-0">
						<img
							src={theme.thumb}
							alt={map.name}
							className="absolute inset-0 w-full h-full object-cover scale-150"
						/>
						<div
							className="absolute inset-0"
							style={{
								background:
									'linear-gradient(to bottom, rgba(26,18,8,0.3) 0%, rgba(26,18,8,0.6) 60%, #1a1208 100%)',
							}}
						/>
						<span className="absolute bottom-3 left-4 font-pixel text-[15px] text-text z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
							{map.name}
						</span>
						<div className="absolute bottom-2 right-4 flex flex-col items-end gap-1 z-10">
							<span className="font-pixel text-[10px] text-accent bg-[rgba(26,18,8,0.85)] px-2 py-0.5 border border-border">
								진입 가능 레벨: Lv.{lvl}
							</span>
							<span className="font-pixel text-[10px] text-text bg-[rgba(26,18,8,0.85)] px-2 py-0.5 border border-border inline-flex items-center gap-1">
								<img
									src="assets/ui/icon-sword.webp"
									alt=""
									width={10}
									height={10}
									className="[image-rendering:pixelated]"
								/>
								<span className="text-text-secondary">권장 전투력</span>
								{Math.round(
									map.recommendedPower * STAR_DIFFICULTY[selectedStar].hp,
								).toLocaleString()}
							</span>
						</div>
					</div>

					{/* Info cards 2x2 */}
					<div className="grid grid-cols-2 gap-2 p-3">
						{infoCards.map((card) => (
							<div
								key={card.label}
								className="bg-panel border border-border p-2 text-center"
							>
								<p className="font-pixel text-[7px] text-text-secondary uppercase tracking-wider">
									{card.label}
								</p>
								<p className="font-pixel text-[11px] text-gold mt-1 transition-all duration-200">
									{card.value}
								</p>
								<p className="font-pixel text-[6px] text-text-secondary mt-0.5">
									{card.sub}
								</p>
							</div>
						))}
					</div>

					{/* Clear record */}
					<div className="px-3 pb-3">
						<p className="font-pixel text-[10px] text-text-secondary uppercase tracking-wider mb-2">
							클리어 기록
						</p>
						<div className="flex items-center gap-2">
							<div className="flex-1 h-[12px] bg-panel border border-border relative">
								{best > 0 && (
									<div
										className="h-full"
										style={{
											width: `${Math.max(2, (best / totalWaves) * 100)}%`,
											background: 'linear-gradient(90deg, #c8a04a, #f0d060)',
										}}
									/>
								)}
							</div>
							<span className="font-pixel text-[10px] text-text w-[40px] text-right">
								{best}/{totalWaves}
							</span>
						</div>
						{/* Stars display */}
						<div className="flex gap-1 items-center mt-1.5">
							{([1, 2, 3] as const).map((s) => (
								<img
									key={s}
									src={
										s <= (stageStars[selectedStageId] ?? 0)
											? 'assets/ui/icon-star-active.png'
											: 'assets/ui/icon-star-inactive.png'
									}
									alt=""
									width={12}
									height={12}
									className="[image-rendering:pixelated]"
								/>
							))}
						</div>
					</div>

					{/* 2x speed guide */}
					{isCleared && (
						<div className="px-3 pb-2">
							<div className="flex items-center gap-2 px-3 py-2 bg-panel border border-gold/30">
								<span className="font-pixel text-[11px] text-gold">▶▶</span>
								<span className="font-pixel text-[9px] text-accent">
									★{selectedStar} 클리어 완료 — 2배속 플레이 가능
								</span>
							</div>
						</div>
					)}

					{/* Star difficulty selector */}
					<div className="px-3 pb-3">
						<p className="font-pixel text-[10px] text-text-secondary uppercase tracking-wider mb-2">
							난이도 선택
						</p>
						<div className="flex gap-2">
							{([1, 2, 3] as StarRating[]).map((star) => {
								const unlocked = isStarUnlocked(
									star,
									selectedMapId,
									stageStars,
								);
								const active = selectedStar === star;
								const colors = STAR_COLORS[star];
								const diff = STAR_DIFFICULTY[star];

								return (
									<button
										key={star}
										type="button"
										onClick={() => unlocked && setSelectedStar(star)}
										disabled={!unlocked}
										className="flex-1 p-2 text-center transition-transform duration-150 cursor-pointer disabled:cursor-not-allowed"
										style={{
											minHeight: 48,
											background: active ? colors.bg : 'transparent',
											border: `2px solid ${active ? colors.border : unlocked ? 'var(--color-border)' : 'var(--color-panel)'}`,
											opacity: unlocked ? 1 : 0.3,
											transform: active ? 'scale(1.05)' : 'scale(1)',
										}}
									>
										<div className="flex items-center justify-center gap-[2px]">
											{([1, 2, 3] as const).slice(0, star).map((s) => (
												<img
													key={s}
													src="assets/ui/icon-star-active.png"
													alt=""
													width={10}
													height={10}
													className="[image-rendering:pixelated]"
												/>
											))}
										</div>
										<div
											className="font-pixel mt-1"
											style={{ fontSize: 10, color: colors.text }}
										>
											{diff.label}
										</div>
									</button>
								);
							})}
						</div>
					</div>

					{/* Deck preview */}
					<div className="px-3 pb-3">
						<div className="flex items-center justify-between mb-2">
							<p className="font-pixel text-[10px] text-text-secondary uppercase tracking-wider">
								출전 덱
							</p>
							<button
								type="button"
								className="font-pixel text-[10px] text-accent bg-panel border border-border px-2 py-0.5 cursor-pointer hover:text-gold transition-colors"
								onClick={() => setShowDeckEdit(true)}
							>
								<span className="inline-flex items-center gap-1">
									<img
										src="assets/ui/icon-edit.webp"
										alt=""
										width={10}
										height={10}
										className="[image-rendering:pixelated]"
									/>
									편집
								</span>
							</button>
						</div>
						<div className="flex gap-1.5">
							{selectedDeck.map((id) => {
								const tower = ALL_TOWERS.find((t) => t.id === id);
								if (!tower) return null;
								return (
									<div
										key={id}
										className="flex-1 bg-panel border border-border p-1.5 flex flex-col items-center gap-1"
									>
										<img
											src={`assets/towers/${tower.type}.webp`}
											alt={tower.name}
											width={32}
											height={32}
											className="[image-rendering:pixelated]"
										/>
										<span className="font-pixel text-[8px] text-text-secondary text-center overflow-hidden max-w-full whitespace-nowrap text-ellipsis">
											{tower.name}
										</span>
										<span className="font-pixel text-[9px] text-accent inline-flex items-center gap-[2px]">
											<img
												src="assets/ui/icon-energy.webp"
												alt=""
												width={10}
												height={10}
												className="[image-rendering:pixelated]"
											/>
											{tower.cost}
										</span>
									</div>
								);
							})}
						</div>
					</div>

					{/* Spacer pushes button to bottom when content is short */}
					<div className="flex-1 min-h-4" />

					{/* Game start button */}
					<div className="p-3">
						<PixelButton
							variant="gold"
							onClick={resetRun}
							style={{
								width: '100%',
								padding: '14px 20px',
								fontSize: '13px',
								boxShadow:
									'0 0 0 1px rgba(240,208,96,0.28), 0 12px 24px rgba(240,208,96,0.14)',
							}}
						>
							<span className="inline-flex items-center gap-1.5">
								<img
									src="assets/ui/icon-sword.webp"
									alt=""
									width={14}
									height={14}
									className="[image-rendering:pixelated]"
								/>
								게임 시작
							</span>
						</PixelButton>
					</div>
				</div>

				{showDeckEdit && (
					<Suspense fallback={null}>
						<DeckEditSheet
							open={showDeckEdit}
							onClose={() => setShowDeckEdit(false)}
						/>
					</Suspense>
				)}
			</div>
		</div>
	);
}
