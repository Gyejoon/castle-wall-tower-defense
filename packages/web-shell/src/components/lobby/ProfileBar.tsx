import { xpToNextLevel } from '@gld/shared';
import { useEffect, useRef, useState } from 'react';
import { uiMobileArt } from '../../assets/uiMobileArt';
import { AVATAR_PRESETS } from '../../data/avatarPresets';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';
import { useMetaStore } from '../../stores/metaStore';
import { DiamondIcon } from '../ui/CurrencyIcon';

const AVATAR_LABEL_BY_KEY = new Map(
	AVATAR_PRESETS.map((p) => [p.key, p.label]),
);

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

	const authProfile = useAuthStore((s) => s.profile);
	const authUserId = useAuthStore((s) => s.userId);

	const signedIn = authUserId !== null;
	const displayNickname = authProfile?.nickname ?? profile.nickname;
	const avatarLabel = authProfile
		? (AVATAR_LABEL_BY_KEY.get(authProfile.avatarKey) ??
			authProfile.nickname.slice(0, 2))
		: null;

	const onIdentityClick = () => {
		if (signedIn) {
			useGameStore.getState().openProfilePage(true);
		} else {
			useAuthStore.getState().openAuthModal(true);
		}
	};

	return (
		<div
			className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border"
			style={{ background: 'var(--color-panel-85)' }}
		>
			{/* Avatar + Nickname + XP bar — clickable region */}
			<button
				type="button"
				onClick={onIdentityClick}
				aria-label={signedIn ? '프로필 열기' : '로그인'}
				className="flex items-center gap-2.5 min-w-0 flex-1 min-h-[44px] bg-transparent border-none text-left cursor-pointer"
			>
				{authProfile ? (
					<span
						className="w-9 h-9 shrink-0 border border-border bg-bg flex items-center justify-center"
						aria-hidden="true"
					>
						<span className="font-pixel text-[8px] text-text-secondary text-center leading-none whitespace-normal px-0.5">
							{avatarLabel}
						</span>
					</span>
				) : (
					<img
						src={uiMobileArt.profileAvatar}
						alt=""
						width={36}
						height={36}
						className="shrink-0 [image-rendering:pixelated]"
						aria-hidden="true"
					/>
				)}
				<span className="flex flex-col gap-0.5 min-w-0 flex-1">
					<span className="flex items-center gap-1.5 min-w-0">
						<span className="font-pixel text-[13px] text-text overflow-hidden text-ellipsis whitespace-nowrap">
							{displayNickname}
						</span>
						{!signedIn && (
							<span className="font-pixel text-[10px] text-accent shrink-0">
								로그인
							</span>
						)}
					</span>
					<span className="font-pixel text-[11px] text-text-secondary">
						Lv.{profile.level}
					</span>
					{/* XP progress bar */}
					<span
						className="block w-full h-[3px] rounded-[1px] overflow-hidden"
						style={{ background: 'rgba(0,0,0,0.3)' }}
					>
						<span
							className="block h-full bg-gold transition-[width] duration-300 ease-[ease]"
							style={{ width: `${Math.min(100, xpProgress * 100)}%` }}
						/>
					</span>
				</span>
			</button>

			{/* Currency: Gold + Diamond — preserved */}
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
					<DiamondIcon />
					<span className="font-pixel text-[11px] text-info">
						{profile.diamond.toLocaleString()}
					</span>
				</div>
			</div>
		</div>
	);
}
