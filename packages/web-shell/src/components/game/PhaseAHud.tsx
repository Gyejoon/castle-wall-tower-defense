import { EventBus } from '@gld/phaser-game';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';

interface FirstPick {
	col: number;
	row: number;
	towerName: string;
}

/**
 * Phase A pivot HUD. Replaces the legacy DeckDock when the active map is
 * `phase_a_long`. Two responsibilities:
 *
 * 1. "소환" button → emits `request-summon-tower`. PhaseAOrchestrator picks
 *    a random empty buildable tile and a random tower from the pool.
 * 2. Tap-tap merge: first tower tap is stored locally, second tap on a
 *    different tower fires `request-merge-towers`. MergeSystem validates
 *    sameness/grade/max and emits success or `merge-failed`.
 *
 * No energy gating in Phase A — summons are free until balance pass.
 */
export function PhaseAHud() {
	const [firstPick, setFirstPick] = useState<FirstPick | null>(null);
	const firstPickRef = useRef<FirstPick | null>(null);
	const pushToast = useGameStore((s) => s.pushToast);

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

		EventBus.on('tower-selected', handleTowerSelected);
		EventBus.on('tower-deselected', handleTowerDeselected);
		EventBus.on('towers-merged', handleMerged);
		EventBus.on('merge-failed', handleMergeFailed);

		return () => {
			EventBus.off('tower-selected', handleTowerSelected);
			EventBus.off('tower-deselected', handleTowerDeselected);
			EventBus.off('towers-merged', handleMerged);
			EventBus.off('merge-failed', handleMergeFailed);
		};
	}, [pushToast]);

	const handleSummon = useCallback(() => {
		EventBus.emit('request-summon-tower');
	}, []);

	const handleCancel = useCallback(() => {
		firstPickRef.current = null;
		setFirstPick(null);
		EventBus.emit('request-clear-tower-selection');
	}, []);

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
				{firstPick === null ? (
					<span className="font-pixel text-[11px] text-text">
						타워 두 개를 차례로 탭 → 합성
					</span>
				) : (
					<span className="font-pixel text-[11px] text-gold">
						{firstPick.towerName} 선택됨 · 짝을 탭하세요
					</span>
				)}
				{firstPick !== null && (
					<button
						type="button"
						onClick={handleCancel}
						className="self-start font-pixel text-[10px] text-text-secondary underline mt-0.5"
					>
						취소
					</button>
				)}
			</div>
			<button
				type="button"
				data-testid="phase-a-summon-button"
				onClick={handleSummon}
				className="h-[80px] w-[100px] bg-panel border-2 border-gold shadow-[0_0_8px_var(--color-gold)] flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
			>
				<img
					src="assets/ui/icon-sword.webp"
					alt=""
					width={28}
					height={28}
					className="[image-rendering:pixelated]"
				/>
				<span className="font-pixel text-[12px] text-gold">소환</span>
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
