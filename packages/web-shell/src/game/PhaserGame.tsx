import { EventBus, startGame } from '@gld/phaser-game';
import type Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useMetaProgress } from '../stores/metaProgressStore';
import { useMetaStore } from '../stores/metaStore';

export function PhaserGame() {
	const containerRef = useRef<HTMLDivElement>(null);
	const gameRef = useRef<Phaser.Game | null>(null);
	const setGameReady = useGameStore((s) => s.setGameReady);
	const selectedMapId = useGameStore((s) => s.selectedMapId);

	useEffect(() => {
		if (!containerRef.current) return;

		// Game already running (StrictMode re-mount) — just restore ready state
		if (gameRef.current) {
			setGameReady(true);
			return;
		}

		const container = containerRef.current;
		const onReady = () => setGameReady(true);
		EventBus.on('game-ready', onReady);
		const game = startGame(container, { mapId: selectedMapId });
		const metaState = useMetaStore.getState();
		game.registry.set('deckIds', metaState.selectedDeck);
		game.registry.set('collection', metaState.collection);
		game.registry.set(
			'tutorialCompleted',
			metaState.progress.tutorialCompleted ?? false,
		);
		game.registry.set('screenShake', useGameStore.getState().screenShake);
		// Phase 9: forward meta progression's global atk% so Game.create()
		// can inject it into TowerSystem. phaser-game package can't import
		// from web-shell; the registry is the contractually-allowed bridge.
		game.registry.set('meta:atkPct', useMetaProgress.getState().globalAtkPct);
		gameRef.current = game;

		// Sync screenShake setting to Phaser registry in real-time
		let prevShake = useGameStore.getState().screenShake;
		const unsubShake = useGameStore.subscribe((state) => {
			if (state.screenShake !== prevShake) {
				prevShake = state.screenShake;
				gameRef.current?.registry.set('screenShake', prevShake);
			}
		});

		return () => {
			EventBus.off('game-ready', onReady);
			// In StrictMode the container stays in the DOM during phantom
			// cleanup, so we keep the game alive. On real unmount (key change
			// or route change) the container is disconnected and we destroy.
			if (!container.isConnected) {
				unsubShake();
				gameRef.current?.destroy(true);
				gameRef.current = null;
				setGameReady(false);
			}
		};
	}, [setGameReady, selectedMapId]);

	return (
		<div
			ref={containerRef}
			id="game-container"
			className="w-full h-full touch-none"
		/>
	);
}
