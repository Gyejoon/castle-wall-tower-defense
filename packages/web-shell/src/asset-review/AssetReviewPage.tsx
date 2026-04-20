import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	acceptAsset,
	listStaging,
	regenerateAsset,
	rejectAsset,
	type StagingEntry,
	type StagingMetadata,
	stagingFileUrl,
} from './api';

type Busy = 'none' | 'accept' | 'reject' | 'regenerate' | 'reload';

export function AssetReviewPage() {
	const [entries, setEntries] = useState<StagingEntry[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [busy, setBusy] = useState<Busy>('none');
	const [error, setError] = useState<string | null>(null);
	const [toast, setToast] = useState<string | null>(null);

	// Use functional updater for setSelectedId so reload doesn't need
	// selectedId in its closure — then useEffect can safely depend on reload.
	const reload = useCallback(async () => {
		setBusy('reload');
		setError(null);
		try {
			const e = await listStaging();
			setEntries(e);
			setSelectedId((prev) => {
				if (e.length === 0) return null;
				if (prev && e.some((x) => x.id === prev)) return prev;
				return e[0].id;
			});
		} catch (err) {
			setError(String(err));
		} finally {
			setBusy('none');
		}
	}, []);

	useEffect(() => {
		reload();
	}, [reload]);

	const selected = useMemo(
		() => entries.find((e) => e.id === selectedId) ?? null,
		[entries, selectedId],
	);

	const runAction = useCallback(
		async (
			action: Busy,
			fn: () => Promise<{ ok: boolean; stdout: string; stderr: string }>,
		) => {
			if (!selected) return;
			setBusy(action);
			setError(null);
			try {
				const res = await fn();
				if (!res.ok) {
					setError(res.stderr || res.stdout || 'action failed');
				} else {
					setToast(`${action} ✓ ${selected.id}`);
					setTimeout(() => setToast(null), 2000);
				}
				await reload();
			} catch (err) {
				setError(String(err));
			} finally {
				setBusy('none');
			}
		},
		[selected, reload],
	);

	return (
		<>
			<div className="hidden h-dvh flex-col items-center justify-center gap-2 bg-bg p-6 text-center text-text-secondary max-[900px]:flex">
				<p className="font-mono text-sm text-text">Asset Review</p>
				<p className="text-xs">
					이 도구는 데스크톱 전용이다. 900px 이상 창 폭에서 열어라.
				</p>
			</div>
			<div className="grid h-dvh grid-cols-[280px_1fr_360px] bg-bg text-text max-[900px]:hidden">
				{/* Left: asset list */}
				<aside className="flex flex-col border-r border-border bg-panel">
					<header className="flex items-center justify-between border-b border-border px-4 py-3">
						<h1 className="font-mono text-sm tracking-wide">Asset Review</h1>
						<button
							type="button"
							className="rounded border border-border px-2 py-1 text-xs hover:bg-border disabled:opacity-40"
							onClick={reload}
							disabled={busy !== 'none'}
						>
							↻ {entries.length}
						</button>
					</header>
					<div className="min-h-0 flex-1 overflow-y-auto">
						{entries.length === 0 && (
							<p className="px-4 py-6 text-center text-xs text-text-secondary/70">
								No staged assets.
								<br />
								Run <code>bun gld-pipe forge &lt;id&gt;</code>.
							</p>
						)}
						{entries.map((entry) => (
							<AssetRow
								key={entry.id}
								entry={entry}
								active={entry.id === selectedId}
								onSelect={() => setSelectedId(entry.id)}
							/>
						))}
					</div>
				</aside>

				{/* Middle: preview */}
				<main className="flex min-w-0 flex-col bg-bg">
					{selected ? (
						<AssetPreview entry={selected} />
					) : (
						<div className="flex flex-1 items-center justify-center text-text-secondary/70">
							Select an asset to review.
						</div>
					)}
				</main>

				{/* Right: actions + metadata */}
				<aside className="flex flex-col overflow-y-auto border-l border-border bg-panel">
					{selected && (
						<ActionsPanel
							entry={selected}
							busy={busy}
							onAccept={() =>
								runAction('accept', () => acceptAsset(selected.id))
							}
							onReject={() =>
								runAction('reject', () => rejectAsset(selected.id))
							}
							onRegenerate={() =>
								runAction('regenerate', () => regenerateAsset(selected.id))
							}
						/>
					)}
				</aside>

				{/* Floating toast / error */}
				{toast && (
					<div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded bg-success px-4 py-2 text-sm text-bg shadow-lg">
						{toast}
					</div>
				)}
				{error && (
					<div className="fixed bottom-4 left-1/2 max-w-xl -translate-x-1/2 rounded bg-danger px-4 py-2 text-xs text-text shadow-lg">
						<button
							type="button"
							className="float-right ml-2"
							onClick={() => setError(null)}
						>
							×
						</button>
						<pre className="whitespace-pre-wrap">{error}</pre>
					</div>
				)}
			</div>
		</>
	);
}

function AssetRow({
	entry,
	active,
	onSelect,
}: {
	entry: StagingEntry;
	active: boolean;
	onSelect: () => void;
}) {
	const meta = entry.metadata;
	const status = meta?.status ?? 'pending';
	const statusColor =
		status === 'accepted'
			? 'bg-success'
			: status === 'rejected'
				? 'bg-danger'
				: 'bg-accent';
	return (
		<button
			type="button"
			onClick={onSelect}
			className={`flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left hover:bg-border ${
				active ? 'bg-border' : ''
			}`}
		>
			{entry.hasPolished ? (
				<AssetThumbnail entry={entry} />
			) : (
				<div className="h-10 w-10 shrink-0 rounded border border-border bg-border" />
			)}
			<div className="min-w-0 flex-1">
				<div className="truncate font-mono text-xs">{entry.id}</div>
				<div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
					<span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
					<span>{status}</span>
					{meta?.polishLevel === 'libresprite-polished' && (
						<span className="rounded bg-border/60 px-1 font-mono">LSP</span>
					)}
					{meta?.warnings?.length ? (
						<span className="text-accent">⚠ {meta.warnings.length}</span>
					) : null}
				</div>
			</div>
		</button>
	);
}

/**
 * Thumbnail that crops to the first frame for sprite sheets. Without this,
 * a 512×80 sheet of 8 frames would render as a tiny compressed horizontal
 * strip in a 40×40 list cell. We use the sheet PNG as a background-image
 * sized so the first frame maps into the 40×40 box.
 */
function AssetThumbnail({ entry }: { entry: StagingEntry }) {
	const anim = entry.metadata?.polish.animation;
	const url = stagingFileUrl(entry.id, 'polished.png');
	if (!anim) {
		return (
			<img
				src={url}
				alt={entry.id}
				className="h-10 w-10 shrink-0 rounded border border-border bg-border object-contain"
				style={{ imageRendering: 'pixelated' }}
			/>
		);
	}
	// Scale the sheet so frame 0 fits inside a 40×40 box preserving aspect
	// ratio. Scale by the LONGER of frame dims so the full frame is visible.
	const BOX = 40;
	const scale = BOX / Math.max(anim.frameW, anim.frameH);
	const sheetW = anim.frameW * anim.frameCount * scale;
	const sheetH = anim.frameH * scale;
	const frameW = anim.frameW * scale;
	// Horizontally center the first frame in the box.
	const offsetX = (BOX - frameW) / 2;
	const offsetY = (BOX - sheetH) / 2;
	return (
		<div
			role="img"
			aria-label={`${entry.id} (frame 0)`}
			className="h-10 w-10 shrink-0 overflow-hidden rounded border border-border bg-border"
			style={{
				backgroundImage: `url(${url})`,
				backgroundRepeat: 'no-repeat',
				backgroundSize: `${sheetW}px ${sheetH}px`,
				backgroundPosition: `${offsetX}px ${offsetY}px`,
				imageRendering: 'pixelated',
			}}
		/>
	);
}

const ZOOM_LEVELS = [2, 4, 6, 8] as const;
type ZoomLevel = (typeof ZOOM_LEVELS)[number];
type ViewMode = 'side' | 'split';

function AssetPreview({ entry }: { entry: StagingEntry }) {
	const meta = entry.metadata;
	const isSheet = !!meta?.polish.animation;
	const [zoom, setZoom] = useState<ZoomLevel>(4);
	const [mode, setMode] = useState<ViewMode>('side');
	// Sheets have sync animation state on each pane. Split mode would need to
	// drive both from the same clock, which is more complexity than the
	// comparison helps with. Degrade to side-by-side for sheets silently.
	const effectiveMode: ViewMode = isSheet ? 'side' : mode;
	const hasBoth = entry.hasOriginal && entry.hasPolished;
	return (
		<div className="flex flex-1 flex-col gap-4 overflow-auto p-6">
			<header className="flex items-center justify-between gap-4">
				<div className="min-w-0 flex-1">
					<h2 className="font-mono text-lg">{entry.id}</h2>
					<p className="truncate font-mono text-xs text-text-secondary">
						{meta?.sourcePath}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{!isSheet && hasBoth && (
						<fieldset
							className="flex items-center gap-1 rounded border border-border bg-panel p-0.5"
							aria-label="view mode"
						>
							{(['side', 'split'] as const).map((m) => (
								<button
									key={m}
									type="button"
									onClick={() => setMode(m)}
									className={`rounded px-2 py-1 font-mono text-xs ${
										m === mode
											? 'bg-accent text-bg'
											: 'text-text-secondary hover:text-text'
									}`}
								>
									{m === 'side' ? 'Side' : 'Split'}
								</button>
							))}
						</fieldset>
					)}
					<fieldset
						className="flex items-center gap-1 rounded border border-border bg-panel p-0.5"
						aria-label="zoom level"
					>
						{ZOOM_LEVELS.map((z) => (
							<button
								key={z}
								type="button"
								onClick={() => setZoom(z)}
								className={`rounded px-2 py-1 font-mono text-xs ${
									z === zoom
										? 'bg-accent text-bg'
										: 'text-text-secondary hover:text-text'
								}`}
							>
								{z}×
							</button>
						))}
					</fieldset>
				</div>
			</header>

			{effectiveMode === 'split' && hasBoth ? (
				<SplitPane
					originalUrl={stagingFileUrl(entry.id, 'original.png')}
					polishedUrl={stagingFileUrl(entry.id, 'polished.png')}
					zoom={zoom}
				/>
			) : (
				<div className="grid grid-cols-2 gap-4">
					<PreviewPane
						title="Original (canvas)"
						url={
							entry.hasOriginal
								? stagingFileUrl(entry.id, 'original.png')
								: null
						}
						isSheet={isSheet}
						zoom={zoom}
						frameW={meta?.polish.animation?.frameW}
						frameH={meta?.polish.animation?.frameH}
						frameCount={meta?.polish.animation?.frameCount}
					/>
					<PreviewPane
						title="Polished (LSP)"
						url={
							entry.hasPolished
								? stagingFileUrl(entry.id, 'polished.png')
								: null
						}
						isSheet={isSheet}
						zoom={zoom}
						frameW={meta?.polish.animation?.frameW}
						frameH={meta?.polish.animation?.frameH}
						frameCount={meta?.polish.animation?.frameCount}
					/>
				</div>
			)}

			{isSheet && (
				<details className="text-xs text-text-secondary">
					<summary className="cursor-pointer">Raw sheet</summary>
					<div className="mt-2 grid grid-cols-2 gap-2">
						<img
							src={stagingFileUrl(entry.id, 'original.png')}
							alt="original sheet"
							className="border border-border"
							style={{ imageRendering: 'pixelated' }}
						/>
						<img
							src={stagingFileUrl(entry.id, 'polished.png')}
							alt="polished sheet"
							className="border border-border"
							style={{ imageRendering: 'pixelated' }}
						/>
					</div>
				</details>
			)}
		</div>
	);
}

/**
 * Before/after split scrubber. Polished image fills the frame; original is
 * overlaid on the LEFT portion via clip-path, revealed as the user drags the
 * divider. Pixel-art aware: both images are rendered at the same zoom and
 * pixel-pixelated so edges align exactly at the cut.
 */
function SplitPane({
	originalUrl,
	polishedUrl,
	zoom,
}: {
	originalUrl: string;
	polishedUrl: string;
	zoom: ZoomLevel;
}) {
	const [split, setSplit] = useState(50);
	const containerRef = useRef<HTMLDivElement>(null);
	const dragging = useRef(false);

	const updateFromClientX = useCallback((clientX: number) => {
		const el = containerRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const pct = ((clientX - rect.left) / rect.width) * 100;
		setSplit(Math.min(100, Math.max(0, pct)));
	}, []);

	const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		dragging.current = true;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		updateFromClientX(e.clientX);
	};
	const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!dragging.current) return;
		updateFromClientX(e.clientX);
	};
	const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		dragging.current = false;
		(e.target as HTMLElement).releasePointerCapture(e.pointerId);
	};

	const imgStyle: React.CSSProperties = {
		imageRendering: 'pixelated',
		transform: `scale(${zoom})`,
		transformOrigin: 'center',
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between text-xs text-text-secondary">
				<span>Original (canvas)</span>
				<span>{split.toFixed(0)}% · drag to compare</span>
				<span>Polished (LSP)</span>
			</div>
			<div
				ref={containerRef}
				className="relative flex min-h-[320px] select-none items-center justify-center overflow-hidden rounded border border-border"
				style={{
					backgroundImage:
						'repeating-conic-gradient(var(--color-panel) 0% 25%, var(--color-bg) 0% 50%)',
					backgroundSize: '16px 16px',
					cursor: 'ew-resize',
					touchAction: 'none',
				}}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
			>
				{/* Polished as base layer (right side reveals through split) */}
				<img
					src={polishedUrl}
					alt="polished"
					className="pointer-events-none"
					style={imgStyle}
				/>
				{/* Original clipped to the left portion */}
				<img
					src={originalUrl}
					alt="original"
					className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
					style={{
						...imgStyle,
						clipPath: `inset(0 ${100 - split}% 0 0)`,
					}}
				/>
				{/* Divider handle */}
				<div
					className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-accent shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
					style={{ left: `${split}%` }}
				>
					<div className="absolute top-1/2 left-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-bg bg-accent text-[10px] font-bold text-bg">
						↔
					</div>
				</div>
			</div>
		</div>
	);
}

