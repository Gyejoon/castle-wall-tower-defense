import { ALL_TOWERS, type TowerDef } from '@gld/shared';
import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { colors, fonts } from '../../styles/tokens';
import { PixelButton } from '../ui/PixelButton';

interface DeckEditSheetProps {
	open: boolean;
	onClose: () => void;
}

const TIER_LABELS: Record<number, string> = {
	1: '일반',
	2: '레어',
	3: '영웅',
	4: '전설',
	5: '신',
};

const TIER_COLORS: Record<number, string> = {
	1: colors.textSecondary,
	2: '#5bc8e8',
	3: '#c060f0',
	4: colors.gold,
	5: '#ffe870',
};

function TowerShape({
	shape,
	color,
	size = 16,
}: {
	shape: TowerDef['shape'];
	color: string;
	size?: number;
}) {
	const half = size / 2;
	switch (shape) {
		case 'circle':
			return (
				<svg width={size} height={size} style={{ flexShrink: 0 }}>
					<circle cx={half} cy={half} r={half - 1} fill={color} />
				</svg>
			);
		case 'hexagon': {
			const pts = Array.from({ length: 6 }, (_, i) => {
				const a = (Math.PI / 3) * i - Math.PI / 6;
				return `${half + (half - 1) * Math.cos(a)},${half + (half - 1) * Math.sin(a)}`;
			}).join(' ');
			return (
				<svg width={size} height={size} style={{ flexShrink: 0 }}>
					<polygon points={pts} fill={color} />
				</svg>
			);
		}
		case 'shield':
			return (
				<svg width={size} height={size} style={{ flexShrink: 0 }}>
					<path
						d={`M${half},2 L${size - 2},${size * 0.35} L${size - 2},${size * 0.6} L${half},${size - 1} L2,${size * 0.6} L2,${size * 0.35} Z`}
						fill={color}
					/>
				</svg>
			);
		case 'star': {
			const outerR = half - 1;
			const innerR = outerR * 0.45;
			const starPts = Array.from({ length: 10 }, (_, i) => {
				const a = (Math.PI / 5) * i - Math.PI / 2;
				const r = i % 2 === 0 ? outerR : innerR;
				return `${half + r * Math.cos(a)},${half + r * Math.sin(a)}`;
			}).join(' ');
			return (
				<svg width={size} height={size} style={{ flexShrink: 0 }}>
					<polygon points={starPts} fill={color} />
				</svg>
			);
		}
		default: // diamond
			return (
				<svg width={size} height={size} style={{ flexShrink: 0 }}>
					<polygon
						points={`${half},1 ${size - 1},${half} ${half},${size - 1} 1,${half}`}
						fill={color}
					/>
				</svg>
			);
	}
}

const TOWERS_BY_TIER: Array<{ tier: number; towers: TowerDef[] }> = [1, 2, 3, 4, 5].map(
	(tier) => ({
		tier,
		towers: ALL_TOWERS.filter((t) => t.tier === tier),
	}),
);

