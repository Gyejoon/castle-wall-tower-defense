import { EventBus } from '@gld/phaser-game';
import { zIndex } from '@gld/shared';
import { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import { Badge } from '../ds/Badge';
import { Button } from '../ds/Button';
import { Card } from '../ds/Card';

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

type TierBadgeIntent = `tier-${1 | 2 | 3 | 4 | 5 | 6}`;

/**
 * Phase 8 Task 8.1 — floating action sheet for a selected tower.
 * Uses ds/ primitives (Button, Badge, Card) for consistent look with overlays.
 *
 * Events:
 *   - 합성  → `enter-merge-mode` { sourceId }
 *   - 이동  → `request-enter-move-mode` { fromCol, fromRow }
 *   - 판매  → `request-sell-tower` { col, row }
 *   - ✕    → onDeselect
 *
 * [F21] mode resets whenever the selected tower's instanceId changes.
 */
export function TowerActionSheet({
	selectedTower,
	onDeselect,
}: TowerActionSheetProps) {
	const [mode, setMode] = useState<SheetMode>('idle');
	const [mergePunch, setMergePunch] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: instanceId is the trigger, not a read dep
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

	const tierIntent = `tier-${selectedTower.tier}` as TierBadgeIntent;

	return (
		<div
			data-testid="tower-action-sheet"
			data-merge-punch={mergePunch ? '1' : '0'}
			className={cn(
				'absolute left-1/2 -translate-x-1/2 bottom-[120px] flex flex-col items-center gap-sm pointer-events-auto',
				'transition-transform duration-200',
				mergePunch ? 'scale-110' : 'scale-100',
			)}
			style={{ zIndex: zIndex.floating }}
		>
			<Card variant="panel" className="py-[6px] px-sm">
				<div className="flex items-center gap-sm">
					<Badge
						variant="tag"
						intent={tierIntent}
						data-testid="tower-action-sheet-tier"
					>
						T{selectedTower.tier}
					</Badge>
					<span className="font-pixel text-[11px] text-text">
						{selectedTower.towerName}
					</span>
				</div>
			</Card>
			<div className="flex items-stretch gap-xs">
				<Button
					data-testid="tower-action-merge"
					onClick={handleMerge}
					variant={mode === 'merge-source' ? 'gold' : 'primary'}
					size="md"
					className="min-w-[64px] min-h-[52px]"
				>
					합성
				</Button>
				<Button
					data-testid="tower-action-move"
					onClick={handleMove}
					variant="secondary"
					size="md"
					className="min-w-[64px] min-h-[52px]"
				>
					이동
				</Button>
				<Button
					data-testid="tower-action-sell"
					onClick={handleSell}
					variant="danger"
					size="md"
					className="min-w-[64px] min-h-[52px]"
				>
					판매 +{selectedTower.sellValue}
				</Button>
				<Button
					data-testid="tower-action-close"
					onClick={onDeselect}
					variant="secondary"
					size="md"
					className="min-w-[52px] min-h-[52px]"
					aria-label="close"
				>
					✕
				</Button>
			</div>
		</div>
	);
}
