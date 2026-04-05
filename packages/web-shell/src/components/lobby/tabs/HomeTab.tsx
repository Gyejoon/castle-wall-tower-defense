import { ALL_TOWERS, MAP_REGISTRY } from '@gld/shared';
import { useState } from 'react';
import { uiMobileArt } from '../../../assets/uiMobileArt';
import { useGameStore } from '../../../stores/gameStore';
import { cn } from '../../../utils/cn';
import { PixelButton } from '../../ui/PixelButton';
import { DeckEditSheet } from '../DeckEditSheet';
import { TabBackground } from '../TabBackground';

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
	const [showDeckEdit, setShowDeckEdit] = useState(false);

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
					{Object.values(MAP_REGISTRY).map((map) => (
						<div
							key={map.id}
							role="button"
							tabIndex={0}
							aria-pressed={selectedMapId === map.id}
							aria-label={`스테이지 ${map.name}`}
							onClick={() => setSelectedMapId(map.id)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									setSelectedMapId(map.id);
								}
							}}
							className={cn(
								'flex-none w-[90px] p-1.5 cursor-pointer text-center border-2',
								selectedMapId === map.id
									? 'bg-[rgba(240,208,96,0.15)] border-gold'
									: 'bg-[rgba(42,32,16,0.8)] border-border',
							)}
						>
							<img
								src={STAGE_THUMBNAILS[map.id]}
								alt={map.name}
								className="w-[78px] h-[44px] object-cover [image-rendering:pixelated]"
							/>
							<p
								className={cn(
									'font-pixel text-[11px] mt-0.5',
									selectedMapId === map.id ? 'text-gold' : 'text-text',
								)}
							>
								{map.name}
							</p>
						</div>
					))}
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
									className="flex-1 p-1 bg-panel border border-border flex flex-col items-center gap-0.5"
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
				<div
					className="flex flex-col gap-2 p-3.5 bg-[rgba(42,32,16,0.9)] border-2 border-gold shadow-[0_0_20px_rgba(240,208,96,0.15),4px_4px_0px_#4a3a20]"
				>
					<span className="font-pixel text-[15px] text-text">
						성벽 막기
					</span>

					<PixelButton
						variant="gold"
						onClick={() => {
							resetRun();
						}}
						style={{
							width: '100%',
							padding: '14px 20px',
							fontSize: '15px',
							boxShadow: '0 0 0 1px rgba(240,208,96,0.28), 0 12px 24px rgba(240,208,96,0.14)',
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
