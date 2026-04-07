import { EventBus } from '@gld/phaser-game';
import { battleXp, type PlacementFailureReason } from '@gld/shared';
import { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useMetaStore } from '../stores/metaStore';

export function useGameEvents(): void {
	const setRunStatus = useGameStore((s) => s.setRunStatus);
	const setPlacementFeedback = useGameStore((s) => s.setPlacementFeedback);
	const pushToast = useGameStore((s) => s.pushToast);
	const resetRun = useGameStore((s) => s.resetRun);
	const setBossWarningVisible = useGameStore((s) => s.setBossWarningVisible);
	const setGameOverStats = useGameStore((s) => s.setGameOverStats);

	useEffect(() => {
		const onGameOver = (data: {
			result: 'victory' | 'defeat';
			stats: {
				wavesCleared: number;
				towersPlaced: number;
				timeSurvivedSec: number;
				goldEarned: number;
				rewardMultiplier: number;
			};
		}) => {
			setRunStatus(data.result);
			setBossWarningVisible(false);
			const xpEarned = Math.round(
				battleXp(data.stats.wavesCleared, data.result === 'victory') *
					data.stats.rewardMultiplier,
			);
			setGameOverStats({ ...data.stats, xpEarned });
			const meta = useMetaStore.getState();
			meta.addGold(data.stats.goldEarned);
			meta.addXp(xpEarned);
			meta.recordBattle(data.result);
			meta.updateHighestWave(
				useGameStore.getState().selectedMapId,
				data.stats.wavesCleared,
			);
			if (data.result === 'victory') {
				const mapId = useGameStore.getState().selectedMapId;
				meta.recordStageClear(mapId);
			}
		};

		const onWaveStarted = (_data: {
			wave: number;
			totalWaves: number;
			slotIndex: number;
			phase: 'combat' | 'waiting' | 'boss' | 'ended';
			kind: 'normal' | 'pre_boss' | 'boss';
			startAtSec: number;
		}) => {
			setRunStatus('running');
			setPlacementFeedback(null);
		};

		const onTowerPlaced = (data: {
			success: boolean;
			reason?: PlacementFailureReason;
		}) => {
			setPlacementFeedback(data.success ? null : (data.reason ?? 'occupied'));
			if (!data.success && data.reason === 'insufficient_energy') {
				pushToast('에너지 부족', 'warning');
			}
		};

		const onResetRun = () => resetRun();

		const onBossWarning = () => {
			setBossWarningVisible(true);
			setTimeout(() => {
				setBossWarningVisible(false);
			}, 1500);
		};

		const onBossDefeated = () => {
			pushToast('BOSS CLEAR!', 'success');
		};

		const onBossPhaseChange = (data: { phase: 1 | 2 }) => {
			if (data.phase === 2) pushToast('보스 분노!', 'warning');
		};

		EventBus.on('game-over', onGameOver);
		EventBus.on('wave-started', onWaveStarted);
		EventBus.on('tower-placed', onTowerPlaced);
		EventBus.on('request-reset-run', onResetRun);
		EventBus.on('boss-warning', onBossWarning);
		EventBus.on('boss-defeated', onBossDefeated);
		EventBus.on('boss-phase-change', onBossPhaseChange);

		return () => {
			EventBus.off('game-over', onGameOver);
			EventBus.off('wave-started', onWaveStarted);
			EventBus.off('tower-placed', onTowerPlaced);
			EventBus.off('request-reset-run', onResetRun);
			EventBus.off('boss-warning', onBossWarning);
			EventBus.off('boss-defeated', onBossDefeated);
			EventBus.off('boss-phase-change', onBossPhaseChange);
		};
	}, [
		pushToast,
		resetRun,
		setPlacementFeedback,
		setRunStatus,
		setBossWarningVisible,
		setGameOverStats,
	]);
}
