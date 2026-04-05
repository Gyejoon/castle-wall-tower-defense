import { ALL_TOWERS, MAP_REGISTRY } from '@gld/shared';
import { useState } from 'react';
import { uiMobileArt } from '../../../assets/uiMobileArt';
import { useGameStore } from '../../../stores/gameStore';
import { colors, fonts } from '../../../styles/tokens';
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
			style={{ position: 'relative', flex: 1, overflow: 'hidden' }}
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
				style={{
					position: 'relative',
					zIndex: 1,
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'flex-end',
					height: '100%',
					padding: '16px',
					gap: '12px',
					background:
						'linear-gradient(180deg, transparent 0%, transparent 40%, rgba(26,18,8,0.7) 70%, rgba(26,18,8,0.92) 100%)',
				}}
			>
				{/* Stage selection */}
				<div
					style={{
						display: 'flex',
						gap: '6px',
						overflowX: 'auto',
						padding: '2px',
					}}
				>
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
							style={{
								flex: '0 0 auto',
								width: '90px',
								padding: '6px',
								background:
									selectedMapId === map.id
										? 'rgba(240,208,96,0.15)'
										: 'rgba(42,32,16,0.8)',
								border: `2px solid ${selectedMapId === map.id ? colors.gold : colors.border}`,
								cursor: 'pointer',
								textAlign: 'center',
							}}
						>
							<img
								src={STAGE_THUMBNAILS[map.id]}
								alt={map.name}
								style={{
									width: '78px',
									height: '44px',
									objectFit: 'cover',
									imageRendering: 'pixelated',
								}}
							/>
							<p
								style={{
									fontFamily: fonts.pixel,
									fontSize: '11px',
									color: selectedMapId === map.id ? colors.gold : colors.text,
									marginTop: '3px',
								}}
							>
								{map.name}
							</p>
						</div>
					))}
				</div>

				{/* Deck preview */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '6px',
						padding: '8px 10px',
						background: 'rgba(42, 32, 16, 0.85)',
						border: `1px solid ${colors.border}`,
					}}
				>
					<div
						style={{
							display: 'flex',
							gap: '4px',
							flex: 1,
						}}
					>
						{selectedDeck.map((id) => {
							const tower = ALL_TOWERS.find((t) => t.id === id);
							if (!tower) return null;
							return (
								<div
									key={id}
									style={{
										flex: 1,
										padding: '4px',
										background: colors.panel,
										border: `1px solid ${colors.border}`,
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: '3px',
									}}
								>
									<img
										src={`assets/towers/${tower.type}.webp`}
										alt={tower.name}
										width={32}
										height={32}
										style={{ imageRendering: 'pixelated' }}
									/>
									<span
										style={{
											fontFamily: fonts.pixel,
											fontSize: '9px',
											color: colors.textSecondary,
											textAlign: 'center',
											overflow: 'hidden',
											maxWidth: '100%',
											whiteSpace: 'nowrap',
											textOverflow: 'ellipsis',
										}}
									>
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
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '8px',
						padding: '14px',
						background: 'rgba(42, 32, 16, 0.9)',
						border: `2px solid ${colors.gold}`,
						boxShadow: `0 0 20px rgba(240, 208, 96, 0.15), 4px 4px 0px ${colors.border}`,
					}}
				>
					<span
						style={{
							fontFamily: fonts.pixel,
							fontSize: '15px',
							color: colors.text,
						}}
					>
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
							boxShadow: `0 0 0 1px rgba(240,208,96,0.28), 0 12px 24px rgba(240,208,96,0.14)`,
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