function PreviewPane({
	title,
	url,
	isSheet,
	zoom,
	frameW,
	frameH,
	frameCount,
}: {
	title: string;
	url: string | null;
	isSheet: boolean;
	zoom: ZoomLevel;
	frameW?: number;
	frameH?: number;
	frameCount?: number;
}) {
	if (!url) {
		return (
			<div className="flex min-h-[240px] items-center justify-center rounded border border-border text-text-secondary/50">
				{title} — missing
			</div>
		);
	}
	return (
		<div className="flex flex-col gap-2">
			<div className="text-xs text-text-secondary">{title}</div>
			<div
				className="flex min-h-[320px] items-center justify-center overflow-auto rounded border border-border"
				style={{
					backgroundImage:
						'repeating-conic-gradient(var(--color-panel) 0% 25%, var(--color-bg) 0% 50%)',
					backgroundSize: '16px 16px',
				}}
			>
				{isSheet &&
				frameW !== undefined &&
				frameH !== undefined &&
				frameCount !== undefined ? (
					<SheetAnimation
						url={url}
						frameW={frameW}
						frameH={frameH}
						frameCount={frameCount}
						zoom={zoom}
					/>
				) : (
					<img
						src={url}
						alt={title}
						style={{
							imageRendering: 'pixelated',
							transform: `scale(${zoom})`,
							transformOrigin: 'center',
						}}
					/>
				)}
			</div>
		</div>
	);
}

