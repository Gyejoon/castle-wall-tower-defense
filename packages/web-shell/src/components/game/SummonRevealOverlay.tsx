import { EventBus } from '@gld/phaser-game';
import { ALL_TOWERS, type TowerId } from '@gld/shared';
import { useEffect, useRef, useState } from 'react';

const TOWER_INFO = new Map(
	ALL_TOWERS.map((t) => [t.id, { name: t.name, family: t.family }]),
);

interface PendingReveal {
	towerId: string;
	source: 'summon' | 'gacha';
	/** monotonic key so repeated reveals re-trigger the timer/animation */
	key: number;
}

/**
 * Phase 8 Task 8.3 — transient celebration overlay that surfaces each
 * Phase A summon/gacha result for 2 seconds before fading out.
 *
 * [F21] timer lives in a useRef so rapid successive `phase-a-summon-ready`
 *       events don't leak stale setTimeout handles.
 */
export function SummonRevealOverlay() {
	const [pending, setPending] = useState<PendingReveal | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const counterRef = useRef(0);

	useEffect(() => {
		const handleReady = (data: {
			towerId: TowerId;
			source: 'summon' | 'gacha';
		}) => {
			counterRef.current += 1;
			setPending({
				towerId: data.towerId,
				source: data.source,
				key: counterRef.current,
			});
		};
		EventBus.on('phase-a-summon-ready', handleReady);
		return () => {
			EventBus.off('phase-a-summon-ready', handleReady);
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, []);

	useEffect(() => {
		if (!pending) return;
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => {
			setPending(null);
			timerRef.current = null;
		}, 2000);
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [pending]);

	if (!pending) return null;

	const info = TOWER_INFO.get(pending.towerId as TowerId);
	const name = info?.name ?? pending.towerId;
	const family = info?.family ?? '';
	const sourceLabel = pending.source === 'gacha' ? '✨ 가챠' : '🎲 소환';
	const towerThumb = `assets/towers/${pending.towerId}.webp`;

	return (
		<div
			key={pending.key}
			data-testid="summon-reveal-overlay"
			className="absolute inset-0 z-[6] flex items-center justify-center pointer-events-none"
			style={{
				animation: 'fadeIn 220ms ease-out',
				background: 'var(--color-overlay-60)',
			}}
		>
			<div
				className="flex flex-col items-center gap-2 border-2 px-6 py-4 rounded-sm"
				style={{
					background: 'var(--color-panel-95)',
					borderColor: 'var(--color-gold)',
					boxShadow: '0 0 12px var(--color-accent-20)',
				}}
			>
				<span
					data-testid="summon-reveal-source"
					className="font-pixel text-[10px] text-accent tracking-wider"
				>
					{sourceLabel}
				</span>
				<img
					src={towerThumb}
					alt=""
					width={40}
					height={40}
					className="[image-rendering:pixelated]"
					onError={(e) => {
						// Phase 11 redesigns placeholders; for now hide the <img>
						// if the sprite isn't on disk instead of showing broken alt.
						(e.currentTarget as HTMLImageElement).style.display = 'none';
					}}
				/>
				<span
					data-testid="summon-reveal-name"
					className="font-pixel text-[13px] text-gold"
				>
					{name}
				</span>
				{family && (
					<span className="font-pixel text-[9px] text-text-secondary">
						{family}
					</span>
				)}
			</div>
		</div>
	);
}
