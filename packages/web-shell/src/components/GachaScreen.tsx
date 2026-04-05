import { ALL_TOWERS, TIER_NAMES } from '@gld/shared';
import { useCallback, useState } from 'react';
import { colors } from '../styles/tokens';
import { cn } from '../utils/cn';
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
		<div className="fixed inset-0 z-10 bg-[rgba(10,8,4,0.92)] flex flex-col items-center justify-center gap-4 p-5">
			<h2 className="text-gold font-pixel text-lg">소환의 제단</h2>

			{phase === 'opening' && (
				<div className="w-[120px] h-[120px] flex items-center justify-center">
					<img
						src="assets/ui/gacha-box-open.png"
						alt="Opening"
						className="w-16 h-16 [image-rendering:pixelated] animate-[gachaPulse_0.5s_ease-in-out_infinite]"
					/>
				</div>
			)}

			{phase === 'reveal' && revealed && (
				<div className="flex flex-col items-center gap-3 animate-[fadeIn_500ms_ease-out]">
					<div className="relative">
						<img
							src={`assets/ui/rarity-frame-${revealed.tierName}.png`}
							alt={revealed.tierName}
							className="w-20 h-20 [image-rendering:pixelated] absolute -top-2 -left-2"
						/>
						<img
							src={`assets/towers/${revealed.id}.png`}
							alt={revealed.name}
							className="w-16 h-16 [image-rendering:pixelated] relative z-1"
						/>
						{revealed.isNew && (
							<img
								src="assets/ui/badge-new.png"
								alt="NEW"
								className="w-6 h-6 [image-rendering:pixelated] absolute -top-1.5 -right-1.5 z-2"
							/>
						)}
					</div>
					<p
						className="font-pixel text-sm"
						style={{ color: TIER_COLORS[revealed.tierName] ?? colors.text }}
					>
						{revealed.name}
					</p>
					<p className="font-pixel text-[11px] text-text-secondary uppercase">
						{revealed.tierName}
					</p>
					<PixelButton variant="gold" onClick={handleCollect}>
						수령
					</PixelButton>
				</div>
			)}

			{phase === 'select' && (
				<>
					<div className="grid grid-cols-2 gap-3">
						{GACHA_BOXES.map((box) => (
							<div
								key={box.id}
								onClick={() => setSelectedBox(box.id)}
								className={cn(
									'p-2 border-2 cursor-pointer text-center',
									selectedBox === box.id
										? 'border-gold bg-[rgba(240,208,96,0.1)]'
										: 'border-border bg-[rgba(42,32,16,0.9)]',
								)}
							>
								<img
									src={box.image}
									alt={box.label}
									className="w-12 h-12 [image-rendering:pixelated]"
								/>
								<p className="font-pixel text-xs text-text mt-1">{box.label}</p>
								{box.cost > 0 && (
									<p className="font-pixel text-[11px] text-gold">{box.cost}</p>
								)}
							</div>
						))}
					</div>

					<div className="flex gap-2">
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
