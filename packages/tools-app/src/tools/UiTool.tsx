import { useState } from 'react';
import type { Busy, UiComponent } from '../types';

const DEFAULT_GALLERY_BASE = 'http://localhost:3000/?ds=1';

export function UiTool({
	components,
	busy,
}: {
	components: UiComponent[];
	busy: Busy;
}) {
	const [galleryBase, setGalleryBase] = useState(DEFAULT_GALLERY_BASE);
	const [draftBase, setDraftBase] = useState(DEFAULT_GALLERY_BASE);
	const [selectedKey, setSelectedKey] = useState<string | null>(
		components[0]?.key ?? null,
	);
	const [reloadCounter, setReloadCounter] = useState(0);

	const selected =
		components.find((entry) => entry.key === selectedKey) ?? components[0];
	const galleryUrl = selected
		? `${galleryBase}#${selected.sectionId}`
		: galleryBase;
	const reloadKey = `${galleryUrl}:${reloadCounter}`;

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
							Run the dev server in this workspace; no components were found
							under <code>web-shell/src/components/ds</code>.
						</p>
					)}
					{components.map((component) => (
						<button
							key={component.key}
							type="button"
							className={`acr-card ${
								component.key === selected?.key ? 'active' : ''
							}`}
							disabled={busy !== 'idle'}
							onClick={() => setSelectedKey(component.key)}
						>
							<span className="status-dot ready" />
							<span>
								<strong>{component.key}</strong>
								<small>{component.exports.join(', ') || '—'}</small>
								<small>refs {component.codeReferences.length}</small>
							</span>
						</button>
					))}
				</div>
				<div className="sidebar-card">
					<p className="eyebrow">Source</p>
					<p>
						Components live under{' '}
						<code>packages/web-shell/src/components/ds</code>. The DS gallery is
						the live preview for variants and intents.
					</p>
				</div>
			</aside>

			<section className="panel ui-detail">
				<div className="panel-header">
					<div>
						<p className="eyebrow">Inspector</p>
						<h2>{selected?.key ?? 'No component selected'}</h2>
					</div>
					<div className="toolbar">
						<button
							type="button"
							onClick={() => setReloadCounter((value) => value + 1)}
							title="Reload gallery"
						>
							↻
						</button>
						{selected && (
							<a
								href={galleryUrl}
								target="_blank"
								rel="noreferrer noopener"
								title="Open gallery in new tab"
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
								<dt>Section ID</dt>
								<dd>
									<code>#{selected.sectionId}</code>
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
						setGalleryBase(draftBase.trim() || DEFAULT_GALLERY_BASE);
					}}
				>
					<input
						type="url"
						value={draftBase}
						onChange={(event) => setDraftBase(event.target.value)}
						placeholder={DEFAULT_GALLERY_BASE}
					/>
					<button type="submit">Go</button>
				</form>

				<div className="preview-frame-host ui-gallery-frame">
					<iframe
						key={reloadKey}
						title="DS gallery preview"
						src={galleryUrl}
						className="preview-frame"
						sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms"
					/>
				</div>

				<p className="preview-hint">
					Run <code>bun run dev:web</code> to mount the gallery on{' '}
					<code>{DEFAULT_GALLERY_BASE}</code>. Selecting a component navigates
					the iframe to that section anchor.
				</p>
			</section>
		</section>
	);
}
