import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	acceptAsset,
	applyAcr,
	applyBalance,
	applyTilemap,
	createAcr,
	generateTilemap,
	getBalance,
	getScenes,
	listAcrs,
	listCatalog,
	listStaging,
	listTilemaps,
	publicAssetUrl,
	regenerateAsset,
	rejectAsset,
	runAcrCheck,
	saveScenes,
	stagingFileUrl,
	updateAcr,
} from './api';
import {
	type AcrChecklistItem,
	type AssetChangeRequest,
	type AssetManifestSection,
	type AssetPolishLevel,
	type BalanceSheet,
	type CatalogEntry,
	CHECK_LABELS,
	type CheckId,
	type CheckStatus,
	type SceneRecord,
	type SceneSettings,
	type StagingEntry,
	type TileKind,
	type TilemapCell,
	type TilemapDocument,
	type ToolSection,
} from './types';

const NAV_ITEMS: ToolSection[] = ['Assets', 'Tilemap', 'Scenes', 'Balance'];
const CHECK_IDS: CheckId[] = ['asset-audit', 'phaser-tests', 'web-build'];
const CHECK_STATUS_ORDER: CheckStatus[] = [
	'pending',
	'required',
	'pass',
	'fail',
];
const TILE_BRUSHES: TileKind[] = [
	'ground',
	'platform',
	'path',
	'wall',
	'foliage',
];
const MANIFEST_SECTIONS: AssetManifestSection[] = [
	'preload',
	'ui',
	'vfx',
	'projectiles',
	'mobile',
	'icons',
	'boss',
	'reward',
	'tutorial',
	'gacha',
];
const POLISH_LEVELS: AssetPolishLevel[] = [
	'canvas-only',
	'libresprite-polished',
];

type Busy =
	| 'idle'
	| 'loading'
	| 'creating'
	| 'saving'
	| 'checking'
	| 'applying'
	| 'staging';

