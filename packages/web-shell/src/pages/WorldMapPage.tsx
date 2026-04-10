import {
	getStageLockStatus,
	getStagesByWorld,
	isStageUnlocked,
	isWorldUnlocked,
	type StageDef,
	type StarRating,
	WORLD_ORDER,
	WORLDS,
	type WorldId,
} from '@gld/shared';
import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useMetaStore } from '../stores/metaStore';
import { cn } from '../utils/cn';

// ── helpers ──────────────────────────────────────────────────────────────────

function pickInitialWorld(stars: Record<string, StarRating>): WorldId {
	for (const id of WORLD_ORDER) {
		const world = WORLDS[id];
		if (world.stageCount === 0) continue;
		if (!isWorldUnlocked(id, stars)) continue;
		const stages = getStagesByWorld(id);
		const allCleared =
			stages.length > 0 && stages.every((s) => (stars[s.id] ?? 0) >= 3);
		if (!allCleared) return id;
	}
	return 'w1_forest';
}

// ── sub-components ───────────────────────────────────────────────────────────

interface StageCardProps {
	stage: StageDef;
	worldOrder: number;
	stars: Record<string, StarRating>;
	lockImgError: boolean;
	onLockImgError: () => void;
	onSelect: (stageId: string) => void;
	onLocked: (reason: string) => void;
}

function StageCard({
	stage,
	worldOrder,
	stars,
	lockImgError,
	onLockImgError,
	onSelect,
	onLocked,
}: StageCardProps) {
	const unlocked = isStageUnlocked(stage.id, stars);
	const lockStatus = unlocked
		? { locked: false as const }
		: getStageLockStatus(stage.id, stars);
	const earnedStars = stars[stage.id] ?? 0;
	const label = `${worldOrder}-${stage.stageNumber}`;

	function handleClick() {
		if (unlocked) {
			onSelect(stage.id);
		} else if (lockStatus.locked && lockStatus.reason) {
			onLocked(lockStatus.reason);
		}
	}

	return (
		<button
			type="button"
			disabled={false}
			onClick={handleClick}
			className={cn(
				'relative flex flex-col gap-1 p-2.5 border-2 transition-all duration-150 text-left',
				'bg-panel border-border',
				unlocked
					? 'cursor-pointer hover:scale-[1.04] hover:border-accent/60 active:scale-[0.97]'
					: 'cursor-pointer opacity-60',
			)}
		>
			{/* Lock overlay */}
			{!unlocked && (
				<div className="absolute inset-0 bg-bg/50 z-10 flex flex-col items-center justify-center gap-1 px-2">
					{lockImgError ? (
						<span className="font-pixel text-[16px] text-text-secondary/70 select-none">
							&#10005;
						</span>
					) : (
						<img
							src="assets/ui/icon-locked.webp"
							alt="잠김"
							width={18}
							height={18}
							className="[image-rendering:pixelated] opacity-70 select-none"
							onError={onLockImgError}
						/>
					)}
					{lockStatus.locked && (
						<span className="font-pixel text-[6px] text-text-secondary/80 text-center leading-tight">
							{lockStatus.reason}
						</span>
					)}
				</div>
			)}

			{/* Top row: stage label + boss badge */}
			<div className="flex items-center justify-between">
				<span className="font-pixel text-[8px] text-accent">{label}</span>
				{stage.isBossStage && (
					<span className="font-pixel text-[6px] text-danger bg-danger/15 border border-danger/40 px-1 py-0.5 leading-none">
						BOSS
					</span>
				)}
			</div>

			{/* Stage name */}
			<span
				className={cn(
					'font-pixel text-[9px] leading-tight',
					unlocked ? 'text-text' : 'text-text-secondary',
				)}
			>
				{stage.name}
			</span>

			{/* Bottom: star row + recommended power */}
			<div className="flex items-center justify-between mt-0.5">
				<div className="flex gap-[2px]">
					{([1, 2, 3] as const).map((s) => (
						<img
							key={s}
							src={
								s <= earnedStars
									? 'assets/ui/icon-star-active.png'
									: 'assets/ui/icon-star-inactive.png'
							}
							alt=""
							width={9}
							height={9}
							className="[image-rendering:pixelated] drop-shadow-[1px_1px_0px_#0a0804]"
						/>
					))}
				</div>
				<span className="font-pixel text-[6px] text-text-secondary/70">
					{stage.recommendedPower.toLocaleString()}
				</span>
			</div>
		</button>
	);
}

