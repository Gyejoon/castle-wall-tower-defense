import { useGameStore } from '../../../stores/gameStore';
import { PixelButton } from '../../ui/PixelButton';

/**
 * Phase 6: Scenario mode purged. The home tab is now a direct launcher
 * for Phase A (primary) plus a stub button for the future MetaForge
 * (Phase 9). Phase 8 Task 8.4 [F24] swaps the gradient primary CTA for a
 * solid token-based button anchored to `--color-accent` / `--color-gold`.
 */
export function HomeTab() {
	const startPhaseA = useGameStore((s) => s.startPhaseA);
	const enterMetaForge = useGameStore((s) => s.enterMetaForge);

	return (
		<div
			id="tabpanel-home"
			role="tabpanel"
			aria-label="마당"
			className="relative flex-1 overflow-hidden flex flex-col"
			style={{ background: 'var(--color-bg)' }}
		>
			<div className="relative z-[1] flex flex-col items-center justify-center flex-1 px-5 gap-6">
				<div className="flex flex-col items-center gap-2">
					<h1
						className="font-pixel text-[24px] text-gold tracking-wider"
						style={{ textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}
					>
						Grid Line Defense
					</h1>
					<span className="font-pixel text-[11px] text-accent tracking-wider uppercase">
						Phase A
					</span>
				</div>

				<div className="w-full max-w-xs flex flex-col gap-3">
					<button
						type="button"
						onClick={startPhaseA}
						className="w-full h-16 rounded-xl font-pixel text-xl active:scale-[0.98] transition-transform"
						style={{
							background: 'var(--color-accent)',
							color: 'var(--color-bg)',
							boxShadow: '0 4px 0 var(--color-border)',
						}}
					>
						<span className="inline-flex items-center justify-center gap-2">
							<img
								src="assets/ui/icon-sword.webp"
								alt=""
								width={18}
								height={18}
								style={{ imageRendering: 'pixelated' }}
							/>
							전투 시작
						</span>
					</button>
					<PixelButton
						variant="secondary"
						onClick={enterMetaForge}
						style={{
							width: '100%',
							padding: '14px 16px',
							fontSize: '13px',
						}}
					>
						메타 강화
					</PixelButton>
				</div>
			</div>
		</div>
	);
}
