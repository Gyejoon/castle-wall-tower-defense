import { EventBus } from '@gld/phaser-game';
import {
	battleXp,
	type DeckCardDef,
	ENERGY_PER_WAVE_CLEAR,
	type PlacementFailureReason,
	type WavePhase,
} from '@gld/shared';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useMetaStore } from '../stores/metaStore';

export function useGameEvents() {
	const setRunStatus = useGameStore((s) => s.setRunStatus);
	const setLives = useGameStore((s) => s.setLives);
	const setEnergy = useGameStore((s) => s.setEnergy);
	const setPlacementFeedback = useGameStore((s) => s.setPlacementFeedback);
	const setDeckCards = useGameStore((s) => s.setDeckCards);
	const setSelectedCardIndex = useGameStore((s) => s.setSelectedCardIndex);
	const setPlayerTowerCount = useGameStore((s) => s.setPlayerTowerCount);
	const patchCombatHud = useGameStore((s) => s.patchCombatHud);
	const pushToast = useGameStore((s) => s.pushToast);
	const resetRun = useGameStore((s) => s.resetRun);
	const upsertBossHp = useGameStore((s) => s.upsertBossHp);
	const removeBossHp = useGameStore((s) => s.removeBossHp);
	const clearAllBossHp = useGameStore((s) => s.clearAllBossHp);
	const setBossWarningVisible = useGameStore((s) => s.setBossWarningVisible);
	const setGameOverStats = useGameStore((s) => s.setGameOverStats);

	const setCountdown = useGameStore((s) => s.setCountdown);
	const setWavePhase = useGameStore((s) => s.setWavePhase);

	const [waitCountdown, setWaitCountdown] = useState(0);
	const [selectedTower, setSelectedTower] = useState<{
		towerDefId: string;
		towerName: string;
		col: number;
		row: number;
		refund: number;
	} | null>(null);
	const waitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const bossWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	useEffect(() => {
		const onDamaged = (data: { remainingHp: number }) =>
			setLives(data.remainingHp);
		const onEnergyChanged = (data: { energy: number }) =>
			setEnergy(data.energy);
		const onGameOver = (data: {
			result: 'victory' | 'defeat';
			stats: {
				wavesCleared: number;
				totalWaves: number;
				towersPlaced: number;
				timeSurvivedSec: number;
				goldEarned: number;
			};
		}) => {
			setRunStatus(data.result);
			clearAllBossHp();
			setBossWarningVisible(false);
			if (bossWarningTimerRef.current) {
				clearTimeout(bossWarningTimerRef.current);
				bossWarningTimerRef.current = null;
			}
			const goldEarned = Math.round(data.stats.goldEarned);
			const xpEarned = Math.round(
				battleXp(data.stats.wavesCleared, data.result === 'victory'),
			);
			setGameOverStats({
				...data.stats,
				goldEarned,
				xpEarned,
				totalWaves: data.stats.totalWaves,
			});
			const meta = useMetaStore.getState();
			meta.addGold(goldEarned);
			meta.addXp(xpEarned);
			meta.recordBattle(data.result);
			meta.updateHighestWave(data.stats.wavesCleared);
		};
		// Phase 10 Task 10.3 [F11] — scene revival after a rewarded continue.
		// Reverses the `onGameOver` state so the GameOverScreen unmounts and
		// HUD returns to wave/building lifecycle.
		const onGameResumed = (data: { livesRestored: number }) => {
			setLives(data.livesRestored);
			setGameOverStats(null);
			// `running` is the post-prep wave phase; `onWaveStarted` will
			// reconfirm once the next wave fires. Using `running` here is a
			// beat earlier but avoids flashing `building` → `running`.
			setRunStatus('running');
		};
		const onWaveStarted = (data: {
			wave: number;
			totalWaves: number;
			slotIndex: number;
			phase: WavePhase;
			kind: 'normal' | 'boss';
			startAtSec: number;
		}) => {
			setRunStatus('running');
			setWaitCountdown(0);
			if (waitIntervalRef.current) {
				clearInterval(waitIntervalRef.current);
				waitIntervalRef.current = null;
			}
			patchCombatHud({
				currentSlot: data.slotIndex,
				phase: data.phase,
				bossWarning: false,
				timerLabel:
					data.phase === 'boss'
						? `Boss ${data.slotIndex}`
						: `Wave ${data.wave}/${data.totalWaves}`,
			});
			setWavePhase(data.phase);
			setCountdown(0);
			setPlacementFeedback(null);
		};
		const onTowerPlaced = (data: {
			success: boolean;
			reason?: PlacementFailureReason;
		}) => {
			setPlacementFeedback(data.success ? null : (data.reason ?? 'occupied'));
			if (data.success) {
				setSelectedCardIndex(null);
			} else if (data.reason === 'insufficient_energy') {
				pushToast('에너지 부족', 'warning');
			}
		};
		const onDeckLoaded = (data: { cards: readonly DeckCardDef[] }) => {
			setDeckCards(data.cards);
		};
		const onPlayerTowerCount = (data: { count: number }) =>
			setPlayerTowerCount(data.count);
		const onResetRun = () => {
			if (waitIntervalRef.current) {
				clearInterval(waitIntervalRef.current);
				waitIntervalRef.current = null;
			}
			if (bossWarningTimerRef.current) {
				clearTimeout(bossWarningTimerRef.current);
				bossWarningTimerRef.current = null;
			}
			setWaitCountdown(0);
			setCountdown(0);
			setWavePhase('combat');
			setBossWarningVisible(false);
			setSelectedTower(null);
			resetRun();
		};
		const onWaveCompleted = (data: {
			wave: number;
			totalWaves: number;
			delaySec: number;
		}) => {
			if (data.wave < data.totalWaves) {
				// Game scene grants +ENERGY_PER_WAVE_CLEAR on every wave end
				// (natural clear + timer-forced alike). Mirror the toast so
				// the +20 bump is obvious against the 1/sec regen baseline.
				pushToast(`웨이브 종료 ⚡+${ENERGY_PER_WAVE_CLEAR}`, 'success');
				setWaitCountdown(data.delaySec);
				patchCombatHud({
					phase: 'waiting',
					timerLabel: `Wave ${data.wave}/${data.totalWaves}`,
				});
				if (waitIntervalRef.current) clearInterval(waitIntervalRef.current);
				let remaining = data.delaySec;
				waitIntervalRef.current = setInterval(() => {
					remaining -= 1;
					if (remaining <= 0) {
						setWaitCountdown(0);
						if (waitIntervalRef.current) clearInterval(waitIntervalRef.current);
						waitIntervalRef.current = null;
					} else {
						setWaitCountdown(remaining);
					}
				}, 1000);
			}
		};
		const onBossWarning = () => {
			patchCombatHud({ bossWarning: true, timerLabel: 'Boss Soon' });
			setBossWarningVisible(true);
			if (bossWarningTimerRef.current)
				clearTimeout(bossWarningTimerRef.current);
			bossWarningTimerRef.current = setTimeout(() => {
				setBossWarningVisible(false);
				bossWarningTimerRef.current = null;
			}, 1500);
		};
		const onBossHpUpdate = (data: {
			unitId: string;
			defId: string;
			hp: number;
			maxHp: number;
			phase: 1 | 2;
		}) => {
			upsertBossHp(data);
		};
		const onBossDefeated = (data: { unitId: string }) => {
			removeBossHp(data.unitId);
			pushToast('BOSS CLEAR!', 'success');
		};
		const onBossPhaseChange = (data: { phase: 1 | 2 }) => {
			if (data.phase === 2) pushToast('보스 분노!', 'warning');
		};
		const onTowerSelected = (data: {
			towerDefId: string;
			towerName: string;
			col: number;
			row: number;
			refund: number;
		}) => {
			setSelectedTower(data);
		};
		const onTowerDeselected = () => {
			setSelectedTower(null);
		};
		const onTowerSold = (data: { refund: number }) => {
			pushToast(
				<span className="inline-flex items-center gap-[2px]">
					<img
						src="assets/ui/icon-energy.webp"
						alt=""
						width={10}
						height={10}
						className="[image-rendering:pixelated]"
					/>
					+{data.refund}
				</span>,
				'success',
			);
			setSelectedTower(null);
		};

		const onPrepStarted = (data: { durationMs: number }) => {
			setCountdown(Math.ceil(data.durationMs / 1000));
			setWavePhase('prep');
		};
		const onPrepTick = (data: { remainingMs: number }) => {
			setCountdown(Math.ceil(data.remainingMs / 1000));
		};

		EventBus.on('wave-prep-started', onPrepStarted);
		EventBus.on('wave-prep-tick', onPrepTick);
		EventBus.on('player-damaged', onDamaged);
		EventBus.on('energy-changed', onEnergyChanged);
		EventBus.on('game-over', onGameOver);
		EventBus.on('game-resumed', onGameResumed);
		EventBus.on('wave-started', onWaveStarted);
		EventBus.on('tower-placed', onTowerPlaced);
		EventBus.on('deck-loaded', onDeckLoaded);
		EventBus.on('player-tower-count', onPlayerTowerCount);
		EventBus.on('request-reset-run', onResetRun);
		EventBus.on('wave-completed', onWaveCompleted);
		EventBus.on('boss-warning', onBossWarning);
		EventBus.on('boss-hp-update', onBossHpUpdate);
		EventBus.on('boss-defeated', onBossDefeated);
		EventBus.on('boss-phase-change', onBossPhaseChange);
		const onWaveTimerTick = (data: {
			remainingSec: number;
			wave: number;
			totalWaves: number;
		}) => {
			patchCombatHud({
				timerLabel: `Wave ${data.wave}/${data.totalWaves} — ${data.remainingSec}s`,
			});
		};

		EventBus.on('tower-selected', onTowerSelected);
		EventBus.on('tower-deselected', onTowerDeselected);
		EventBus.on('tower-sold', onTowerSold);
		EventBus.on('wave-timer-tick', onWaveTimerTick);

		return () => {
			if (waitIntervalRef.current) clearInterval(waitIntervalRef.current);
			if (bossWarningTimerRef.current)
				clearTimeout(bossWarningTimerRef.current);
			EventBus.off('wave-prep-started', onPrepStarted);
			EventBus.off('wave-prep-tick', onPrepTick);
			EventBus.off('player-damaged', onDamaged);
			EventBus.off('energy-changed', onEnergyChanged);
			EventBus.off('game-over', onGameOver);
			EventBus.off('game-resumed', onGameResumed);
			EventBus.off('wave-started', onWaveStarted);
			EventBus.off('tower-placed', onTowerPlaced);
			EventBus.off('deck-loaded', onDeckLoaded);
			EventBus.off('player-tower-count', onPlayerTowerCount);
			EventBus.off('request-reset-run', onResetRun);
			EventBus.off('wave-completed', onWaveCompleted);
			EventBus.off('boss-warning', onBossWarning);
			EventBus.off('boss-hp-update', onBossHpUpdate);
			EventBus.off('boss-defeated', onBossDefeated);
			EventBus.off('boss-phase-change', onBossPhaseChange);
			EventBus.off('tower-selected', onTowerSelected);
			EventBus.off('tower-deselected', onTowerDeselected);
			EventBus.off('tower-sold', onTowerSold);
			EventBus.off('wave-timer-tick', onWaveTimerTick);
		};
	}, [
		patchCombatHud,
		pushToast,
		resetRun,
		setCountdown,
		setDeckCards,
		setEnergy,
		setLives,
		setPlacementFeedback,
		setPlayerTowerCount,
		setSelectedCardIndex,
		setRunStatus,
		setWavePhase,
		upsertBossHp,
		removeBossHp,
		clearAllBossHp,
		setBossWarningVisible,
		setGameOverStats,
	]);

	return { waitCountdown, selectedTower };
}
