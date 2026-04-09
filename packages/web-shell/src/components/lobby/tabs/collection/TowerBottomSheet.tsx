import {
	CC_AURA_CONFIGS,
	enhancementCost,
	GLOBAL_RANGE_THRESHOLD,
	getEffectiveStats,
	MAX_TOWER_LEVEL,
	PROMOTION_CONFIG,
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
	const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

	useEffect(() => {
		return () => {
			for (const t of timersRef.current) clearTimeout(t);
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
		if (!owned || promoting) return;
		setPromoting(true);
		setPromotionResult(null);
		const rollTimer = setTimeout(() => {
			const result = promoteTower(def.id);
			setPromoting(false);
			if (result === 'success') {
				setPromotionResult('success');
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
	const effectiveDmg = getEffectiveStats(def.stats.damage, level, grade);
	const nextLevelDmg =
		level < MAX_TOWER_LEVEL
			? getEffectiveStats(def.stats.damage, level + 1, grade)
			: effectiveDmg;
	const cost = owned ? enhancementCost(level, def.tier) : 0;
	const canEnhance = owned && level < MAX_TOWER_LEVEL && profile.gold >= cost;
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
							{grade.toUpperCase()} Lv.{level}
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
									{special.startsWith('stun') ? '스턴' : '슬로우'}{' '}
									{(cfg.durationMs / 1000).toFixed(1)}s / 쿨{' '}
									{(cfg.cooldownMs / 1000).toFixed(1)}s /{' '}
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
					{level < MAX_TOWER_LEVEL ? (
						<>
							<div className="flex justify-between font-pixel text-[11px]">
								<span className="text-text-secondary">
									공격력: {effectiveDmg.toFixed(1)} →{' '}
									<span className="text-success">
										{nextLevelDmg.toFixed(1)}
									</span>
								</span>
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
							최대 레벨
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
		</div>
	);
}