export function App() {
	const [activeTool, setActiveTool] = useState<ToolSection>('Assets');
	const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
	const [acrs, setAcrs] = useState<AssetChangeRequest[]>([]);
	const [staging, setStaging] = useState<StagingEntry[]>([]);
	const [tilemaps, setTilemaps] = useState<TilemapDocument[]>([]);
	const [sceneSettings, setSceneSettings] = useState<SceneSettings | null>(
		null,
	);
	const [balance, setBalance] = useState<BalanceSheet | null>(null);
	const [selectedAssetKey, setSelectedAssetKey] = useState<string | null>(null);
	const [selectedAcrId, setSelectedAcrId] = useState<string | null>(null);
	const [selectedTilemapId, setSelectedTilemapId] = useState<string | null>(
		null,
	);
	const [tileDraft, setTileDraft] = useState<TilemapDocument | null>(null);
	const [tileBrush, setTileBrush] = useState<TileKind>('path');
	const [query, setQuery] = useState('');
	const [section, setSection] = useState('all');
	const [busy, setBusy] = useState<Busy>('idle');
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	const selectedAsset = useMemo(
		() => catalog.find((asset) => asset.key === selectedAssetKey) ?? catalog[0],
		[catalog, selectedAssetKey],
	);

	const selectedAcr = useMemo(
		() => acrs.find((acr) => acr.id === selectedAcrId) ?? acrs[0],
		[acrs, selectedAcrId],
	);

	const sections = useMemo(
		() => [
			'all',
			...Array.from(new Set(catalog.map((asset) => asset.section))).sort(),
		],
		[catalog],
	);

	const filteredCatalog = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return catalog.filter((asset) => {
			if (section !== 'all' && asset.section !== section) return false;
			if (!needle) return true;
			return (
				asset.key.toLowerCase().includes(needle) ||
				asset.path.toLowerCase().includes(needle) ||
				asset.section.toLowerCase().includes(needle)
			);
		});
	}, [catalog, query, section]);

	const reload = useCallback(async () => {
		setBusy('loading');
		setError(null);
		try {
			const [
				nextCatalog,
				nextAcrs,
				nextStaging,
				nextTilemaps,
				nextScenes,
				nextBalance,
			] = await Promise.all([
				listCatalog(),
				listAcrs(),
				listStaging(),
				listTilemaps(),
				getScenes(),
				getBalance(),
			]);
			setCatalog(nextCatalog);
			setAcrs(nextAcrs);
			setStaging(nextStaging);
			setTilemaps(nextTilemaps);
			setSceneSettings(nextScenes);
			setBalance(nextBalance);
			setSelectedAssetKey((prev) => prev ?? nextCatalog[0]?.key ?? null);
			setSelectedAcrId((prev) => prev ?? nextAcrs[0]?.id ?? null);
			setSelectedTilemapId((prev) => prev ?? nextTilemaps[0]?.id ?? null);
			setTileDraft((prev) => prev ?? nextTilemaps[0] ?? null);
		} catch (err) {
			setError(String(err));
		} finally {
			setBusy('idle');
		}
	}, []);

	useEffect(() => {
		reload();
	}, [reload]);

	useEffect(() => {
		const selected = tilemaps.find(
			(tilemap) => tilemap.id === selectedTilemapId,
		);
		if (selected) setTileDraft(selected);
	}, [selectedTilemapId, tilemaps]);

	const showNotice = useCallback((message: string) => {
		setNotice(message);
		window.setTimeout(() => setNotice(null), 2400);
	}, []);

	const replaceAcr = useCallback((acr: AssetChangeRequest) => {
		setAcrs((current) =>
			current.some((candidate) => candidate.id === acr.id)
				? current.map((candidate) =>
						candidate.id === acr.id ? acr : candidate,
					)
				: [acr, ...current],
		);
	}, []);

	const handleCreateAcr = useCallback(async () => {
		if (!selectedAsset) return;
		setBusy('creating');
		setError(null);
		try {
			const acr = await createAcr({
				title: `Review ${selectedAsset.key}`,
				assetKeys: [selectedAsset.key],
			});
			replaceAcr(acr);
			setSelectedAcrId(acr.id);
			showNotice(`Created ${acr.id}`);
		} catch (err) {
			setError(String(err));
		} finally {
			setBusy('idle');
		}
	}, [replaceAcr, selectedAsset, showNotice]);

	const handleChecklistChange = useCallback(
		async (item: AcrChecklistItem, status: CheckStatus) => {
			if (!selectedAcr) return;
			setBusy('saving');
			setError(null);
			try {
				const checklist = selectedAcr.checklist.map((candidate) =>
					candidate.id === item.id ? { ...candidate, status } : candidate,
				);
				replaceAcr(await updateAcr(selectedAcr.id, { checklist }));
			} catch (err) {
				setError(String(err));
			} finally {
				setBusy('idle');
			}
		},
		[replaceAcr, selectedAcr],
	);

	const handleManifestPatch = useCallback(
		async (sectionValue: AssetManifestSection, polish: AssetPolishLevel) => {
			if (!selectedAcr || !selectedAsset) return;
			setBusy('saving');
			setError(null);
			try {
				const existing = selectedAcr.manifestUpdates ?? [];
				const manifestUpdates = [
					...existing.filter((update) => update.key !== selectedAsset.key),
					{ key: selectedAsset.key, section: sectionValue, polish },
				];
				const assetKeys = Array.from(
					new Set([...selectedAcr.assetKeys, selectedAsset.key]),
				);
				replaceAcr(
					await updateAcr(selectedAcr.id, {
						manifestUpdates,
						assetKeys,
						status: 'ready',
					}),
				);
				showNotice('Manifest patch staged in ACR');
			} catch (err) {
				setError(String(err));
			} finally {
				setBusy('idle');
			}
		},
		[replaceAcr, selectedAcr, selectedAsset, showNotice],
	);

	const handleRunCheck = useCallback(
		async (checkId: CheckId) => {
			if (!selectedAcr) return;
			setBusy('checking');
			setError(null);
			try {
				const result = await runAcrCheck(selectedAcr.id, checkId);
				replaceAcr(result.acr);
				showNotice(
					result.ok ? `${CHECK_LABELS[checkId]} passed` : 'Check failed',
				);
			} catch (err) {
				setError(String(err));
				await reload();
			} finally {
				setBusy('idle');
			}
		},
		[reload, replaceAcr, selectedAcr, showNotice],
	);

	const handleApplyAcr = useCallback(async () => {
		if (!selectedAcr) return;
		setBusy('applying');
		setError(null);
		try {
			const result = await applyAcr(selectedAcr.id);
			replaceAcr(result.acr);
			setCatalog(await listCatalog());
			showNotice(
				result.changed ? 'Applied manifest updates' : 'ACR marked applied',
			);
		} catch (err) {
			setError(String(err));
		} finally {
			setBusy('idle');
		}
	}, [replaceAcr, selectedAcr, showNotice]);

	const handleStagingAction = useCallback(
		async (entry: StagingEntry, action: 'accept' | 'reject' | 'regenerate') => {
			setBusy('staging');
			setError(null);
			try {
				const fn =
					action === 'accept'
						? acceptAsset
						: action === 'reject'
							? rejectAsset
							: regenerateAsset;
				await fn(entry.id);
				showNotice(`${action} ${entry.id}`);
				setStaging(await listStaging());
				setCatalog(await listCatalog());
			} catch (err) {
				setError(String(err));
			} finally {
				setBusy('idle');
			}
		},
		[showNotice],
	);

	const paintTile = useCallback(
		(cell: TilemapCell) => {
			if (!tileDraft) return;
			setTileDraft({
				...tileDraft,
				cells: tileDraft.cells.map((candidate) =>
					candidate.x === cell.x && candidate.y === cell.y
						? { ...candidate, kind: tileBrush }
						: candidate,
				),
			});
		},
		[tileBrush, tileDraft],
	);

	const handleGenerateTilemap = useCallback(async () => {
		if (!tileDraft) return;
		setBusy('saving');
		setError(null);
		try {
			const generated = await generateTilemap(tileDraft);
			setTileDraft(generated);
			showNotice(`Generated draft ${generated.file}`);
		} catch (err) {
			setError(String(err));
		} finally {
			setBusy('idle');
		}
	}, [showNotice, tileDraft]);

	const handleApplyTilemap = useCallback(async () => {
		if (!tileDraft) return;
		setBusy('applying');
		setError(null);
		try {
			const result = await applyTilemap(tileDraft);
			setTilemaps(await listTilemaps());
			showNotice(`Applied ${result.path}`);
		} catch (err) {
			setError(String(err));
		} finally {
			setBusy('idle');
		}
	}, [showNotice, tileDraft]);

	const handleSaveScenes = useCallback(async () => {
		if (!sceneSettings) return;
		setBusy('saving');
		setError(null);
		try {
			setSceneSettings(await saveScenes(sceneSettings));
			showNotice('Scene settings saved');
		} catch (err) {
			setError(String(err));
		} finally {
			setBusy('idle');
		}
	}, [sceneSettings, showNotice]);

	const handleApplyBalance = useCallback(async () => {
		if (!balance) return;
		setBusy('applying');
		setError(null);
		try {
			const result = await applyBalance(balance);
			setBalance(result.sheet);
			showNotice('Balance sheet applied to shared constants');
		} catch (err) {
			setError(String(err));
		} finally {
			setBusy('idle');
		}
	}, [balance, showNotice]);

	return (
		<div className="app-shell">
			<aside className="sidebar">
				<div className="brand">
					<span className="brand-mark">GLD</span>
					<span>Tools</span>
				</div>
				<nav className="nav-list">
					{NAV_ITEMS.map((item) => (
						<button
							key={item}
							type="button"
							className={`nav-item ${item === activeTool ? 'active' : ''}`}
							onClick={() => setActiveTool(item)}
						>
							<span>{item}</span>
							<span className="muted">ready</span>
						</button>
					))}
				</nav>
				<div className="sidebar-card">
					<p className="eyebrow">Boundary</p>
					<p>Local-only app. Public web-shell does not import this tool.</p>
				</div>
			</aside>

			<main className="workspace">
				<header className="topbar">
					<div>
						<p className="eyebrow">Game Development Console</p>
						<h1>{activeTool}</h1>
					</div>
					<div className="toolbar">
						<button type="button" onClick={reload} disabled={busy !== 'idle'}>
							Refresh
						</button>
					</div>
				</header>

				{activeTool === 'Assets' && (
					<AssetsTool
						acrs={acrs}
						busy={busy}
						catalog={catalog}
						filteredCatalog={filteredCatalog}
						onApply={handleApplyAcr}
						onChecklistChange={handleChecklistChange}
						onCreateAcr={handleCreateAcr}
						onManifestPatch={handleManifestPatch}
						onRunCheck={handleRunCheck}
						onSectionChange={setSection}
						onSelectAcr={setSelectedAcrId}
						onSelectAsset={setSelectedAssetKey}
						onStagingAction={handleStagingAction}
						query={query}
						section={section}
						sections={sections}
						selectedAcr={selectedAcr ?? null}
						selectedAsset={selectedAsset ?? null}
						setQuery={setQuery}
						staging={staging}
					/>
				)}

				{activeTool === 'Tilemap' && (
					<TilemapTool
						brush={tileBrush}
						busy={busy}
						draft={tileDraft}
						onApply={handleApplyTilemap}
						onBrushChange={setTileBrush}
						onGenerate={handleGenerateTilemap}
						onPaint={paintTile}
						onSelect={(id) => setSelectedTilemapId(id)}
						selectedId={selectedTilemapId}
						tilemaps={tilemaps}
					/>
				)}

				{activeTool === 'Scenes' && sceneSettings && (
					<ScenesTool
						busy={busy}
						onChange={setSceneSettings}
						onSave={handleSaveScenes}
						settings={sceneSettings}
					/>
				)}

				{activeTool === 'Balance' && balance && (
					<BalanceTool
						balance={balance}
						busy={busy}
						onApply={handleApplyBalance}
						onChange={setBalance}
					/>
				)}
			</main>

			{notice && <div className="toast success">{notice}</div>}
			{error && (
				<div className="toast error">
					<button type="button" onClick={() => setError(null)}>
						x
					</button>
					<pre>{error}</pre>
				</div>
			)}
		</div>
	);
}

