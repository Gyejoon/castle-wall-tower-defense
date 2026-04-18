import { EventBus } from '@gld/phaser-game';
import { ALL_TOWERS, getPhaseARefund, PHASE_A_SUMMON_COST } from '@gld/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { cn } from '../../utils/cn';

const TOWER_NAME_MAP = new Map(ALL_TOWERS.map((t) => [t.id, t.name]));

interface FirstPick {
	col: number;
	row: number;
	towerName: string;
	refund: number;
	tier: number;
}

interface PendingSummon {
	towerId: string;
}

/**
 * Phase 1: grade display was removed from the HUD — Phase 8 will redo this
 * panel against the family/tier model (tier badge, merge preview, etc.).
 */
export function PhaseAHud() {
	const [firstPick, setFirstPick] = useState<FirstPick | null>(null);
	const firstPickRef = useRef<FirstPick | null>(null);
	const [pendingSummon, setPendingSummon] = useState<PendingSummon | null>(
		null,
	);
	const [movingTower, setMovingTower] = useState<{
		col: number;
		row: number;
	} | null>(null);
	const pushToast = useGameStore((s) => s.pushToast);
	const energy = useGameStore((s) => s.energy);
	const [summonCost, setSummonCost] = useState(PHASE_A_SUMMON_COST);
	const canAfford = energy >= summonCost;

	useEffect(() => {
		firstPickRef.current = firstPick;
	}, [firstPick]);

	useEffect(() => {
		const handleTowerSelected = (data: {
			towerDefId: string;
			towerName: string;
			col: number;
			row: number;
			refund: number;
			tier: number;
		}) => {
			setMovingTower(null);
			const first = firstPickRef.current;
			if (first === null) {
				firstPickRef.current = {
					col: data.col,
					row: data.row,
					towerName: data.towerName,
					refund: getPhaseARefund(),
					tier: data.tier,
				};
				setFirstPick(firstPickRef.current);
				return;
			}
			if (first.col === data.col && first.row === data.row) {
				firstPickRef.current = null;
				setFirstPick(null);
				return;
			}
			EventBus.emit('request-merge-towers', {
				fromCol: first.col,
				fromRow: first.row,
				toCol: data.col,
				toRow: data.row,
			});
			firstPickRef.current = null;
			setFirstPick(null);
		};

		const handleTowerDeselected = () => {
			firstPickRef.current = null;
			setFirstPick(null);
			setMovingTower(null);
		};

		const handleTowerMoved = () => {
			setMovingTower(null);
			firstPickRef.current = null;
			setFirstPick(null);
			pushToast('타워 이동 완료', 'success');
		};

		const handleMoveFailed = () => {
			setMovingTower(null);
			pushToast('이동 불가', 'warning');
		};

		const handleMerged = (data: { toTier: number }) => {
			firstPickRef.current = null;
			setFirstPick(null);
			pushToast(`합성 성공 → T${data.toTier}`, 'success');
		};

		const handleMergeFailed = (data: { reason: string }) => {
			firstPickRef.current = null;
			setFirstPick(null);
			pushToast(`합성 실패: ${mergeFailLabel(data.reason)}`, 'warning');
		};

		const handleSummonReady = (data: { towerId: string }) => {
			setPendingSummon(data);
		};

		const handleTowerSummoned = () => {
			setPendingSummon(null);
		};

		const handleSummonFailed = (data: { reason: string }) => {
			setPendingSummon(null);
			pushToast(`소환 실패: ${summonFailLabel(data.reason)}`, 'warning');
		};

		const handleUpgradeApplied = (data: {
			upgradeId: string;
			totalStacks: number;
		}) => {
			if (data.upgradeId === 'summon_discount') {
				setSummonCost(Math.max(5, PHASE_A_SUMMON_COST - data.totalStacks * 3));
			}
		};

		EventBus.on('tower-selected', handleTowerSelected);
		EventBus.on('tower-deselected', handleTowerDeselected);
		EventBus.on('towers-merged', handleMerged);
		EventBus.on('merge-failed', handleMergeFailed);
		EventBus.on('phase-a-summon-ready', handleSummonReady);
		EventBus.on('tower-summoned', handleTowerSummoned);
		EventBus.on('summon-failed', handleSummonFailed);
		EventBus.on('upgrade-applied', handleUpgradeApplied);
		EventBus.on('tower-moved', handleTowerMoved);
		EventBus.on('move-failed', handleMoveFailed);

		return () => {
			EventBus.off('tower-selected', handleTowerSelected);
			EventBus.off('tower-deselected', handleTowerDeselected);
			EventBus.off('towers-merged', handleMerged);
			EventBus.off('merge-failed', handleMergeFailed);
			EventBus.off('phase-a-summon-ready', handleSummonReady);
			EventBus.off('tower-summoned', handleTowerSummoned);
			EventBus.off('summon-failed', handleSummonFailed);
			EventBus.off('upgrade-applied', handleUpgradeApplied);
			EventBus.off('tower-moved', handleTowerMoved);
			EventBus.off('move-failed', handleMoveFailed);
		};
	}, [pushToast]);

	const handleSummon = useCallback(() => {
		if (!canAfford) {
			pushToast('에너지 부족', 'warning');
			return;
		}
		EventBus.emit('request-summon-tower');
	}, [canAfford, pushToast]);

	const handleCancelSummon = useCallback(() => {
		setPendingSummon(null);
		EventBus.emit('request-clear-tower-selection');
	}, []);

	const handleCancelMerge = useCallback(() => {
		firstPickRef.current = null;
		setFirstPick(null);
		EventBus.emit('request-clear-tower-selection');
	}, []);

	const towerThumb = pendingSummon
		? `assets/towers/${pendingSummon.towerId}.webp`
		: null;
	const towerName = pendingSummon
		? (TOWER_NAME_MAP.get(pendingSummon.towerId) ?? pendingSummon.towerId)
		: null;

	return (
		<div
			data-testid="phase-a-hud"
			className="h-[110px] shrink-0 border-t border-border px-3 pt-2 flex items-center justify-between gap-3"
			style={{
				background: 'var(--color-bg-95)',
				paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
			}}
		>
			<div className="flex flex-col gap-1 min-w-0 flex-1">
				<span className="font-pixel text-[10px] text-text-secondary tracking-[0.04em]">
					Phase A — 랜덤 소환 + 합성
				</span>

				{pendingSummon !== null ? (
					<>
						<div className="flex items-center gap-2">
							{towerThumb && (
								<img
									src={towerThumb}
									alt=""
									width={24}
									height={24}
									className="[image-rendering:pixelated]"
								/>
							)}
							<span className="font-pixel text-[11px] text-gold">
								{towerName} — 배치할 위치를 탭
							</span>
						</div>
						<button
							type="button"
							onClick={handleCancelSummon}
							className="self-start font-pixel text-[10px] text-text-secondary underline mt-0.5"
						>
							취소
						</button>
					</>
				) : movingTower !== null ? (
					<>
						<span className="font-pixel text-[11px] text-gold">
							이동할 위치를 탭하세요
						</span>
						<button
							type="button"
							onClick={() => {
								setMovingTower(null);
								EventBus.emit('request-clear-tower-selection');
							}}
							className="self-start font-pixel text-[10px] text-text-secondary underline mt-0.5"
						>
							취소
						</button>
					</>
				) : firstPick !== null ? (
					<>
						<span className="font-pixel text-[11px] text-gold">
							{firstPick.towerName} (T{firstPick.tier}) · 짝을 탭하세요
						</span>
						<div className="flex items-center gap-3 mt-0.5">
							<button
								type="button"
								onClick={handleCancelMerge}
								className="font-pixel text-[10px] text-text-secondary underline"
							>
								취소
							</button>
							<button
								type="button"
								onClick={() => {
									setMovingTower({
										col: firstPick.col,
										row: firstPick.row,
									});
									firstPickRef.current = null;
									setFirstPick(null);
									EventBus.emit('request-enter-move-mode', {
										fromCol: firstPick.col,
										fromRow: firstPick.row,
									});
								}}
								className="font-pixel text-[10px] text-accent underline"
							>
								이동
							</button>
							<button
								type="button"
								onClick={() => {
									EventBus.emit('request-sell-tower', {
										col: firstPick.col,
										row: firstPick.row,
									});
									firstPickRef.current = null;
									setFirstPick(null);
								}}
								className="font-pixel text-[10px] text-danger underline"
							>
								판매 +{firstPick.refund}
							</button>
						</div>
					</>
				) : (
					<span className="font-pixel text-[11px] text-text">
						타워 두 개를 차례로 탭 → 합성
					</span>
				)}
			</div>

			<button
				type="button"
				data-testid="phase-a-summon-button"
				onClick={handleSummon}
				disabled={!canAfford || pendingSummon !== null}
				aria-disabled={!canAfford || pendingSummon !== null}
				className={cn(
					'h-[80px] w-[100px] bg-panel border-2 flex flex-col items-center justify-center gap-1 transition-transform',
					canAfford && !pendingSummon
						? 'border-gold shadow-[0_0_8px_var(--color-gold)] active:scale-95'
						: 'border-border opacity-40 cursor-not-allowed',
				)}
			>
				<img
					src="assets/ui/icon-sword.webp"
					alt=""
					width={28}
					height={28}
					className="[image-rendering:pixelated]"
				/>
				<span
					className={cn(
						'font-pixel text-[12px]',
						canAfford && !pendingSummon ? 'text-gold' : 'text-text-secondary',
					)}
				>
					소환
				</span>
				<span className="inline-flex items-center gap-[2px]">
					<img
						src="assets/ui/icon-energy.webp"
						alt=""
						width={10}
						height={10}
						className="[image-rendering:pixelated]"
					/>
					<span
						className={cn(
							'font-pixel text-[11px]',
							canAfford ? 'text-gold' : 'text-danger',
						)}
					>
						{summonCost}
					</span>
				</span>
			</button>
		</div>
	);
}

function mergeFailLabel(reason: string): string {
	switch (reason) {
		case 'not-implemented':
			return '합성 시스템 준비 중';
		case 'different-tower':
			return '다른 타워';
		case 'different-tier':
			return '다른 티어';
		case 'max-tier':
			return '최고 티어';
		case 'invalid-tile':
			return '잘못된 칸';
		default:
			return reason;
	}
}

function summonFailLabel(reason: string): string {
	switch (reason) {
		case 'insufficient-energy':
			return '에너지 부족';
		case 'no-empty-tile':
			return '빈 칸 없음';
		case 'placement-failed':
			return '배치 불가';
		default:
			return reason;
	}
}