export function DeckEditSheet({ open, onClose }: DeckEditSheetProps) {
	const savedDeck = useGameStore((s) => s.selectedDeck);
	const setSelectedDeck = useGameStore((s) => s.setSelectedDeck);
	const [selected, setSelected] = useState<string[]>([...savedDeck]);

	if (!open) return null;

	const toggle = (id: string) => {
		setSelected((prev) => {
			if (prev.includes(id)) {
				return prev.filter((x) => x !== id);
			}
			if (prev.length >= 4) return prev;
			return [...prev, id];
		});
	};

	const handleConfirm = () => {
		if (selected.length === 4) {
			setSelectedDeck(selected);
		}
		onClose();
	};

	const handleClose = () => {
		setSelected([...savedDeck]);
		onClose();
	};

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 200,
				background: 'rgba(10, 8, 4, 0.88)',
				display: 'flex',
				flexDirection: 'column',
			}}
		>
			{/* Header */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '14px 16px 10px',
					borderBottom: `1px solid ${colors.border}`,
					background: colors.panel,
					flexShrink: 0,
				}}
			>
				<span
					style={{
						fontFamily: fonts.pixel,
						fontSize: '12px',
						color: colors.gold,
					}}
				>
					덱 편집
				</span>
				<button
					type="button"
					aria-label="닫기"
					onClick={handleClose}
					style={{
						background: 'none',
						border: `1px solid ${colors.border}`,
						color: colors.textSecondary,
						fontFamily: fonts.pixel,
						fontSize: '10px',
						cursor: 'pointer',
						padding: '4px 8px',
					}}
				>
					✕
				</button>
			</div>

			{/* Tower list */}
			<div
				style={{
					flex: 1,
					overflowY: 'auto',
					padding: '12px 16px',
					display: 'flex',
					flexDirection: 'column',
					gap: '16px',
				}}
			>
				{TOWERS_BY_TIER.map(({ tier, towers }) => (
					<div key={tier}>
						<div
							style={{
								fontFamily: fonts.pixel,
								fontSize: '8px',
								color: TIER_COLORS[tier],
								marginBottom: '8px',
								letterSpacing: '1px',
							}}
						>
							T{tier} {TIER_LABELS[tier]}
						</div>
						<div
							style={{
								display: 'grid',
								gridTemplateColumns: 'repeat(2, 1fr)',
								gap: '6px',
							}}
						>
							{towers.map((tower) => {
								const isSelected = selected.includes(tower.id);
								const slotNum = selected.indexOf(tower.id) + 1;
								const isFull = selected.length >= 4 && !isSelected;

								return (
									<button
										key={tower.id}
										type="button"
										onClick={() => !isFull && toggle(tower.id)}
										style={{
											position: 'relative',
											display: 'flex',
											alignItems: 'center',
											gap: '8px',
											padding: '8px 10px',
											background: isSelected
												? 'rgba(240,208,96,0.12)'
												: colors.panel,
											border: `2px solid ${isSelected ? colors.gold : colors.border}`,
											boxShadow: isSelected
												? `0 0 6px rgba(240,208,96,0.3)`
												: 'none',
											cursor: isFull ? 'not-allowed' : 'pointer',
											opacity: isFull ? 0.4 : 1,
											textAlign: 'left',
										}}
									>
										{isSelected && (
											<span
												style={{
													position: 'absolute',
													top: 3,
													right: 5,
													fontFamily: fonts.pixel,
													fontSize: '8px',
													color: colors.gold,
												}}
											>
												{slotNum}
											</span>
										)}
										<TowerShape shape={tower.shape} color={tower.color} size={18} />
										<div
											style={{
												display: 'flex',
												flexDirection: 'column',
												gap: '2px',
												minWidth: 0,
											}}
										>
											<span
												style={{
													fontFamily: fonts.pixel,
													fontSize: '8px',
													color: isSelected ? colors.gold : colors.text,
													whiteSpace: 'nowrap',
													overflow: 'hidden',
													textOverflow: 'ellipsis',
												}}
											>
												{tower.name}
											</span>
											<span
												style={{
													fontFamily: fonts.pixel,
													fontSize: '7px',
													color: colors.textSecondary,
												}}
											>
												⚡{tower.cost}
											</span>
										</div>
									</button>
								);
							})}
						</div>
					</div>
				))}
			</div>

			{/* Bottom preview + confirm */}
			<div
				style={{
					flexShrink: 0,
					padding: '12px 16px',
					background: colors.panel,
					borderTop: `2px solid ${colors.border}`,
					display: 'flex',
					flexDirection: 'column',
					gap: '10px',
				}}
			>
				{/* 4 slot preview */}
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(4, 1fr)',
						gap: '6px',
					}}
				>
					{Array.from({ length: 4 }, (_, i) => {
						const towerId = selected[i];
						const tower = towerId ? ALL_TOWERS.find((t) => t.id === towerId) : null;
						return (
							<div
								key={i}
								style={{
									height: '52px',
									border: `2px solid ${tower ? colors.gold : colors.border}`,
									background: tower ? 'rgba(240,208,96,0.08)' : 'rgba(42,32,16,0.6)',
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									justifyContent: 'center',
									gap: '4px',
									padding: '4px',
								}}
							>
								{tower ? (
									<>
										<TowerShape shape={tower.shape} color={tower.color} size={16} />
										<span
											style={{
												fontFamily: fonts.pixel,
												fontSize: '6px',
												color: colors.gold,
												textAlign: 'center',
												overflow: 'hidden',
												maxWidth: '100%',
												whiteSpace: 'nowrap',
												textOverflow: 'ellipsis',
											}}
										>
											{tower.name}
										</span>
									</>
								) : (
									<span
										style={{
											fontFamily: fonts.pixel,
											fontSize: '8px',
											color: colors.border,
										}}
									>
										{i + 1}
									</span>
								)}
							</div>
						);
					})}
				</div>

				<PixelButton
					variant="gold"
					disabled={selected.length !== 4}
					onClick={handleConfirm}
					style={{ width: '100%', fontSize: '10px', padding: '12px' }}
				>
					확인 ({selected.length}/4)
				</PixelButton>
			</div>
		</div>
	);
}
