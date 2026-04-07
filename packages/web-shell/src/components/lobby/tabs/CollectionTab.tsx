import type { OwnedTower } from '@gld/shared';
import {
	ALL_TOWERS,
	type ElementType,
	enhancementCost,
	getEffectiveStats,
	MAX_TOWER_LEVEL,
	PROMOTION_CONFIG,
	type TowerDef,
	type TowerGrade,
} from '@gld/shared';
import { useEffect, useRef, useState } from 'react';
import { uiMobileArt } from '../../../assets/uiMobileArt';
import { useGameStore } from '../../../stores/gameStore';
import { useMetaStore } from '../../../stores/metaStore';
import { colors } from '../../../styles/tokens';
import { cn } from '../../../utils/cn';
import { GachaScreen } from '../../GachaScreen';
import { PixelButton } from '../../ui/PixelButton';
import { TabBackground } from '../TabBackground';

const ELEMENT_COLORS: Record<ElementType, string> = {
	fire: '#c03020',
	water: '#5bc8e8',
	lightning: '#f0d060',
	neutral: '#a09070',
};

const ELEMENT_NAMES: Record<ElementType, string> = {
	fire: '화염',
	water: '냉기',
	lightning: '번개',
	neutral: '무속성',
};

function translateSpecial(special: string): string {
	return special
		.replace(/splash/g, '범위 공격')
		.replace(/slow_(\d+)%_aoe/g, '광역 감속 $1%')
		.replace(/slow_(\d+)%/g, '감속 $1%')
		.replace(/stun_aoe_global/g, '전역 기절')
		.replace(/stun_aoe_extended/g, '광역 기절(강화)')
		.replace(/stun_aoe/g, '광역 기절')
		.replace(/stun/g, '기절');
}

const GRADE_BORDER: Record<TowerGrade, string> = {
	normal: colors.border,
	rare: '#5bc8e8',
	unique: '#9060e0',
	epic: '#f0d060',
};

const TIER_DOT_KEYS = [1, 2, 3, 4, 5] as const;

export function CollectionTab() {
	const [selectedDef, setSelectedDef] = useState<TowerDef | null>(null);
	const [showGacha, setShowGacha] = useState(false);
	const collection = useMetaStore((s) => s.collection);
	const ownedIds = new Set(collection.map((t) => t.defId));

	const ownedTowers = ALL_TOWERS.filter((t) => ownedIds.has(t.id));
	const lockedTowers = ALL_TOWERS.filter((t) => !ownedIds.has(t.id));

	return (
		<div
			id="tabpanel-collection"
			role="tabpanel"
			aria-label="전쟁탁자"
			className="relative flex flex-1 flex-col overflow-hidden"
		>
			<TabBackground
				src={uiMobileArt.wartableBg}
				gradient="linear-gradient(180deg, #2a2010 0%, #1a1208 100%)"
				overlayOpacity={0.3}
			/>

			<div className="relative z-[1] flex flex-1 flex-col gap-3 overflow-auto p-3">
				<div className="flex items-center justify-between">
					<span className="font-pixel text-sm text-text">보유 타워</span>
					<div className="flex items-center gap-2">
						<span className="font-pixel text-[11px] text-text-secondary">
							{ownedTowers.length}/{ALL_TOWERS.length}
						</span>
						<PixelButton variant="gold" onClick={() => setShowGacha(true)}>
							소환의 제단
						</PixelButton>
					</div>
				</div>

				{ownedTowers.length === 0 ? (
					<EmptyState />
				) : (
					<div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
						{ownedTowers.map((def) => {
							const owned = collection.find((t) => t.defId === def.id);
							return (
								<TowerGridCard
									key={def.id}
									def={def}
									owned={owned}
									onClick={() => setSelectedDef(def)}
								/>
							);
						})}
					</div>
				)}

				{lockedTowers.length > 0 && (
					<>
						<span className="mt-1 font-pixel text-xs text-text-secondary">
							미획득
						</span>
						<div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
							{lockedTowers.map((def) => (
								<TowerGridCard
									key={def.id}
									def={def}
									locked
									onClick={() => setSelectedDef(def)}
								/>
							))}
						</div>
					</>
				)}
			</div>

			{selectedDef && (
				<TowerBottomSheet
					def={selectedDef}
					onClose={() => setSelectedDef(null)}
				/>
			)}

			{showGacha && (
				<GachaScreen onClose={() => setShowGacha(false)} />
			)}
		</div>
	);
}

function TowerGridCard({
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
				locked && 'opacity-50',
			)}
			style={{
				background: locked ? 'rgba(26, 18, 8, 0.7)' : 'rgba(42, 32, 16, 0.85)',
				border: `1px solid ${locked ? colors.border : gradeBorder}`,
				boxShadow:
					owned?.grade === 'epic'
						? `0 0 8px ${GRADE_BORDER.epic}44`
						: undefined,
			}}
		>
			<div className="flex gap-[3px]">
				{TIER_DOT_KEYS.slice(0, def.tier).map((dotKey) => (
					<span
						key={`${def.id}-tier-${dotKey}`}
						className="block h-[5px] w-[5px] bg-gold"
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
					className="font-pixel text-[10px]"
					style={{ color: GRADE_BORDER[owned.grade] }}
				>
					Lv.{owned.level}
				</span>
			)}
		</button>
	);
}

function TowerBottomSheet({
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

	return (
		<div
			className="absolute bottom-0 left-0 right-0 z-5 flex flex-col gap-2.5 p-4 animate-[slideUp_0.2s_ease-out]"
			style={{
				background: 'rgba(26, 18, 8, 0.96)',
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
							<span
								key={`${def.id}-detail-${dotKey}`}
								className="block h-[5px] w-[5px] bg-gold"
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
					className="cursor-pointer border-none bg-transparent px-2 py-1 min-h-[44px] min-w-[44px] font-pixel text-sm text-text-secondary"
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
					value={String(def.stats.range)}
					color={colors.textSecondary}
				/>
				<StatDisplay
					label="속성"
					value={ELEMENT_NAMES[def.element]}
					color={elementColor}
				/>
			</div>

			{def.stats.special && (
				<p className="font-pixel text-[11px] leading-[1.6] text-accent">
					특수: {translateSpecial(def.stats.special)}
				</p>
			)}

			{/* Enhancement section */}
			{owned && (
				<div
					className="flex flex-col gap-2 p-2"
					style={{
						background: 'rgba(42,32,16,0.6)',
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
					className="flex flex-col gap-2 p-2"
					style={{
						background: 'rgba(42,32,16,0.6)',
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
					<PixelButton
						variant="secondary"
						style={{ width: '100%', fontSize: '12px' }}
						onClick={handlePromote}
						disabled={promoting || profile.gold < promoConfig.goldCost}
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
					전투에서 타워를 획득하세요!
				</span>
			)}
		</div>
	);
}

function StatDisplay({
	label,
	value,
	color,
}: {
	label: string;
	value: string;
	color: string;
}) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="font-pixel text-[10px] text-text-secondary">
				{label}
			</span>
			<span className="font-pixel text-[13px]" style={{ color }}>
				{value}
			</span>
		</div>
	);
}

function EmptyState() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-5 py-10">
			<span className="text-center font-pixel text-[13px] leading-[1.8] text-text-secondary">
				아직 타워가 없습니다.
				<br />
				전투에서 타워를 획득하세요!
			</span>
		</div>
	);
}
