import { isMapUnlocked, MAP_REGISTRY } from '@gld/shared';
import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useMetaStore } from '../stores/metaStore';
import { colors } from '../styles/tokens';
import { cn } from '../utils/cn';

const MAP_THEMES: Record<string, { borderColor: string; landmark: string }> = {
	forest_gate: {
		borderColor: colors.success,
		landmark: 'assets/ui/landmark-forest_gate.webp',
	},
	lava_fortress: {
		borderColor: colors.bossPhase1,
		landmark: 'assets/ui/landmark-lava_fortress.webp',
	},
	storm_citadel: {
		borderColor: colors.info,
		landmark: 'assets/ui/landmark-storm_citadel.webp',
	},
};

export function WorldMapPage() {
	const [lockImgError, setLockImgError] = useState(false);
	const enterLobby = useGameStore((s) => s.enterLobby);
	const enterStageDetail = useGameStore((s) => s.enterStageDetail);
	const playerLevel = useMetaStore((s) => s.profile.level) ?? 1;
	const stagesCleared = useMetaStore((s) => s.progress.stagesCleared);
	const stageStars = useMetaStore((s) => s.progress.stageStars);

	const maps = Object.values(MAP_REGISTRY);

	return (
		<div className="flex h-full w-full justify-center bg-bg">
			<div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-bg shadow-[0_0_40px_rgba(0,0,0,0.5)]">
				{/* Header */}
				<div className="relative flex items-center justify-center px-3 py-4 bg-panel border-b-2 border-border z-10 shrink-0">
					<button
						type="button"
						className="absolute left-3 min-h-[44px] min-w-[44px] flex items-center font-pixel text-[10px] text-accent cursor-pointer hover:text-gold transition-colors"
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
					<span className="font-pixel text-[15px] text-gold">
						스테이지 선택
					</span>
					<span className="absolute right-3 font-pixel text-[9px] text-text-secondary px-2 py-0.5 bg-panel border border-border">
						Lv.{playerLevel}
					</span>
				</div>

				{/* Stage list */}
				<div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
					{maps.map((map) => {
						const locked = !isMapUnlocked(map, playerLevel);
						const theme = MAP_THEMES[map.id];
						const stars =
							stageStars[map.id] ?? (stagesCleared.includes(map.id) ? 1 : 0);

						return (
							<button
								key={map.id}
								type="button"
								disabled={locked}
								onClick={() => !locked && enterStageDetail(map.id)}
								className={cn(
									'w-full flex items-center gap-3 p-3 border-2 text-left transition-[border-color,transform]',
									locked
										? 'border-border bg-panel/60 opacity-45 grayscale cursor-not-allowed'
										: 'border-border bg-panel hover:border-gold active:scale-[0.99] cursor-pointer',
								)}
								style={
									!locked ? { borderColor: theme?.borderColor } : undefined
								}
							>
								{/* Landmark thumbnail */}
								<div className="relative w-16 h-16 shrink-0">
									<img
										src={theme?.landmark}
										alt={map.name}
										width={64}
										height={64}
										className={cn(
											'w-full h-full [image-rendering:pixelated]',
											locked && 'brightness-[0.35]',
										)}
									/>
									{locked && (
										<div className="absolute inset-0 flex items-center justify-center">
											{lockImgError ? (
												<span className="font-pixel text-base text-text-secondary/70">
													&#10005;
												</span>
											) : (
												<img
													src="assets/ui/icon-locked.webp"
													alt="잠김"
													width={20}
													height={20}
													className="[image-rendering:pixelated] opacity-80"
													onError={() => setLockImgError(true)}
												/>
											)}
										</div>
									)}
								</div>

								{/* Info */}
								<div className="flex-1 min-w-0 flex flex-col gap-1">
									<span
										className={cn(
											'font-pixel text-[13px]',
											locked ? 'text-text-secondary' : 'text-text',
										)}
									>
										{map.name}
									</span>
									<span
										className={cn(
											'font-pixel text-[10px]',
											locked ? 'text-danger' : 'text-accent',
										)}
									>
										{locked
											? `Lv.${map.unlockLevel} 해금`
											: `Lv.${map.unlockLevel ?? 1} · 권장 전투력 ${map.recommendedPower ?? '-'}`}
									</span>
									{/* Stars */}
									<div className="flex gap-0.5 mt-0.5">
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
												className="[image-rendering:pixelated]"
											/>
										))}
									</div>
								</div>

								{/* Arrow (rotated left arrow) */}
								{!locked && (
									<img
										src="assets/ui/icon-arrow-left.webp"
										alt=""
										width={10}
										height={10}
										className="[image-rendering:pixelated] shrink-0 opacity-70 rotate-180"
									/>
								)}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}
