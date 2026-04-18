import { EventBus } from '@gld/phaser-game';
import { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';

export interface SelectedTower {
	/** Pseudo instance id: `${col},${row}` — the Phaser scene currently emits
	 *  tower-selected keyed by grid coords, not instance UUID. Phase 9 can
	 *  upgrade this to a real instanceId when tower-selected carries it. */
	instanceId: string;
	col: number;
	row: number;
	towerId: string;
	towerName: string;
	tier: number;
	sellValue: number;
}

interface TowerActionSheetProps {
	selectedTower: SelectedTower | null;
	onDeselect: () => void;
}

type SheetMode = 'idle' | 'merge-source';

/**
 * Phase 8 Task 8.1 — floating action sheet for a selected tower.
 *
 * Surfaces 합성 / 이동 / 판매 / ✕ as 52px+ touch targets above the HUD bar.
 * Emits the events the Phaser scene already handles:
 *   - 합성  → emits `enter-merge-mode` { sourceId }; GamePage picks up the
 *     sourceId and waits for the next tower-selected to fire merge
 *   - 이동  → emits `request-enter-move-mode` { fromCol, fromRow }
 *   - 판매  → emits `request-sell-tower` { col, row }
 *   - ✕    → calls onDeselect (usually clears selection + emits
 *     `request-clear-tower-selection`)
 *
 * [F21] mode resets whenever the selected tower's instanceId changes so
 *       stale merge-source state doesn't leak across selections.
 */
export function TowerActionSheet({
	selectedTower,
	onDeselect,
}: TowerActionSheetProps) {
	const [mode, setMode] = useState<SheetMode>('idle');
	// Phase 11 Task 11.2 — momentary scale punch when a successful merge is
	// announced while the sheet is on screen. Auto-clears after 200ms via the
	// effect cleanup so subsequent merges retrigger the animation.
	const [mergePunch, setMergePunch] = useState(false);

	// [F21] React state reset — avoid stale mode when switching towers.
	useEffect(() => {
		setMode('idle');
	}, [selectedTower?.instanceId]);

	useEffect(() => {
		const handler = () => {
			setMergePunch(true);
			window.setTimeout(() => setMergePunch(false), 200);
		};
		EventBus.on('towers-merged', handler);
		return () => {
			EventBus.off('towers-merged', handler);
		};
	}, []);

	if (!selectedTower) return null;

	const handleMerge = () => {
		setMode('merge-source');
		EventBus.emit('enter-merge-mode', { sourceId: selectedTower.instanceId });
	};

	const handleMove = () => {
		EventBus.emit('request-enter-move-mode', {
			fromCol: selectedTower.col,
			fromRow: selectedTower.row,
		});
	};

	const handleSell = () => {
		EventBus.emit('request-sell-tower', {
			col: selectedTower.col,
			row: selectedTower.row,
		});
	};

	return (
		<div
			data-testid="tower-action-sheet"
			data-merge-punch={mergePunch ? '1' : '0'}
			className={cn(
				'absolute left-1/2 -translate-x-1/2 bottom-[120px] z-[4] flex flex-col items-center gap-2 pointer-events-auto transition-transform duration-200',
				mergePunch ? 'scale-110' : 'scale-100',
			)}
		>
			<div
				className="flex items-center gap-2 px-3 py-1.5 rounded-sm border"
				style={{
					background: 'var(--color-panel-95)',
					borderColor: 'var(--color-border)',
				}}
			>
				<span
					data-testid="tower-action-sheet-tier"
					className="font-pixel text-[10px] px-1.5 py-[1px] rounded-sm"
					style={{
						background: 'var(--color-accent-20)',
						color: 'var(--color-gold)',
					}}
				>
					T{selectedTower.tier}
				</span>
				<span className="font-pixel text-[11px] text-text">
					{selectedTower.towerName}
				</span>
			</div>
			<div className="flex items-stretch gap-1">
				<button
					type="button"
					data-testid="tower-action-merge"
					onClick={handleMerge}
					className={cn(
						'min-w-[64px] min-h-[52px] px-3 border-2 font-pixel text-[11px] text-gold',
						mode === 'merge-source'
							? 'bg-accent-20 border-gold'
							: 'bg-panel border-accent active:scale-95',
					)}
					style={{
						background:
							mode === 'merge-source'
								? 'var(--color-accent-20)'
								: 'var(--color-panel)',
						borderColor: 'var(--color-accent)',
					}}
				>
					합성
				</button>
				<button
					type="button"
					data-testid="tower-action-move"
					onClick={handleMove}
					className="min-w-[64px] min-h-[52px] px-3 border-2 font-pixel text-[11px] active:scale-95"
					style={{
						background: 'var(--color-panel)',
						borderColor: 'var(--color-info)',
						color: 'var(--color-info)',
					}}
				>
					이동
				</button>
				<button
					type="button"
					data-testid="tower-action-sell"
					onClick={handleSell}
					className="min-w-[64px] min-h-[52px] px-3 border-2 font-pixel text-[11px] active:scale-95"
					style={{
						background: 'var(--color-panel)',
						borderColor: 'var(--color-danger)',
						color: 'var(--color-danger)',
					}}
				>
					판매 +{selectedTower.sellValue}
				</button>
				<button
					type="button"
					data-testid="tower-action-close"
					onClick={onDeselect}
					className="min-w-[52px] min-h-[52px] px-2 border-2 font-pixel text-[12px] active:scale-95"
					style={{
						background: 'var(--color-panel)',
						borderColor: 'var(--color-border)',
						color: 'var(--color-text-secondary)',
					}}
				>
					✕
				</button>
			</div>
		</div>
	);
}
