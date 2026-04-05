import { useGameStore } from '../../stores/gameStore';
import { colors, fonts } from '../../styles/tokens';

export function BossHpBar() {
	const bossHp = useGameStore((s) => s.bossHp);

	if (!bossHp.visible) return null;

	const pct =
		bossHp.maxHp > 0 ? Math.max(0, bossHp.hp / bossHp.maxHp) * 100 : 0;
	const barColor = bossHp.phase === 2 ? '#c03020' : '#c87020';
	const phaseLabel = bossHp.phase === 2 ? 'Phase 2' : 'Phase 1';

	return (
		<div
			style={{
				position: 'absolute',
				top: '6px',
				left: '50%',
				transform: 'translateX(-50%)',
				zIndex: 3,
				width: 'min(80vw, 300px)',
				background: 'rgba(26,18,8,0.88)',
				border: `1px solid ${colors.border}`,
				boxShadow: '2px 2px 0px rgba(0,0,0,0.4)',
				padding: '5px 8px',
				display: 'flex',
				flexDirection: 'column',
				gap: '3px',
			}}
		>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
				}}
			>
				<span
					style={{
						fontFamily: fonts.pixel,
						fontSize: '8px',
						color: bossHp.phase === 2 ? colors.danger : colors.gold,
					}}
				>
					고대 드래곤
				</span>
				<span
					style={{
						fontFamily: fonts.pixel,
						fontSize: '7px',
						color: colors.textSecondary,
					}}
				>
					{phaseLabel}
				</span>
			</div>
			<div
				style={{
					width: '100%',
					height: '8px',
					background: 'rgba(0,0,0,0.5)',
					border: `1px solid ${colors.border}`,
					overflow: 'hidden',
				}}
			>
				<div
					style={{
						width: `${pct}%`,
						height: '100%',
						background: barColor,
						transition: 'width 0.2s ease',
						animation:
							bossHp.phase === 2
								? 'bossBarPulse 0.8s ease-in-out infinite'
								: undefined,
					}}
				/>
			</div>
			<div
				style={{
					fontFamily: fonts.pixel,
					fontSize: '7px',
					color: colors.textSecondary,
					textAlign: 'right',
				}}
			>
				{bossHp.hp}/{bossHp.maxHp}
			</div>
			<style>{`
				@keyframes bossBarPulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.6; }
				}
			`}</style>
		</div>
	);
}
