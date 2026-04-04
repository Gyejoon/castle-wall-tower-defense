import { EventBus, startGame } from '@gld/phaser-game';
import type Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';

export function PhaserGame() {
	const containerRef = useRef<HTMLDivElement>(null);
	const gameRef = useRef<Phaser.Game | null>(null);
	const setGameReady = useGameStore((s) => s.setGameReady);

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
		gameRef.current = startGame(container);

		return () => {
			EventBus.off('game-ready', onReady);
			// In StrictMode the container stays in the DOM during phantom
			// cleanup, so we keep the game alive. On real unmount (key change
			// or route change) the container is disconnected and we destroy.
			if (!container.isConnected) {
				gameRef.current?.destroy(true);
				gameRef.current = null;
				setGameReady(false);
			}
		};
	}, [setGameReady]);

	return (
		<div
			ref={containerRef}
			id="game-container"
			style={{ width: '100%', height: '100%', touchAction: 'none' }}
		/>
	);
}
