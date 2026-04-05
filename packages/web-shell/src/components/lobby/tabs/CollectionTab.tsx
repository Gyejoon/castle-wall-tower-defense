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
import { colors, fonts } from '../../../styles/tokens';
import { PixelButton } from '../../ui/PixelButton';
import { TabBackground } from '../TabBackground';

const ELEMENT_COLORS: Record<ElementType, string> = {
	fire: '#c03020',
	water: '#5bc8e8',
	lightning: '#f0d060',
	neutral: '#a09070',
};

const GRADE_BORDER: Record<TowerGrade, string> = {
	normal: colors.border,
	rare: '#5bc8e8',
	unique: '#9060e0',
	epic: '#f0d060',
};

const TIER_DOT_KEYS = [1, 2, 3, 4, 5] as const;

interface SelectedTower {
	def: TowerDef;
	owned: OwnedTower | undefined;
}

export function CollectionTab() {
	const [selected, setSelected] = useState<SelectedTower | null>(null);
	const collection = useMetaStore((s) => s.collection);
	const ownedIds = new Set(collection.map((t) => t.defId));

	const ownedTowers = ALL_TOWERS.filter((t) => ownedIds.has(t.id));
	const lockedTowers = ALL_TOWERS.filter((t) => !ownedIds.has(t.id));

	const handleSelect = (def: TowerDef) => {
		const owned = collection.find((t) => t.defId === def.id);
		setSelected({ def, owned });
	};

	return (
		<div
			id="tabpanel-collection"
			role="tabpanel"
			aria-label="전쟁탁자"
			style={{
				position: 'relative',
				flex: 1,
				overflow: 'hidden',
				display: 'flex',
				flexDirection: 'column',
			}}
		>
			<TabBackground
				src={uiMobileArt.wartableBg}
				gradient="linear-gradient(180deg, #2a2010 0%, #1a1208 100%)"
				overlayOpacity={0.3}
			/>

			<div
				style={{
					position: 'relative',
					zIndex: 1,
					flex: 1,
					overflow: 'auto',
					padding: '12px',
					display: 'flex',
					flexDirection: 'column',
					gap: '12px',
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'baseline',
						justifyContent: 'space-between',
					}}
				>
					<span
						style={{
							fontFamily: fonts.pixel,
							fontSize: '10px',
							color: colors.text,
						}}
					>
						보유 타워
					</span>
					<span
						style={{
							fontFamily: fonts.pixel,
							fontSize: '7px',
							color: colors.textSecondary,
						}}
					>
						{ownedTowers.length}/{ALL_TOWERS.length}
					</span>
				</div>

				{ownedTowers.length === 0 ? (
					<EmptyState />
				) : (
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
							gap: '8px',
						}}
					>
						{ownedTowers.map((def) => {
							const owned = collection.find((t) => t.defId === def.id);
							return (
								<TowerGridCard
									key={def.id}
									def={def}
									owned={owned}
									onClick={() => handleSelect(def)}
								/>
							);
						})}
					</div>
				)}

				{lockedTowers.length > 0 && (
					<>
						<span
							style={{
								fontFamily: fonts.pixel,
								fontSize: '8px',
								color: colors.textSecondary,
								marginTop: '4px',
							}}
						>
							미획득
						</span>
						<div
							style={{
								display: 'grid',
								gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
								gap: '8px',
							}}
						>
							{lockedTowers.map((def) => (
								<TowerGridCard
									key={def.id}
									def={def}
									locked
									onClick={() => handleSelect(def)}
								/>
							))}
						</div>
					</>
				)}
			</div>

			{selected && (
				<TowerBottomSheet
					def={selected.def}
					owned={selected.owned}
					onClose={() => setSelected(null)}
				/>
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
	const elementColor = ELEMENT_COLORS[def.element];
	const gradeBorder = owned ? GRADE_BORDER[owned.grade] : colors.border;

	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: '4px',
				padding: '10px 6px',
				background: locked ? 'rgba(26, 18, 8, 0.7)' : 'rgba(42, 32, 16, 0.85)',
				border: `1px solid ${locked ? colors.border : gradeBorder}`,
				opacity: locked ? 0.5 : 1,
				cursor: 'pointer',
				touchAction: 'manipulation',
				boxShadow:
					owned?.grade === 'epic'
						? `0 0 8px ${GRADE_BORDER.epic}44`
						: undefined,
			}}
		>
			<div style={{ display: 'flex', gap: '3px' }}>
				{TIER_DOT_KEYS.slice(0, def.tier).map((dotKey) => (
					<span
						key={`${def.id}-tier-${dotKey}`}
						style={{
							width: 5,
							height: 5,
							background: colors.gold,
							display: 'block',
						}}
					/>
				))}
			</div>
			<div
				style={{
					width: 32,
					height: 32,
					background: `radial-gradient(circle, ${elementColor}44, transparent)`,
					border: `1px solid ${elementColor}66`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<span
					style={{
						fontFamily: fonts.pixel,
						fontSize: '6px',
						color: elementColor,
					}}
				>
					{def.element.charAt(0).toUpperCase()}
				</span>
			</div>
			<span
				style={{
					fontFamily: fonts.pixel,
					fontSize: '6px',
					color: locked ? colors.textSecondary : colors.text,
					textAlign: 'center',
					lineHeight: 1.3,
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
					width: '100%',
				}}
			>
				{def.name}
			</span>
			{owned && (
				<span
					style={{
						fontFamily: fonts.pixel,
						fontSize: '5px',
						color: GRADE_BORDER[owned.grade],
					}}
				>
					Lv.{owned.level}
				</span>
			)}
		</button>
	);
}

