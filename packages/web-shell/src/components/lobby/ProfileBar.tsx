import { xpToNextLevel } from '@gld/shared';
import { useEffect, useRef, useState } from 'react';
import { uiMobileArt } from '../../assets/uiMobileArt';
import { useMetaStore } from '../../stores/metaStore';
import { colors, fonts } from '../../styles/tokens';

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
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: '10px',
				padding: '10px 14px',
				background: 'rgba(42, 32, 16, 0.85)',
				borderBottom: `1px solid ${colors.border}`,
			}}
		>
			{/* Avatar + Nickname + XP bar */}
			<img
				src={uiMobileArt.profileAvatar}
				alt="profile"
				width={36}
				height={36}
				style={{ imageRendering: 'pixelated', flexShrink: 0 }}
			/>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '2px',
					minWidth: 0,
					flex: '1 1 0',
				}}
			>
				<span
					style={{
						fontFamily: fonts.pixel,
						fontSize: '9px',
						color: colors.text,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{profile.nickname}
				</span>
				<span
					style={{
						fontFamily: fonts.pixel,
						fontSize: '7px',
						color: colors.textSecondary,
					}}
				>
					Lv.{profile.level}
				</span>
				{/* XP progress bar */}
				<div
					style={{
						width: '100%',
						height: '3px',
						background: 'rgba(0,0,0,0.3)',
						borderRadius: '1px',
						overflow: 'hidden',
					}}
				>
					<div
						style={{
							width: `${Math.min(100, xpProgress * 100)}%`,
							height: '100%',
							background: colors.gold,
							transition: 'width 0.3s ease',
						}}
					/>
				</div>
			</div>

			{/* Wins */}
			<div
				className="profile-currency"
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '4px',
					flexShrink: 0,
				}}
			>
				<img
					src={uiMobileArt.trophyIcon}
					alt="wins"
					width={18}
					height={18}
					style={{ imageRendering: 'pixelated' }}
				/>
				<span
					style={{
						fontFamily: fonts.pixel,
						fontSize: '8px',
						color: colors.accent,
					}}
				>
					{profile.wins}
				</span>
			</div>

			{/* Gold */}
			<div
				className="profile-currency"
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '4px',
					flexShrink: 0,
				}}
			>
				<img
					src={uiMobileArt.coinIcon}
					alt="gold"
					width={18}
					height={18}
					style={{ imageRendering: 'pixelated' }}
				/>
				<span
					style={{
						fontFamily: fonts.pixel,
						fontSize: '8px',
						color: colors.gold,
					}}
				>
					{displayGold.toLocaleString()}
				</span>
			</div>
		</div>
	);
}
