import type { Busy, TileKind, TilemapCell, TilemapDocument } from '../types';

const TILE_BRUSHES: TileKind[] = [
	'ground',
	'platform',
	'path',
	'wall',
	'foliage',
];

export function TilemapTool({
	tilemaps,
	selectedId,
	draft,
	brush,
	busy,
	onSelect,
	onBrushChange,
	onPaint,
	onGenerate,
	onApply,
}: {
	tilemaps: TilemapDocument[];
	selectedId: string | null;
	draft: TilemapDocument | null;
	brush: TileKind;
	busy: Busy;
	onSelect: (id: string) => void;
	onBrushChange: (brush: TileKind) => void;
	onPaint: (cell: TilemapCell) => void;
	onGenerate: () => void;
	onApply: () => void;
}) {
	return (
		<section className="tool-two-col">
			<aside className="panel">
				<div className="panel-header">
					<div>
						<p className="eyebrow">Tilemaps</p>
						<h2>{tilemaps.length} maps</h2>
					</div>
				</div>
				<div className="stack">
					{tilemaps.map((tilemap) => (
						<button
							key={tilemap.id}
							type="button"
							className={`acr-card ${tilemap.id === selectedId ? 'active' : ''}`}
							onClick={() => onSelect(tilemap.id)}
						>
							<span className="status-dot ready" />
							<span>
								<strong>{tilemap.id}</strong>
								<small>
									{tilemap.width}x{tilemap.height} / {tilemap.tileSize}px
								</small>
								<small>rule tiles {tilemap.ruleTiles.length}</small>
							</span>
						</button>
					))}
				</div>
				<div className="sidebar-card">
					<p className="eyebrow">Rule Tile</p>
					<p>
						Path, wall, foliage brushes auto-generate neighbor-mask tile IDs.
					</p>
				</div>
			</aside>
			<section className="panel">
				<div className="panel-header">
					<div>
						<p className="eyebrow">Editor</p>
						<h2>{draft?.file ?? 'No map'}</h2>
					</div>
					<div className="toolbar">
						<button
							type="button"
							disabled={busy !== 'idle'}
							onClick={onGenerate}
						>
							Generate draft
						</button>
						<button
							type="button"
							className="primary"
							disabled={busy !== 'idle'}
							onClick={onApply}
						>
							Apply JSON
						</button>
					</div>
				</div>
				<div className="brush-row">
					{TILE_BRUSHES.map((candidate) => (
						<button
							key={candidate}
							type="button"
							className={candidate === brush ? 'active-brush' : ''}
							onClick={() => onBrushChange(candidate)}
						>
							{candidate}
						</button>
					))}
				</div>
				{draft && (
					<div
						className="tile-grid"
						style={{ gridTemplateColumns: `repeat(${draft.width}, 34px)` }}
					>
						{draft.cells.map((cell) => (
							<button
								key={`${cell.x},${cell.y}`}
								type="button"
								className={`tile-cell ${cell.kind}`}
								title={`${cell.x},${cell.y} ${cell.kind}`}
								onClick={() => onPaint(cell)}
							/>
						))}
					</div>
				)}
			</section>
		</section>
	);
}
