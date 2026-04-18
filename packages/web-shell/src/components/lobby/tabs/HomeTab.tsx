import { useGameStore } from '../../../stores/gameStore';
import { PixelButton } from '../../ui/PixelButton';

/**
 * Phase 6: Scenario mode purged. The home tab is now a direct launcher
 * for Phase A (primary) plus a stub button for the future MetaForge
 * (Phase 9). Phase 8 [F24] will swap the classes for real design tokens.
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
					<h1 className="font-pixel text-[24px] text-gold drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] tracking-wider">
						Grid Line Defense
					</h1>
					<span className="font-pixel text-[11px] text-accent tracking-wider uppercase">
						Phase A
					</span>
				</div>

				<div className="w-full max-w-[300px] flex flex-col gap-3">
					<PixelButton
						variant="gold"
						onClick={startPhaseA}
						style={{
							width: '100%',
							padding: '18px 20px',
							fontSize: '16px',
						}}
					>
						<span className="inline-flex items-center justify-center gap-2">
							<img
								src="assets/ui/icon-sword.webp"
								alt=""
								width={18}
								height={18}
								className="[image-rendering:pixelated]"
							/>
							전투 시작
						</span>
					</PixelButton>
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
