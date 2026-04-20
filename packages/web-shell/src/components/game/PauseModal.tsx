import { EventBus } from '@gld/phaser-game';
import { useGameStore } from '../../stores/gameStore';

interface PauseModalProps {
	open: boolean;
	onResume: () => void;
}

/**
 * Phase 8 Task 8.2 — basic pause overlay launched by the PhaseAHud ≡ button.
 *
 * Scene-level pausing is driven by the existing `request-pause`/`request-resume`
 * contract that Game.ts already implements (onPause / onResume handlers).
 * Exiting taps into the gameStore `enterLobby` action so we match the existing
 * top-right exit button flow.
 */
export function PauseModal({ open, onResume }: PauseModalProps) {
	const enterLobby = useGameStore((s) => s.enterLobby);

	if (!open) return null;

	const handleResume = () => {
		EventBus.emit('request-resume');
		onResume();
	};

	const handleQuit = () => {
		EventBus.emit('request-resume');
		enterLobby();
	};

	return (
		<div
			data-testid="pause-modal"
			className="absolute inset-0 z-[11] flex items-center justify-center"
			style={{
				background: 'var(--color-overlay-60)',
				animation: 'fadeIn 0.2s ease-out',
			}}
		>
			<div
				className="flex flex-col items-center gap-4 border border-border px-6 py-5"
				style={{ background: 'var(--color-panel-95)' }}
			>
				<p className="font-pixel text-[13px] text-text">일시정지</p>
				<div className="flex gap-3">
					<button
						type="button"
						data-testid="pause-modal-resume"
						onClick={handleResume}
						className="border-2 px-4 py-2 font-pixel text-[11px]"
						style={{
							background: 'var(--color-accent-20)',
							borderColor: 'var(--color-accent)',
							color: 'var(--color-gold)',
						}}
					>
						게임으로 돌아가기
					</button>
					<button
						type="button"
						data-testid="pause-modal-quit"
						onClick={handleQuit}
						className="border-2 px-4 py-2 font-pixel text-[11px]"
						style={{
							background: 'var(--color-danger-20)',
							borderColor: 'var(--color-danger)',
							color: 'var(--color-danger)',
						}}
					>
						나가기
					</button>
				</div>
			</div>
		</div>
	);
}
