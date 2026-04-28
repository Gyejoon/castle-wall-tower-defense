import { EventBus } from '@gld/phaser-game';
import { zIndex } from '@gld/shared';
import { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import { Badge } from '../ds/Badge';
import { Button } from '../ds/Button';
import { Card } from '../ds/Card';

export interface SelectedTower {
	// 현재는 `${col},${row}` 형식의 의사 ID. 씬이 진짜 instanceId를 실으면 그때 교체.
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

// 선택된 타워 변경 시 mode는 항상 idle로 리셋된다.
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
