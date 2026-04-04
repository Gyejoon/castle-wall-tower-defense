import { EventBus, startGame } from '@gld/phaser-game';
import type Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';

export function PhaserGame() {
	const containerRef = useRef<HTMLDivElement>(null);
	const gameRef = useRef<Phaser.Game | null>(null);
	const setGameReady = useGameStore((s) => s.setGameReady);
	const selectedMapId = useGameStore((s) => s.selectedMapId);

	useEffect(() => {
		if (!containerRef.current || gameRef.current) return;

		const onReady = () => setGameReady(true);
		EventBus.on('game-ready', onReady);
		gameRef.current = startGame(containerRef.current, { mapId: selectedMapId });

		return () => {
			EventBus.off('game-ready', onReady);
			gameRef.current?.destroy(true);
			gameRef.current = null;
			setGameReady(false);
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
