import {
	CC_AURA_CONFIGS,
	enhancementCost,
	GLOBAL_RANGE_THRESHOLD,
	getEffectiveStats,
	maxLevelForGrade,
	PROMOTION_CONFIG,
	stunCooldownMultiplier,
	stunDurationMultiplier,
	type TowerDef,
	type TowerGrade,
} from '@gld/shared';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../../../stores/gameStore';
import { useMetaStore } from '../../../../stores/metaStore';
import { colors } from '../../../../styles/tokens';
import { PixelButton } from '../../../ui/PixelButton';
import {
	ELEMENT_COLORS,
	ELEMENT_NAMES,
	GRADE_BORDER,
	TIER_DOT_KEYS,
	translateSpecial,
} from './constants';
import { GradePromotionOverlay } from './GradePromotionOverlay';
import { StatDisplay } from './StatDisplay';

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
	const promoteTower = useMetaStore((s) => s.promoteTower);
	const pushToast = useGameStore((s) => s.pushToast);
	const [promoting, setPromoting] = useState(false);
	const [promotionResult, setPromotionResult] = useState<
		'success' | 'fail' | null
	>(null);
	const [promotion, setPromotion] = useState<{
		to: TowerGrade;
	} | null>(null);
	const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

	useEffect(() => {
		return () => {
			for (const t of timersRef.current) clearTimeout(t);
			timersRef.current.length = 0;
		};
	}, []);

	const handleEnhance = () => {
		const result = enhanceTower(def.id);
		if (result === 'no_gold') {
			pushToast('골드가 부족합니다', 'warning');
		} else if (result === 'max_level') {
			pushToast('이미 최대 레벨입니다', 'info');
		}
	};

	const handlePromote = () => {
		if (!owned || promoting || promotion) return;
		// Clear stale timers from previous attempts
		for (const t of timersRef.current) clearTimeout(t);
		timersRef.current.length = 0;
		setPromoting(true);
		setPromotionResult(null);
		const rollTimer = setTimeout(() => {
			const result = promoteTower(def.id);
			setPromoting(false);
			if (result === 'success') {
				setPromotionResult('success');
				setPromotion({
					to: promoConfig.nextGrade as TowerGrade,
				});
				pushToast('승급 성공!', 'success');
			} else if (result === 'fail') {
				setPromotionResult('fail');
				pushToast('승급 실패... 골드만 소모되었습니다', 'warning');
			} else if (result === 'no_gold') {
				pushToast('골드가 부족합니다', 'warning');
			} else if (result === 'level_too_low') {
				pushToast(
					`Lv.${promoConfig.requiredLevel} 이상이어야 승급할 수 있습니다`,
					'warning',
				);
			}
			const clearTimer = setTimeout(() => setPromotionResult(null), 1500);
			timersRef.current.push(clearTimer);
		}, 1000);
		timersRef.current.push(rollTimer);
	};

	const level = owned?.level ?? 1;
	const grade = owned?.grade ?? 'normal';
	const gradeMax = maxLevelForGrade(grade);
	const effectiveDmg = getEffectiveStats(def.stats.damage, level, grade);
	const nextLevelDmg =
		level < gradeMax
			? getEffectiveStats(def.stats.damage, level + 1, grade)
			: effectiveDmg;
	const cost = owned ? enhancementCost(level, def.tier, grade) : 0;
	const canEnhance = owned && level < gradeMax && profile.gold >= cost;
	const promoConfig = PROMOTION_CONFIG[grade];
	const meetsLevelReq = promoConfig.nextGrade
		? level >= promoConfig.requiredLevel
		: true;

	return (
		<div
			className="absolute bottom-0 left-0 right-0 z-5 flex flex-col gap-2.5 bg-[rgba(26,18,8,0.96)] p-4 animate-[slideUp_0.2s_ease-out]"
			style={{
				borderTop: `2px solid ${owned ? GRADE_BORDER[grade] : elementColor}`,
			}}
		>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<img
						src={`assets/towers/${def.type}.webp`}
						alt={def.name}
						width={32}
						height={32}
						className="[image-rendering:pixelated]"
					/>
					<span className="font-pixel text-sm text-text">{def.name}</span>
					<div className="flex gap-0.5">
						{TIER_DOT_KEYS.slice(0, def.tier).map((dotKey) => (
							<img
								key={`${def.id}-detail-${dotKey}`}
								src="assets/ui/icon-star-active.png"
								alt=""
								width={10}
								height={10}
								className="[image-rendering:pixelated]"
							/>
						))}
					</div>
					{owned && (
						<span
							className="font-pixel text-[11px]"
							style={{ color: GRADE_BORDER[grade] }}
						>
							{grade.toUpperCase()} Lv.{level}/{gradeMax}
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
					// Active stun towers (fortress) use attackInterval as stun cadence,
					// passive stun towers (shield/holy_shrine/divine_throne) use CC cooldown.
					// Runtime scales duration for all stun towers and cooldown for passive only.
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

			{/* Enhancement section */}
			{owned && (
				<div
					className="flex flex-col gap-2 bg-[rgba(42,32,16,0.6)] p-2"
					style={{
						border: `1px solid ${colors.border}`,
					}}
				>
					{level < gradeMax ? (
						<>
							{(() => {
								const special = def.stats.special;
								const configKey = special?.replace(/%/g, '') ?? '';
								const cfg = CC_AURA_CONFIGS[configKey];
								const isStun = !!special?.startsWith('stun');
								const isActiveStun = isStun && def.stats.attackSpeed > 0;
								const isPassiveStun = isStun && def.stats.attackSpeed === 0;

								const curDur =
									cfg && isStun
										? cfg.durationMs * stunDurationMultiplier(level)
										: undefined;
								const nextDur =
									cfg && isStun
										? cfg.durationMs * stunDurationMultiplier(level + 1)
										: undefined;
								const curCd =
									cfg && isPassiveStun
										? cfg.cooldownMs * stunCooldownMultiplier(level)
										: undefined;
								const nextCd =
									cfg && isPassiveStun
										? cfg.cooldownMs * stunCooldownMultiplier(level + 1)
										: undefined;

								const fmt = (ms: number) => `${(ms / 1000).toFixed(2)}s`;
								const showDamageRow = def.stats.damage > 0;
								const showStunRow = isStun && !!cfg;

								return (
									<div className="flex flex-col gap-0.5 font-pixel text-[11px]">
										{/* Row 1: damage (only if damage > 0) */}
										{showDamageRow && (
											<div className="flex justify-between">
												<span className="text-text-secondary">
													공격력: {effectiveDmg.toFixed(1)} →{' '}
													<span className="text-success">
														{nextLevelDmg.toFixed(1)}
													</span>
												</span>
												<span className="text-text-secondary">
													Lv.{level}/{gradeMax}
												</span>
											</div>
										)}

										{/* Row 2: stun duration (all stun towers) */}
										{showStunRow &&
											curDur !== undefined &&
											nextDur !== undefined && (
												<div className="flex justify-between">
													<span className="text-text-secondary">
														스턴 지속: {fmt(curDur)} →{' '}
														<span className="text-success">{fmt(nextDur)}</span>
													</span>
													{!showDamageRow && (
														<span className="text-text-secondary">
															Lv.{level}/{gradeMax}
														</span>
													)}
												</div>
											)}

										{/* Row 3: stun cooldown (passive stun only; active uses attackSpeed) */}
										{showStunRow &&
											isPassiveStun &&
											curCd !== undefined &&
											nextCd !== undefined && (
												<div className="flex justify-between">
													<span className="text-text-secondary">
														스턴 쿨: {fmt(curCd)} →{' '}
														<span className="text-success">{fmt(nextCd)}</span>
													</span>
												</div>
											)}

										{/* Info note: active stun (fortress) — cadence tied to attackSpeed, not scaled */}
										{showStunRow && isActiveStun && (
											<span className="text-[10px] text-text-secondary opacity-70">
												* 발동 주기는 공속 기반(고정)
											</span>
										)}

										{/* Info note: slow towers — slow factor/duration not yet scaled */}
										{special?.includes('slow') && !isStun && showDamageRow && (
											<span className="text-[10px] text-text-secondary opacity-70">
												* 슬로우 효과는 레벨에 따라 변하지 않음
											</span>
										)}

										{/* Fallback: pure-slow towers (damage=0 + slow, e.g. stasis_field) and any future special-only tower */}
										{!showDamageRow && !showStunRow && (
											<div className="flex justify-between">
												<span className="text-text-secondary">
													{special?.includes('slow')
														? '슬로우 효과 강화'
														: '특수 효과 강화'}
												</span>
												<span className="text-text-secondary">
													Lv.{level}/{gradeMax}
												</span>
											</div>
										)}
									</div>
								);
							})()}
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
							{promoConfig.nextGrade
								? `강화 한도 (Lv.${gradeMax}) — 승급 필요`
								: `최대 레벨 (Lv.${gradeMax})`}
						</span>
					)}
				</div>
			)}

			{/* Promotion section */}
			{owned && promoConfig.nextGrade && (
				<div
					className="flex flex-col gap-2 bg-[rgba(42,32,16,0.6)] p-2"
					style={{
						border: `1px solid ${GRADE_BORDER[grade]}`,
						animation:
							promotionResult === 'success'
								? 'promotionSuccess 0.5s ease'
								: promotionResult === 'fail'
									? 'promotionFail 0.3s ease'
									: promoting
										? 'promotionRoll 0.5s ease-in-out infinite'
										: undefined,
					}}
				>
					<div className="flex justify-between font-pixel text-[11px]">
						<span className="text-text-secondary">
							등급: <span style={{ color: GRADE_BORDER[grade] }}>{grade}</span>{' '}
							→{' '}
							<span
								style={{
									color: GRADE_BORDER[promoConfig.nextGrade as TowerGrade],
								}}
							>
								{promoConfig.nextGrade}
							</span>
						</span>
						<span className="text-text-secondary">
							성공률 {(promoConfig.successRate * 100).toFixed(0)}%
						</span>
					</div>
					{!meetsLevelReq && (
						<div className="flex items-center gap-1 font-pixel text-[10px]">
							<img
								src="assets/ui/icon-locked.webp"
								alt="잠김"
								width={10}
								height={10}
								className="[image-rendering:pixelated]"
							/>
							<span style={{ color: colors.danger }}>
								Lv.{level} / {promoConfig.requiredLevel} —{' '}
								{promoConfig.requiredLevel - level}레벨 더 필요
							</span>
						</div>
					)}
					<PixelButton
						variant="secondary"
						style={{ width: '100%', fontSize: '12px' }}
						onClick={handlePromote}
						disabled={
							promoting || profile.gold < promoConfig.goldCost || !meetsLevelReq
						}
					>
						{promoting ? '승급 중...' : `승급 시도 (${promoConfig.goldCost}G)`}
					</PixelButton>
				</div>
			)}

			{owned && !promoConfig.nextGrade && (
				<div className="p-2 text-center">
					<span
						className="font-pixel text-[11px]"
						style={{ color: GRADE_BORDER.epic }}
					>
						최고 등급
					</span>
				</div>
			)}

			{!owned && (
				<span className="text-center font-pixel text-[11px] text-text-secondary">
					소환의 제단에서 타워를 획득하세요!
				</span>
			)}
			{promotion && (
				<GradePromotionOverlay
					toGrade={promotion.to}
					towerId={def.id}
					onDone={() => setPromotion(null)}
				/>
			)}
		</div>
	);
}
