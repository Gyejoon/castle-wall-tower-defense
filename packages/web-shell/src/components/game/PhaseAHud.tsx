import { EventBus } from '@gld/phaser-game';
import { ALL_TOWERS, PHASE_A_SUMMON_COST } from '@gld/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { cn } from '../../utils/cn';

const TOWER_NAME_MAP = new Map(ALL_TOWERS.map((t) => [t.id, t.name]));
const TOWER_TYPE_MAP = new Map(ALL_TOWERS.map((t) => [t.id, t.type]));

interface FirstPick {
	col: number;
	row: number;
	towerName: string;
}

interface PendingSummon {
	towerId: string;
	grade: string;
}

export function PhaseAHud() {
	const [firstPick, setFirstPick] = useState<FirstPick | null>(null);
	const firstPickRef = useRef<FirstPick | null>(null);
	const [pendingSummon, setPendingSummon] = useState<PendingSummon | null>(
		null,
	);
	const pushToast = useGameStore((s) => s.pushToast);
	const energy = useGameStore((s) => s.energy);
	const canAfford = energy >= PHASE_A_SUMMON_COST;

	useEffect(() => {
		firstPickRef.current = firstPick;
	}, [firstPick]);

	useEffect(() => {
		const handleTowerSelected = (data: {
			towerDefId: string;
			towerName: string;
			col: number;
			row: number;
		}) => {
			const first = firstPickRef.current;
			if (first === null) {
				firstPickRef.current = {
					col: data.col,
					row: data.row,
					towerName: data.towerName,
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
		};

		const handleMerged = (data: { toGrade: string }) => {
			firstPickRef.current = null;
			setFirstPick(null);
			pushToast(`합성 성공 → ${data.toGrade.toUpperCase()}`, 'success');
		};

		const handleMergeFailed = (data: { reason: string }) => {
			firstPickRef.current = null;
			setFirstPick(null);
			pushToast(`합성 실패: ${mergeFailLabel(data.reason)}`, 'warning');
		};

		const handleSummonReady = (data: { towerId: string; grade: string }) => {
			setPendingSummon(data);
		};

		const handleTowerSummoned = () => {
			setPendingSummon(null);
		};

		const handleSummonFailed = (data: { reason: string }) => {
			setPendingSummon(null);
			pushToast(`소환 실패: ${summonFailLabel(data.reason)}`, 'warning');
		};

		EventBus.on('tower-selected', handleTowerSelected);
		EventBus.on('tower-deselected', handleTowerDeselected);
		EventBus.on('towers-merged', handleMerged);
		EventBus.on('merge-failed', handleMergeFailed);
		EventBus.on('phase-a-summon-ready', handleSummonReady);
		EventBus.on('tower-summoned', handleTowerSummoned);
		EventBus.on('summon-failed', handleSummonFailed);

		return () => {
			EventBus.off('tower-selected', handleTowerSelected);
			EventBus.off('tower-deselected', handleTowerDeselected);
			EventBus.off('towers-merged', handleMerged);
			EventBus.off('merge-failed', handleMergeFailed);
			EventBus.off('phase-a-summon-ready', handleSummonReady);
			EventBus.off('tower-summoned', handleTowerSummoned);
			EventBus.off('summon-failed', handleSummonFailed);
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
		? `assets/towers/${TOWER_TYPE_MAP.get(pendingSummon.towerId) ?? pendingSummon.towerId}.webp`
		: null;
	const towerName = pendingSummon
		? (TOWER_NAME_MAP.get(pendingSummon.towerId) ?? pendingSummon.towerId)
		: null;

	return (
		<div
			data-testid="phase-a-hud"
			className="h-[110px] shrink-0 border-t border-border px-3 pt-2 flex items-center justify-between gap-3"
			style={{
				background: 'rgba(26, 18, 8, 0.95)',
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
				) : firstPick !== null ? (
					<>
						<span className="font-pixel text-[11px] text-gold">
							{firstPick.towerName} 선택됨 · 짝을 탭하세요
						</span>
						<button
							type="button"
							onClick={handleCancelMerge}
							className="self-start font-pixel text-[10px] text-text-secondary underline mt-0.5"
						>
							취소
						</button>
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
						{PHASE_A_SUMMON_COST}
					</span>
				</span>
			</button>
		</div>
	);
}

function mergeFailLabel(reason: string): string {
	switch (reason) {
		case 'different-tower':
			return '다른 타워';
		case 'different-grade':
			return '다른 등급';
		case 'max-grade':
			return '최고 등급';
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
