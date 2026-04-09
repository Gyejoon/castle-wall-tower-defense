/**
 * 월드 클릭 시 하단에서 올라오는 스테이지 선택 패널.
 *
 * - 3×3 그리드 (마지막 행 2칸) = 8 슬롯 고정. 내부 스크롤 금지.
 * - 헤더에 **난이도 탭 빈 슬롯** 포함 — #106 ★1/★2/★3 탭 drop-in 대상.
 * - X / 백드롭 / ESC 클릭으로 닫힘.
 */

import { MAP_REGISTRY, UI_COLORS } from '@gld/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';
import type { WorldSlot } from './WorldLayout';
import {
	getStageStars,
	isStageUnlocked,
	type UnlockContext,
} from './worldLogic';

type Props = {
	world: WorldSlot;
	worldIndex: number;
	ctx: UnlockContext;
	onClose: () => void;
	onSelectStage: (stageId: string) => void;
};

const SLOTS_PER_WORLD = 8;

export function WorldStagePanel({
	world,
	worldIndex,
	ctx,
	onClose,
	onSelectStage,
}: Props) {
	const [closing, setClosing] = useState(false);
	const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

	// Unmount 시 모든 타이머 정리
	useEffect(() => {
		return () => {
			for (const id of timersRef.current) clearTimeout(id);
		};
	}, []);

	const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
		const id = window.setTimeout(fn, ms);
		timersRef.current.push(id);
	}, []);

	const triggerClose = useCallback(() => {
		setClosing((prev) => {
			if (prev) return prev;
			scheduleTimeout(onClose, 180);
			return true;
		});
	}, [onClose, scheduleTimeout]);

	// ESC 닫기
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') triggerClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [triggerClose]);

	const themeColor = UI_COLORS[world.themeToken];

	// 슬롯 8개 — 실제 stage + placeholder
	const slots: Array<{
		kind: 'stage' | 'placeholder';
		stageId?: string;
		slotIndex: number;
	}> = Array.from({ length: SLOTS_PER_WORLD }, (_, i) => {
		const stageId = world.stageIds[i];
		return stageId
			? { kind: 'stage' as const, stageId, slotIndex: i }
			: { kind: 'placeholder' as const, slotIndex: i };
	});

	return (
		<div className="absolute inset-0 z-[30] flex flex-col justify-end">
			{/* Backdrop */}
			<button
				type="button"
				aria-label="패널 닫기"
				onClick={triggerClose}
				className={cn(
					'absolute inset-0 cursor-default',
					closing ? '' : 'wm-backdrop-fade-in',
				)}
				style={{
					backgroundColor: 'rgba(10, 8, 4, 0.6)',
					backdropFilter: 'blur(3px) brightness(0.6)',
					WebkitBackdropFilter: 'blur(3px) brightness(0.6)',
				}}
			/>

			{/* Panel */}
			<div
				className={cn(
					'relative flex flex-col border-t-2',
					closing ? 'wm-panel-slide-down' : 'wm-panel-slide-up',
				)}
				style={{
					backgroundColor: UI_COLORS.panel,
					borderTopColor: themeColor,
					boxShadow: `0 -8px 24px rgba(0,0,0,0.6), inset 0 1px 0 ${themeColor}`,
				}}
			>
				{/* Header */}
				<div className="relative flex items-center px-3 pt-3 pb-2">
					<button
						type="button"
						onClick={triggerClose}
						className="flex h-11 w-11 items-center justify-center cursor-pointer hover:bg-panel-70 transition-colors"
						aria-label="닫기"
					>
						<span className="font-pixel text-[14px] text-text-secondary hover:text-gold">
							&#10005;
						</span>
					</button>
					<div className="flex-1 flex flex-col items-center gap-0.5">
						<span
							className="font-pixel text-[11px]"
							style={{ color: themeColor }}
						>
							W{worldIndex + 1}
						</span>
						<span className="font-pixel text-[13px] text-gold leading-none">
							{world.displayName}
						</span>
					</div>
					<div className="flex h-11 w-11 items-center justify-center">
						{/* 대칭 여백 */}
					</div>
				</div>

				{/* 난이도 탭 빈 슬롯 (#106 drop-in) */}
				<div
					className="h-8 mx-3 border border-dashed border-border/40 flex items-center justify-center"
					aria-hidden
				>
					<span className="font-pixel text-[7px] text-text-secondary/30">
						★1 / ★2 / ★3
					</span>
				</div>

				<div className="h-px bg-border/60 mx-3 mt-2" />

				{/* 3×3 카드 그리드 — 내부 스크롤 금지 */}
				<div className="px-3 pt-3 pb-4">
					<div
						className="grid grid-cols-3 gap-2 justify-items-center"
						style={{ gridTemplateRows: 'repeat(3, 120px)' }}
					>
						{slots.map((slot) => {
							const stageId = slot.stageId;
							if (slot.kind === 'stage' && stageId) {
								const map = MAP_REGISTRY[stageId];
								if (!map) return null;
								const unlocked = isStageUnlocked(stageId, ctx);
								const stars = getStageStars(stageId, ctx);
								return (
									<StageCard
										key={slot.slotIndex}
										slotNumber={slot.slotIndex + 1}
										name={map.name}
										landmarkAsset={world.landmarkAsset}
										unlocked={unlocked}
										stars={stars}
										rewardMultiplier={map.rewardMultiplier}
										unlockLevel={map.unlockLevel}
										themeColor={themeColor}
										onClick={() => {
											if (!unlocked) return;
											setClosing(true);
											scheduleTimeout(() => onSelectStage(stageId), 100);
										}}
									/>
								);
							}
							return (
								<PlaceholderCard
									key={slot.slotIndex}
									slotNumber={slot.slotIndex + 1}
								/>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}

type StageCardProps = {
	slotNumber: number;
	name: string;
	landmarkAsset: string;
	unlocked: boolean;
	stars: 0 | 1 | 2 | 3;
	rewardMultiplier: number;
	unlockLevel?: number;
	themeColor: string;
	onClick: () => void;
};

function StageCard({
	slotNumber,
	name,
	landmarkAsset,
	unlocked,
	stars,
	rewardMultiplier,
	unlockLevel,
	themeColor,
	onClick,
}: StageCardProps) {
	const perfect = stars === 3;
	return (
		<button
			type="button"
			disabled={!unlocked}
			onClick={onClick}
			className={cn(
				'relative flex h-[120px] w-[96px] flex-col items-center justify-between border-2 bg-panel/95 px-1 pt-1 pb-1.5 transition-all duration-150',
				unlocked
					? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0'
					: 'cursor-not-allowed opacity-45',
			)}
			style={{
				borderColor: perfect
					? UI_COLORS.danger
					: unlocked
						? themeColor
						: UI_COLORS.border,
			}}
		>
			{/* 스테이지 번호 리본 */}
			<div className="absolute top-0 left-0 px-1 py-0.5 bg-panel/95 border-r border-b border-border">
				<span className="font-pixel text-[9px] text-accent leading-none">
					{String(slotNumber).padStart(2, '0')}
				</span>
			</div>

			{/* 보상 배율 배지 */}
			{rewardMultiplier > 1 && (
				<div
					className="absolute top-0 right-0 px-1 py-0.5 border-l border-b"
					style={{
						backgroundColor: 'var(--color-panel-96)',
						borderColor: UI_COLORS.gold,
					}}
				>
					<span
						className="font-pixel text-[8px] leading-none"
						style={{ color: UI_COLORS.gold }}
					>
						×{rewardMultiplier}
					</span>
				</div>
			)}

			{/* 썸네일 */}
			<div className="mt-3 flex h-[52px] w-[52px] items-center justify-center">
				<img
					src={landmarkAsset}
					alt=""
					className={cn(
						'h-full w-full object-contain [image-rendering:pixelated]',
						!unlocked && 'grayscale brightness-[0.45]',
					)}
				/>
			</div>

			{/* 이름 */}
			<div className="w-full text-center">
				<span
					className={cn(
						'font-pixel text-[8px] leading-tight line-clamp-2',
						unlocked ? 'text-text' : 'text-text-secondary',
					)}
				>
					{name}
				</span>
			</div>

			{/* ★ 슬롯 */}
			<div
				className="flex gap-0.5"
				role="img"
				aria-label={`${stars} of 3 stars`}
			>
				{([1, 2, 3] as const).map((s) => (
					<img
						key={s}
						src={
							s <= stars
								? 'assets/ui/icon-star-active.png'
								: 'assets/ui/icon-star-inactive.png'
						}
						alt=""
						width={10}
						height={10}
						className="[image-rendering:pixelated]"
					/>
				))}
			</div>

			{/* 잠금 오버레이 */}
			{!unlocked && (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-panel/80">
					<img
						src="assets/ui/icon-locked.webp"
						alt="잠김"
						width={20}
						height={20}
						className="[image-rendering:pixelated] opacity-80"
					/>
					{unlockLevel !== undefined && (
						<span className="font-pixel text-[8px] text-danger">
							Lv.{unlockLevel}
						</span>
					)}
				</div>
			)}
		</button>
	);
}

function PlaceholderCard({ slotNumber }: { slotNumber: number }) {
	return (
		<div
			aria-hidden
			className="relative flex h-[120px] w-[96px] flex-col items-center justify-center border-2 border-dashed border-border/30 bg-panel/40"
		>
			<div className="absolute top-0 left-0 px-1 py-0.5 border-r border-b border-border/30">
				<span className="font-pixel text-[9px] text-text-secondary/30 leading-none">
					{String(slotNumber).padStart(2, '0')}
				</span>
			</div>
			<span className="font-pixel text-[10px] text-text-secondary/40 select-none">
				???
			</span>
		</div>
	);
}
