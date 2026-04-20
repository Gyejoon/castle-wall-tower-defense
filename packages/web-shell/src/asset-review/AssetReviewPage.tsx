import { useCallback, useEffect, useMemo, useState } from 'react';
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
		<div className="grid h-dvh grid-cols-[280px_1fr_360px] bg-slate-950 text-slate-100">
			{/* Left: asset list */}
			<aside className="flex flex-col border-r border-slate-800 bg-slate-900">
				<header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
					<h1 className="font-mono text-sm tracking-wide">Asset Review</h1>
					<button
						type="button"
						className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800 disabled:opacity-40"
						onClick={reload}
						disabled={busy !== 'none'}
					>
						↻ {entries.length}
					</button>
				</header>
				<div className="min-h-0 flex-1 overflow-y-auto">
					{entries.length === 0 && (
						<p className="px-4 py-6 text-center text-xs text-slate-500">
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
			<main className="flex min-w-0 flex-col bg-slate-950">
				{selected ? (
					<AssetPreview entry={selected} />
				) : (
					<div className="flex flex-1 items-center justify-center text-slate-500">
						Select an asset to review.
					</div>
				)}
			</main>

			{/* Right: actions + metadata */}
			<aside className="flex flex-col overflow-y-auto border-l border-slate-800 bg-slate-900">
				{selected && (
					<ActionsPanel
						entry={selected}
						busy={busy}
						onAccept={() => runAction('accept', () => acceptAsset(selected.id))}
						onReject={() => runAction('reject', () => rejectAsset(selected.id))}
						onRegenerate={() =>
							runAction('regenerate', () => regenerateAsset(selected.id))
						}
					/>
				)}
			</aside>

			{/* Floating toast / error */}
			{toast && (
				<div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded bg-emerald-600 px-4 py-2 text-sm shadow-lg">
					{toast}
				</div>
			)}
			{error && (
				<div className="fixed bottom-4 left-1/2 max-w-xl -translate-x-1/2 rounded bg-red-600 px-4 py-2 text-xs shadow-lg">
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
			? 'bg-emerald-500'
			: status === 'rejected'
				? 'bg-red-500'
				: 'bg-amber-500';
	return (
		<button
			type="button"
			onClick={onSelect}
			className={`flex w-full items-center gap-3 border-b border-slate-800 px-3 py-2 text-left hover:bg-slate-800 ${
				active ? 'bg-slate-800' : ''
			}`}
		>
			{entry.hasPolished ? (
				<img
					src={stagingFileUrl(entry.id, 'polished.png')}
					alt={entry.id}
					className="h-10 w-10 shrink-0 rounded border border-slate-700 bg-slate-800 object-contain"
					style={{ imageRendering: 'pixelated' }}
				/>
			) : (
				<div className="h-10 w-10 shrink-0 rounded border border-slate-700 bg-slate-800" />
			)}
			<div className="min-w-0 flex-1">
				<div className="truncate font-mono text-xs">{entry.id}</div>
				<div className="flex items-center gap-1.5 text-[10px] text-slate-400">
					<span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
					<span>{status}</span>
					{meta?.polishLevel === 'libresprite-polished' && (
						<span className="rounded bg-slate-700 px-1 font-mono">LSP</span>
					)}
					{meta?.warnings?.length ? (
						<span className="text-amber-400">⚠ {meta.warnings.length}</span>
					) : null}
				</div>
			</div>
		</button>
	);
}

function AssetPreview({ entry }: { entry: StagingEntry }) {
	const meta = entry.metadata;
	const isSheet = !!meta?.polish.animation;
	return (
		<div className="flex flex-1 flex-col gap-4 overflow-auto p-6">
			<header>
				<h2 className="font-mono text-lg">{entry.id}</h2>
				<p className="font-mono text-xs text-slate-400">{meta?.sourcePath}</p>
			</header>

			<div className="grid grid-cols-2 gap-4">
				<PreviewPane
					title="Original (canvas)"
					url={
						entry.hasOriginal ? stagingFileUrl(entry.id, 'original.png') : null
					}
					isSheet={isSheet}
					frameW={meta?.polish.animation?.frameW}
					frameH={meta?.polish.animation?.frameH}
					frameCount={meta?.polish.animation?.frameCount}
				/>
				<PreviewPane
					title="Polished (LSP)"
					url={
						entry.hasPolished ? stagingFileUrl(entry.id, 'polished.png') : null
					}
					isSheet={isSheet}
					frameW={meta?.polish.animation?.frameW}
					frameH={meta?.polish.animation?.frameH}
					frameCount={meta?.polish.animation?.frameCount}
				/>
			</div>

			{isSheet && (
				<details className="text-xs text-slate-400">
					<summary className="cursor-pointer">Raw sheet</summary>
					<div className="mt-2 grid grid-cols-2 gap-2">
						<img
							src={stagingFileUrl(entry.id, 'original.png')}
							alt="original sheet"
							className="border border-slate-800"
							style={{ imageRendering: 'pixelated' }}
						/>
						<img
							src={stagingFileUrl(entry.id, 'polished.png')}
							alt="polished sheet"
							className="border border-slate-800"
							style={{ imageRendering: 'pixelated' }}
						/>
					</div>
				</details>
			)}
		</div>
	);
}

function PreviewPane({
	title,
	url,
	isSheet,
	frameW,
	frameH,
	frameCount,
}: {
	title: string;
	url: string | null;
	isSheet: boolean;
	frameW?: number;
	frameH?: number;
	frameCount?: number;
}) {
	if (!url) {
		return (
			<div className="flex min-h-[240px] items-center justify-center rounded border border-slate-800 text-slate-600">
				{title} — missing
			</div>
		);
	}
	return (
		<div className="flex flex-col gap-2">
			<div className="text-xs text-slate-400">{title}</div>
			<div className="flex min-h-[320px] items-center justify-center rounded border border-slate-800 bg-[repeating-conic-gradient(#1f2937_0%_25%,#111827_0%_50%)_50%/16px_16px]">
				{isSheet &&
				frameW !== undefined &&
				frameH !== undefined &&
				frameCount !== undefined ? (
					<SheetAnimation
						url={url}
						frameW={frameW}
						frameH={frameH}
						frameCount={frameCount}
					/>
				) : (
					<img
						src={url}
						alt={title}
						className="max-h-[400px] max-w-full"
						style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
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
}: {
	url: string;
	frameW: number;
	frameH: number;
	frameCount: number;
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
				width: frameW * 2,
				height: frameH * 2,
				backgroundImage: `url(${url})`,
				backgroundRepeat: 'no-repeat',
				backgroundPosition: `${-frame * frameW * 2}px 0`,
				backgroundSize: `${frameW * frameCount * 2}px ${frameH * 2}px`,
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
					className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40"
					onClick={onAccept}
					disabled={disabled || !entry.hasPolished}
				>
					{busy === 'accept' ? 'Accepting…' : 'Accept → public/assets'}
				</button>
				<button
					type="button"
					className="rounded bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600 disabled:opacity-40"
					onClick={onRegenerate}
					disabled={disabled}
				>
					{busy === 'regenerate' ? 'Regenerating…' : '↻ Regenerate (new seed)'}
				</button>
				<button
					type="button"
					className="rounded bg-red-600 px-3 py-2 text-sm hover:bg-red-500 disabled:opacity-40"
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
			<div className="font-mono text-slate-400">metadata</div>
			<dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 rounded bg-slate-800 p-3">
				<dt className="text-slate-500">status</dt>
				<dd>{meta.status}</dd>
				<dt className="text-slate-500">polish</dt>
				<dd>{meta.polishLevel}</dd>
				<dt className="text-slate-500">forged</dt>
				<dd className="truncate">
					{meta.forgedAt.slice(0, 16).replace('T', ' ')}
				</dd>
				<dt className="text-slate-500">rim / shadow</dt>
				<dd>
					{meta.polish.rimLight.strength}% / {meta.polish.rimLight.shadow}%
				</dd>
				<dt className="text-slate-500">noise</dt>
				<dd>
					d={meta.polish.noise.density.toFixed(2)}, seed=
					{meta.polish.noise.seed.toString(16).padStart(8, '0')}
				</dd>
				{meta.polish.animation && (
					<>
						<dt className="text-slate-500">frames</dt>
						<dd>
							{meta.polish.animation.frameCount}× {meta.polish.animation.frameW}
							×{meta.polish.animation.frameH}
						</dd>
					</>
				)}
			</dl>

			{meta.warnings.length > 0 && (
				<div className="rounded bg-amber-950/50 p-3">
					<div className="mb-1 text-amber-400">
						warnings ({meta.warnings.length})
					</div>
					<ul className="list-disc pl-4 text-slate-300">
						{meta.warnings.map((w) => (
							<li key={w} className="break-words">
								{w}
							</li>
						))}
					</ul>
				</div>
			)}

			{meta.animation?.warnings && meta.animation.warnings.length > 0 && (
				<div className="rounded bg-amber-950/50 p-3">
					<div className="mb-1 text-amber-400">animation drift</div>
					<ul className="list-disc pl-4 text-slate-300">
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
