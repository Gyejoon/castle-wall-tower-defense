import { isMapUnlocked, MAP_REGISTRY } from '@gld/shared';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useMetaStore } from '../stores/metaStore';
import { cn } from '../utils/cn';

const MAP_THEMES: Record<string, { borderColor: string; landmark: string }> = {
	forest_gate: {
		borderColor: '#4a8a2a',
		landmark: 'assets/ui/landmark-forest_gate.webp',
	},
	lava_fortress: {
		borderColor: '#c04020',
		landmark: 'assets/ui/landmark-lava_fortress.webp',
	},
	storm_citadel: {
		borderColor: '#5a6aaa',
		landmark: 'assets/ui/landmark-storm_citadel.webp',
	},
};

const MAP_CONTENT_WIDTH = 430;
const MAP_CONTENT_HEIGHT = 640;

const NODE_POSITIONS: Record<string, { top: number; left: number }> = {
	forest_gate: { top: 480, left: 250 },
	lava_fortress: { top: 120, left: 200 },
	storm_citadel: { top: 300, left: 310 },
};

const PATH_CONNECTIONS = [
	{ from: 'forest_gate', to: 'lava_fortress' },
	{ from: 'lava_fortress', to: 'storm_citadel' },
];

export function WorldMapPage() {
	const [lockImgError, setLockImgError] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const enterLobby = useGameStore((s) => s.enterLobby);
	const enterStageDetail = useGameStore((s) => s.enterStageDetail);
	const playerLevel = useMetaStore((s) => s.profile.level) ?? 1;
	const stagesCleared = useMetaStore((s) => s.progress.stagesCleared);
	const stageStars = useMetaStore((s) => s.progress.stageStars);

	const maps = Object.values(MAP_REGISTRY);

	// 권장 스테이지: 첫 번째 미클리어 해금 스테이지, 없으면 마지막 해금 스테이지
	const recommendedMapId = (() => {
		const unclearedUnlocked = maps.find(
			(m) => isMapUnlocked(m, playerLevel) && !stagesCleared.includes(m.id),
		);
		if (unclearedUnlocked) return unclearedUnlocked.id;
		const unlocked = maps.filter((m) => isMapUnlocked(m, playerLevel));
		return unlocked[unlocked.length - 1]?.id;
	})();

	// 마운트 시 권장 스테이지 위치로 스크롤
	useEffect(() => {
		const container = scrollRef.current;
		const pos = recommendedMapId ? NODE_POSITIONS[recommendedMapId] : null;
		if (!container || !pos) return;
		const scrollTarget = pos.top - container.clientHeight / 2;
		container.scrollTo({ top: Math.max(0, scrollTarget) });
	}, [recommendedMapId]);

	return (
		<div className="flex h-full w-full justify-center bg-bg">
			<div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-bg shadow-[0_0_40px_rgba(0,0,0,0.5)]">
				{/* Header */}
				<div className="relative flex items-center justify-center px-3 py-4 bg-panel border-b-2 border-border z-10">
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
					<span className="absolute right-3 font-pixel text-[9px] text-text-secondary px-2 py-0.5 bg-panel border border-border">
						Lv.{playerLevel}
					</span>
				</div>

				{/* Map area — scrollable on small screens */}
				<div className="relative flex-1 min-h-0">
					<div
						ref={scrollRef}
						className="h-full overflow-x-hidden overflow-y-auto bg-[#1a1208] flex flex-col items-center justify-center"
					>
						<div
							className="relative mx-auto"
							style={{
								width: `${MAP_CONTENT_WIDTH}px`,
								height: `${MAP_CONTENT_HEIGHT}px`,
							}}
						>
							{/* World map background */}
							<img
								src="assets/ui/worldmap-bg.webp"
								alt=""
								className="absolute inset-0 w-full h-full object-cover [image-rendering:pixelated]"
								style={{ objectPosition: '40% center' }}
							/>
							<div
								className="absolute inset-0 pointer-events-none"
								style={{ boxShadow: 'inset 0 0 60px 20px rgba(10,8,4,0.7)' }}
							/>

							{/* Path connections (SVG) */}
							<svg
								className="absolute inset-0 w-full h-full z-0"
								viewBox={`0 0 ${MAP_CONTENT_WIDTH} ${MAP_CONTENT_HEIGHT}`}
								preserveAspectRatio="none"
								role="img"
								aria-label="스테이지 연결 경로"
							>
								{PATH_CONNECTIONS.map(({ from, to }) => {
									const a = NODE_POSITIONS[from];
									const b = NODE_POSITIONS[to];
									if (!a || !b) return null;
									return (
										<g key={`${from}-${to}`}>
											{/* Glow */}
											<line
												x1={a.left}
												y1={a.top}
												x2={b.left}
												y2={b.top}
												stroke="#f0d060"
												strokeWidth="8"
												strokeDasharray="4 12"
												opacity="0.1"
											/>
											{/* Shadow */}
											<line
												x1={a.left}
												y1={a.top}
												x2={b.left}
												y2={b.top}
												stroke="#0a0804"
												strokeWidth="4"
												strokeDasharray="4 12"
												opacity="0.5"
												transform="translate(1,1)"
											/>
											{/* Main path — dot style */}
											<line
												x1={a.left}
												y1={a.top}
												x2={b.left}
												y2={b.top}
												stroke="#c8a04a"
												strokeWidth="3"
												strokeDasharray="3 12"
												strokeLinecap="round"
												opacity="0.45"
											/>
										</g>
									);
								})}
							</svg>

							{/* Map nodes */}
							{maps.map((map) => {
								const pos = NODE_POSITIONS[map.id];
								if (!pos) return null;
								const locked = !isMapUnlocked(map, playerLevel);
								const theme = MAP_THEMES[map.id];

								return (
									<button
										key={map.id}
										type="button"
										disabled={locked}
										className={cn(
											'absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-all duration-200',
											locked
												? 'opacity-45 grayscale cursor-not-allowed'
												: 'cursor-pointer hover:scale-[1.06] hover:-translate-y-[calc(50%+3px)] active:scale-95',
										)}
										style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
										onClick={() => {
											if (locked) return;
											enterStageDetail(map.id);
										}}
									>
										{/* Landmark */}
										<div className="relative">
											{/* Landmark icon */}
											<div
												role="presentation"
												className="relative w-[96px] h-[96px] transition-[filter] duration-200"
												style={
													!locked
														? {
																filter: `drop-shadow(0 0 0px ${theme?.borderColor ?? 'transparent'})`,
															}
														: undefined
												}
												onMouseEnter={(e) => {
													if (!locked)
														e.currentTarget.style.filter = `drop-shadow(0 0 8px ${theme?.borderColor})`;
												}}
												onMouseLeave={(e) => {
													if (!locked)
														e.currentTarget.style.filter = `drop-shadow(0 0 0px ${theme?.borderColor ?? 'transparent'})`;
												}}
											>
												<img
													src={theme?.landmark}
													alt={map.name}
													className={cn(
														'w-full h-full [image-rendering:pixelated]',
														locked && 'brightness-[0.35]',
													)}
												/>

												{/* Lock icon */}
												{locked && (
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
																className="[image-rendering:pixelated] opacity-70 select-none"
																onError={() => setLockImgError(true)}
															/>
														)}
													</div>
												)}

												{/* Star progress */}
												{!locked && (
													<div className="absolute top-1 right-1 flex gap-[1px]">
														{([1, 2, 3] as const).map((s) => (
															<img
																key={s}
																src={
																	s <=
																	(stageStars[map.id] ??
																		(stagesCleared.includes(map.id) ? 1 : 0))
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

											{/* Label */}
											<div
												className="mt-1 flex flex-col items-center gap-0.5 px-2 py-1 bg-panel/85 backdrop-blur-sm border"
												style={{
													borderColor: locked ? '#4a3a20' : theme?.borderColor,
												}}
											>
												<span
													className={cn(
														'font-pixel text-[8px] text-center leading-tight',
														locked ? 'text-text-secondary' : 'text-text',
													)}
												>
													{map.name}
												</span>

												<span
													className={cn(
														'font-pixel text-[6px]',
														locked ? 'text-danger' : 'text-accent',
													)}
												>
													{locked
														? `Lv.${map.unlockLevel} 해금`
														: `Lv.${map.unlockLevel ?? 1}`}
												</span>
											</div>
										</div>
									</button>
								);
							})}

							{/* Bottom hint */}
							<div className="absolute bottom-4 left-0 right-0 text-center">
								<span className="font-pixel text-[7px] text-text-secondary/50">
									스테이지를 선택하세요
								</span>
							</div>
						</div>
					</div>
					{/* Scroll hint fade — viewport-fixed */}
					<div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-bg to-transparent z-10" />
				</div>
			</div>
		</div>
	);
}
