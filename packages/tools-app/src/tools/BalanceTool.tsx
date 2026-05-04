import type { BalanceSheet, Busy } from '../types';

export function BalanceTool({
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
