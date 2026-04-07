import { isMapUnlocked, MAP_REGISTRY } from '@gld/shared';
import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useMetaStore } from '../stores/metaStore';
import { cn } from '../utils/cn';

const MAP_THEMES: Record<string, { borderColor: string; thumb: string }> = {
	forest_gate: {
		borderColor: '#4a8a2a',
		thumb: 'assets/ui/stage-thumb-forest_gate.webp',
	},
	lava_fortress: {
		borderColor: '#c04020',
		thumb: 'assets/ui/stage-thumb-lava_fortress.webp',
	},
	storm_citadel: {
		borderColor: '#5a6aaa',
		thumb: 'assets/ui/stage-thumb-storm_citadel.webp',
	},
};

const NODE_POSITIONS: Record<string, { top: string; left: string }> = {
	forest_gate: { top: '68%', left: '50%' },
	lava_fortress: { top: '40%', left: '26%' },
	storm_citadel: { top: '12%', left: '70%' },
};

const PATH_CONNECTIONS = [
	{ from: 'forest_gate', to: 'lava_fortress' },
	{ from: 'lava_fortress', to: 'storm_citadel' },
];

export function WorldMapPage() {
	const [lockImgError, setLockImgError] = useState(false);
	const enterLobby = useGameStore((s) => s.enterLobby);
	const enterStageDetail = useGameStore((s) => s.enterStageDetail);
	const playerLevel = useMetaStore((s) => s.profile.level) ?? 1;
	const stagesCleared = useMetaStore((s) => s.progress.stagesCleared);

	const maps = Object.values(MAP_REGISTRY);

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
					<div className="h-full overflow-auto">
						<div
							className="relative min-h-[520px] h-full"
							style={{
								background: `
								radial-gradient(ellipse at 50% 72%, rgba(34,80,34,0.18), transparent 45%),
								radial-gradient(ellipse at 26% 42%, rgba(100,30,10,0.14), transparent 40%),
								radial-gradient(ellipse at 70% 16%, rgba(40,50,90,0.18), transparent 40%),
								#1a1208
							`,
							}}
						>
							{/* Stars */}
							<div className="stars-overlay" />

							{/* Path connections (SVG) */}
							<svg
								className="absolute inset-0 w-full h-full z-0"
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
												stroke="#c8a04a"
												strokeWidth="6"
												strokeDasharray="4 12"
												opacity="0.08"
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
								const cleared = stagesCleared.includes(map.id);
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
										style={{ top: pos.top, left: pos.left }}
										onClick={() => {
											if (locked) return;
											enterStageDetail(map.id);
										}}
									>
										{/* Card */}
										<div
											className={cn(
												'relative w-[140px] bg-panel overflow-hidden',
												locked
													? 'border-2 border-border shadow-[2px_2px_0px_#0a0804]'
													: 'border-2 shadow-[3px_3px_0px_#0a0804]',
											)}
											style={{
												borderColor: locked ? undefined : theme?.borderColor,
											}}
										>
											{/* Inner border accent */}
											{!locked && (
												<div
													className="absolute inset-[2px] border pointer-events-none z-20"
													style={{
														borderColor: `${theme?.borderColor}30`,
													}}
												/>
											)}

											{/* Thumbnail */}
											<div className="relative h-[80px] overflow-hidden">
												<img
													src={theme?.thumb}
													alt={map.name}
													className={cn(
														'w-full h-full object-cover [image-rendering:pixelated]',
														locked && 'brightness-[0.35]',
													)}
												/>
												<div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-transparent" />

												{/* Lock icon */}
												{locked && (
													<div className="absolute inset-0 flex items-center justify-center">
														{lockImgError ? (
															<span className="font-pixel text-[20px] text-text-secondary/70 select-none">
																✕
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

												{/* Clear badge */}
												{cleared && !locked && (
													<div className="absolute top-1 right-1 bg-gold px-1.5 py-0.5 border border-accent shadow-[1px_1px_0px_#0a0804]">
														<span className="font-pixel text-[7px] text-bg">
															✓
														</span>
													</div>
												)}
											</div>

											{/* Info */}
											<div className="px-2 py-2 flex flex-col items-center gap-1">
												<span
													className={cn(
														'font-pixel text-[9px] text-center leading-tight',
														locked ? 'text-text-secondary' : 'text-text',
													)}
												>
													{map.name}
												</span>

												<div
													className={cn(
														'px-2 py-0.5 border text-center',
														locked
															? 'bg-danger/10 border-danger/30'
															: 'bg-panel border-border',
													)}
												>
													<span
														className={cn(
															'font-pixel text-[7px]',
															locked ? 'text-danger' : 'text-accent',
														)}
													>
														{locked
															? `Lv.${map.unlockLevel} 해금`
															: `Lv.${map.unlockLevel ?? 1}`}
													</span>
												</div>
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
