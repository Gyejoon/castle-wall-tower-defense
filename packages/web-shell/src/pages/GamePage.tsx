import { EventBus, soundGenerator } from '@gld/phaser-game';
import { useCallback, useEffect, useState } from 'react';
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

	const { waitCountdown, selectedTower } = useGameEvents();
	const [showExitModal, setShowExitModal] = useState(false);

	// iOS AudioContext unlock on first user gesture
	useEffect(() => {
		const unlockAudio = () => {
			soundGenerator.unlock();
			document.removeEventListener('pointerdown', unlockAudio);
			document.removeEventListener('touchstart', unlockAudio);
			document.removeEventListener('click', unlockAudio);
		};
		document.addEventListener('pointerdown', unlockAudio);
		document.addEventListener('touchstart', unlockAudio);
		document.addEventListener('click', unlockAudio);
		return () => {
			document.removeEventListener('pointerdown', unlockAudio);
			document.removeEventListener('touchstart', unlockAudio);
			document.removeEventListener('click', unlockAudio);
		};
	}, []);

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

	const handleExitRequest = useCallback(() => {
		if (runStatus !== 'running') return;
		setShowExitModal(true);
		EventBus.emit('request-pause');
	}, [runStatus]);

	const handleExitConfirm = useCallback(() => {
		setShowExitModal(false);
		enterLobby();
	}, [enterLobby]);

	const handleExitCancel = useCallback(() => {
		setShowExitModal(false);
		EventBus.emit('request-resume');
	}, []);

	const handleSellTower = useCallback(() => {
		if (!selectedTower) return;
		EventBus.emit('request-sell-tower', {
			col: selectedTower.col,
			row: selectedTower.row,
		});
	}, [selectedTower]);

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
					onExitRequest={handleExitRequest}
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

					{/* Tower Sell Panel */}
					{selectedTower &&
						runStatus !== 'victory' &&
						runStatus !== 'defeat' && (
							<div
								className="absolute bottom-2 left-1/2 z-[3] flex -translate-x-1/2 items-center gap-2 border border-border px-3 py-2 font-pixel text-[11px]"
								style={{ background: 'rgba(42, 32, 16, 0.95)' }}
							>
								<span className="text-text">
									{selectedTower.towerName}
								</span>
								<button
									className="border border-danger px-2 py-1 text-danger"
									style={{ background: 'rgba(192,48,32,0.2)' }}
									onClick={handleSellTower}
								>
									판매 E+{selectedTower.refund}
								</button>
							</div>
						)}

					{/* Exit Confirm Modal */}
					{showExitModal && runStatus === 'running' && (
						<div
							className="absolute inset-0 z-[10] flex items-center justify-center"
							style={{
								background: 'rgba(0,0,0,0.6)',
								animation: 'fadeIn 0.2s ease-out',
							}}
						>
							<div
								className="flex flex-col items-center gap-4 border border-border px-6 py-5"
								style={{ background: 'var(--color-panel)' }}
							>
								<p className="font-pixel text-[13px] text-text">
									정말 나가시겠습니까?
								</p>
								<p className="font-pixel text-[9px] text-text-secondary">
									진행 상황이 저장되지 않습니다
								</p>
								<div className="flex gap-3">
									<button
										className="border border-danger px-4 py-2 font-pixel text-[11px] text-danger"
										style={{ background: 'rgba(192,48,32,0.2)' }}
										onClick={handleExitConfirm}
									>
										나가기
									</button>
									<button
										className="border border-accent px-4 py-2 font-pixel text-[11px] text-accent"
										style={{ background: 'rgba(200,160,74,0.2)' }}
										onClick={handleExitCancel}
									>
										계속하기
									</button>
								</div>
							</div>
						</div>
					)}

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
