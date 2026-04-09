import { MAP_REGISTRY, UI_COLORS } from '@gld/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useMetaStore } from '../stores/metaStore';
import { cn } from '../utils/cn';
import { AmbientFx } from './worldmap/AmbientFx';
import { MapCharacter } from './worldmap/MapCharacter';
import {
	MAP_CONTENT_HEIGHT,
	MAP_CONTENT_WIDTH,
	WORLD_LAYOUT,
	WORLD_PATH_CONNECTIONS,
	type WorldSlot,
} from './worldmap/WorldLayout';
import { WorldStagePanel } from './worldmap/WorldStagePanel';
import {
	getRecommendedStageId,
	getStageStars,
	isWorldUnlocked,
	type UnlockContext,
} from './worldmap/worldLogic';

export function WorldMapPage() {
	const [lockImgError, setLockImgError] = useState(false);
	const [activeWorldIdx, setActiveWorldIdx] = useState<number | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const enterLobby = useGameStore((s) => s.enterLobby);
	const enterStageDetail = useGameStore((s) => s.enterStageDetail);
	const playerLevel = useMetaStore((s) => s.profile.level) ?? 1;
	const stagesCleared = useMetaStore((s) => s.progress.stagesCleared);
	const stageStars = useMetaStore((s) => s.progress.stageStars);

	const ctx: UnlockContext = useMemo(
		() => ({ playerLevel, stagesCleared, stageStars }),
		[playerLevel, stagesCleared, stageStars],
	);

	const recommendedStageId = useMemo(
		() => getRecommendedStageId(WORLD_LAYOUT, ctx),
		[ctx],
	);

	const recommendedWorldIdx = useMemo(() => {
		if (!recommendedStageId) return -1;
		return WORLD_LAYOUT.findIndex((w) =>
			w.stageIds.includes(recommendedStageId),
		);
	}, [recommendedStageId]);

	const recommendedWorld =
		recommendedWorldIdx >= 0 ? WORLD_LAYOUT[recommendedWorldIdx] : undefined;

	// 마운트 시 권장 월드 위치로 스크롤
	useEffect(() => {
		const container = scrollRef.current;
		if (!container || !recommendedWorld) return;
		const scrollTarget =
			recommendedWorld.position.top - container.clientHeight / 2;
		container.scrollTo({ top: Math.max(0, scrollTarget) });
	}, [recommendedWorld]);

	const activeWorld =
		activeWorldIdx !== null ? WORLD_LAYOUT[activeWorldIdx] : null;

	const handleWorldClick = (idx: number, world: WorldSlot) => {
		if (world.placeholder) return;
		if (!isWorldUnlocked(world, ctx)) return;
		setActiveWorldIdx(idx);
	};

	return (
		<div className="flex h-full w-full justify-center bg-bg">
			<div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-bg shadow-[0_0_40px_rgba(0,0,0,0.5)]">
				{/* Header */}
				<div className="relative flex items-center justify-center px-3 py-4 bg-panel border-b-2 border-border z-20">
					<button
						type="button"
						className="absolute left-3 font-pixel text-[10px] text-accent cursor-pointer hover:text-gold transition-colors"
						onClick={enterLobby}
					>
						<span className="inline-flex items-center gap-1">
							<img
								src="assets/ui/icon-arrow-left.webp"
								alt=""
								width={10}
								height={10}
								className="[image-rendering:pixelated]"
							/>
							돌아가기
						</span>
					</button>
					<span className="absolute left-1/2 -translate-x-1/2 font-pixel text-base text-gold">
						스테이지 선택
					</span>
					{/* 우측 정렬: Lv 뱃지 + 전투력 slot(#109 drop-in) */}
					<div className="absolute right-3 flex items-center gap-2">
						<span className="font-pixel text-[9px] text-text-secondary px-2 py-0.5 bg-panel border border-border">
							Lv.{playerLevel}
						</span>
						{/* 전투력 뱃지 공간 — #109 drop-in */}
						<div
							aria-hidden
							className="h-5 w-12 border border-dashed border-border/30"
						/>
					</div>
				</div>

				{/* Map area */}
				<div className="relative flex-1 min-h-0">
					<div
						ref={scrollRef}
						className="h-full overflow-x-hidden overflow-y-auto bg-[#1a1208] flex flex-col items-center"
					>
						<div
							className="relative mx-auto"
							style={{
								width: `${MAP_CONTENT_WIDTH}px`,
								height: `${MAP_CONTENT_HEIGHT}px`,
							}}
						>
							{/* Background */}
							<img
								src="assets/ui/worldmap-bg.webp"
								alt=""
								className="absolute inset-0 w-full h-full object-cover [image-rendering:pixelated]"
								style={{ objectPosition: '40% center' }}
							/>
							{/* Vertical masking — 배경 512×768과 컨테이너 430×800 갭을 자연스럽게 가림 */}
							<div
								className="absolute inset-0 pointer-events-none"
								style={{
									boxShadow: 'inset 0 0 80px 24px rgba(10,8,4,0.8)',
								}}
							/>

							{/* 월드별 컬러 와시 — themeToken 토큰 기반 radial glow */}
							{WORLD_LAYOUT.map((world, i) => {
								const color = UI_COLORS[world.themeToken];
								const dim = world.placeholder || !isWorldUnlocked(world, ctx);
								return (
									<div
										key={`wash-${i}`}
										aria-hidden
										className="absolute pointer-events-none"
										style={{
											top: `${world.position.top - 120}px`,
											left: `${world.position.left - 120}px`,
											width: '240px',
											height: '240px',
											background: `radial-gradient(circle, ${color}${dim ? '14' : '33'} 0%, transparent 65%)`,
											mixBlendMode: 'screen',
										}}
									/>
								);
							})}

							{/* SVG 경로 (dash flow) */}
							<svg
								className="absolute inset-0 w-full h-full z-[1]"
								viewBox={`0 0 ${MAP_CONTENT_WIDTH} ${MAP_CONTENT_HEIGHT}`}
								preserveAspectRatio="none"
								role="img"
								aria-label="월드 연결 경로"
							>
								{WORLD_PATH_CONNECTIONS.map(({ fromIdx, toIdx }, i) => {
									const a = WORLD_LAYOUT[fromIdx];
									const b = WORLD_LAYOUT[toIdx];
									if (!a || !b) return null;
									const dimmed = b.placeholder || !isWorldUnlocked(b, ctx);
									return (
										<g key={`path-${i}`}>
											{/* Glow */}
											<line
												x1={a.position.left}
												y1={a.position.top}
												x2={b.position.left}
												y2={b.position.top}
												stroke={UI_COLORS.gold}
												strokeWidth="8"
												strokeDasharray="3 12"
												opacity={dimmed ? 0.05 : 0.12}
											/>
											{/* Shadow */}
											<line
												x1={a.position.left}
												y1={a.position.top}
												x2={b.position.left}
												y2={b.position.top}
												stroke="#0a0804"
												strokeWidth="4"
												strokeDasharray="3 12"
												opacity="0.5"
												transform="translate(1,1)"
											/>
											{/* Main dashed line — 흘러가는 dash */}
											<line
												x1={a.position.left}
												y1={a.position.top}
												x2={b.position.left}
												y2={b.position.top}
												stroke={dimmed ? UI_COLORS.border : UI_COLORS.accent}
												strokeWidth="3"
												strokeDasharray="3 12"
												strokeLinecap="round"
												opacity={dimmed ? 0.35 : 0.7}
												className={dimmed ? undefined : 'wm-dash-flow'}
											/>
										</g>
									);
								})}
							</svg>

							{/* World nodes */}
							{WORLD_LAYOUT.map((world, idx) => {
								const unlocked = isWorldUnlocked(world, ctx);
								const isPlaceholder = !!world.placeholder;
								const isRecommended = idx === recommendedWorldIdx;
								const themeColor = UI_COLORS[world.themeToken];

								// 최대 rewardMultiplier 조회
								const firstStage = world.stageIds[0];
								const firstMap = firstStage
									? MAP_REGISTRY[firstStage]
									: undefined;
								const rewardMult = firstMap?.rewardMultiplier ?? 1;
								const unlockLevel = firstMap?.unlockLevel;

								// ★ 진행 (첫 스테이지 기준)
								const stars = firstStage ? getStageStars(firstStage, ctx) : 0;

								return (
									<div
										key={world.worldId}
										className="absolute z-[10] -translate-x-1/2 -translate-y-1/2"
										style={{
											top: `${world.position.top}px`,
											left: `${world.position.left}px`,
										}}
									>
										{/* 기단 (돌받침) — 랜드마크 아래 픽셀 타원 */}
										<div
											aria-hidden
											className="absolute left-1/2 -translate-x-1/2"
											style={{
												top: '78px',
												width: '64px',
												height: '14px',
												backgroundColor: 'rgba(10,8,4,0.45)',
												borderRadius: '50%',
												filter: 'blur(1px)',
											}}
										/>

										{/* 권장 월드 펄스 링 */}
										{isRecommended && unlocked && (
											<>
												<div
													aria-hidden
													className="wm-pulse-ring absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
													style={{
														width: '108px',
														height: '108px',
														borderRadius: '50%',
														border: `2px solid ${themeColor}`,
														boxShadow: `0 0 12px ${themeColor}`,
													}}
												/>
												<div
													aria-hidden
													className="wm-pulse-ring-delay absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
													style={{
														width: '108px',
														height: '108px',
														borderRadius: '50%',
														border: `2px solid ${themeColor}`,
														boxShadow: `0 0 12px ${themeColor}`,
													}}
												/>
											</>
										)}

										<button
											type="button"
											disabled={!unlocked}
											onClick={() => handleWorldClick(idx, world)}
											className={cn(
												'relative block transition-all duration-200',
												unlocked
													? 'cursor-pointer hover:scale-[1.06] active:scale-95'
													: 'cursor-not-allowed',
											)}
										>
											<div className="relative w-[96px] h-[96px]">
												{/* 랜드마크 이미지 */}
												<img
													src={world.landmarkAsset}
													alt={world.displayName}
													className={cn(
														'w-full h-full [image-rendering:pixelated]',
														isPlaceholder &&
															'wm-silhouette brightness-[0.3] grayscale blur-[2px]',
														!isPlaceholder &&
															!unlocked &&
															'brightness-[0.35] grayscale',
													)}
													style={
														!isPlaceholder && unlocked
															? {
																	filter: `drop-shadow(0 0 6px ${themeColor}80)`,
																}
															: undefined
													}
												/>

												{/* Ambient FX — 활성 월드만 */}
												{!isPlaceholder && unlocked && (
													<AmbientFx kind={world.ambientFxKind} size={96} />
												)}

												{/* Lock icon */}
												{!unlocked && !isPlaceholder && (
													<div className="absolute inset-0 flex items-center justify-center">
														{lockImgError ? (
															<span className="font-pixel text-[20px] text-text-secondary/70 select-none">
																&#10005;
															</span>
														) : (
															<img
																src="assets/ui/icon-locked.webp"
																alt="잠김"
																width={24}
																height={24}
																className="[image-rendering:pixelated] opacity-75 select-none"
																onError={() => setLockImgError(true)}
															/>
														)}
													</div>
												)}

												{/* Placeholder ??? */}
												{isPlaceholder && (
													<div className="absolute inset-0 flex items-center justify-center">
														<span className="font-pixel text-[22px] text-text-secondary/60 select-none drop-shadow-[1px_1px_0_#0a0804]">
															?
														</span>
													</div>
												)}

												{/* ★ progress — 활성 월드만 */}
												{!isPlaceholder && unlocked && (
													<div className="absolute top-1 left-1 flex gap-[1px]">
														{([1, 2, 3] as const).map((s) => (
															<img
																key={s}
																src={
																	s <= stars
																		? 'assets/ui/icon-star-active.png'
																		: 'assets/ui/icon-star-inactive.png'
																}
																alt=""
																width={10}
																height={10}
																className="[image-rendering:pixelated] drop-shadow-[1px_1px_0px_#0a0804]"
															/>
														))}
													</div>
												)}
											</div>

											{/* 라벨 리본 — 지명표 */}
											<div
												className="mt-1 flex flex-col items-center gap-0.5 px-2 py-1 bg-panel/90 backdrop-blur-sm border relative"
												style={{
													borderColor: isPlaceholder
														? UI_COLORS.border
														: unlocked
															? themeColor
															: UI_COLORS.border,
												}}
											>
												{/* 보상 배율 배지 — 리본 우상단 */}
												{rewardMult > 1 && unlocked && !isPlaceholder && (
													<div
														className="absolute -top-2 -right-1 px-1 leading-none"
														style={{
															backgroundColor: UI_COLORS.panel,
															border: `1px solid ${UI_COLORS.gold}`,
														}}
													>
														<span
															className="font-pixel text-[8px]"
															style={{ color: UI_COLORS.gold }}
														>
															×{rewardMult}
														</span>
													</div>
												)}

												<span
													className={cn(
														'font-pixel text-[10px] text-center leading-tight',
														isPlaceholder
															? 'text-text-secondary/50'
															: unlocked
																? 'text-gold'
																: 'text-text-secondary',
													)}
												>
													{isPlaceholder ? '???' : world.displayName}
												</span>

												<span
													className={cn(
														'font-pixel text-[7px]',
														isPlaceholder
															? 'text-text-secondary/40'
															: unlocked
																? 'text-text-secondary'
																: 'text-danger',
													)}
												>
													{isPlaceholder
														? 'Coming Soon'
														: unlocked
															? `W${idx + 1}`
															: unlockLevel !== undefined
																? `Lv.${unlockLevel} 해금`
																: 'Locked'}
												</span>
											</div>
										</button>
									</div>
								);
							})}

							{/* 캐릭터 아바타 — 권장 월드 위치 */}
							{recommendedWorld && (
								<MapCharacter
									top={recommendedWorld.position.top}
									left={recommendedWorld.position.left}
								/>
							)}
						</div>
					</div>

					{/* 스크롤 힌트 페이드 */}
					<div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-bg to-transparent z-[5]" />

					{/* Slide-over 스테이지 패널 */}
					{activeWorld && activeWorldIdx !== null && (
						<WorldStagePanel
							world={activeWorld}
							worldIndex={activeWorldIdx}
							ctx={ctx}
							onClose={() => setActiveWorldIdx(null)}
							onSelectStage={(stageId) => {
								setActiveWorldIdx(null);
								enterStageDetail(stageId);
							}}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