function AssetsTool(props: {
	acrs: AssetChangeRequest[];
	busy: Busy;
	catalog: CatalogEntry[];
	filteredCatalog: CatalogEntry[];
	onApply: () => void;
	onChecklistChange: (item: AcrChecklistItem, status: CheckStatus) => void;
	onCreateAcr: () => void;
	onManifestPatch: (
		section: AssetManifestSection,
		polish: AssetPolishLevel,
	) => void;
	onRunCheck: (checkId: CheckId) => void;
	onSectionChange: (section: string) => void;
	onSelectAcr: (id: string) => void;
	onSelectAsset: (key: string) => void;
	onStagingAction: (
		entry: StagingEntry,
		action: 'accept' | 'reject' | 'regenerate',
	) => void;
	query: string;
	section: string;
	sections: string[];
	selectedAcr: AssetChangeRequest | null;
	selectedAsset: CatalogEntry | null;
	setQuery: (query: string) => void;
	staging: StagingEntry[];
}) {
	const [patchSection, setPatchSection] =
		useState<AssetManifestSection>('preload');
	const [patchPolish, setPatchPolish] =
		useState<AssetPolishLevel>('canvas-only');

	useEffect(() => {
		if (props.selectedAsset) {
			setPatchSection(props.selectedAsset.section);
			setPatchPolish(props.selectedAsset.polish ?? 'canvas-only');
		}
	}, [props.selectedAsset]);

	return (
		<>
			<section className="grid-layout">
				<AcrList
					acrs={props.acrs}
					onSelect={props.onSelectAcr}
					selectedId={props.selectedAcr?.id ?? null}
				/>
				<section className="panel catalog-panel">
					<div className="panel-header">
						<div>
							<p className="eyebrow">Catalog</p>
							<h2>{props.filteredCatalog.length} assets</h2>
						</div>
						<select
							value={props.section}
							onChange={(event) => props.onSectionChange(event.target.value)}
						>
							{props.sections.map((name) => (
								<option key={name} value={name}>
									{name}
								</option>
							))}
						</select>
					</div>
					<input
						className="search"
						onChange={(event) => props.setQuery(event.target.value)}
						placeholder="Search key, path, section"
						value={props.query}
					/>
					<div className="asset-grid">
						{props.filteredCatalog.map((asset) => (
							<AssetCard
								key={asset.key}
								active={asset.key === props.selectedAsset?.key}
								asset={asset}
								inSelectedAcr={
									props.selectedAcr?.assetKeys.includes(asset.key) ?? false
								}
								onSelect={() => props.onSelectAsset(asset.key)}
							/>
						))}
					</div>
				</section>
				<section className="panel inspector">
					<div className="panel-header">
						<div>
							<p className="eyebrow">Inspector</p>
							<h2>{props.selectedAsset?.key ?? 'No asset selected'}</h2>
						</div>
						<button
							type="button"
							className="primary"
							disabled={props.busy !== 'idle' || !props.selectedAsset}
							onClick={props.onCreateAcr}
						>
							New ACR
						</button>
					</div>
					{props.selectedAsset && (
						<>
							<AssetPreview asset={props.selectedAsset} />
							<dl className="meta-list">
								<div>
									<dt>Path</dt>
									<dd>{props.selectedAsset.path}</dd>
								</div>
								<div>
									<dt>Type</dt>
									<dd>
										{props.selectedAsset.type}
										{props.selectedAsset.frameCount
											? ` / ${props.selectedAsset.frameWidth}x${props.selectedAsset.frameHeight} / ${props.selectedAsset.frameCount}f`
											: ''}
									</dd>
								</div>
								<div>
									<dt>Status</dt>
									<dd>
										file {props.selectedAsset.fileExists ? 'ok' : 'missing'} /
										webp{' '}
										{props.selectedAsset.webpExists === null
											? 'n/a'
											: props.selectedAsset.webpExists
												? 'ok'
												: 'missing'}
									</dd>
								</div>
							</dl>
							<div className="form-grid">
								<label>
									Section
									<select
										value={patchSection}
										onChange={(event) =>
											setPatchSection(
												event.target.value as AssetManifestSection,
											)
										}
									>
										{MANIFEST_SECTIONS.map((entry) => (
											<option key={entry} value={entry}>
												{entry}
											</option>
										))}
									</select>
								</label>
								<label>
									Polish
									<select
										value={patchPolish}
										onChange={(event) =>
											setPatchPolish(event.target.value as AssetPolishLevel)
										}
									>
										{POLISH_LEVELS.map((entry) => (
											<option key={entry} value={entry}>
												{entry}
											</option>
										))}
									</select>
								</label>
							</div>
							<button
								type="button"
								className="primary wide"
								disabled={props.busy !== 'idle' || !props.selectedAcr}
								onClick={() => props.onManifestPatch(patchSection, patchPolish)}
							>
								Stage manifest patch in selected ACR
							</button>
						</>
					)}
					{props.selectedAcr && (
						<AcrDetail
							acr={props.selectedAcr}
							busy={props.busy}
							onApply={props.onApply}
							onChecklistChange={props.onChecklistChange}
							onRunCheck={props.onRunCheck}
						/>
					)}
				</section>
			</section>
			<StagingPanel
				busy={props.busy}
				entries={props.staging}
				onAction={props.onStagingAction}
			/>
		</>
	);
}

