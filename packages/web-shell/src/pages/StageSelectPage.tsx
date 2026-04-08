import { EventBus, soundGenerator, startGame } from '@gld/phaser-game';
import type Phaser from 'phaser';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { BossWarningOverlay } from '../components/game/BossWarningOverlay';
import { DeckDock } from '../components/game/DeckDock';
import { GameOverScreen } from '../components/game/GameOverScreen';
import { ToastNotification } from '../components/game/ToastNotification';
import { TopHud } from '../components/game/TopHud';
import { TutorialOverlay } from '../components/game/TutorialOverlay';
import { useGameEvents } from '../hooks/useGameEvents';
import { useGameStore } from '../stores/gameStore';
import { useMetaStore } from '../stores/metaStore';

const DeckEditSheet = lazy(() =>
	import('../components/lobby/DeckEditSheet').then((m) => ({
		default: m.DeckEditSheet,
	})),
);

export function StageSelectPage() {
	const containerRef = useRef<HTMLDivElement>(null);
	const gameRef = useRef<Phaser.Game | null>(null);

	const runStatus = useGameStore((s) => s.runStatus);
	const gameReady = useGameStore((s) => s.gameReady);
	const setGameReady = useGameStore((s) => s.setGameReady);
	const lives = useGameStore((s) => s.lives);
	const energy = useGameStore((s) => s.energy);
	const combatHud = useGameStore((s) => s.combatHud);
	const toast = useGameStore((s) => s.toast);
	const clearToast = useGameStore((s) => s.clearToast);
	const resetRun = useGameStore((s) => s.resetRun);
	const enterLobby = useGameStore((s) => s.enterLobby);
	const enterStageSelect = useGameStore((s) => s.enterStageSelect);
	const setSelectedMapId = useGameStore((s) => s.setSelectedMapId);
	const bossWarningVisible = useGameStore((s) => s.bossWarningVisible);
	const gameOverStats = useGameStore((s) => s.gameOverStats);
	const gameSpeed = useGameStore((s) => s.gameSpeed);
	const setGameSpeed = useGameStore((s) => s.setGameSpeed);
	const selectedMapId = useGameStore((s) => s.selectedMapId);
	const stagesCleared = useMetaStore((s) => s.progress.stagesCleared);
	const speed2xUnlocked = stagesCleared.includes(selectedMapId);

	const [showDeckEdit, setShowDeckEdit] = useState(false);

	const { waitCountdown } = useGameEvents();

	const isInGame =
		runStatus === 'building' ||
		runStatus === 'running' ||
		runStatus === 'victory' ||
		runStatus === 'defeat';

	// Mount Phaser in stageSelect mode
	useEffect(() => {
		if (!containerRef.current) return;

		if (gameRef.current) {
			setGameReady(true);
			return;
		}

		const container = containerRef.current;
		const metaState = useMetaStore.getState();

		const game = startGame(container, { mode: 'stageSelect' });
		game.registry.set('playerLevel', metaState.profile.level);
		game.registry.set('stagesCleared', metaState.progress.stagesCleared);
		game.registry.set('highestWave', metaState.progress.highestWave);
		game.registry.set('collection', metaState.collection);
		game.registry.set('deckIds', metaState.selectedDeck);
		game.registry.set(
			'tutorialCompleted',
			metaState.progress.tutorialCompleted ?? false,
		);
		game.registry.set(
			'showDamageNumbers',
			useGameStore.getState().showDamageNumbers,
		);
		game.registry.set('screenShake', useGameStore.getState().screenShake);
		game.registry.set('selectedStar', useGameStore.getState().selectedStar);
		gameRef.current = game;

		let prevShowDmg = useGameStore.getState().showDamageNumbers;
		const unsubDmgNumbers = useGameStore.subscribe((state) => {
			if (state.showDamageNumbers !== prevShowDmg) {
				prevShowDmg = state.showDamageNumbers;
				gameRef.current?.registry.set('showDamageNumbers', prevShowDmg);
			}
		});

		let prevShake = useGameStore.getState().screenShake;
		const unsubShake = useGameStore.subscribe((state) => {
			if (state.screenShake !== prevShake) {
				prevShake = state.screenShake;
				gameRef.current?.registry.set('screenShake', prevShake);
			}
		});

		let prevStar = useGameStore.getState().selectedStar;
		const unsubStar = useGameStore.subscribe((state) => {
			if (state.selectedStar !== prevStar) {
				prevStar = state.selectedStar;
				gameRef.current?.registry.set('selectedStar', prevStar);
			}
		});

		return () => {
			if (!container.isConnected) {
				unsubDmgNumbers();
				unsubShake();
				unsubStar();
				gameRef.current?.destroy(true);
				gameRef.current = null;
				setGameReady(false);
			}
		};
	}, [setGameReady]);

	// Stage select EventBus listeners
	useEffect(() => {
		const onEnterLobby = () => enterLobby();
		const onStartGame = (data: { mapId: string }) => {
			setSelectedMapId(data.mapId);
			// Phaser side handles scene.start('Game') in StageDetailScene fadeOut callback.
			// React only updates state + syncs registry data.
			const game = gameRef.current;
			if (game) {
				const metaState = useMetaStore.getState();
				game.registry.set('deckIds', metaState.selectedDeck);
				game.registry.set('collection', metaState.collection);
			}
			useGameStore.getState().setRunStatus('building');
		};
		const onDeckEdit = () => setShowDeckEdit(true);
		const onStageSelectReady = () => setGameReady(true);
		const onGameReady = () => setGameReady(true);

		const onEnterStageSelect = () => enterStageSelect();

		EventBus.on('request-enter-lobby', onEnterLobby);
		EventBus.on('request-enter-stage-select', onEnterStageSelect);
		EventBus.on('request-start-game-from-stage', onStartGame);
		EventBus.on('request-deck-edit', onDeckEdit);
		EventBus.on('stage-select-ready', onStageSelectReady);
		EventBus.on('game-ready', onGameReady);

		return () => {
			EventBus.off('request-enter-lobby', onEnterLobby);
			EventBus.off('request-enter-stage-select', onEnterStageSelect);
			EventBus.off('request-start-game-from-stage', onStartGame);
			EventBus.off('request-deck-edit', onDeckEdit);
			EventBus.off('stage-select-ready', onStageSelectReady);
			EventBus.off('game-ready', onGameReady);
		};
	}, [enterLobby, setSelectedMapId, setGameReady, enterStageSelect]);

	// Apply saved SFX volume to audio engine on mount
	useEffect(() => {
		const sfxVol = useGameStore.getState().sfxVolume;
		soundGenerator.setMasterVolume(sfxVol);
	}, []);

	// Sound unlock on visibility change
	useEffect(() => {
		const handleVisibility = async () => {
			if (document.visibilityState === 'visible') {
				try {
					await soundGenerator.unlock();
				} catch {
					/* AudioContext.resume() can reject in restricted contexts */
				}
			}
		};
		document.addEventListener('visibilitychange', handleVisibility);
		return () =>
			document.removeEventListener('visibilitychange', handleVisibility);
	}, []);

	// Toast auto-dismiss
	useEffect(() => {
		if (!toast) return;
		const timeout = window.setTimeout(() => clearToast(), 1800);
		return () => window.clearTimeout(timeout);
	}, [clearToast, toast]);

	const isBossPhase = combatHud.bossWarning || combatHud.phase === 'boss';

	return (
		<div className="flex h-full w-full justify-center bg-bg">
			<div className="flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-bg shadow-[0_0_40px_rgba(0,0,0,0.5)]">
				{isInGame && (
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
					/>
				)}

				<div
					className="relative w-full flex-1 min-h-0 overflow-hidden"
					style={{
						background: isInGame
							? 'linear-gradient(180deg, rgba(13,26,42,0.48) 0%, rgba(26,18,8,0.4) 100%)'
							: undefined,
					}}
				>
					<div
						ref={containerRef}
						id="game-container"
						className="w-full h-full touch-none"
					/>

					{isInGame && runStatus !== 'victory' && runStatus !== 'defeat' && (
						<TutorialOverlay />
					)}

					{isInGame && <BossWarningOverlay visible={bossWarningVisible} />}

					{isInGame && !gameReady && (
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

				{isInGame && runStatus !== 'victory' && runStatus !== 'defeat' && (
					<DeckDock />
				)}

				{showDeckEdit && (
					<Suspense fallback={null}>
						<DeckEditSheet
							open={showDeckEdit}
							onClose={() => setShowDeckEdit(false)}
						/>
					</Suspense>
				)}
			</div>
		</div>
	);
}