function SheetAnimation({
	url,
	frameW,
	frameH,
	frameCount,
	zoom,
}: {
	url: string;
	frameW: number;
	frameH: number;
	frameCount: number;
	zoom: ZoomLevel;
}) {
	const [frame, setFrame] = useState(0);
	useEffect(() => {
		// Respect prefers-reduced-motion: show frame 0 statically so a reviewer
		// with the setting can still inspect the sheet per-frame via the raw
		// sheet disclosure below the preview.
		const mq =
			typeof window !== 'undefined' && window.matchMedia
				? window.matchMedia('(prefers-reduced-motion: reduce)')
				: null;
		if (mq?.matches) return;
		const id = setInterval(() => setFrame((f) => (f + 1) % frameCount), 120);
		return () => clearInterval(id);
	}, [frameCount]);
	return (
		<div
			role="img"
			aria-label="sheet animation preview"
			style={{
				width: frameW * zoom,
				height: frameH * zoom,
				backgroundImage: `url(${url})`,
				backgroundRepeat: 'no-repeat',
				backgroundPosition: `${-frame * frameW * zoom}px 0`,
				backgroundSize: `${frameW * frameCount * zoom}px ${frameH * zoom}px`,
				imageRendering: 'pixelated',
			}}
		/>
	);
}

