import { xpToNextLevel } from '@gld/shared';
import { useEffect, useRef, useState } from 'react';
import { uiMobileArt } from '../../assets/uiMobileArt';
import { useMetaStore } from '../../stores/metaStore';

function useAnimatedGold() {
	const gold = useMetaStore((s) => s.profile.gold);
	const [display, setDisplay] = useState(gold);
	const rafRef = useRef(0);
	const displayRef = useRef(display);
	displayRef.current = display;

	useEffect(() => {
		const from = displayRef.current;
		if (from === gold) return;
		const start = performance.now();
		const duration = 500;
		const tick = (now: number) => {
			const t = Math.min((now - start) / duration, 1);
			const eased = 1 - (1 - t) ** 3; // easeOutCubic
			const val = Math.round(from + (gold - from) * eased);
			setDisplay(val);
			displayRef.current = val;
			if (t < 1) rafRef.current = requestAnimationFrame(tick);
		};
		rafRef.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafRef.current);
	}, [gold]);

	return display;
}

export function ProfileBar() {
	const profile = useMetaStore((s) => s.profile);
	const displayGold = useAnimatedGold();
	const xpNeeded = xpToNextLevel(profile.level);
	const xpProgress = xpNeeded > 0 ? profile.xp / xpNeeded : 0;

	return (
		<div
			className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border"
			style={{ background: 'rgba(42, 32, 16, 0.85)' }}
		>
			{/* Avatar + Nickname + XP bar */}
			<img
				src={uiMobileArt.profileAvatar}
				alt="profile"
				width={36}
				height={36}
				className="shrink-0 [image-rendering:pixelated]"
			/>
			<div className="flex flex-col gap-0.5 min-w-0 flex-1">
				<span className="font-pixel text-[13px] text-text overflow-hidden text-ellipsis whitespace-nowrap">
					{profile.nickname}
				</span>
				<span className="font-pixel text-[11px] text-text-secondary">
					Lv.{profile.level}
				</span>
				{/* XP progress bar */}
				<div
					className="w-full h-[3px] rounded-[1px] overflow-hidden"
					style={{ background: 'rgba(0,0,0,0.3)' }}
				>
					<div
						className="h-full bg-gold transition-[width] duration-300 ease-[ease]"
						style={{ width: `${Math.min(100, xpProgress * 100)}%` }}
					/>
				</div>
			</div>

			{/* Currency: Gold + Diamond */}
			<div className="flex flex-col items-end gap-1 shrink-0">
				<div className="flex items-center gap-1">
					<img
						src={uiMobileArt.coinIcon}
						alt="gold"
						width={14}
						height={14}
						className="[image-rendering:pixelated]"
					/>
					<span className="font-pixel text-[11px] text-gold">
						{displayGold.toLocaleString()}
					</span>
				</div>
				<div className="flex items-center gap-1">
					<span className="text-[12px] leading-none">💎</span>
					<span className="font-pixel text-[11px] text-[#5bc8e8]">
						{profile.diamond.toLocaleString()}
					</span>
				</div>
			</div>
		</div>
	);
}
