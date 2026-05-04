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
	regenerateAsset,
	rejectAsset,
	runAcrCheck,
	saveScenes,
	updateAcr,
} from './api';
import { AssetsTool } from './tools/AssetsTool';
import { BalanceTool } from './tools/BalanceTool';
import { ScenesTool } from './tools/ScenesTool';
import { TilemapTool } from './tools/TilemapTool';
import {
	type AcrChecklistItem,
	type AssetChangeRequest,
	type AssetManifestSection,
	type AssetPolishLevel,
	type BalanceSheet,
	type Busy,
	type CatalogEntry,
	CHECK_LABELS,
	type CheckId,
	type CheckStatus,
	type SceneSettings,
	type StagingEntry,
	type TileKind,
	type TilemapCell,
	type TilemapDocument,
	type ToolSection,
} from './types';

const NAV_ITEMS: ToolSection[] = ['Assets', 'Tilemap', 'Scenes', 'Balance'];

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