function ActionsPanel({
	entry,
	busy,
	onAccept,
	onReject,
	onRegenerate,
}: {
	entry: StagingEntry;
	busy: Busy;
	onAccept: () => void;
	onReject: () => void;
	onRegenerate: () => void;
}) {
	const meta = entry.metadata as StagingMetadata | null;
	const disabled = busy !== 'none';
	return (
		<div className="flex flex-col gap-3 p-4">
			<section className="flex flex-col gap-2">
				<button
					type="button"
					className="rounded bg-success px-3 py-2 text-sm font-semibold text-bg hover:brightness-110 disabled:opacity-40"
					onClick={onAccept}
					disabled={disabled || !entry.hasPolished}
				>
					{busy === 'accept' ? 'Accepting…' : 'Accept → public/assets'}
				</button>
				<button
					type="button"
					className="rounded border border-border bg-panel px-3 py-2 text-sm text-text hover:bg-border/40 disabled:opacity-40"
					onClick={onRegenerate}
					disabled={disabled}
				>
					{busy === 'regenerate' ? 'Regenerating…' : '↻ Regenerate (new seed)'}
				</button>
				<button
					type="button"
					className="rounded bg-danger px-3 py-2 text-sm text-text hover:brightness-110 disabled:opacity-40"
					onClick={onReject}
					disabled={disabled}
				>
					{busy === 'reject' ? 'Rejecting…' : 'Reject (clear staging)'}
				</button>
			</section>

			{meta && <MetadataPanel meta={meta} />}
		</div>
	);
}

