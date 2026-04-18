import {
	CC_AURA_CONFIGS,
	enhancementCost,
	GLOBAL_RANGE_THRESHOLD,
	getEffectiveStats,
	MAX_TOWER_LEVEL,
	stunCooldownMultiplier,
	stunDurationMultiplier,
	type TowerDef,
} from '@gld/shared';
import { useGameStore } from '../../../../stores/gameStore';
import { useMetaStore } from '../../../../stores/metaStore';
import { colors } from '../../../../styles/tokens';
import { PixelButton } from '../../../ui/PixelButton';
import { ELEMENT_COLORS, ELEMENT_NAMES, translateSpecial } from './constants';
import { StatDisplay } from './StatDisplay';

/**
 * Phase 1: grade promotion UI is gone — this sheet now just shows stats
 * and a flat-level enhancement action. Phase 9 will rebuild richer
 * tower-detail UI (merge preview, tier progression, awakening).
 */
export function TowerBottomSheet({
	def,
	onClose,
}: {
	def: TowerDef;
	onClose: () => void;
}) {
	const elementColor = ELEMENT_COLORS[def.element];
	const profile = useMetaStore((s) => s.profile);
	const owned = useMetaStore((s) =>
		s.collection.find((t) => t.defId === def.id),
	);
	const enhanceTower = useMetaStore((s) => s.enhanceTower);
	const pushToast = useGameStore((s) => s.pushToast);

	const handleEnhance = () => {
		const result = enhanceTower(def.id);
		if (result === 'no_gold') {
			pushToast('골드가 부족합니다', 'warning');
		} else if (result === 'max_level') {
			pushToast('이미 최대 레벨입니다', 'info');
		}
	};

	const level = owned?.level ?? 1;
	const tier = owned?.tier ?? def.tier;
	const effectiveDmg = getEffectiveStats(def.stats.damage, level);
	const nextLevelDmg =
		level < MAX_TOWER_LEVEL
			? getEffectiveStats(def.stats.damage, level + 1)
			: effectiveDmg;
	const cost = owned ? enhancementCost(level, tier) : 0;
	const canEnhance = owned && level < MAX_TOWER_LEVEL && profile.gold >= cost;

	return (
		<div
			className="absolute bottom-0 left-0 right-0 z-5 flex flex-col gap-2.5 bg-[rgba(26,18,8,0.96)] p-4 animate-[slideUp_0.2s_ease-out]"
			style={{
				borderTop: `2px solid ${elementColor}`,
			}}
		>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<img
						src={`assets/towers/${def.id}.webp`}
						alt={def.name}
						width={32}
						height={32}
						className="[image-rendering:pixelated]"
					/>
					<span className="font-pixel text-sm text-text">{def.name}</span>
					<span className="font-pixel text-[11px] text-text-secondary">
						T{tier}
					</span>
					{owned && (
						<span className="font-pixel text-[11px] text-text-secondary">
							Lv.{level}/{MAX_TOWER_LEVEL}
						</span>
					)}
				</div>
				<button
					type="button"
					onClick={onClose}
					className="cursor-pointer border-none bg-transparent px-2 py-1 font-pixel text-sm text-text-secondary"
				>
					X
				</button>
			</div>

			{/* Stats */}
			<div className="flex gap-4">
				<StatDisplay
					label="공격력"
					value={effectiveDmg.toFixed(1)}
					color={colors.danger}
				/>
				<StatDisplay
					label="공속"
					value={`${def.stats.attackSpeed}s`}
					color={colors.info}
				/>
				<StatDisplay
					label="사거리"
					value={
						def.stats.range >= GLOBAL_RANGE_THRESHOLD
							? '전체 맵'
							: String(def.stats.range)
					}
					color={colors.textSecondary}
				/>
				<StatDisplay
					label="속성"
					value={ELEMENT_NAMES[def.element]}
					color={elementColor}
				/>
				{!def.stats.special && def.stats.attackSpeed > 0 && (
					<StatDisplay
						label="방어 무시"
						value="적용"
						color={colors.armorPierce}
					/>
				)}
			</div>

			{def.stats.special &&
				(() => {
					const special = def.stats.special;
					const configKey = special.replace(/%/g, '');
					const cfg = CC_AURA_CONFIGS[configKey];
					const isStun = special.startsWith('stun');
					const isActiveStun = isStun && def.stats.attackSpeed > 0;
					const scaledDurationMs =
						cfg && isStun
							? cfg.durationMs * stunDurationMultiplier(level)
							: cfg?.durationMs;
					const scaledCooldownMs =
						cfg && isActiveStun
							? 1000 / def.stats.attackSpeed
							: cfg && isStun
								? cfg.cooldownMs * stunCooldownMultiplier(level)
								: cfg?.cooldownMs;
					return (
						<div className="flex flex-col gap-1">
							<p className="font-pixel text-[11px] leading-[1.6] text-accent">
								특수: {translateSpecial(special)}
							</p>
							{cfg && (
								<p
									className="font-pixel text-[10px] leading-[1.4]"
									style={{ color: colors.textSecondary }}
								>
									{isStun ? '스턴' : '슬로우'}{' '}
									{((scaledDurationMs ?? 0) / 1000).toFixed(1)}s / 쿨{' '}
									{((scaledCooldownMs ?? 0) / 1000).toFixed(1)}s /{' '}
									{cfg.aoe ? '광역' : '단일'}
								</p>
							)}
						</div>
					);
				})()}

			{/* Enhancement section (flat-level) */}
			{owned && (
				<div
					className="flex flex-col gap-2 bg-[rgba(42,32,16,0.6)] p-2"
					style={{
						border: `1px solid ${colors.border}`,
					}}
				>
					{level < MAX_TOWER_LEVEL ? (
						<>
							<div className="flex flex-col gap-0.5 font-pixel text-[11px]">
								<div className="flex justify-between">
									<span className="text-text-secondary">
										공격력: {effectiveDmg.toFixed(1)} →{' '}
										<span className="text-success">
											{nextLevelDmg.toFixed(1)}
										</span>
									</span>
									<span className="text-text-secondary">
										Lv.{level}/{MAX_TOWER_LEVEL}
									</span>
								</div>
							</div>
							<PixelButton
								variant="gold"
								style={{ width: '100%', fontSize: '12px' }}
								onClick={handleEnhance}
								disabled={!canEnhance}
							>
								강화 ({cost}G)
							</PixelButton>
						</>
					) : (
						<span className="text-center font-pixel text-[11px] text-gold">
							최대 레벨 (Lv.{MAX_TOWER_LEVEL})
						</span>
					)}
				</div>
			)}

			{!owned && (
				<span className="text-center font-pixel text-[11px] text-text-secondary">
					소환의 제단에서 타워를 획득하세요!
				</span>
			)}
		</div>
	);
}
