import type { OwnedTower, TowerDef } from '@gld/shared';
import { cn } from '../../../../utils/cn';
import { towerAssetSrc } from '../../../common/TowerIcon';

/**
 * Phase 1: grade borders were dropped alongside the grade system. Collection
 * cards now show a simple tier badge (T1..T6) in place of the old grade halo.
 * Phase 9 will rebuild richer visual treatment (tier-specific colors, merge
 * preview, etc.) once the meta loop design is locked.
 */
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
	const tier = owned?.tier ?? def.tier;
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				'flex cursor-pointer flex-col items-center gap-1 px-1.5 py-2.5 touch-manipulation border border-border',
				locked ? 'bg-bg-76 opacity-50' : 'bg-panel-85',
			)}
		>
			<div className="flex gap-[3px]">
				<span className="font-pixel text-[9px] text-text-secondary">
					T{tier}
				</span>
			</div>
			<img
				src={towerAssetSrc(def.id)}
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
				<span className="font-pixel text-[9px] text-text-secondary">
					Lv.{owned.level}
				</span>
			)}
		</button>
	);
}
