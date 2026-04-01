import { useState } from 'react';
import { uiMobileArt } from '../../../assets/uiMobileArt';
import {
	ELEMENT_COLORS,
	MOCK_TOWERS,
	type TowerCard,
} from '../../../data/mockLobbyData';
import { colors, fonts } from '../../../styles/tokens';
import { TabBackground } from '../TabBackground';

const TIER_DOT_KEYS = [
	'tier-1',
	'tier-2',
	'tier-3',
	'tier-4',
	'tier-5',
] as const;

export function CollectionTab() {
	const [selectedTower, setSelectedTower] = useState<TowerCard | null>(null);
	const ownedTowers = MOCK_TOWERS.filter((t) => t.owned);
	const lockedTowers = MOCK_TOWERS.filter((t) => !t.owned);

	return (
		<div
			id="tabpanel-collection"
			role="tabpanel"
			aria-label="전쟁탁자"
			style={{
				position: 'relative',
				flex: 1,
				overflow: 'hidden',
				display: 'flex',
				flexDirection: 'column',
			}}
		>
			{/* Background */}
			<TabBackground
				src={uiMobileArt.wartableBg}
				gradient="linear-gradient(180deg, #2a2010 0%, #1a1208 100%)"
				overlayOpacity={0.3}
			/>

			{/* Content */}
			<div
				style={{
					position: 'relative',
					zIndex: 1,
					flex: 1,
					overflow: 'auto',
					padding: '12px',
					display: 'flex',
					flexDirection: 'column',
					gap: '12px',
				}}
			>
				{/* Header */}
				<div
					style={{
						display: 'flex',
						alignItems: 'baseline',
						justifyContent: 'space-between',
					}}
				>
					<span
						style={{
							fontFamily: fonts.pixel,
							fontSize: '10px',
							color: colors.text,
						}}
					>
						보유 타워
					</span>
					<span
						style={{
							fontFamily: fonts.pixel,
							fontSize: '7px',
							color: colors.textSecondary,
						}}
					>
						{ownedTowers.length}/{MOCK_TOWERS.length}
					</span>
				</div>

				{ownedTowers.length === 0 ? (
					<EmptyState />
				) : (
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
							gap: '8px',
						}}
					>
						{ownedTowers.map((tower) => (
							<TowerGridCard
								key={tower.id}
								tower={tower}
								onClick={() => setSelectedTower(tower)}
							/>
						))}
					</div>
				)}

				{lockedTowers.length > 0 && (
					<>
						<span
							style={{
								fontFamily: fonts.pixel,
								fontSize: '8px',
								color: colors.textSecondary,
								marginTop: '4px',
							}}
						>
							미획득
						</span>
						<div
							style={{
								display: 'grid',
								gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
								gap: '8px',
							}}
						>
							{lockedTowers.map((tower) => (
								<TowerGridCard
									key={tower.id}
									tower={tower}
									locked
									onClick={() => setSelectedTower(tower)}
								/>
							))}
						</div>
					</>
				)}
			</div>

			{/* Bottom sheet detail */}
			{selectedTower && (
				<TowerBottomSheet
					tower={selectedTower}
					onClose={() => setSelectedTower(null)}
				/>
			)}
		</div>
	);
}

function TowerGridCard({
	tower,
	locked,
	onClick,
}: {
	tower: TowerCard;
	locked?: boolean;
	onClick: () => void;
}) {
	const elementColor = ELEMENT_COLORS[tower.element];
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: '4px',
				padding: '10px 6px',
				background: locked ? 'rgba(26, 18, 8, 0.7)' : 'rgba(42, 32, 16, 0.85)',
				border: `1px solid ${locked ? colors.border : elementColor}`,
				opacity: locked ? 0.5 : 1,
				cursor: 'pointer',
				touchAction: 'manipulation',
			}}
		>
			{/* Tier dots */}
			<div style={{ display: 'flex', gap: '3px' }}>
				{TIER_DOT_KEYS.slice(0, tower.tier).map((dotKey) => (
					<span
						key={`${tower.id}-${dotKey}`}
						style={{
							width: 5,
							height: 5,
							background: colors.gold,
							display: 'block',
						}}
					/>
				))}
			</div>
			{/* Tower icon placeholder */}
			<div
				style={{
					width: 32,
					height: 32,
					background: `radial-gradient(circle, ${elementColor}44, transparent)`,
					border: `1px solid ${elementColor}66`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<span
					style={{
						fontFamily: fonts.pixel,
						fontSize: '6px',
						color: elementColor,
					}}
				>
					{tower.element.charAt(0).toUpperCase()}
				</span>
			</div>
			<span
				style={{
					fontFamily: fonts.pixel,
					fontSize: '6px',
					color: locked ? colors.textSecondary : colors.text,
					textAlign: 'center',
					lineHeight: 1.3,
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
					width: '100%',
				}}
			>
				{tower.nameKo}
			</span>
		</button>
	);
}

