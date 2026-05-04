import { useState } from 'react';

const DEFAULT_URL = 'http://localhost:3000';

export function PreviewPanel({ version }: { version: number }) {
	const [url, setUrl] = useState(DEFAULT_URL);
	const [draftUrl, setDraftUrl] = useState(DEFAULT_URL);
	const [collapsed, setCollapsed] = useState(false);
	const [manualReload, setManualReload] = useState(0);

	if (collapsed) {
		return (
			<aside className="preview-panel collapsed">
				<button
					type="button"
					className="preview-collapse"
					onClick={() => setCollapsed(false)}
					title="Expand preview"
				>
					◀
				</button>
			</aside>
		);
	}

	const reloadKey = `${url}:${version}:${manualReload}`;

	return (
		<aside className="preview-panel">
			<header className="panel-header tight">
				<div>
					<p className="eyebrow">Game Preview</p>
					<h2>web-shell</h2>
				</div>
				<div className="toolbar">
					<button
						type="button"
						onClick={() => setManualReload((value) => value + 1)}
						title="Reload preview"
					>
						↻
					</button>
					<a
						href={url}
						target="_blank"
						rel="noreferrer noopener"
						title="Open in new tab"
					>
						↗
					</a>
					<button
						type="button"
						onClick={() => setCollapsed(true)}
						title="Collapse preview"
					>
						▶
					</button>
				</div>
			</header>
			<form
				className="preview-url-row"
				onSubmit={(event) => {
					event.preventDefault();
					setUrl(draftUrl.trim() || DEFAULT_URL);
				}}
			>
				<input
					type="url"
					value={draftUrl}
					onChange={(event) => setDraftUrl(event.target.value)}
					placeholder="http://localhost:3000"
				/>
				<button type="submit">Go</button>
			</form>
			<div className="preview-frame-host">
				<iframe
					key={reloadKey}
					title="web-shell game preview"
					src={url}
					className="preview-frame"
					sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms"
				/>
			</div>
			<p className="preview-hint">
				Run <code>bun run dev:web</code> to start the game on{' '}
				<code>{DEFAULT_URL}</code>.
			</p>
		</aside>
	);
}