// ── main component ────────────────────────────────────────────────────────────

export function WorldMapPage() {
	const enterLobby = useGameStore((s) => s.enterLobby);
	const enterStageDetail = useGameStore((s) => s.enterStageDetail);
	const pushToast = useGameStore((s) => s.pushToast);
	const playerLevel = useMetaStore((s) => s.profile.level) ?? 1;
	const stageStars = useMetaStore((s) => s.progress.stageStars);

	const [activeWorld, setActiveWorld] = useState<WorldId>(() =>
		pickInitialWorld(stageStars),
	);
	const [lockImgError, setLockImgError] = useState(false);

	const activeWorldDef = WORLDS[activeWorld];
	const stages =
		activeWorldDef.stageCount > 0 ? getStagesByWorld(activeWorld) : [];

	return (
		<div className="flex h-full w-full justify-center bg-bg">
			<div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-bg shadow-[0_0_40px_rgba(0,0,0,0.5)]">
				{/* Header */}
				<div className="relative flex items-center justify-center px-3 py-4 bg-panel border-b-2 border-border z-10">
					<button
						type="button"
						className="absolute left-3 font-pixel text-[10px] text-accent cursor-pointer hover:text-gold transition-colors"
						onClick={enterLobby}
					>
						<span className="inline-flex items-center gap-1">
							<img
								src="assets/ui/icon-arrow-left.webp"
								alt=""
								width={10}
								height={10}
								className="[image-rendering:pixelated]"
							/>
							돌아가기
						</span>
					</button>
					<span className="absolute left-1/2 -translate-x-1/2 font-pixel text-base text-gold">
						스테이지 선택
					</span>
					<span className="absolute right-3 font-pixel text-[9px] text-text-secondary px-2 py-0.5 bg-panel border border-border">
						Lv.{playerLevel}
					</span>
				</div>

				{/* World tabs */}
				<div className="flex bg-panel border-b-2 border-border overflow-x-auto shrink-0 scrollbar-none">
					{WORLD_ORDER.map((worldId) => {
						const world = WORLDS[worldId];
						const worldUnlocked = isWorldUnlocked(worldId, stageStars);
						const isActive = worldId === activeWorld;
						return (
							<button
								key={worldId}
								type="button"
								onClick={() => setActiveWorld(worldId)}
								className={cn(
									'flex-1 min-w-[56px] flex flex-col items-center justify-center gap-0.5 px-1 py-2 transition-all duration-150 cursor-pointer',
									'font-pixel text-[7px] whitespace-nowrap',
									isActive
										? 'bg-bg border-b-2 border-gold text-gold -mb-[2px]'
										: 'text-text-secondary hover:text-text border-b-2 border-transparent -mb-[2px]',
								)}
							>
								{!worldUnlocked ? (
									<>
										{lockImgError ? (
											<span className="text-[10px] text-text-secondary/50 select-none">
												&#128274;
											</span>
										) : (
											<img
												src="assets/ui/icon-locked.webp"
												alt=""
												width={10}
												height={10}
												className="[image-rendering:pixelated] opacity-50"
												onError={() => setLockImgError(true)}
											/>
										)}
									</>
								) : null}
								<span className="leading-tight text-center">{world.name}</span>
							</button>
						);
					})}
				</div>

				{/* Stage grid */}
				<div className="flex-1 min-h-0 overflow-y-auto bg-bg">
					{activeWorldDef.stageCount === 0 ? (
						<div className="flex flex-col items-center justify-center h-full gap-3 px-6">
							<span className="font-pixel text-[32px] text-text-secondary/30 select-none">
								?
							</span>
							<span className="font-pixel text-[11px] text-text-secondary text-center leading-relaxed">
								준비 중
							</span>
							<span className="font-pixel text-[8px] text-text-secondary/50 text-center leading-relaxed">
								{activeWorldDef.name}은 아직 개방되지 않았습니다
							</span>
						</div>
					) : (
						<div className="grid grid-cols-2 gap-2 p-3">
							{stages.map((stage) => (
								<StageCard
									key={stage.id}
									stage={stage}
									worldOrder={activeWorldDef.order}
									stars={stageStars}
									lockImgError={lockImgError}
									onLockImgError={() => setLockImgError(true)}
									onSelect={(id) => enterStageDetail(id)}
									onLocked={(reason) => pushToast(reason, 'warning')}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
