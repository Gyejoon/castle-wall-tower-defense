import { EventBus } from '@gld/phaser-game';
import { useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useMetaStore } from '../stores/metaStore';

export function useMissionTracker() {
	const progressMission = useMetaStore((s) => s.progressMission);
	const runId = useGameStore((s) => s.runId);
	const maxWaveThisRun = useRef(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: runId is an intentional trigger dependency so the effect re-subscribes and resets maxWaveThisRun whenever a new run starts
	useEffect(() => {
		maxWaveThisRun.current = 0;

		const onTowerPlaced = (d: { success: boolean }) => {
			if (d.success) progressMission('place_towers', 1);
		};

		const onWaveStarted = (d: { wave: number }) => {
			if (d.wave > maxWaveThisRun.current) {
				progressMission('reach_wave', 1);
				maxWaveThisRun.current = d.wave;
			}
		};

		const onBossDefeated = () => progressMission('defeat_boss', 1);

		const onGameOver = (d: { result: string }) => {
			if (d.result === 'victory') progressMission('clear_stage', 1);
			maxWaveThisRun.current = 0;
		};

		EventBus.on('tower-placed', onTowerPlaced);
		EventBus.on('wave-started', onWaveStarted);
		EventBus.on('boss-defeated', onBossDefeated);
		EventBus.on('game-over', onGameOver);

		return () => {
			EventBus.off('tower-placed', onTowerPlaced);
			EventBus.off('wave-started', onWaveStarted);
			EventBus.off('boss-defeated', onBossDefeated);
			EventBus.off('game-over', onGameOver);
		};
	}, [progressMission, runId]);
}
