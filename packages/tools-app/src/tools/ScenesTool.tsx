import type { Busy, SceneRecord, SceneSettings } from '../types';

export function ScenesTool({
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
