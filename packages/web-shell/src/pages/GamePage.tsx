import { EventBus, soundGenerator } from '@gld/phaser-game';
import {
	battleXp,
	type DeckCardDef,
	ENERGY_CAP,
	type PlacementFailureReason,
} from '@gld/shared';
import { useEffect, useRef, useState } from 'react';
import { BossHpBar } from '../components/game/BossHpBar';
import { DeckDock } from '../components/game/DeckDock';
import { TutorialOverlay } from '../components/game/TutorialOverlay';
import { PixelButton } from '../components/ui/PixelButton';
import { PhaserGame } from '../game/PhaserGame';
import { useGameStore } from '../stores/gameStore';
import { useMetaStore } from '../stores/metaStore';
import { colors } from '../styles/tokens';
import { cn } from '../utils/cn';

function formatTimerLabel(rawLabel: string) {
	if (rawLabel.startsWith('Boss')) return rawLabel.replace('Boss', '보스');
	if (rawLabel.startsWith('Wave')) return rawLabel.replace('Wave', '웨이브');
	return rawLabel;
}

const TOAST_BG = 'rgba(42,32,16,0.94)';

const TOAST_COLOR_MAP: Record<string, string> = {
	success: colors.success,
	warning: colors.gold,
	error: colors.danger,
	info: colors.info,
};

function getToastStyle(tone: 'info' | 'success' | 'warning' | 'error') {
	const accent = TOAST_COLOR_MAP[tone] ?? colors.info;
	return { color: accent, background: TOAST_BG, border: accent };
}