function TowerBottomSheet({
	def,
	owned,
	onClose,
}: {
	def: TowerDef;
	owned: OwnedTower | undefined;
	onClose: () => void;
}) {
	const elementColor = ELEMENT_COLORS[def.element];
	const profile = useMetaStore((s) => s.profile);
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
			style={{
				position: 'absolute',
				bottom: 0,
				left: 0,
				right: 0,
				zIndex: 5,
				background: 'rgba(26, 18, 8, 0.96)',
				borderTop: `2px solid ${owned ? GRADE_BORDER[grade] : elementColor}`,
				padding: '16px',
				display: 'flex',
				flexDirection: 'column',
				gap: '10px',
				animation: 'slideUp 0.2s ease-out',
			}}
		>
			{/* Header */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<span
						style={{
							fontFamily: fonts.pixel,
							fontSize: '10px',
							color: colors.text,
						}}
					>
						{def.name}
					</span>
					<div style={{ display: 'flex', gap: '2px' }}>
						{TIER_DOT_KEYS.slice(0, def.tier).map((dotKey) => (
							<span
								key={`${def.id}-detail-${dotKey}`}
								style={{
									width: 5,
									height: 5,
									background: colors.gold,
									display: 'block',
								}}
							/>
						))}
					</div>
					{owned && (
						<span
							style={{
								fontFamily: fonts.pixel,
								fontSize: '7px',
								color: GRADE_BORDER[grade],
							}}
						>
							{grade.toUpperCase()} Lv.{level}
						</span>
					)}
				</div>
				<button
					type="button"
					onClick={onClose}
					style={{
						background: 'none',
						border: 'none',
						cursor: 'pointer',
						fontFamily: fonts.pixel,
						fontSize: '10px',
						color: colors.textSecondary,
						padding: '4px 8px',
					}}
				>
					X
				</button>
			</div>

			{/* Stats */}
			<div style={{ display: 'flex', gap: '16px' }}>
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
				<StatDisplay label="속성" value={def.element} color={elementColor} />
			</div>

			{def.stats.special && (
				<p
					style={{
						fontFamily: fonts.pixel,
						fontSize: '7px',
						color: colors.accent,
						lineHeight: 1.6,
					}}
				>
					특수: {def.stats.special}
				</p>
			)}

			{/* Enhancement section */}
			{owned && (
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '8px',
						padding: '8px',
						background: 'rgba(42,32,16,0.6)',
						border: `1px solid ${colors.border}`,
					}}
				>
					{level < MAX_TOWER_LEVEL ? (
						<>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									fontFamily: fonts.pixel,
									fontSize: '7px',
								}}
							>
								<span style={{ color: colors.textSecondary }}>
									공격력: {effectiveDmg.toFixed(1)} →{' '}
									<span style={{ color: colors.success }}>
										{nextLevelDmg.toFixed(1)}
									</span>
								</span>
							</div>
							<PixelButton
								variant="gold"
								style={{ width: '100%', fontSize: '8px' }}
								onClick={handleEnhance}
								disabled={!canEnhance}
							>
								강화 ({cost}G)
							</PixelButton>
						</>
					) : (
						<span
							style={{
								fontFamily: fonts.pixel,
								fontSize: '7px',
								color: colors.gold,
								textAlign: 'center',
							}}
						>
							최대 레벨
						</span>
					)}
				</div>
			)}

			{/* Promotion section */}
			{owned && promoConfig.nextGrade && (
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '8px',
						padding: '8px',
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
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							fontFamily: fonts.pixel,
							fontSize: '7px',
						}}
					>
						<span style={{ color: colors.textSecondary }}>
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
						<span style={{ color: colors.textSecondary }}>
							성공률 {(promoConfig.successRate * 100).toFixed(0)}%
						</span>
					</div>
					<PixelButton
						variant="secondary"
						style={{ width: '100%', fontSize: '8px' }}
						onClick={handlePromote}
						disabled={promoting || profile.gold < promoConfig.goldCost}
					>
						{promoting ? '승급 중...' : `승급 시도 (${promoConfig.goldCost}G)`}
					</PixelButton>
				</div>
			)}

			{owned && !promoConfig.nextGrade && (
				<div style={{ padding: '8px', textAlign: 'center' }}>
					<span
						style={{
							fontFamily: fonts.pixel,
							fontSize: '7px',
							color: GRADE_BORDER.epic,
						}}
					>
						최고 등급
					</span>
				</div>
			)}

			{!owned && (
				<span
					style={{
						fontFamily: fonts.pixel,
						fontSize: '7px',
						color: colors.textSecondary,
						textAlign: 'center',
					}}
				>
					전투에서 타워를 획득하세요!
				</span>
			)}

			<style>{`
				@keyframes promotionRoll {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.3; }
				}
				@keyframes promotionSuccess {
					0% { transform: scale(1); }
					50% { transform: scale(1.02); }
					100% { transform: scale(1); }
				}
				@keyframes promotionFail {
					0%, 100% { transform: translateX(0); }
					25% { transform: translateX(-4px); }
					75% { transform: translateX(4px); }
				}
			`}</style>
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
		<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
			<span
				style={{
					fontFamily: fonts.pixel,
					fontSize: '6px',
					color: colors.textSecondary,
				}}
			>
				{label}
			</span>
			<span style={{ fontFamily: fonts.pixel, fontSize: '9px', color }}>
				{value}
			</span>
		</div>
	);
}

function EmptyState() {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				flex: 1,
				gap: '10px',
				padding: '40px 20px',
			}}
		>
			<span
				style={{
					fontFamily: fonts.pixel,
					fontSize: '9px',
					color: colors.textSecondary,
					textAlign: 'center',
					lineHeight: 1.8,
				}}
			>
				아직 타워가 없습니다.
				<br />
				전투에서 타워를 획득하세요!
			</span>
		</div>
	);
}
