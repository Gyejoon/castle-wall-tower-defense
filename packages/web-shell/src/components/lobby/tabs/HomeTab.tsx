import { ALL_TOWERS, MAP_REGISTRY } from '@gld/shared';
import { useState } from 'react';
import { uiMobileArt } from '../../../assets/uiMobileArt';
import { MOCK_PROFILE } from '../../../data/mockLobbyData';
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
				{/* Record strip */}
				<div
					style={{
						display: 'flex',
						justifyContent: 'center',
						gap: '16px',
						padding: '8px 12px',
						background: 'rgba(42, 32, 16, 0.8)',
						border: `1px solid ${colors.border}`,
					}}
				>
					<StatBadge
						label="승"
						value={MOCK_PROFILE.wins}
						color={colors.success}
					/>
					<StatBadge
						label="패"
						value={MOCK_PROFILE.losses}
						color={colors.danger}
					/>
					<StatBadge
						label="승률"
						value={`${MOCK_PROFILE.winRate}%`}
						color={colors.accent}
					/>
					<StatBadge
						label="연승"
						value={MOCK_PROFILE.winStreak}
						color={colors.gold}
					/>
				</div>

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
									fontSize: '7px',
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
									<span style={{ fontSize: '10px' }}>
										{shapeChar(tower.shape, tower.color)}
									</span>
									<span
										style={{
											fontFamily: fonts.pixel,
											fontSize: '5px',
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
						style={{ fontSize: '7px', padding: '6px 8px', flexShrink: 0 }}
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
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
						}}
					>
						<span
							style={{
								fontFamily: fonts.pixel,
								fontSize: '11px',
								color: colors.text,
							}}
						>
							PVE 생존
						</span>
						<span
							style={{
								fontFamily: fonts.pixel,
								fontSize: '7px',
								color: colors.textSecondary,
							}}
						>
							싱글 플레이
						</span>
					</div>

					<PixelButton
						variant="gold"
						onClick={() => {
							resetRun();
						}}
						style={{
							width: '100%',
							padding: '14px 20px',
							fontSize: '11px',
							boxShadow: `0 0 0 1px rgba(240,208,96,0.28), 0 12px 24px rgba(240,208,96,0.14)`,
						}}
					>
						즉시 시작
					</PixelButton>

					{/* Sub buttons */}
					<div style={{ display: 'flex', gap: '8px' }}>
						<PixelButton
							variant="secondary"
							style={{ flex: 1, fontSize: '7px', padding: '8px 10px' }}
							disabled
						>
							AI 연습
						</PixelButton>
						<PixelButton
							variant="secondary"
							style={{ flex: 1, fontSize: '7px', padding: '8px 10px' }}
							disabled
						>
							전적
						</PixelButton>
					</div>
				</div>
			</div>

			{/* Overlay icons (mock) */}
			<div
				style={{
					position: 'absolute',
					top: '12px',
					right: '12px',
					zIndex: 2,
					display: 'flex',
					gap: '8px',
				}}
			>
				<OverlayIcon label="우편" badge={3} />
				<OverlayIcon label="공지" badge={1} />
			</div>

			<DeckEditSheet
				open={showDeckEdit}
				onClose={() => setShowDeckEdit(false)}
			/>
		</div>
	);
}

function shapeChar(
	shape: 'diamond' | 'circle' | 'hexagon' | 'shield' | 'star',
	color: string,
): JSX.Element {
	const chars: Record<string, string> = {
		diamond: '◆',
		circle: '●',
		hexagon: '⬡',
		shield: '🛡',
		star: '★',
	};
	return <span style={{ color, fontSize: '10px' }}>{chars[shape] ?? '■'}</span>;
}

function StatBadge({
	label,
	value,
	color,
}: {
	label: string;
	value: string | number;
	color: string;
}) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: '2px',
			}}
		>
			<span style={{ fontFamily: fonts.pixel, fontSize: '10px', color }}>
				{value}
			</span>
			<span
				style={{
					fontFamily: fonts.pixel,
					fontSize: '6px',
					color: colors.textSecondary,
				}}
			>
				{label}
			</span>
		</div>
	);
}

function OverlayIcon({ label, badge }: { label: string; badge?: number }) {
	return (
		<div
			style={{
				position: 'relative',
				width: 36,
				height: 36,
				background: 'rgba(42, 32, 16, 0.8)',
				border: `1px solid ${colors.border}`,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				cursor: 'pointer',
			}}
		>
			<span
				style={{
					fontFamily: fonts.pixel,
					fontSize: '6px',
					color: colors.textSecondary,
				}}
			>
				{label}
			</span>
			{badge != null && badge > 0 && (
				<span
					style={{
						position: 'absolute',
						top: -4,
						right: -4,
						minWidth: 14,
						height: 14,
						background: colors.danger,
						color: '#fff',
						fontFamily: fonts.pixel,
						fontSize: '6px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						padding: '0 2px',
					}}
				>
					{badge}
				</span>
			)}
		</div>
	);
}
