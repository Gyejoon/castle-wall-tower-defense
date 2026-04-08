import type { AchievementDef } from '@gld/shared';
import { DiamondIcon } from './CurrencyIcon';

export function AchievementToast({
	achievement,
}: {
	achievement: AchievementDef;
}) {
	return (
		<div
			className="font-pixel flex items-center gap-2 px-3 py-2 border"
			style={{
				background: 'var(--color-panel-96)',
				borderColor: 'var(--color-accent)',
				animation: 'slideDown 0.3s ease-out',
			}}
		>
			<span className="text-[10px] text-text">{achievement.name}</span>
			<span className="text-[10px] text-gold inline-flex items-center gap-0.5">
				<DiamondIcon size={10} /> {achievement.reward.diamond}
			</span>
		</div>
	);
}
