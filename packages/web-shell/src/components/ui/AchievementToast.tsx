import type { AchievementDef } from '@gld/shared';

export function AchievementToast({ achievement }: { achievement: AchievementDef }) {
	return (
		<div
			className="font-pixel flex items-center gap-2 px-3 py-2 border"
			style={{
				background: 'rgba(42,32,16,0.95)',
				borderColor: '#c8a04a',
				animation: 'slideDown 0.3s ease-out',
			}}
		>
			<span className="text-[10px] text-text">🏆 {achievement.name}</span>
			<span className="text-[10px] text-gold">💎 {achievement.reward.diamond}</span>
		</div>
	);
}
