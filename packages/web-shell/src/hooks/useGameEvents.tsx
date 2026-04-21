import { EventBus } from '@gld/phaser-game';
import {
	battleXp,
	type DeckCardDef,
	type PlacementFailureReason,
	type WavePhase,
} from '@gld/shared';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
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
	// Dedupe submit-per-run so a "이어서 하기" flow (game-over → game-resumed →
	// later game-over) doesn't double-insert and trip the rate_limit trigger.
	// Keyed by gameStore.runId, which increments only on resetRun/enterLobby/
	// startPhaseA — not on resume. Intentionally auth-agnostic: if the user
	// signs out mid-run, we still treat the run as already submitted for
	// whichever identity owned it, to preserve "one run = one row" semantics.
	const submittedRunIdRef = useRef<number>(-1);

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
				remainingHp: number;
				initialHp: number;
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

			const auth = useAuthStore.getState();
			if (!auth.userId) {
				pushToast('로그인하면 랭킹에 기록됩니다', 'info');
				return;
			}
			const currentRunId = useGameStore.getState().runId;
			if (submittedRunIdRef.current === currentRunId) {
				// already submitted for this run (e.g., intermediate defeat before
				// "이어서 하기"); skip to avoid duplicate rows and rate_limit reject.
				return;
			}
			submittedRunIdRef.current = currentRunId;
			auth
				.submitRun({
					waveReached: Math.max(
						0,
						Math.min(50, Math.round(data.stats.wavesCleared)),
					),
					remainingHp: Math.max(
						0,
						Math.min(25, Math.round(data.stats.remainingHp)),
					),
					initialHp: Math.max(
						1,
						Math.min(25, Math.round(data.stats.initialHp)),
					),
					result: data.result,
					towersPlaced: Math.max(
						0,
						Math.min(200, Math.round(data.stats.towersPlaced)),
					),
					durationSec: Math.max(
						10,
						Math.min(14400, Math.round(data.stats.timeSurvivedSec)),
					),
					goldEarned: Math.max(
						0,
						Math.min(1000000, Math.round(data.stats.goldEarned)),
					),
				})
				.then((r) => {
					if (r.kind === 'ok') pushToast('랭킹에 기록되었습니다', 'success');
					else if (r.kind === 'queued')
						pushToast('오프라인 저장됨. 다음 접속 시 전송', 'info');
					else if (r.kind === 'rejected')
						pushToast('제출이 제한되었습니다', 'warning');
					else if (r.kind === 'invalid') {
						// permanent validation failure (CHECK/RLS) — surface as error
						// so we don't claim silent success or promise a retry.
						pushToast('기록 전송 실패 (유효하지 않은 값)', 'error');
						console.error('[GLD] submitRun rejected as invalid', r.reason);
					}
					// 'disabled' and 'unauthenticated' are silent — already handled
					// above or config-level, no user-facing message needed here.
				})
				.catch((err) => {
					// failure is terminal for this run; allow a retry only after
					// next runId bump (new run) so we don't hammer the endpoint.
					console.error('[GLD] submitRun failed', err);
				});
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
			phase: 1 | 2 | 3;
		}) => {
			upsertBossHp(data);
		};
		const onBossDefeated = (data: { unitId: string }) => {
			removeBossHp(data.unitId);
			pushToast('BOSS CLEAR!', 'success');
		};
		const onBossPhaseChange = (data: { phase: 1 | 2 | 3 }) => {
			if (data.phase === 2) pushToast('보스 분노!', 'warning');
			else if (data.phase === 3) pushToast('보스 광폭화!', 'error');
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
