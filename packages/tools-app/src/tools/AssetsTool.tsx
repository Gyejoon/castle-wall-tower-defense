import { useEffect, useState } from 'react';
import { publicAssetUrl, stagingFileUrl } from '../api';
import {
	type AcrChecklistItem,
	type AssetChangeRequest,
	type AssetManifestSection,
	type AssetPolishLevel,
	type Busy,
	type CatalogEntry,
	CHECK_LABELS,
	type CheckId,
	type CheckStatus,
	type StagingEntry,
} from '../types';

const CHECK_IDS: CheckId[] = ['asset-audit', 'phaser-tests', 'web-build'];
const CHECK_STATUS_ORDER: CheckStatus[] = [
	'pending',
	'required',
	'pass',
	'fail',
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

export function AssetsTool(props: {
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
