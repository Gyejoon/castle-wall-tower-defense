import { EventBus } from '@gld/phaser-game';
import {
	type DeckCardDef,
	ENERGY_CAP,
	type PlacementFailureReason,
} from '@gld/shared';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { BossHpBar } from '../components/game/BossHpBar';
import { DeckDock } from '../components/game/DeckDock';
import { PixelButton } from '../components/ui/PixelButton';
import { PhaserGame } from '../game/PhaserGame';
import { useGameStore } from '../stores/gameStore';
import { colors, fonts } from '../styles/tokens';

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

function getHudChipStyle({
	color,
	background,
	minWidth,
}: {
	color: string;
	background: string;
	minWidth?: CSSProperties['minWidth'];
}): CSSProperties {
	return {
		padding: '5px 7px',
		background,
		color,
		fontFamily: fonts.pixel,
		fontSize: '10px',
		border: `1px solid ${colors.border}`,
		boxShadow: `2px 2px 0px rgba(0,0,0,0.25)`,
		flexShrink: 0,
		minWidth,
		overflow: 'hidden',
		textOverflow: 'ellipsis',
	};
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
	const gameOverStats = useGameStore((s) => s.gameOverStats);
	const setGameOverStats = useGameStore((s) => s.setGameOverStats);
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
			};
		}) => {
			setRunStatus(data.result);
			setBossHp({ hp: 0, maxHp: 0, phase: 1, visible: false });
			setGameOverStats(data.stats);
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
		if (!toast) return;
		const timeout = window.setTimeout(() => clearToast(), 1800);
		return () => window.clearTimeout(timeout);
	}, [clearToast, toast]);

	const resultTitle = runStatus === 'victory' ? '방어 성공' : '방어 실패';
	const toastStyle = toast ? getToastStyle(toast.tone) : null;

	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				justifyContent: 'center',
				background: colors.bg,
			}}
		>
			<div
				style={{
					width: '100%',
					maxWidth: '430px',
					height: '100dvh',
					display: 'flex',
					flexDirection: 'column',
					background: colors.bg,
					boxShadow: '0 0 40px rgba(0,0,0,0.5)',
					overflow: 'hidden',
				}}
			>
				<div
					data-testid="top-hud"
					style={{
						padding: '10px 12px',
						display: 'flex',
						alignItems: 'center',
						gap: '6px',
						flexWrap: 'nowrap',
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						background: 'rgba(42, 32, 16, 0.92)',
						borderBottom: `1px solid ${colors.border}`,
						flexShrink: 0,
					}}
				>
					<div
						style={getHudChipStyle({
							color: colors.danger,
							background: 'rgba(192,48,32,0.16)',
						})}
					>
						HP {lives}
					</div>
					<div
						style={{
							...getHudChipStyle({
								color: colors.gold,
								background: 'rgba(240,208,96,0.16)',
							}),
							display: 'flex',
							alignItems: 'center',
							gap: '4px',
							minWidth: '70px',
						}}
					>
						<span>⚡{energy}</span>
						<div
							style={{
								flex: 1,
								height: '4px',
								background: 'rgba(0,0,0,0.3)',
								borderRadius: '2px',
								overflow: 'hidden',
							}}
						>
							<div
								style={{
									width: `${Math.min(100, (energy / ENERGY_CAP) * 100)}%`,
									height: '100%',
									background:
										energy >= ENERGY_CAP ? colors.success : colors.gold,
									transition: 'width 0.3s ease',
								}}
							/>
						</div>
					</div>
					<div
						data-testid="hud-timer"
						style={getHudChipStyle({
							color:
								combatHud.bossWarning || combatHud.phase === 'boss'
									? colors.gold
									: colors.text,
							background:
								combatHud.bossWarning || combatHud.phase === 'boss'
									? 'rgba(240,208,96,0.16)'
									: 'rgba(42,32,16,0.82)',
							minWidth: 0,
						})}
					>
						{combatHud.bossWarning
							? '보스 임박'
							: combatHud.phase === 'waiting' && waitCountdown > 0
								? `다음 ${waitCountdown}s`
								: formatTimerLabel(combatHud.timerLabel)}
					</div>
				</div>

				<div
					style={{
						width: '100%',
						flex: 1,
						minHeight: 0,
						position: 'relative',
						overflow: 'hidden',
						background:
							'linear-gradient(180deg, rgba(13,26,42,0.48) 0%, rgba(26,18,8,0.4) 100%)',
					}}
				>
					<PhaserGame key={runId} />

					<BossHpBar />

					{bossWarningVisible && (
						<div
							style={{
								position: 'absolute',
								inset: 0,
								zIndex: 5,
								background: 'rgba(0,0,0,0.6)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<div
								style={{
									fontFamily: fonts.pixel,
									fontSize: '20px',
									color: '#ff4444',
									textAlign: 'center',
									animation: 'pulse 0.5s ease-in-out infinite',
								}}
							>
								⚠ WARNING ⚠
								<style>{`
									@keyframes pulse {
										0%, 100% { opacity: 1; transform: scale(1); }
										50% { opacity: 0.5; transform: scale(1.05); }
									}
								`}</style>
							</div>
						</div>
					)}

					{!gameReady && (
						<div
							style={{
								position: 'absolute',
								inset: 0,
								background: 'rgba(26, 18, 8, 0.76)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								color: colors.textSecondary,
								fontFamily: fonts.pixel,
								fontSize: '9px',
								zIndex: 2,
							}}
						>
							그리드 부팅 중...
						</div>
					)}

					{toast && toastStyle && (
						<div
							style={{
								position: 'absolute',
								top: 12,
								left: '50%',
								transform: 'translateX(-50%)',
								zIndex: 4,
								padding: '8px 12px',
								border: `2px solid ${toastStyle.border}`,
								boxShadow: `3px 3px 0px rgba(0,0,0,0.28)`,
								background: toastStyle.background,
								color: toastStyle.color,
								fontFamily: fonts.pixel,
								fontSize: '8px',
								maxWidth: 'min(80vw, 280px)',
								textAlign: 'center',
							}}
						>
							{toast.message}
						</div>
					)}

					{(runStatus === 'victory' || runStatus === 'defeat') && (
						<div
							style={{
								position: 'absolute',
								inset: 0,
								zIndex: 3,
								background: 'rgba(10, 8, 4, 0.82)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								padding: '20px',
							}}
						>
							<div
								style={{
									width: 'min(100%, 360px)',
									padding: '20px',
									background: 'rgba(42, 32, 16, 0.96)',
									border: `2px solid ${runStatus === 'victory' ? colors.success : colors.danger}`,
									boxShadow: `6px 6px 0px ${colors.border}`,
									display: 'flex',
									flexDirection: 'column',
									gap: '14px',
									textAlign: 'center',
								}}
							>
								<img
									src={
										runStatus === 'victory'
											? 'assets/ui/defense-success.png'
											: 'assets/ui/defense-fail.png'
									}
									alt={resultTitle}
									style={{
										width: '200px',
										height: 'auto',
										imageRendering: 'pixelated',
										margin: '0 auto',
									}}
								/>
								<h2
									style={{
										color:
											runStatus === 'victory' ? colors.success : colors.danger,
										fontFamily: fonts.pixel,
										fontSize: '12px',
										fontWeight: 400,
									}}
								>
									{resultTitle}
								</h2>
								<p
									style={{
										color: colors.textSecondary,
										fontFamily: fonts.pixel,
										fontSize: '8px',
										lineHeight: 1.8,
									}}
								>
									{runStatus === 'defeat'
										? `웨이브 ${gameOverStats?.wavesCleared ?? '?'}에서 돌파당했습니다`
										: '왕국을 지켜냈습니다!'}
								</p>
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										gap: '6px',
									}}
								>
									<p
										style={{
											color: colors.textSecondary,
											fontFamily: fonts.pixel,
											fontSize: '8px',
										}}
									>
										클리어 웨이브: {gameOverStats?.wavesCleared ?? 0}/10
									</p>
									<p
										style={{
											color: colors.textSecondary,
											fontFamily: fonts.pixel,
											fontSize: '8px',
										}}
									>
										배치한 타워: {gameOverStats?.towersPlaced ?? 0}
									</p>
									<p
										style={{
											color: colors.textSecondary,
											fontFamily: fonts.pixel,
											fontSize: '8px',
										}}
									>
										생존 시간:{' '}
										{Math.floor((gameOverStats?.timeSurvivedSec ?? 0) / 60)}:
										{String(
											(gameOverStats?.timeSurvivedSec ?? 0) % 60,
										).padStart(2, '0')}
									</p>
									<p
										style={{
											color: colors.gold,
											fontFamily: fonts.pixel,
											fontSize: '10px',
											marginTop: '4px',
										}}
									>
										획득 골드: {gameOverStats?.goldEarned ?? 0}G
									</p>
								</div>
								<PixelButton
									variant="gold"
									style={{ width: '100%' }}
									onClick={resetRun}
								>
									다시 시작
								</PixelButton>
								<PixelButton
									variant="secondary"
									style={{ width: '100%' }}
									onClick={enterLobby}
								>
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
