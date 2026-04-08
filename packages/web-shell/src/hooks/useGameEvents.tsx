import { EventBus } from '@gld/phaser-game';
import {
	battleXp,
	type DeckCardDef,
	INITIAL_PLAYER_HP,
	PERFECT_CLEAR_BONUS,
	type PlacementFailureReason,
	STAR_REWARD_MULTIPLIERS,
	type StarRating,
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
	const setBossHp = useGameStore((s) => s.setBossHp);
	const setBossWarningVisible = useGameStore((s) => s.setBossWarningVisible);
	const setGameOverStats = useGameStore((s) => s.setGameOverStats);

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
			selectedStar: StarRating;
			starCleared: boolean;
			hpRemaining: number;
			stats: {
				wavesCleared: number;
				towersPlaced: number;
				timeSurvivedSec: number;
				goldEarned: number;
				rewardMultiplier: number;
			};
		}) => {
			setRunStatus(data.result);
			setBossHp({ hp: 0, maxHp: 0, phase: 1, visible: false });
			setBossWarningVisible(false);
			if (bossWarningTimerRef.current) {
				clearTimeout(bossWarningTimerRef.current);
				bossWarningTimerRef.current = null;
			}
			const starReward = STAR_REWARD_MULTIPLIERS[data.selectedStar];
			const goldEarned = Math.round(data.stats.goldEarned * starReward.gold);
			const xpEarned = Math.round(
				battleXp(data.stats.wavesCleared, data.result === 'victory') *
					data.stats.rewardMultiplier * starReward.xp,
			);
			setGameOverStats({
				...data.stats,
				goldEarned,
				xpEarned,
				selectedStar: data.selectedStar,
				starCleared: data.starCleared,
			});
			const meta = useMetaStore.getState();
			meta.addGold(goldEarned);
			meta.addXp(xpEarned);
			meta.recordBattle(data.result);
			meta.updateHighestWave(
				useGameStore.getState().selectedMapId,
				data.stats.wavesCleared,
			);
			if (data.result === 'victory') {
				const mapId = useGameStore.getState().selectedMapId;
				meta.recordStageClear(mapId);

				// ★ Record star clear
				if (data.starCleared) {
					meta.recordStarClear(mapId, data.selectedStar);
				}

				// Awakening stone rewards (only when star condition is met)
				if (starReward.awakeningStone > 0 && data.starCleared) {
					meta.addAwakeningStones(starReward.awakeningStone);
				}

				// Perfect clear bonus (★3 with HP 100%)
				if (data.selectedStar === 3 && data.hpRemaining === INITIAL_PLAYER_HP) {
					meta.addAwakeningStones(PERFECT_CLEAR_BONUS.awakeningStone);
				}
			}
		};
		const onWaveStarted = (data: {
			wave: number;
			totalWaves: number;
			slotIndex: number;
			phase: 'combat' | 'waiting' | 'boss' | 'ended';
			kind: 'normal' | 'pre_boss' | 'boss';
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
				bossWarning: data.kind === 'pre_boss',
				timerLabel:
					data.phase === 'boss'
						? `Boss ${data.slotIndex}`
						: data.kind === 'pre_boss'
							? 'Boss Soon'
							: `Wave ${data.wave}/${data.totalWaves}`,
			});
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
		const onResetRun = () => resetRun();
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
			hp: number;
			maxHp: number;
			phase: 1 | 2;
		}) => {
			setBossHp({ ...data, visible: true });
		};
		const onBossDefeated = () => {
			setBossHp({ hp: 0, maxHp: 0, phase: 1, visible: false });
			pushToast('BOSS CLEAR!', 'success');
			// Boss kill achievements
			const meta = useMetaStore.getState();
			const prev = meta.progress.achievements.progress['boss_10'] ?? 0;
			meta.updateAchievementProgress('boss_10', prev + 1);
			meta.updateAchievementProgress('boss_100', prev + 1);
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

		EventBus.on('player-damaged', onDamaged);
		EventBus.on('energy-changed', onEnergyChanged);
		EventBus.on('game-over', onGameOver);
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
		EventBus.on('tower-selected', onTowerSelected);
		EventBus.on('tower-deselected', onTowerDeselected);
		EventBus.on('tower-sold', onTowerSold);

		return () => {
			if (waitIntervalRef.current) clearInterval(waitIntervalRef.current);
			if (bossWarningTimerRef.current)
				clearTimeout(bossWarningTimerRef.current);
			EventBus.off('player-damaged', onDamaged);
			EventBus.off('energy-changed', onEnergyChanged);
			EventBus.off('game-over', onGameOver);
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
		};
	}, [
		patchCombatHud,
		pushToast,
		resetRun,
		setDeckCards,
		setEnergy,
		setLives,
		setPlacementFeedback,
		setPlayerTowerCount,
		setSelectedCardIndex,
		setRunStatus,
		setBossHp,
		setBossWarningVisible,
		setGameOverStats,
	]);

	return { waitCountdown, selectedTower };
}
