import { useGameStore } from '../../stores/gameStore';
import { cn } from '../../utils/cn';

export function BossHpBar() {
	const bossHp = useGameStore((s) => s.bossHp);

	if (!bossHp.visible) return null;

	const pct =
		bossHp.maxHp > 0 ? Math.max(0, bossHp.hp / bossHp.maxHp) * 100 : 0;
	const barColor = bossHp.phase === 2 ? '#c03020' : '#c87020';
	const phaseLabel = bossHp.phase === 2 ? 'Phase 2' : 'Phase 1';

	return (
		<div
			className="absolute top-1.5 left-1/2 -translate-x-1/2 z-[3] w-[min(80vw,300px)] border border-border shadow-[2px_2px_0px_rgba(0,0,0,0.4)] px-2 py-1.5 flex flex-col gap-[3px]"
			style={{ background: 'rgba(26,18,8,0.88)' }}
		>
			<div className="flex justify-between items-center">
				<span
					className={cn(
						'font-pixel text-xs',
						bossHp.phase === 2 ? 'text-danger' : 'text-gold',
					)}
				>
					고대 드래곤
				</span>
				<span className="font-pixel text-[11px] text-text-secondary">
					{phaseLabel}
				</span>
			</div>
			<div
				className="w-full h-2 border border-border overflow-hidden"
				style={{ background: 'rgba(0,0,0,0.5)' }}
			>
				<div
					className="h-full transition-[width] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
					style={{
						width: `${pct}%`,
						background: barColor,
						animation:
							bossHp.phase === 2
								? 'bossBarPulse 0.8s ease-in-out infinite'
								: undefined,
					}}
				/>
			</div>
			<div className="font-pixel text-[11px] text-text-secondary text-right">
				{bossHp.hp}/{bossHp.maxHp}
			</div>
		</div>
	);
}
