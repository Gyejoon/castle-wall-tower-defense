import { soundGenerator } from '@gld/phaser-game';
import { useEffect } from 'react';
import { BossWarningOverlay } from '../components/game/BossWarningOverlay';
import { GameOverScreen } from '../components/game/GameOverScreen';
import { ToastNotification } from '../components/game/ToastNotification';
import { TutorialOverlay } from '../components/game/TutorialOverlay';
import { PhaserGame } from '../game/PhaserGame';
import { useGameEvents } from '../hooks/useGameEvents';
import { useGameStore } from '../stores/gameStore';

export function GamePage() {
	const runId = useGameStore((s) => s.runId);
	const runStatus = useGameStore((s) => s.runStatus);
	const gameReady = useGameStore((s) => s.gameReady);
	const toast = useGameStore((s) => s.toast);
	const clearToast = useGameStore((s) => s.clearToast);
	const resetRun = useGameStore((s) => s.resetRun);
	const enterLobby = useGameStore((s) => s.enterLobby);
	const bossWarningVisible = useGameStore((s) => s.bossWarningVisible);
	const gameOverStats = useGameStore((s) => s.gameOverStats);

	useGameEvents();

	useEffect(() => {
		const handleVisibility = () => {
			if (document.visibilityState === 'visible') {
				soundGenerator.unlock();
			}
		};
		document.addEventListener('visibilitychange', handleVisibility);
		return () =>
			document.removeEventListener('visibilitychange', handleVisibility);
	}, []);

	useEffect(() => {
		if (!toast) return;
		const timeout = window.setTimeout(() => clearToast(), 1800);
		return () => window.clearTimeout(timeout);
	}, [clearToast, toast]);

	return (
		<div className="game-page flex h-full w-full justify-center bg-bg">
			<div className="flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-bg shadow-[0_0_40px_rgba(0,0,0,0.5)]">
				{/* Game Area — full height, HUD is now inside Phaser UIScene */}
				<div
					className="relative w-full flex-1 min-h-0 overflow-hidden"
					style={{
						background:
							'linear-gradient(180deg, rgba(13,26,42,0.48) 0%, rgba(26,18,8,0.4) 100%)',
					}}
				>
					<PhaserGame key={runId} />

					{runStatus !== 'victory' && runStatus !== 'defeat' && (
						<TutorialOverlay />
					)}

					<BossWarningOverlay visible={bossWarningVisible} />

					{!gameReady && (
						<div
							className="absolute inset-0 z-[2] flex items-center justify-center font-pixel text-[13px] text-text-secondary"
							style={{ background: 'rgba(26, 18, 8, 0.76)' }}
						>
							그리드 부팅 중...
						</div>
					)}

					<ToastNotification toast={toast} />

					{(runStatus === 'victory' || runStatus === 'defeat') && (
						<GameOverScreen
							runStatus={runStatus}
							gameOverStats={gameOverStats}
							onRestart={resetRun}
							onLobby={enterLobby}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