function AcrList({
	acrs,
	selectedId,
	onSelect,
}: {
	acrs: AssetChangeRequest[];
	selectedId: string | null;
	onSelect: (id: string) => void;
}) {
	return (
		<section className="panel acr-list">
			<div className="panel-header">
				<div>
					<p className="eyebrow">Requests</p>
					<h2>{acrs.length} ACRs</h2>
				</div>
			</div>
			<div className="stack">
				{acrs.length === 0 && (
					<p className="empty">Select an asset and create the first ACR.</p>
				)}
				{acrs.map((acr) => (
					<button
						key={acr.id}
						type="button"
						className={`acr-card ${acr.id === selectedId ? 'active' : ''}`}
						onClick={() => onSelect(acr.id)}
					>
						<span className={`status-dot ${acr.status}`} />
						<span>
							<strong>{acr.id}</strong>
							<small>{acr.title}</small>
							<small>
								{acr.status} / patches {acr.manifestUpdates?.length ?? 0}
							</small>
						</span>
					</button>
				))}
			</div>
		</section>
	);
}

function AssetCard({
	asset,
	active,
	inSelectedAcr,
	onSelect,
}: {
	asset: CatalogEntry;
	active: boolean;
	inSelectedAcr: boolean;
	onSelect: () => void;
}) {
	const broken = !asset.fileExists || asset.webpExists === false;
	return (
		<button
			type="button"
			className={`asset-card ${active ? 'active' : ''} ${broken ? 'blocked' : ''}`}
			onClick={onSelect}
		>
			<AssetPreview asset={asset} compact />
			<strong>{asset.key}</strong>
			<small>
				{asset.type} / {asset.section}
			</small>
			<small className={broken ? 'danger' : 'ok'}>
				{broken ? 'blocked' : inSelectedAcr ? 'in selected ACR' : 'ready'}
			</small>
		</button>
	);
}