function TowerBottomSheet({
	tower,
	onClose,
}: {
	tower: TowerCard;
	onClose: () => void;
}) {
	const elementColor = ELEMENT_COLORS[tower.element];
	return (
		<div
			style={{
				position: 'absolute',
				bottom: 0,
				left: 0,
				right: 0,
				zIndex: 5,
				background: 'rgba(26, 18, 8, 0.96)',
				borderTop: `2px solid ${elementColor}`,
				padding: '16px',
				display: 'flex',
				flexDirection: 'column',
				gap: '10px',
				animation: 'slideUp 0.2s ease-out',
			}}
		>
			{/* Header */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<span
						style={{
							fontFamily: fonts.pixel,
							fontSize: '10px',
							color: colors.text,
						}}
					>
						{tower.nameKo}
					</span>
					<div style={{ display: 'flex', gap: '2px' }}>
						{TIER_DOT_KEYS.slice(0, tower.tier).map((dotKey) => (
							<span
								key={`${tower.id}-detail-${dotKey}`}
								style={{
									width: 5,
									height: 5,
									background: colors.gold,
									display: 'block',
								}}
							/>
						))}
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					style={{
						background: 'none',
						border: 'none',
						cursor: 'pointer',
						fontFamily: fonts.pixel,
						fontSize: '10px',
						color: colors.textSecondary,
						padding: '4px 8px',
					}}
				>
					X
				</button>
			</div>

			{/* Stats */}
			<div style={{ display: 'flex', gap: '16px' }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
					<span
						style={{
							fontFamily: fonts.pixel,
							fontSize: '6px',
							color: colors.textSecondary,
						}}
					>
						공격력
					</span>
					<span
						style={{
							fontFamily: fonts.pixel,
							fontSize: '9px',
							color: colors.danger,
						}}
					>
						{tower.attackDamage}
					</span>
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
					<span
						style={{
							fontFamily: fonts.pixel,
							fontSize: '6px',
							color: colors.textSecondary,
						}}
					>
						공속
					</span>
					<span
						style={{
							fontFamily: fonts.pixel,
							fontSize: '9px',
							color: colors.info,
						}}
					>
						{tower.attackSpeed}s
					</span>
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
					<span
						style={{
							fontFamily: fonts.pixel,
							fontSize: '6px',
							color: colors.textSecondary,
						}}
					>
						속성
					</span>
					<span
						style={{
							fontFamily: fonts.pixel,
							fontSize: '9px',
							color: elementColor,
						}}
					>
						{tower.element}
					</span>
				</div>
			</div>

			{/* Description */}
			<p
				style={{
					fontFamily: fonts.pixel,
					fontSize: '7px',
					color: colors.textSecondary,
					lineHeight: 1.6,
				}}
			>
				{tower.description}
			</p>

			{!tower.owned && (
				<span
					style={{
						fontFamily: fonts.pixel,
						fontSize: '7px',
						color: colors.textSecondary,
						textAlign: 'center',
					}}
				>
					전투에서 타워를 획득하세요!
				</span>
			)}
		</div>
	);
}

function EmptyState() {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				flex: 1,
				gap: '10px',
				padding: '40px 20px',
			}}
		>
			<span
				style={{
					fontFamily: fonts.pixel,
					fontSize: '9px',
					color: colors.textSecondary,
					textAlign: 'center',
					lineHeight: 1.8,
				}}
			>
				아직 타워가 없습니다.
				<br />
				전투에서 타워를 획득하세요!
			</span>
		</div>
	);
}
