import { isMapUnlocked, MAP_REGISTRY } from '@gld/shared';
import { useGameStore } from '../stores/gameStore';
import { useMetaStore } from '../stores/metaStore';
import { cn } from '../utils/cn';

const MAP_THEMES: Record<string, { gradient: string; icon: string; borderColor: string }> = {
	forest_gate: {
		gradient: 'linear-gradient(135deg, #2d5a1e, #1a3a10)',
		icon: '♣',
		borderColor: '#4a8a2a',
	},
	lava_fortress: {
		gradient: 'linear-gradient(135deg, #8a2a0a, #5a1a08)',
		icon: '♦',
		borderColor: '#c04020',
	},
	storm_citadel: {
		gradient: 'linear-gradient(135deg, #2a3a6a, #1a2848)',
		icon: '♠',
		borderColor: '#5a6aaa',
	},
};

const NODE_POSITIONS: Record<string, { top: string; left: string }> = {
	forest_gate: { top: '68%', left: '50%' },
	lava_fortress: { top: '42%', left: '25%' },
	storm_citadel: { top: '16%', left: '72%' },
};

// SVG path data for dashed connections between nodes
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
					<span className="font-pixel text-[11px] text-gold">스테이지 선택</span>
					<span className="font-pixel text-[9px] text-text-secondary px-2 py-0.5 bg-panel border border-border">
						Lv.{playerLevel}
					</span>
				</div>

				{/* Map area */}
				<div
					className="relative flex-1 min-h-0 overflow-hidden"
					style={{
						background: 'radial-gradient(ellipse at 50% 80%, rgba(34,80,34,0.15), transparent 60%), radial-gradient(ellipse at 25% 45%, rgba(100,30,10,0.1), transparent 50%), radial-gradient(ellipse at 72% 20%, rgba(40,50,90,0.15), transparent 50%), #1a1208',
					}}
				>
					{/* Stars */}
					<div className="stars-overlay" />

					{/* Path connections (SVG) */}
					<svg className="absolute inset-0 w-full h-full z-0" preserveAspectRatio="none">
						{PATH_CONNECTIONS.map(({ from, to }) => {
							const a = NODE_POSITIONS[from];
							const b = NODE_POSITIONS[to];
							if (!a || !b) return null;
							return (
								<line
									key={`${from}-${to}`}
									x1={a.left}
									y1={a.top}
									x2={b.left}
									y2={b.top}
									stroke="#4a3a20"
									strokeWidth="2"
									strokeDasharray="6 8"
									opacity="0.5"
								/>
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
									'absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-transform duration-150',
									locked
										? 'opacity-40 grayscale cursor-not-allowed'
										: 'cursor-pointer hover:scale-110 active:scale-95',
								)}
								style={{ top: pos.top, left: pos.left }}
								onClick={() => {
									if (locked) return;
									enterStageDetail(map.id);
								}}
							>
								{/* Card frame */}
								<div
									className="relative w-[96px] bg-panel border-2 border-border shadow-[3px_3px_0px_#0a0804] p-2 flex flex-col items-center gap-1"
									style={{
										borderColor: locked ? undefined : theme?.borderColor,
									}}
								>
									{/* Inner border */}
									<div
										className="absolute inset-[3px] border pointer-events-none"
										style={{
											borderColor: locked
												? 'rgba(74,58,32,0.2)'
												: `${theme?.borderColor}40`,
										}}
									/>

									{/* Icon circle */}
									<div
										className="w-[40px] h-[40px] rounded-full flex items-center justify-center border-2 relative"
										style={{
											background: locked
												? 'linear-gradient(135deg, #3a3a3a, #2a2a2a)'
												: theme?.gradient,
											borderColor: locked
												? '#4a4a4a'
												: theme?.borderColor,
										}}
									>
										{/* Highlight */}
										<div className="absolute top-[3px] left-[5px] w-[10px] h-[6px] bg-white/10 rounded-full" />
										<span
											className="font-pixel text-[16px]"
											style={{
												color: locked ? '#606060' : '#f0e8d8',
											}}
										>
											{locked ? '✕' : theme?.icon}
										</span>

										{/* Pulse ring for available uncleared */}
										{!locked && !cleared && (
											<div
												className="absolute inset-[-6px] rounded-full border animate-[pulse_2s_ease-in-out_infinite] pointer-events-none"
												style={{
													borderColor: `${theme?.borderColor}50`,
												}}
											/>
										)}
									</div>

									{/* Map name */}
									<span className="font-pixel text-[8px] text-text text-center leading-tight">
										{map.name}
									</span>

									{/* Level badge */}
									<div
										className={cn(
											'px-1.5 py-0.5 border text-center',
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

									{/* Clear badge */}
									{cleared && !locked && (
										<div className="absolute -top-1 -right-1 bg-gold border border-accent px-1 py-0.5">
											<span className="font-pixel text-[7px] text-bg">✓</span>
										</div>
									)}
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
