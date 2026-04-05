import {
	ALL_TOWERS,
	DEFAULT_MAP_ID,
	isMapUnlocked,
	MAP_REGISTRY,
} from '@gld/shared';
import { useState } from 'react';
import { uiMobileArt } from '../../../assets/uiMobileArt';
import { useGameStore } from '../../../stores/gameStore';
import { useMetaStore } from '../../../stores/metaStore';
import { cn } from '../../../utils/cn';
import { PixelButton } from '../../ui/PixelButton';
import { DeckEditSheet } from '../DeckEditSheet';
import { TabBackground } from '../TabBackground';

const STAGE_DIFFICULTY: Record<string, number> = {
	forest_gate: 1,
	lava_fortress: 2,
	storm_citadel: 3,
};

const STAGE_THUMBNAILS: Record<string, string> = {
	forest_gate: 'assets/ui/stage-thumb-forest_gate.png',
	lava_fortress: 'assets/ui/stage-thumb-lava_fortress.png',
	storm_citadel: 'assets/ui/stage-thumb-storm_citadel.png',
};

export function HomeTab() {
	const resetRun = useGameStore((s) => s.resetRun);
	const selectedMapId = useGameStore((s) => s.selectedMapId);
	const setSelectedMapId = useGameStore((s) => s.setSelectedMapId);
	const selectedDeck = useGameStore((s) => s.selectedDeck);
	const playerLevel = useMetaStore((s) => s.profile.level) ?? 0;
	const [showDeckEdit, setShowDeckEdit] = useState(false);

	// Derive safe map id synchronously — no flicker from useEffect
	const selectedMap = MAP_REGISTRY[selectedMapId];
	const effectiveMapId =
		selectedMap && !isMapUnlocked(selectedMap, playerLevel)
			? DEFAULT_MAP_ID
			: selectedMapId;

	return (
		<div
			id="tabpanel-home"
			role="tabpanel"
			aria-label="마당"
			className="relative flex-1 overflow-hidden"
		>
			{/* Background scene */}
			<TabBackground
				src={uiMobileArt.courtyardBg}
				gradient="linear-gradient(180deg, #0d1a2a 0%, #14233a 50%, #1a1208 100%)"
			/>
			{/* Ambient animations */}
			<div className="torch torch-left" />
			<div className="torch torch-right" />
			<div className="castle-flag" />
			<div className="stars-overlay" />

			{/* Content overlay */}
			<div
				className="relative z-1 flex flex-col justify-end h-full p-4 gap-3"
				style={{
					background:
						'linear-gradient(180deg, transparent 0%, transparent 40%, rgba(26,18,8,0.7) 70%, rgba(26,18,8,0.92) 100%)',
				}}
			>
				{/* Stage selection */}
				<div className="flex gap-1.5 overflow-x-auto p-0.5">
					{Object.values(MAP_REGISTRY).map((map) => {
						const locked = !isMapUnlocked(map, playerLevel);
						const selected = effectiveMapId === map.id;
						const stars = STAGE_DIFFICULTY[map.id] ?? 1;
						return (
							<div
								key={map.id}
								role="button"
								tabIndex={locked ? -1 : 0}
								aria-pressed={!locked && selected}
								aria-disabled={locked || undefined}
								aria-label={
									locked
										? `${map.name} (Lv.${map.unlockLevel}에서 해금)`
										: `스테이지 ${map.name}`
								}
								onClick={() => {
									if (locked) return;
									setSelectedMapId(map.id);
								}}
								onKeyDown={(e) => {
									if (locked) return;
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										setSelectedMapId(map.id);
									}
								}}
								className={cn(
									'relative flex-none w-[90px] p-1.5 text-center border-2',
									{
										'bg-[rgba(240,208,96,0.15)] border-gold cursor-pointer':
											!locked && selected,
										'bg-[rgba(42,32,16,0.8)] border-border cursor-pointer':
											!locked && !selected,
										'bg-[rgba(42,32,16,0.5)] border-border/50 opacity-60 grayscale':
											locked,
									},
								)}
							>
								<div className="relative">
									<img
										src={STAGE_THUMBNAILS[map.id]}
										alt={map.name}
										className="w-[78px] h-[44px] object-cover [image-rendering:pixelated]"
									/>
									{locked && (
										<div className="absolute inset-0 flex items-center justify-center bg-black/40">
											<span className="font-pixel text-[10px] text-gold">
												Lv.{map.unlockLevel}
											</span>
										</div>
									)}
								</div>
								<p
									className={cn('font-pixel text-[11px] mt-[3px]', {
										'text-gold': !locked && selected,
										'text-text': !locked && !selected,
										'text-text-secondary': locked,
									})}
								>
									{map.name}
								</p>
								<p className="font-pixel text-[8px] text-text-secondary mt-[3px]">
									{'★'.repeat(stars)}
									{'☆'.repeat(3 - stars)}
								</p>
							</div>
						);
					})}
				</div>

				{/* Deck preview */}
				<div className="flex items-center gap-1.5 px-2.5 py-2 bg-[rgba(42,32,16,0.85)] border border-border">
					<div className="flex gap-1 flex-1">
						{selectedDeck.map((id) => {
							const tower = ALL_TOWERS.find((t) => t.id === id);
							if (!tower) return null;
							return (
								<div
									key={id}
									className="flex-1 p-1 bg-panel border border-border flex flex-col items-center gap-[3px]"
								>
									<img
										src={`assets/towers/${tower.type}.webp`}
										alt={tower.name}
										width={32}
										height={32}
										className="[image-rendering:pixelated]"
									/>
									<span className="font-pixel text-[9px] text-text-secondary text-center overflow-hidden max-w-full whitespace-nowrap text-ellipsis">
										{tower.name}
									</span>
								</div>
							);
						})}
					</div>
					<PixelButton
						variant="secondary"
						style={{ fontSize: '11px', padding: '6px 8px', flexShrink: 0 }}
						onClick={() => setShowDeckEdit(true)}
					>
						덱 편집
					</PixelButton>
				</div>

				{/* Battle CTA card */}
				<div className="flex flex-col gap-2 p-3.5 bg-[rgba(42,32,16,0.9)] border-2 border-gold shadow-[0_0_20px_rgba(240,208,96,0.15),4px_4px_0px_#4a3a20]">
					<span className="font-pixel text-[15px] text-text">성벽 막기</span>

					<PixelButton
						variant="gold"
						onClick={() => {
							resetRun();
						}}
						style={{
							width: '100%',
							padding: '14px 20px',
							fontSize: '15px',
							boxShadow:
								'0 0 0 1px rgba(240,208,96,0.28), 0 12px 24px rgba(240,208,96,0.14)',
						}}
					>
						게임 시작
					</PixelButton>
				</div>
			</div>

			<DeckEditSheet
				open={showDeckEdit}
				onClose={() => setShowDeckEdit(false)}
			/>
		</div>
	);
}