export function GamePage() {
	const runId = useGameStore((s) => s.runId);
	const runStatus = useGameStore((s) => s.runStatus);
	const gameReady = useGameStore((s) => s.gameReady);
	const lives = useGameStore((s) => s.lives);
	const energy = useGameStore((s) => s.energy);
	const combatHud = useGameStore((s) => s.combatHud);
	const toast = useGameStore((s) => s.toast);
	const setRunStatus = useGameStore((s) => s.setRunStatus);
	const setLives = useGameStore((s) => s.setLives);
	const setEnergy = useGameStore((s) => s.setEnergy);
	const setPlacementFeedback = useGameStore((s) => s.setPlacementFeedback);
	const setDeckCards = useGameStore((s) => s.setDeckCards);
	const setSelectedCardIndex = useGameStore((s) => s.setSelectedCardIndex);
	const setPlayerTowerCount = useGameStore((s) => s.setPlayerTowerCount);
	const patchCombatHud = useGameStore((s) => s.patchCombatHud);
	const pushToast = useGameStore((s) => s.pushToast);
	const clearToast = useGameStore((s) => s.clearToast);
	const resetRun = useGameStore((s) => s.resetRun);
	const enterLobby = useGameStore((s) => s.enterLobby);
	const bossWarningVisible = useGameStore((s) => s.bossWarningVisible);
	const setBossHp = useGameStore((s) => s.setBossHp);
	const setBossWarningVisible = useGameStore((s) => s.setBossWarningVisible);
	const bossHp = useGameStore((s) => s.bossHp);
	const gameOverStats = useGameStore((s) => s.gameOverStats);
	const setGameOverStats = useGameStore((s) => s.setGameOverStats);
	const gameSpeed = useGameStore((s) => s.gameSpeed);
	const setGameSpeed = useGameStore((s) => s.setGameSpeed);
	const selectedMapId = useGameStore((s) => s.selectedMapId);
	const stagesCleared = useMetaStore((s) => s.progress.stagesCleared);
	const speed2xUnlocked = stagesCleared.includes(selectedMapId);
	const [waitCountdown, setWaitCountdown] = useState(0);
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
			const xpEarned = Math.round(
				battleXp(
					data.stats.wavesCleared,
					data.result === 'victory',
				) * data.stats.rewardMultiplier
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
		};
		const onBossPhaseChange = (data: { phase: 1 | 2 }) => {
			if (data.phase === 2) pushToast('보스 분노!', 'warning');
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

	useEffect(() => {
		const handleVisibility = () => {
			if (document.visibilityState === 'visible') {
				soundGenerator.unlock();
			}
		};
		document.addEventListener('visibilitychange', handleVisibility);
		return () =>
			document.removeEventListener('visibilitychange', handleVisibility);
	}, []);

	useEffect(() => {
		if (!toast) return;
		const timeout = window.setTimeout(() => clearToast(), 1800);
		return () => window.clearTimeout(timeout);
	}, [clearToast, toast]);

	const toastStyle = toast ? getToastStyle(toast.tone) : null;
	const isBossPhase = combatHud.bossWarning || combatHud.phase === 'boss';

	return (
		<div className="flex h-full w-full justify-center bg-bg">
			<div className="flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-bg shadow-[0_0_40px_rgba(0,0,0,0.5)]">
				{/* Top HUD */}
				<div
					data-testid="top-hud"
					className="flex shrink-0 flex-col border-b border-border"
					style={{ background: 'rgba(42, 32, 16, 0.92)' }}
				>
					{/* 첫 번째 행: 항상 고정 */}
					<div data-testid="top-hud-row" className="flex flex-nowrap items-center gap-1.5 overflow-hidden whitespace-nowrap px-3 py-2.5">
						<div
							className="shrink-0 overflow-hidden text-ellipsis border border-border px-[7px] py-[5px] font-pixel text-sm text-danger shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
							style={{ background: 'rgba(192,48,32,0.16)' }}
						>
							HP {lives}
						</div>
						<div
							className="flex min-w-[70px] shrink-0 items-center gap-1 overflow-hidden text-ellipsis border border-border px-[7px] py-[5px] font-pixel text-sm text-gold shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
							style={{ background: 'rgba(240,208,96,0.16)' }}
						>
							<span>⚡{energy}</span>
							<div
								className="flex-1 overflow-hidden rounded-sm"
								style={{ height: '4px', background: 'rgba(0,0,0,0.3)' }}
							>
								<div
									className={cn(
										'h-full transition-[width] duration-300 ease-out',
										energy >= ENERGY_CAP ? 'bg-success' : 'bg-gold',
									)}
									style={{
										width: `${Math.min(100, (energy / ENERGY_CAP) * 100)}%`,
									}}
								/>
							</div>
						</div>
						<div
							data-testid="hud-timer"
							className={cn(
								'shrink-0 overflow-hidden text-ellipsis border border-border px-[7px] py-[5px] font-pixel text-sm shadow-[2px_2px_0px_rgba(0,0,0,0.25)]',
								isBossPhase ? 'text-gold' : 'text-text',
							)}
							style={{
								background: isBossPhase
									? 'rgba(240,208,96,0.16)'
									: 'rgba(42,32,16,0.82)',
							}}
						>
							{combatHud.bossWarning
								? '보스 임박'
								: combatHud.phase === 'waiting' && waitCountdown > 0
									? `다음 ${waitCountdown}s`
									: formatTimerLabel(combatHud.timerLabel)}
						</div>
						{runStatus === 'running' && speed2xUnlocked && (
							<button
								className="ml-auto font-pixel text-[11px] px-2 py-0.5 border border-border text-text-secondary"
								style={{ background: gameSpeed === 2 ? 'rgba(200,112,32,0.3)' : 'rgba(26,18,8,0.7)' }}
								onClick={() => setGameSpeed(gameSpeed === 1 ? 2 : 1)}
							>
								{gameSpeed === 2 ? '2x ▶▶' : '1x ▶'}
							</button>
						)}
					</div>
					{/* 두 번째 행: 보스 체력바 (나타날 때 첫 행에 영향 없음) */}
					{bossHp.visible && (
						<div className="px-3 pb-2">
							<BossHpBar />
						</div>
					)}
				</div>

				{/* Game Area */}
				<div
					className="relative w-full flex-1 min-h-0 overflow-hidden"
					style={{
						background:
							'linear-gradient(180deg, rgba(13,26,42,0.48) 0%, rgba(26,18,8,0.4) 100%)',
					}}
				>
					<PhaserGame key={runId} />

					{runStatus !== 'victory' && runStatus !== 'defeat' && (
						<TutorialOverlay />
					)}


					{bossWarningVisible && (
						<div
							className="absolute inset-0 z-5 flex items-center justify-center"
							style={{ background: 'rgba(0,0,0,0.6)' }}
						>
							<div className="text-center font-pixel text-2xl text-[#ff4444] animate-[warningPulse_0.5s_ease-in-out_infinite]">
								⚠ WARNING ⚠
							</div>
						</div>
					)}

					{!gameReady && (
						<div
							className="absolute inset-0 z-[2] flex items-center justify-center font-pixel text-[13px] text-text-secondary"
							style={{ background: 'rgba(26, 18, 8, 0.76)' }}
						>
							그리드 부팅 중...
						</div>
					)}

					{toast && toastStyle && (
						<div
							className="absolute top-3 left-1/2 z-[4] max-w-[min(80vw,280px)] -translate-x-1/2 px-3 py-2 text-center font-pixel text-xs shadow-[3px_3px_0px_rgba(0,0,0,0.28)]"
							style={{
								border: `2px solid ${toastStyle.border}`,
								background: toastStyle.background,
								color: toastStyle.color,
							}}
						>
							{toast.message}
						</div>
					)}

					{(runStatus === 'victory' || runStatus === 'defeat') && (
						<div
							className="absolute inset-0 z-[10] flex items-center justify-center p-5"
							style={{ background: 'rgba(10, 8, 4, 0.88)' }}
						>
							<div
								className="flex w-[min(100%,360px)] flex-col gap-4 p-5 text-center"
								style={{
									background: 'rgba(26, 14, 6, 0.98)',
									border: `2px solid ${runStatus === 'victory' ? colors.success : colors.danger}`,
									boxShadow: `0 0 24px ${runStatus === 'victory' ? 'rgba(80,200,80,0.3)' : 'rgba(200,60,60,0.3)'}, 6px 6px 0px ${colors.border}`,
								}}
							>
								{/* 배너 */}
								<div
									className="py-3 -mx-5 -mt-5 flex flex-col items-center gap-1"
									style={{
										background: runStatus === 'victory' ? 'rgba(40,80,40,0.8)' : 'rgba(80,20,20,0.8)',
										borderBottom: `1px solid ${runStatus === 'victory' ? colors.success : colors.danger}`,
									}}
								>
									<span className="font-pixel text-2xl" style={{ color: runStatus === 'victory' ? colors.success : colors.danger }}>
										{runStatus === 'victory' ? '⚔ 방어 성공 ⚔' : '✕ 방어 실패 ✕'}
									</span>
									<span className="font-pixel text-[11px] text-text-secondary">
										{runStatus === 'defeat'
											? `웨이브 ${gameOverStats?.wavesCleared ?? '?'}에서 돌파당했습니다`
											: gameOverStats?.wavesCleared === 10
												? '✨ 완벽한 방어! 왕국을 성공적으로 지켜냈습니다!'
												: '왕국을 성공적으로 지켜냈습니다!'}
									</span>
								</div>

								{/* 스탯 그리드 */}
								<div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2 text-left">
									<div className="flex flex-col gap-0.5 px-3 py-2" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
										<span className="font-pixel text-[10px] text-text-secondary">클리어 웨이브</span>
										<span className="font-pixel text-sm text-text">{gameOverStats?.wavesCleared ?? 0} / 10</span>
									</div>
									<div className="flex flex-col gap-0.5 px-3 py-2" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
										<span className="font-pixel text-[10px] text-text-secondary">배치한 타워</span>
										<span className="font-pixel text-sm text-text">{gameOverStats?.towersPlaced ?? 0}</span>
									</div>
									<div className="flex flex-col gap-0.5 px-3 py-2" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
										<span className="font-pixel text-[10px] text-text-secondary">생존 시간</span>
										<span className="font-pixel text-sm text-text">
											{(() => {
												const s = gameOverStats?.timeSurvivedSec ?? 0;
												const h = Math.floor(s / 3600);
												const m = Math.floor((s % 3600) / 60);
												const sec = s % 60;
												return h > 0
													? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
													: `${m}:${String(sec).padStart(2, '0')}`;
											})()}
										</span>
									</div>
									<div className="flex flex-col gap-0.5 px-3 py-2" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
										<span className="font-pixel text-[10px] text-text-secondary">획득 골드</span>
										<span className="font-pixel text-sm text-gold">{gameOverStats?.goldEarned ?? 0}G</span>
									</div>
								</div>

								{/* XP */}
								<div className="flex items-center justify-center gap-2 py-1.5" style={{ background: 'rgba(20,30,80,0.5)', border: '1px solid rgba(100,150,255,0.2)' }}>
									<span className="font-pixel text-[11px] text-text-secondary">획득 XP</span>
									<span className="font-pixel text-base text-info">+{gameOverStats?.xpEarned ?? 0}</span>
								</div>

								{/* 버튼 */}
								<PixelButton variant="gold" style={{ width: '100%' }} onClick={resetRun}>
									다시 시작
								</PixelButton>
								<PixelButton variant="secondary" style={{ width: '100%' }} onClick={enterLobby}>
									로비로 돌아가기
								</PixelButton>
							</div>
						</div>
					)}
				</div>

				{runStatus !== 'victory' && runStatus !== 'defeat' && <DeckDock />}
			</div>
		</div>
	);
}
