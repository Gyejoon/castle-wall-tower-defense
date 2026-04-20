import { UNITS } from '@gld/shared';
import type { BossHpEntry } from '../../stores/gameStore';
import { cn } from '../../utils/cn';

const UNIT_NAME_MAP = new Map(UNITS.map((u) => [u.id, u.name]));

interface BossHpBarProps {
	entry: BossHpEntry;
}

export function BossHpBar({ entry }: BossHpBarProps) {
	const pct = entry.maxHp > 0 ? Math.max(0, entry.hp / entry.maxHp) * 100 : 0;
	const barColor = entry.phase === 2 ? '#c03020' : '#c87020';
	const phaseLabel = entry.phase === 2 ? 'Phase 2' : 'Phase 1';

	return (
		<div
			className="w-full flex flex-col gap-[3px] px-2.5 py-2"
			style={{
				background:
					'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 100%)',
			}}
		>
			<div className="flex justify-between items-center">
				<span
					className={cn(
						'font-pixel text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]',
						entry.phase === 2 ? 'text-danger' : 'text-gold',
					)}
				>
					{UNIT_NAME_MAP.get(entry.defId) ?? entry.defId}
				</span>
				<span className="font-pixel text-[11px] text-text drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
					{phaseLabel} — {Math.floor(entry.hp)}/{Math.floor(entry.maxHp)}
				</span>
			</div>
			<div
				className="w-full h-[5px] overflow-hidden"
				style={{
					background: 'rgba(0,0,0,0.35)',
					boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
				}}
			>
				<div
					className="h-full transition-[width] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
					style={{
						width: `${pct}%`,
						background: `linear-gradient(180deg, ${barColor} 0%, ${barColor}cc 100%)`,
						boxShadow: `0 0 6px ${barColor}88`,
						animation:
							entry.phase === 2
								? 'bossBarPulse 0.8s ease-in-out infinite'
								: undefined,
					}}
				/>
			</div>
		</div>
	);
}
