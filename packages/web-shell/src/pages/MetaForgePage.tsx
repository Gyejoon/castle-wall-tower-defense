import { useGameStore } from '../stores/gameStore';
import { useMetaProgress } from '../stores/metaProgressStore';

/**
 * Phase 9.3 — Meta Forge page shell. Displays the current global atk%
 * boost and per-family perk counts. Real perk-selection, currency, and
 * upgrade-cost UX land in later phases; this page exists so the HomeTab
 * "메타 강화" button has a destination and the persisted state is
 * inspectable.
 */
export function MetaForgePage() {
	const globalAtkPct = useMetaProgress((s) => s.globalAtkPct);
	const familyPerks = useMetaProgress((s) => s.familyPerks);
	const exit = useGameStore((s) => s.enterLobby);

	return (
		<div className="w-full h-full flex justify-center bg-bg">
			<div className="w-full max-w-[430px] h-full flex flex-col bg-panel shadow-[0_0_40px_rgba(0,0,0,0.5)]">
				<div className="flex items-center justify-between px-4 py-3 border-b border-border">
					<h2 className="text-xl font-bold text-accent font-pixel">
						메타 강화
					</h2>
					<button
						type="button"
						onClick={exit}
						className="text-sm text-text-secondary font-pixel hover:text-accent transition-colors"
					>
						뒤로
					</button>
				</div>

				<div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
					<div className="rounded bg-bg border border-border p-3">
						<div className="text-xs text-text-secondary font-pixel uppercase mb-1">
							글로벌 강화
						</div>
						<div className="text-sm text-text">
							공격력 증가{' '}
							<span className="text-accent font-bold">
								+{Math.round(globalAtkPct * 100)}%
							</span>
						</div>
					</div>

					<div>
						<div className="text-xs text-text-secondary font-pixel uppercase mb-2">
							패밀리 퍽
						</div>
						<div className="grid grid-cols-2 gap-2">
							{(['archer', 'siege', 'frost', 'stun'] as const).map((f) => (
								<div key={f} className="p-3 rounded bg-bg border border-border">
									<div className="text-xs text-text font-pixel uppercase">
										{f}
									</div>
									<div className="text-[10px] text-text-secondary mt-1">
										퍽 {familyPerks[f].length}개
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="mt-auto text-[10px] text-text-secondary text-center">
						상시 강화는 추후 추가 예정
					</div>
				</div>
			</div>
		</div>
	);
}
