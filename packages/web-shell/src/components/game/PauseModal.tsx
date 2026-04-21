import { EventBus } from '@gld/phaser-game';
import { useGameStore } from '../../stores/gameStore';
import { Button } from '../ds/Button';
import { Overlay } from '../ds/Overlay';
import { Panel } from '../ds/Panel';

interface PauseModalProps {
	open: boolean;
	onResume: () => void;
}

/**
 * Phase 8 Task 8.2 — basic pause overlay launched by the PhaseAHud ≡ button.
 *
 * Scene-level pausing is driven by the existing `request-pause`/`request-resume`
 * contract that Game.ts already implements (onPause / onResume handlers).
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
		<Overlay
			intent="pause"
			data-testid="pause-modal"
			className="animate-[fadeIn_200ms_ease-out]"
		>
			<Panel
				title="일시정지"
				actions={
					<>
						<Button
							variant="primary"
							size="sm"
							onClick={handleResume}
							data-testid="pause-modal-resume"
						>
							게임으로 돌아가기
						</Button>
						<Button
							variant="danger"
							size="sm"
							onClick={handleQuit}
							data-testid="pause-modal-quit"
						>
							나가기
						</Button>
					</>
				}
			>
				<p className="font-pixel text-[12px] text-textSecondary">
					자원·타워 배치는 유지됩니다.
				</p>
			</Panel>
		</Overlay>
	);
}
