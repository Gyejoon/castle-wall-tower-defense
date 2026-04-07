import { ENERGY_CAP } from '@gld/shared';
import { cn } from '../../utils/cn';

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
}

export function TopHud({
	lives,
	energy,
	isBossPhase,
	combatHud,
	waitCountdown,
}: TopHudProps) {
	return (
		<div
			data-testid="top-hud"
			className="flex shrink-0 flex-nowrap items-center gap-1.5 overflow-hidden whitespace-nowrap border-b border-border bg-panel-92 px-3 py-2.5"
		>
			<div className="shrink-0 overflow-hidden text-ellipsis border border-border bg-[rgba(192,48,32,0.16)] px-[7px] py-[5px] font-pixel text-sm text-danger shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
				HP {lives}
			</div>
			<div className="flex min-w-[70px] shrink-0 items-center gap-1 overflow-hidden text-ellipsis border border-border bg-[rgba(240,208,96,0.16)] px-[7px] py-[5px] font-pixel text-sm text-gold shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
				<span>⚡{energy}</span>
				<div className="h-1 flex-1 overflow-hidden rounded-sm bg-black/30">
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
		</div>
	);
}