function AcrDetail({
	acr,
	busy,
	onChecklistChange,
	onRunCheck,
	onApply,
}: {
	acr: AssetChangeRequest;
	busy: Busy;
	onChecklistChange: (item: AcrChecklistItem, status: CheckStatus) => void;
	onRunCheck: (checkId: CheckId) => void;
	onApply: () => void;
}) {
	return (
		<div className="acr-detail">
			<div className="panel-header tight">
				<div>
					<p className="eyebrow">Selected ACR</p>
					<h2>{acr.id}</h2>
				</div>
				<span className={`badge ${acr.status}`}>{acr.status}</span>
			</div>
			<div className="checklist">
				{acr.checklist.map((item) => (
					<label key={item.id} className="check-row">
						<span>{item.label}</span>
						<select
							disabled={busy !== 'idle'}
							value={item.status}
							onChange={(event) =>
								onChecklistChange(item, event.target.value as CheckStatus)
							}
						>
							{CHECK_STATUS_ORDER.map((status) => (
								<option key={status} value={status}>
									{status}
								</option>
							))}
						</select>
					</label>
				))}
			</div>
			<div className="patch-list">
				<strong>Manifest patches</strong>
				{(acr.manifestUpdates ?? []).map((update) => (
					<small key={update.key}>
						{update.key}: {update.section} / {update.polish}
					</small>
				))}
				{!acr.manifestUpdates?.length && (
					<small>No staged manifest patch.</small>
				)}
			</div>
			<div className="button-row">
				{CHECK_IDS.map((checkId) => (
					<button
						key={checkId}
						type="button"
						disabled={busy !== 'idle'}
						onClick={() => onRunCheck(checkId)}
					>
						{CHECK_LABELS[checkId]}
					</button>
				))}
			</div>
			<button
				type="button"
				className="primary wide"
				disabled={busy !== 'idle'}
				onClick={onApply}
			>
				Apply ready patch
			</button>
			<div className="log-box">
				{acr.logs.map((log) => (
					<details key={log.id} open={log === acr.logs[0]}>
						<summary>
							{log.message}
							{typeof log.exitCode === 'number' ? ` (${log.exitCode})` : ''}
						</summary>
						<pre>
							{[log.stdout, log.stderr].filter(Boolean).join('\n') || log.at}
						</pre>
					</details>
				))}
			</div>
		</div>
	);
}

