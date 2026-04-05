import { ALL_TOWERS, TIER_NAMES } from '@gld/shared';
import { useCallback, useState } from 'react';
import { colors, fonts } from '../styles/tokens';
import { PixelButton } from './ui/PixelButton';

const GACHA_BOXES = [
	{
		id: 'free',
		label: '무료 상자',
		cost: 0,
		image: 'assets/ui/gacha-box-free.png',
	},
	{
		id: 'ad',
		label: '광고 상자',
		cost: 0,
		image: 'assets/ui/gacha-box-ad.png',
	},
	{
		id: 'diamond',
		label: '다이아 상자',
		cost: 100,
		image: 'assets/ui/gacha-box-diamond.png',
	},
	{
		id: 'premium',
		label: '프리미엄 상자',
		cost: 300,
		image: 'assets/ui/gacha-box-premium.png',
	},
] as const;

const TIER_COLORS: Record<string, string> = {
	common: colors.text,
	rare: '#5bc8e8',
	heroic: '#9060e0',
	legendary: '#f0d060',
	god: '#ff6b4a',
};

interface RevealedTower {
	id: string;
	name: string;
	tier: number;
	tierName: string;
	isNew: boolean;
}

function rollRandomTower(): RevealedTower {
	const weights = [60, 25, 10, 4, 1];
	const roll = Math.random() * 100;
	let cumulative = 0;
	let targetTier = 1;
	for (let i = 0; i < weights.length; i++) {
		cumulative += weights[i];
		if (roll < cumulative) {
			targetTier = i + 1;
			break;
		}
	}
	const candidates = ALL_TOWERS.filter((t) => t.tier === targetTier);
	const tower = candidates[Math.floor(Math.random() * candidates.length)];
	const tierName = TIER_NAMES[tower.tier] ?? 'common';
	return {
		id: tower.id,
		name: tower.name,
		tier: tower.tier,
		tierName,
		isNew: Math.random() < 0.3,
	};
}

interface GachaScreenProps {
	onClose: () => void;
}

export function GachaScreen({ onClose }: GachaScreenProps) {
	const [selectedBox, setSelectedBox] = useState<string | null>(null);
	const [phase, setPhase] = useState<'select' | 'opening' | 'reveal'>('select');
	const [revealed, setRevealed] = useState<RevealedTower | null>(null);

	const handleOpen = useCallback(() => {
		if (!selectedBox) return;
		setPhase('opening');
		setTimeout(() => {
			const tower = rollRandomTower();
			setRevealed(tower);
			setPhase('reveal');
		}, 1500);
	}, [selectedBox]);

	const handleCollect = useCallback(() => {
		setPhase('select');
		setRevealed(null);
		setSelectedBox(null);
	}, []);

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 10,
				background: 'rgba(10, 8, 4, 0.92)',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: '16px',
				padding: '20px',
			}}
		>
			<h2
				style={{
					color: colors.gold,
					fontFamily: fonts.pixel,
					fontSize: '18px',
				}}
			>
				소환의 제단
			</h2>

			{phase === 'opening' && (
				<div
					style={{
						width: '120px',
						height: '120px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<img
						src="assets/ui/gacha-box-open.png"
						alt="Opening"
						style={{
							width: '64px',
							height: '64px',
							imageRendering: 'pixelated',
							animation: 'pulse 0.5s ease-in-out infinite',
						}}
					/>
				</div>
			)}

			{phase === 'reveal' && revealed && (
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: '12px',
						animation: 'fadeIn 500ms ease-out',
					}}
				>
					<div style={{ position: 'relative' }}>
						<img
							src={`assets/ui/rarity-frame-${revealed.tierName}.png`}
							alt={revealed.tierName}
							style={{
								width: '80px',
								height: '80px',
								imageRendering: 'pixelated',
								position: 'absolute',
								top: '-8px',
								left: '-8px',
							}}
						/>
						<img
							src={`assets/towers/${revealed.id}.png`}
							alt={revealed.name}
							style={{
								width: '64px',
								height: '64px',
								imageRendering: 'pixelated',
								position: 'relative',
								zIndex: 1,
							}}
						/>
						{revealed.isNew && (
							<img
								src="assets/ui/badge-new.png"
								alt="NEW"
								style={{
									width: '24px',
									height: '24px',
									imageRendering: 'pixelated',
									position: 'absolute',
									top: '-6px',
									right: '-6px',
									zIndex: 2,
								}}
							/>
						)}
					</div>
					<p
						style={{
							fontFamily: fonts.pixel,
							fontSize: '14px',
							color: TIER_COLORS[revealed.tierName] ?? colors.text,
						}}
					>
						{revealed.name}
					</p>
					<p
						style={{
							fontFamily: fonts.pixel,
							fontSize: '11px',
							color: colors.textSecondary,
							textTransform: 'uppercase',
						}}
					>
						{revealed.tierName}
					</p>
					<PixelButton variant="gold" onClick={handleCollect}>
						수령
					</PixelButton>
				</div>
			)}

			{phase === 'select' && (
				<>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(2, 1fr)',
							gap: '12px',
						}}
					>
						{GACHA_BOXES.map((box) => (
							<div
								key={box.id}
								onClick={() => setSelectedBox(box.id)}
								style={{
									padding: '8px',
									border: `2px solid ${selectedBox === box.id ? colors.gold : colors.border}`,
									background:
										selectedBox === box.id
											? 'rgba(240,208,96,0.1)'
											: 'rgba(42,32,16,0.9)',
									cursor: 'pointer',
									textAlign: 'center',
								}}
							>
								<img
									src={box.image}
									alt={box.label}
									style={{
										width: '48px',
										height: '48px',
										imageRendering: 'pixelated',
									}}
								/>
								<p
									style={{
										fontFamily: fonts.pixel,
										fontSize: '12px',
										color: colors.text,
										marginTop: '4px',
									}}
								>
									{box.label}
								</p>
								{box.cost > 0 && (
									<p
										style={{
											fontFamily: fonts.pixel,
											fontSize: '11px',
											color: colors.gold,
										}}
									>
										{box.cost}
									</p>
								)}
							</div>
						))}
					</div>

					<div style={{ display: 'flex', gap: '8px' }}>
						<PixelButton
							variant="gold"
							onClick={handleOpen}
							style={{ opacity: selectedBox ? 1 : 0.4 }}
						>
							열기
						</PixelButton>
						<PixelButton variant="secondary" onClick={onClose}>
							닫기
						</PixelButton>
					</div>
				</>
			)}

			{phase !== 'select' && phase !== 'reveal' && (
				<PixelButton variant="secondary" onClick={onClose}>
					닫기
				</PixelButton>
			)}
		</div>
	);
}
