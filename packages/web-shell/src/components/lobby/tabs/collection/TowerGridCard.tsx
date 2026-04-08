import type { OwnedTower, TowerDef } from '@gld/shared';
import { colors } from '../../../../styles/tokens';
import { cn } from '../../../../utils/cn';
import { GRADE_BORDER, TIER_DOT_KEYS } from './constants';

export function TowerGridCard({
	def,
	owned,
	locked,
	onClick,
}: {
	def: TowerDef;
	owned?: OwnedTower;
	locked?: boolean;
	onClick: () => void;
}) {
	const gradeBorder = owned ? GRADE_BORDER[owned.grade] : colors.border;

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				'flex cursor-pointer flex-col items-center gap-1 px-1.5 py-2.5 touch-manipulation',
				locked ? 'bg-bg-76 opacity-50' : 'bg-panel-85',
			)}
			style={{
				border: `1px solid ${locked ? colors.border : gradeBorder}`,
				boxShadow:
					owned?.grade === 'epic'
						? `0 0 8px ${GRADE_BORDER.epic}44`
						: undefined,
			}}
		>
			<div className="flex gap-[3px]">
				{TIER_DOT_KEYS.slice(0, def.tier).map((dotKey) => (
					<img
						key={`${def.id}-tier-${dotKey}`}
						src="assets/ui/icon-star-active.png"
						alt=""
						width={8}
						height={8}
						className="[image-rendering:pixelated]"
					/>
				))}
			</div>
			<img
				src={`assets/towers/${def.type}.webp`}
				alt={def.name}
				width={40}
				height={40}
				className="[image-rendering:pixelated]"
				style={{
					filter: locked ? 'brightness(0.4) grayscale(0.6)' : undefined,
				}}
			/>
			<span
				className={cn(
					'w-full overflow-hidden text-ellipsis whitespace-nowrap text-center font-pixel text-[10px] leading-[1.3]',
					locked ? 'text-text-secondary' : 'text-text',
				)}
			>
				{def.name}
			</span>
			{owned && (
				<span
					className="font-pixel text-[9px]"
					style={{ color: GRADE_BORDER[owned.grade] }}
				>
					Lv.{owned.level}
				</span>
			)}
		</button>
	);
}
