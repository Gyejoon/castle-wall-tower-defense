import { useEffect, useRef } from 'react';
import { EventBus } from '@gld/phaser-game';
import { useGameStore } from '../stores/gameStore';
import { useMetaStore } from '../stores/metaStore';

export function useMissionTracker() {
  const progressMission = useMetaStore((s) => s.progressMission);
  // runId가 바뀔 때마다 effect 재실행 → maxWaveThisRun 리셋 보장 (game-over 없는 씬 종료 포함)
  const runId = useGameStore((s) => s.runId);
  const maxWaveThisRun = useRef(0);

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
