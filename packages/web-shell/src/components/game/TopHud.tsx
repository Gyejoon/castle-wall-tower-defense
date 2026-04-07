import { ENERGY_CAP } from '@gld/shared';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';
import { BossHpBar } from './BossHpBar';

/** Increments a counter each time `value` changes, used as a React key to replay CSS animations.
 *  Returns 0 on initial mount (no animation), 1+ on subsequent changes. */
function useFlashKey(value: number): number {
	const prevRef = useRef(value);
	const mountedRef = useRef(false);
	const [key, setKey] = useState(0);
	useEffect(() => {
		if (!mountedRef.current) {
			mountedRef.current = true;
			return;
		}
		if (prevRef.current !== value) {
			prevRef.current = value;
			setKey((k) => k + 1);
		}
	}, [value]);
	return key;
}

function formatTimerLabel(rawLabel: string) {
	if (rawLabel.startsWith('Boss')) return rawLabel.replace('Boss', '보스');
	if (rawLabel.startsWith('Wave')) return rawLabel.replace('Wave', '웨이브');
	return rawLabel;
}

interface TopHudProps {
	lives: number;
	energy: number;
	isBossPhase: boolean;
	combatHud: { bossWarning: boolean; phase: string; timerLabel: string };
	waitCountdown: number;
	gameSpeed: number;
	speed2xUnlocked: boolean;
	runStatus: string;
	onToggleSpeed: () => void;
	bossHpVisible: boolean;
}

export function TopHud({
	lives,
	energy,
	isBossPhase,
	combatHud,
	waitCountdown,
	gameSpeed,
	speed2xUnlocked,
	runStatus,
	onToggleSpeed,
	bossHpVisible,
}: TopHudProps) {
	const hpFlash = useFlashKey(lives);

	return (
		<div
			data-testid="top-hud"
			className="flex shrink-0 flex-col border-b border-border"
			style={{ background: 'rgba(42, 32, 16, 0.92)' }}
		>
			{/* 첫 번째 행: 항상 고정 */}
			<div
				data-testid="top-hud-row"
				className="flex flex-nowrap items-center gap-1.5 overflow-hidden whitespace-nowrap px-3 py-2.5"
			>
				<div
					key={`hp-${hpFlash}`}
					className={cn(
						'shrink-0 overflow-hidden text-ellipsis border border-border px-[7px] py-[5px] font-pixel text-sm text-danger shadow-[2px_2px_0px_rgba(0,0,0,0.25)]',
						hpFlash > 0 && 'hud-flash',
					)}
					style={{ background: 'rgba(192,48,32,0.16)' }}
				>
					HP {lives}
				</div>
				<div
					className="flex min-w-[70px] shrink-0 items-center gap-1 overflow-hidden text-ellipsis border border-border px-[7px] py-[5px] font-pixel text-sm text-gold shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
					style={{ background: 'rgba(240,208,96,0.16)' }}
				>
					<span className="inline-flex items-center gap-[2px]">
						<img
							src="assets/ui/icon-energy.webp"
							alt=""
							width={10}
							height={10}
							className="[image-rendering:pixelated]"
						/>
						{energy}
					</span>
					<div
						className="flex-1 overflow-hidden rounded-sm"
						style={{ height: '4px', background: 'rgba(0,0,0,0.3)' }}
					>
						<div
							className={cn(
								'h-full transition-[width] duration-300 ease-out',
								energy >= ENERGY_CAP ? 'bg-success' : 'bg-gold',
							)}
							style={{
								width: `${Math.min(100, (energy / ENERGY_CAP) * 100)}%`,
							}}
						/>
					</div>
				</div>
				<div
					data-testid="hud-timer"
					className={cn(
						'shrink-0 overflow-hidden text-ellipsis border border-border px-[7px] py-[5px] font-pixel text-sm shadow-[2px_2px_0px_rgba(0,0,0,0.25)]',
						isBossPhase ? 'text-gold' : 'text-text',
					)}
					style={{
						background: isBossPhase
							? 'rgba(240,208,96,0.16)'
							: 'rgba(42,32,16,0.82)',
					}}
				>
					{combatHud.bossWarning
						? '보스 임박'
						: combatHud.phase === 'waiting' && waitCountdown > 0
							? `다음 ${waitCountdown}s`
							: formatTimerLabel(combatHud.timerLabel)}
				</div>
				{runStatus === 'running' && speed2xUnlocked && (
					<button
						className="ml-auto font-pixel text-[11px] px-2 py-0.5 border border-border text-text-secondary"
						style={{
							background:
								gameSpeed === 2 ? 'rgba(200,112,32,0.3)' : 'rgba(26,18,8,0.7)',
						}}
						onClick={onToggleSpeed}
					>
						{gameSpeed === 2 ? '2x ▶▶' : '1x ▶'}
					</button>
				)}
			</div>
			{/* 두 번째 행: 보스 체력바 (나타날 때 첫 행에 영향 없음) */}
			{bossHpVisible && (
				<div className="px-3 pb-2">
					<BossHpBar />
				</div>
			)}
		</div>
	);
}