function AssetPreview({
	asset,
	compact = false,
}: {
	asset: CatalogEntry;
	compact?: boolean;
}) {
	if (asset.type === 'tilemapTiledJSON') {
		return (
			<div className={`preview-box ${compact ? 'compact' : ''}`}>JSON</div>
		);
	}
	if (!asset.fileExists) {
		return (
			<div className={`preview-box missing ${compact ? 'compact' : ''}`}>
				missing
			</div>
		);
	}
	return (
		<div className={`preview-box ${compact ? 'compact' : ''}`}>
			<img src={publicAssetUrl(asset.path)} alt={asset.key} />
		</div>
	);
}

function TilemapTool({
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

function ScenesTool({
	settings,
	busy,
	onChange,
	onSave,
}: {
	settings: SceneSettings;
	busy: Busy;
	onChange: (settings: SceneSettings) => void;
	onSave: () => void;
}) {
	const updateScene = (scene: SceneRecord, patch: Partial<SceneRecord>) => {
		onChange({
			...settings,
			scenes: settings.scenes.map((candidate) =>
				candidate.key === scene.key ? { ...candidate, ...patch } : candidate,
			),
		});
	};

	return (
		<section className="panel">
			<div className="panel-header">
				<div>
					<p className="eyebrow">Scene Registry</p>
					<h2>{settings.scenes.length} scenes</h2>
				</div>
				<button
					type="button"
					className="primary"
					disabled={busy !== 'idle'}
					onClick={onSave}
				>
					Save scene settings
				</button>
			</div>
			<div className="scene-grid">
				{settings.scenes.map((scene) => (
					<article key={scene.key} className="scene-card">
						<div className="panel-header tight">
							<div>
								<p className="eyebrow">Order {scene.order}</p>
								<h2>{scene.key}</h2>
							</div>
							<label className="inline-check">
								<input
									type="checkbox"
									checked={scene.enabled}
									onChange={(event) =>
										updateScene(scene, { enabled: event.target.checked })
									}
								/>
								enabled
							</label>
						</div>
						<small>{scene.file}</small>
						<div className="form-grid">
							<label>
								View
								<select
									value={scene.view}
									onChange={(event) =>
										updateScene(scene, {
											view: event.target.value as SceneRecord['view'],
										})
									}
								>
									<option value="boot">boot</option>
									<option value="preload">preload</option>
									<option value="top-down-game">top-down-game</option>
									<option value="overlay">overlay</option>
								</select>
							</label>
							<label>
								Order
								<input
									type="number"
									value={scene.order}
									onChange={(event) =>
										updateScene(scene, { order: Number(event.target.value) })
									}
								/>
							</label>
						</div>
						<textarea
							value={scene.notes}
							onChange={(event) =>
								updateScene(scene, { notes: event.target.value })
							}
							placeholder="Scene management notes"
						/>
					</article>
				))}
			</div>
		</section>
	);
}

function BalanceTool({
	balance,
	busy,
	onChange,
	onApply,
}: {
	balance: BalanceSheet;
	busy: Busy;
	onChange: (sheet: BalanceSheet) => void;
	onApply: () => void;
}) {
	const setEnergy = (key: keyof BalanceSheet['energy'], value: number) => {
		onChange({ ...balance, energy: { ...balance.energy, [key]: value } });
	};
	const setGacha = (
		tier: keyof BalanceSheet['gacha'],
		key: 'cost' | 'successRate',
		value: number,
	) => {
		onChange({
			...balance,
			gacha: {
				...balance.gacha,
				[tier]: { ...balance.gacha[tier], [key]: value },
			},
		});
	};
	const setWave = (slot: number, key: 'hp' | 'speed', value: number) => {
		onChange({
			...balance,
			waveScaling: balance.waveScaling.map((row) =>
				row.slot === slot ? { ...row, [key]: value } : row,
			),
		});
	};

	return (
		<section className="balance-layout">
			<section className="panel">
				<div className="panel-header">
					<div>
						<p className="eyebrow">Energy</p>
						<h2>Runtime constants</h2>
					</div>
					<button
						type="button"
						className="primary"
						disabled={busy !== 'idle'}
						onClick={onApply}
					>
						Apply balance sheet
					</button>
				</div>
				<div className="form-grid">
					{Object.entries(balance.energy).map(([key, value]) => (
						<label key={key}>
							{key}
							<input
								type="number"
								value={value}
								onChange={(event) =>
									setEnergy(
										key as keyof BalanceSheet['energy'],
										Number(event.target.value),
									)
								}
							/>
						</label>
					))}
				</div>
			</section>
			<section className="panel">
				<div className="panel-header">
					<div>
						<p className="eyebrow">Gacha</p>
						<h2>Cost / success</h2>
					</div>
				</div>
				<div className="data-table">
					{Object.entries(balance.gacha).map(([tier, value]) => (
						<div key={tier} className="table-row">
							<strong>{tier}</strong>
							<input
								type="number"
								value={value.cost}
								onChange={(event) =>
									setGacha(
										tier as keyof BalanceSheet['gacha'],
										'cost',
										Number(event.target.value),
									)
								}
							/>
							<input
								step="0.01"
								type="number"
								value={value.successRate}
								onChange={(event) =>
									setGacha(
										tier as keyof BalanceSheet['gacha'],
										'successRate',
										Number(event.target.value),
									)
								}
							/>
						</div>
					))}
				</div>
			</section>
			<section className="panel">
				<div className="panel-header">
					<div>
						<p className="eyebrow">Wave Scaling</p>
						<h2>First 10 slots</h2>
					</div>
					<label>
						HP slope
						<input
							step="0.01"
							type="number"
							value={balance.hpSlope}
							onChange={(event) =>
								onChange({ ...balance, hpSlope: Number(event.target.value) })
							}
						/>
					</label>
				</div>
				<div className="data-table">
					{balance.waveScaling.slice(0, 10).map((row) => (
						<div key={row.slot} className="table-row">
							<strong>W{row.slot}</strong>
							<input
								step="0.1"
								type="number"
								value={row.hp}
								onChange={(event) =>
									setWave(row.slot, 'hp', Number(event.target.value))
								}
							/>
							<input
								step="0.01"
								type="number"
								value={row.speed}
								onChange={(event) =>
									setWave(row.slot, 'speed', Number(event.target.value))
								}
							/>
						</div>
					))}
				</div>
			</section>
			<section className="panel tower-sheet">
				<div className="panel-header">
					<div>
						<p className="eyebrow">Tower Sheet</p>
						<h2>{balance.towers.length} towers</h2>
					</div>
				</div>
				<div className="tower-table">
					{balance.towers.map((tower) => (
						<div key={tower.id} className="table-row">
							<strong>{tower.id}</strong>
							<span>
								{tower.family} T{tower.tier}
							</span>
							<span>dmg {tower.damage ?? '-'}</span>
							<span>rng {tower.range ?? '-'}</span>
							<span>spd {tower.attackSpeed ?? '-'}</span>
						</div>
					))}
				</div>
			</section>
		</section>
	);
}

function StagingPanel({
	entries,
	busy,
	onAction,
}: {
	entries: StagingEntry[];
	busy: Busy;
	onAction: (
		entry: StagingEntry,
		action: 'accept' | 'reject' | 'regenerate',
	) => void;
}) {
	return (
		<section className="panel staging-panel">
			<div className="panel-header">
				<div>
					<p className="eyebrow">Staging</p>
					<h2>{entries.length} staged assets</h2>
				</div>
			</div>
			<div className="staging-grid">
				{entries.length === 0 && (
					<p className="empty">
						No staged assets. Run the forge pipeline from terminal.
					</p>
				)}
				{entries.map((entry) => (
					<article key={entry.id} className="staging-card">
						<div className="preview-pair">
							{entry.hasOriginal ? (
								<img
									src={stagingFileUrl(entry.id, 'original.png')}
									alt="original"
								/>
							) : (
								<span>no original</span>
							)}
							{entry.hasPolished ? (
								<img
									src={stagingFileUrl(entry.id, 'polished.png')}
									alt="polished"
								/>
							) : (
								<span>no polished</span>
							)}
						</div>
						<strong>{entry.id}</strong>
						<small>{entry.metadata?.status ?? 'pending'}</small>
						<div className="button-row">
							<button
								type="button"
								disabled={busy !== 'idle' || !entry.hasPolished}
								onClick={() => onAction(entry, 'accept')}
							>
								Accept
							</button>
							<button
								type="button"
								disabled={busy !== 'idle'}
								onClick={() => onAction(entry, 'regenerate')}
							>
								Regenerate
							</button>
							<button
								type="button"
								disabled={busy !== 'idle'}
								onClick={() => onAction(entry, 'reject')}
							>
								Reject
							</button>
						</div>
					</article>
				))}
			</div>
		</section>
	);
}
