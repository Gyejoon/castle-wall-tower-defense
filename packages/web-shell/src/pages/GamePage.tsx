import { soundGenerator } from '@gld/phaser-game';
import { useEffect } from 'react';
import { BossWarningOverlay } from '../components/game/BossWarningOverlay';
import { DeckDock } from '../components/game/DeckDock';
import { GameOverScreen } from '../components/game/GameOverScreen';
import { ToastNotification } from '../components/game/ToastNotification';
import { TopHud } from '../components/game/TopHud';
import { TutorialOverlay } from '../components/game/TutorialOverlay';
import { PhaserGame } from '../game/PhaserGame';
import { useGameEvents } from '../hooks/useGameEvents';
import { useGameStore } from '../stores/gameStore';
import { useMetaStore } from '../stores/metaStore';

export function GamePage() {
	const runId = useGameStore((s) => s.runId);
	const runStatus = useGameStore((s) => s.runStatus);
	const gameReady = useGameStore((s) => s.gameReady);
	const lives = useGameStore((s) => s.lives);
	const energy = useGameStore((s) => s.energy);
	const combatHud = useGameStore((s) => s.combatHud);
	const toast = useGameStore((s) => s.toast);
	const clearToast = useGameStore((s) => s.clearToast);
	const resetRun = useGameStore((s) => s.resetRun);
	const enterLobby = useGameStore((s) => s.enterLobby);
	const bossWarningVisible = useGameStore((s) => s.bossWarningVisible);
	const bossHp = useGameStore((s) => s.bossHp);
	const gameOverStats = useGameStore((s) => s.gameOverStats);
	const gameSpeed = useGameStore((s) => s.gameSpeed);
	const setGameSpeed = useGameStore((s) => s.setGameSpeed);
	const selectedMapId = useGameStore((s) => s.selectedMapId);
	const stagesCleared = useMetaStore((s) => s.progress.stagesCleared);
	const speed2xUnlocked = stagesCleared.includes(selectedMapId);

	const { waitCountdown } = useGameEvents();

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

	const isBossPhase = combatHud.bossWarning || combatHud.phase === 'boss';

	return (
		<div className="flex h-full w-full justify-center bg-bg">
			<div className="flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-bg shadow-[0_0_40px_rgba(0,0,0,0.5)]">
				<TopHud
					lives={lives}
					energy={energy}
					isBossPhase={isBossPhase}
					combatHud={combatHud}
					waitCountdown={waitCountdown}
					gameSpeed={gameSpeed}
					speed2xUnlocked={speed2xUnlocked}
					runStatus={runStatus}
					onToggleSpeed={() => setGameSpeed(gameSpeed === 1 ? 2 : 1)}
					bossHpVisible={bossHp.visible}
				/>

				{/* Game Area */}
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

				{runStatus !== 'victory' && runStatus !== 'defeat' && <DeckDock />}
			</div>
		</div>
	);
}
