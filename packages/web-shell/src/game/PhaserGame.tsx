import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { startGame, EventBus } from '@gld/phaser-game';
import { useGameStore } from '../stores/gameStore';

export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const setGameReady = useGameStore((s) => s.setGameReady);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    gameRef.current = startGame(containerRef.current);

    const onReady = () => setGameReady(true);
    EventBus.on('game-ready', onReady);

    return () => {
      EventBus.off('game-ready', onReady);
      EventBus.removeAllListeners();
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
