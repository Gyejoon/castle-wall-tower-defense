import { isMapUnlocked, MAP_REGISTRY } from '@gld/shared';
import { useGameStore } from '../stores/gameStore';
import { useMetaStore } from '../stores/metaStore';
import { cn } from '../utils/cn';

const MAP_THEMES: Record<
	string,
	{ gradient: string; borderColor: string; thumb: string }
> = {
	forest_gate: {
		gradient: 'linear-gradient(135deg, #2d5a1e, #1a3a10)',
		borderColor: '#4a8a2a',
		thumb: 'assets/ui/stage-thumb-forest_gate.webp',
	},
	lava_fortress: {
		gradient: 'linear-gradient(135deg, #8a2a0a, #5a1a08)',
		borderColor: '#c04020',
		thumb: 'assets/ui/stage-thumb-lava_fortress.webp',
	},
	storm_citadel: {
		gradient: 'linear-gradient(135deg, #2a3a6a, #1a2848)',
		borderColor: '#5a6aaa',
		thumb: 'assets/ui/stage-thumb-storm_citadel.webp',
	},
};

const NODE_POSITIONS: Record<string, { top: string; left: string }> = {
	forest_gate: { top: '66%', left: '50%' },
	lava_fortress: { top: '40%', left: '28%' },
	storm_citadel: { top: '14%', left: '68%' },
};

const PATH_CONNECTIONS = [
	{ from: 'forest_gate', to: 'lava_fortress' },
	{ from: 'lava_fortress', to: 'storm_citadel' },
];

export function WorldMapPage() {
	const enterLobby = useGameStore((s) => s.enterLobby);
	const enterStageDetail = useGameStore((s) => s.enterStageDetail);
	const playerLevel = useMetaStore((s) => s.profile.level) ?? 1;
	const stagesCleared = useMetaStore((s) => s.progress.stagesCleared);

	const maps = Object.values(MAP_REGISTRY);

	return (
		<div className="flex h-full w-full justify-center bg-bg">
			<div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-bg shadow-[0_0_40px_rgba(0,0,0,0.5)]">
				{/* Header */}
				<div className="flex items-center justify-between px-3 py-2.5 bg-panel border-b border-border z-10">
					<button
						type="button"
						className="font-pixel text-[9px] text-accent cursor-pointer hover:text-gold transition-colors"
						onClick={enterLobby}
					>
						← 돌아가기
					</button>
					<span className="font-pixel text-[11px] text-gold">
						스테이지 선택
					</span>
					<span className="font-pixel text-[9px] text-text-secondary px-2 py-0.5 bg-panel border border-border">
						Lv.{playerLevel}
					</span>
				</div>

				{/* Map area */}
				<div
					className="relative flex-1 min-h-0 overflow-hidden"
					style={{
						background:
							'radial-gradient(ellipse at 50% 70%, rgba(34,80,34,0.12), transparent 60%), radial-gradient(ellipse at 28% 42%, rgba(100,30,10,0.08), transparent 50%), radial-gradient(ellipse at 68% 18%, rgba(40,50,90,0.12), transparent 50%), #1a1208',
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
									{/* Shadow */}
									<line
										x1={a.left}
										y1={a.top}
										x2={b.left}
										y2={b.top}
										stroke="#0a0804"
										strokeWidth="3"
										strokeDasharray="6 10"
										opacity="0.4"
										transform="translate(1,1)"
									/>
									{/* Main line */}
									<line
										x1={a.left}
										y1={a.top}
										x2={b.left}
										y2={b.top}
										stroke="#4a3a20"
										strokeWidth="2"
										strokeDasharray="6 10"
										opacity="0.6"
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
										? 'opacity-40 grayscale cursor-not-allowed'
										: 'cursor-pointer hover:scale-105 hover:-translate-y-[calc(50%+4px)] active:scale-95',
								)}
								style={{ top: pos.top, left: pos.left }}
								onClick={() => {
									if (locked) return;
									enterStageDetail(map.id);
								}}
							>
								{/* Card frame */}
								<div
									className="relative w-[130px] bg-panel border-2 shadow-[3px_3px_0px_#0a0804] overflow-hidden"
									style={{
										borderColor: locked
											? 'var(--color-border)'
											: theme?.borderColor,
									}}
								>
									{/* Thumbnail image */}
									<div className="relative h-[72px] overflow-hidden">
										<img
											src={theme?.thumb}
											alt={map.name}
											className={cn(
												'w-full h-full object-cover [image-rendering:pixelated]',
												locked && 'brightness-50',
											)}
										/>
										{/* Gradient overlay */}
										<div className="absolute inset-0 bg-gradient-to-t from-panel/90 to-transparent" />

										{/* Lock overlay */}
										{locked && (
											<div className="absolute inset-0 flex items-center justify-center bg-black/30">
												<span className="font-pixel text-[16px] text-text-secondary">
													🔒
												</span>
											</div>
										)}

										{/* Clear badge */}
										{cleared && !locked && (
											<div className="absolute top-1 right-1 bg-gold px-1.5 py-0.5 border border-accent">
												<span className="font-pixel text-[7px] text-bg">✓</span>
											</div>
										)}
									</div>

									{/* Info */}
									<div className="px-2 py-1.5 flex flex-col items-center gap-0.5">
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
												'px-1.5 py-0.5 border text-center mt-0.5',
												locked
													? 'bg-[#301010] border-[#802020]'
													: 'bg-panel border-border',
											)}
										>
											<span
												className="font-pixel text-[7px]"
												style={{
													color: locked ? '#c03020' : '#c8a04a',
												}}
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
					<div className="absolute bottom-3 left-0 right-0 text-center">
						<span className="font-pixel text-[7px] text-text-secondary/60">
							스테이지를 선택하세요
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