function MetadataPanel({ meta }: { meta: StagingMetadata }) {
	return (
		<section className="flex flex-col gap-2 text-xs">
			<div className="font-mono text-text-secondary">metadata</div>
			<dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 rounded bg-border p-3">
				<dt className="text-text-secondary/70">status</dt>
				<dd>{meta.status}</dd>
				<dt className="text-text-secondary/70">polish</dt>
				<dd>{meta.polishLevel}</dd>
				<dt className="text-text-secondary/70">forged</dt>
				<dd className="truncate">
					{meta.forgedAt.slice(0, 16).replace('T', ' ')}
				</dd>
				<dt className="text-text-secondary/70">rim / shadow</dt>
				<dd>
					{meta.polish.rimLight.strength}% / {meta.polish.rimLight.shadow}%
				</dd>
				<dt className="text-text-secondary/70">noise</dt>
				<dd>
					d={meta.polish.noise.density.toFixed(2)}, seed=
					{meta.polish.noise.seed.toString(16).padStart(8, '0')}
				</dd>
				{meta.polish.animation && (
					<>
						<dt className="text-text-secondary/70">frames</dt>
						<dd>
							{meta.polish.animation.frameCount}× {meta.polish.animation.frameW}
							×{meta.polish.animation.frameH}
						</dd>
					</>
				)}
			</dl>

			{meta.warnings.length > 0 && (
				<div className="rounded border border-accent/40 bg-accent/10 p-3">
					<div className="mb-1 text-accent">
						warnings ({meta.warnings.length})
					</div>
					<ul className="list-disc pl-4 text-text">
						{meta.warnings.map((w) => (
							<li key={w} className="break-words">
								{w}
							</li>
						))}
					</ul>
				</div>
			)}

			{meta.animation?.warnings && meta.animation.warnings.length > 0 && (
				<div className="rounded border border-accent/40 bg-accent/10 p-3">
					<div className="mb-1 text-accent">animation drift</div>
					<ul className="list-disc pl-4 text-text">
						{meta.animation.warnings.map((w) => (
							<li key={`${w.from}-${w.to}`}>
								{w.from}→{w.to}: {w.drift.toFixed(2)}px &gt; {w.maxDrift}
							</li>
						))}
					</ul>
				</div>
			)}
		</section>
	);
}
