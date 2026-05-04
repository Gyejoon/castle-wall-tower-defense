import { useMemo, useState } from 'react';
import type { Busy, UiComponent } from '../types';

const DEFAULT_GALLERY_BASE = 'http://localhost:3000/?ds=1';
const DEFAULT_LIVE_BASE = 'http://localhost:3000/';

const CATEGORY_LABELS: Record<string, string> = {
	ds: 'Design System',
	ui: 'Pixel UI',
	game: 'Game / HUD',
	lobby: 'Lobby',
	auth: 'Auth',
	gacha: 'Gacha',
	common: 'Common',
	root: 'Root',
};

function categoryLabel(category: string): string {
	return CATEGORY_LABELS[category] ?? category;
}

export function UiTool({
	components,
	busy,
}: {
	components: UiComponent[];
	busy: Busy;
}) {
	const [galleryBase, setGalleryBase] = useState(DEFAULT_GALLERY_BASE);
	const [liveBase, setLiveBase] = useState(DEFAULT_LIVE_BASE);
	const [draftGallery, setDraftGallery] = useState(DEFAULT_GALLERY_BASE);
	const [draftLive, setDraftLive] = useState(DEFAULT_LIVE_BASE);
	const [selectedKey, setSelectedKey] = useState<string | null>(
		components[0]?.key ?? null,
	);
	const [reloadCounter, setReloadCounter] = useState(0);

	const grouped = useMemo(() => {
		const map = new Map<string, UiComponent[]>();
		for (const component of components) {
			const list = map.get(component.category) ?? [];
			list.push(component);
			map.set(component.category, list);
		}
		return Array.from(map.entries()).sort(([a], [b]) => {
			if (a === 'ds') return -1;
			if (b === 'ds') return 1;
			return a.localeCompare(b);
		});
	}, [components]);

	const selected =
		components.find((entry) => entry.key === selectedKey) ?? components[0];
	const previewUrl = selected
		? selected.sectionId
			? `${galleryBase}#${selected.sectionId}`
			: liveBase
		: galleryBase;
	const previewMode = selected?.sectionId ? 'gallery' : 'live';
	const reloadKey = `${previewUrl}:${reloadCounter}`;

	return (
		<section className="ui-tool-layout">
			<aside className="panel ui-component-list">
				<div className="panel-header">
					<div>
						<p className="eyebrow">Components</p>
						<h2>{components.length} entries</h2>
					</div>
				</div>
				<div className="stack">
					{components.length === 0 && (
						<p className="empty">
							No components found under <code>web-shell/src/components</code>.
						</p>
					)}
					{grouped.map(([category, list]) => (
						<div key={category} className="ui-component-group">
							<p className="ui-group-label">{categoryLabel(category)}</p>
							{list.map((component) => (
								<button
									key={component.key}
									type="button"
									className={`acr-card ${
										component.key === selected?.key ? 'active' : ''
									}`}
									disabled={busy !== 'idle'}
									onClick={() => setSelectedKey(component.key)}
								>
									<span
										className={`status-dot ${
											component.sectionId ? 'ready' : 'draft'
										}`}
									/>
									<span>
										<strong>{component.key}</strong>
										<small>{component.exports.join(', ') || '—'}</small>
										<small>refs {component.codeReferences.length}</small>
									</span>
								</button>
							))}
						</div>
					))}
				</div>
				<div className="sidebar-card">
					<p className="eyebrow">Preview source</p>
					<p>
						DS components use the <code>?ds=1</code> gallery anchors. Other
						components fall back to the live game; navigate in-game to bring HUD
						overlays into view.
					</p>
				</div>
			</aside>

			<section className="panel ui-detail">
				<div className="panel-header">
					<div>
						<p className="eyebrow">
							Inspector{' '}
							<span className={`badge ${previewMode}`}>{previewMode}</span>
						</p>
						<h2>{selected?.key ?? 'No component selected'}</h2>
					</div>
					<div className="toolbar">
						<button
							type="button"
							onClick={() => setReloadCounter((value) => value + 1)}
							title="Reload preview"
						>
							↻
						</button>
						{selected && (
							<a
								href={previewUrl}
								target="_blank"
								rel="noreferrer noopener"
								title="Open in new tab"
							>
								↗
							</a>
						)}
					</div>
				</div>

				{selected && (
					<>
						<dl className="meta-list">
							<div>
								<dt>Category</dt>
								<dd>{categoryLabel(selected.category)}</dd>
							</div>
							<div>
								<dt>File</dt>
								<dd>
									<code>{selected.file}</code>
								</dd>
							</div>
							<div>
								<dt>Exports</dt>
								<dd>{selected.exports.join(', ') || '—'}</dd>
							</div>
							<div>
								<dt>Anchor</dt>
								<dd>
									{selected.sectionId ? (
										<code>#{selected.sectionId}</code>
									) : (
										<span className="muted">
											live game (no gallery section)
										</span>
									)}
								</dd>
							</div>
						</dl>

						<div className="ui-references">
							<strong>Code references</strong>
							{selected.codeReferences.length === 0 && (
								<small>No references found in source index.</small>
							)}
							{selected.codeReferences.map((path) => (
								<small key={path}>
									<code>{path}</code>
								</small>
							))}
						</div>
					</>
				)}

				<form
					className="preview-url-row"
					onSubmit={(event) => {
						event.preventDefault();
						setGalleryBase(draftGallery.trim() || DEFAULT_GALLERY_BASE);
						setLiveBase(draftLive.trim() || DEFAULT_LIVE_BASE);
					}}
				>
					<input
						type="url"
						value={draftGallery}
						onChange={(event) => setDraftGallery(event.target.value)}
						placeholder={DEFAULT_GALLERY_BASE}
						title="Gallery URL (used for DS components)"
					/>
					<input
						type="url"
						value={draftLive}
						onChange={(event) => setDraftLive(event.target.value)}
						placeholder={DEFAULT_LIVE_BASE}
						title="Live game URL (used for HUD components)"
					/>
					<button type="submit">Go</button>
				</form>

				<div className="preview-frame-host ui-gallery-frame">
					<iframe
						key={reloadKey}
						title="UI preview"
						src={previewUrl}
						className="preview-frame"
						sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms"
					/>
				</div>

				<p className="preview-hint">
					Run <code>bun run dev:web</code> to mount{' '}
					<code>{DEFAULT_LIVE_BASE}</code>. DS components scroll the gallery to
					their anchor; HUD/Game components show the live app for in-context
					inspection.
				</p>
			</section>
		</section>
	);
}
