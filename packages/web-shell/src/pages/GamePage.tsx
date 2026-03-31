import { EventBus } from '@gld/phaser-game';
import {
	EMOTES,
	type PlacementFailureReason,
	TOTAL_WAVES,
	type TowerDef,
} from '@gld/shared';
import { useEffect } from 'react';
import { EmoteBubble } from '../components/EmoteBubble';
import { PixelButton } from '../components/ui/PixelButton';
import { PhaserGame } from '../game/PhaserGame';
import { useEmoteStore } from '../stores/emoteStore';
import { useGameStore } from '../stores/gameStore';
import { colors } from '../styles/tokens';

function formatWaveLabel(wave: number, totalWaves: number) {
	return Math.min(totalWaves, Math.max(1, wave || 1));
}

export function GamePage() {
	const runId = useGameStore((s) => s.runId);
	const runStatus = useGameStore((s) => s.runStatus);
	const gameReady = useGameStore((s) => s.gameReady);
	const lives = useGameStore((s) => s.lives);
	const gold = useGameStore((s) => s.gold);
	const wave = useGameStore((s) => s.wave);
	const countdown = useGameStore((s) => s.countdown);
	const setRunStatus = useGameStore((s) => s.setRunStatus);
	const setLives = useGameStore((s) => s.setLives);
	const setGold = useGameStore((s) => s.setGold);
	const setWave = useGameStore((s) => s.setWave);
	const setWavePhase = useGameStore((s) => s.setWavePhase);
	const setCountdown = useGameStore((s) => s.setCountdown);
	const setPlacementFeedback = useGameStore((s) => s.setPlacementFeedback);
	const setRolledTower = useGameStore((s) => s.setRolledTower);
	const setOpponentState = useGameStore((s) => s.setOpponentState);
	const resetRun = useGameStore((s) => s.resetRun);
	const enterLobby = useGameStore((s) => s.enterLobby);
	const myEmote = useEmoteStore((s) => s.myEmote);
	const opponentEmote = useEmoteStore((s) => s.opponentEmote);
	const receiveEmote = useEmoteStore((s) => s.receiveEmote);
	const clearMyEmote = useEmoteStore((s) => s.clearMyEmote);
	const clearOpponentEmote = useEmoteStore((s) => s.clearOpponentEmote);

	const totalWaves = TOTAL_WAVES;

	useEffect(() => {
		const onDamaged = (data: { remainingHp: number }) =>
			setLives(data.remainingHp);
		const onGoldChanged = (data: { gold: number }) => setGold(data.gold);
		const onGameOver = (data: { winnerId: string }) => {
			setRunStatus(data.winnerId === 'local' ? 'victory' : 'defeat');
		};
		const onWaveStarted = (data: { wave: number }) => {
			setWave(data.wave);
			setWavePhase('combat');
			setRunStatus('combat');
			setPlacementFeedback(null);
		};
		const onBuildingPhase = (data: { nextWave: number; countdown: number }) => {
			setWave(data.nextWave);
			setWavePhase('building');
			setRunStatus('building');
			setCountdown(data.countdown);
		};
		const onCountdownTick = (data: { secondsLeft: number }) =>
			setCountdown(data.secondsLeft);
		const onTowerPlaced = (data: {
			success: boolean;
			reason?: PlacementFailureReason;
		}) => {
			setPlacementFeedback(data.success ? null : (data.reason ?? 'occupied'));
			if (data.success) setRolledTower(null);
		};
		const onRandomTowerRolled = (data: {
			towerId: string;
			towerDef: TowerDef;
		}) => {
			setRolledTower(data.towerDef);
		};
		const onOpponentState = (data: {
			gold: number;
			hp: number;
			towerCount: number;
		}) => {
			setOpponentState(data);
		};
		const onEmoteReceived = (data: { emoteId: string; playerId: string }) => {
			if (data.playerId !== 'opponent') return;
			receiveEmote(data.emoteId);
		};
		const onResetRun = () => resetRun();

		EventBus.on('player-damaged', onDamaged);
		EventBus.on('gold-changed', onGoldChanged);
		EventBus.on('game-over', onGameOver);
		EventBus.on('wave-started', onWaveStarted);
		EventBus.on('building-phase-started', onBuildingPhase);
		EventBus.on('countdown-tick', onCountdownTick);
		EventBus.on('tower-placed', onTowerPlaced);
		EventBus.on('random-tower-rolled', onRandomTowerRolled);
		EventBus.on('opponent-state', onOpponentState);
		EventBus.on('emote-received', onEmoteReceived);
		EventBus.on('request-reset-run', onResetRun);

		return () => {
			EventBus.off('player-damaged', onDamaged);
			EventBus.off('gold-changed', onGoldChanged);
			EventBus.off('game-over', onGameOver);
			EventBus.off('wave-started', onWaveStarted);
			EventBus.off('building-phase-started', onBuildingPhase);
			EventBus.off('countdown-tick', onCountdownTick);
			EventBus.off('tower-placed', onTowerPlaced);
			EventBus.off('random-tower-rolled', onRandomTowerRolled);
			EventBus.off('opponent-state', onOpponentState);
			EventBus.off('emote-received', onEmoteReceived);
			EventBus.off('request-reset-run', onResetRun);
		};
	}, [
		setCountdown,
		setGold,
		setLives,
		setOpponentState,
		setPlacementFeedback,
		receiveEmote,
		setRolledTower,
		setRunStatus,
		setWave,
		setWavePhase,
		resetRun,
	]);

	const resultTitle = runStatus === 'victory' ? '방어 성공' : '방어 실패';

	useEffect(() => {
		if (!myEmote) return;
		EventBus.emit('send-emote', { emoteId: myEmote.id });
	}, [myEmote]);

	return (
		<div
			style={{
				minHeight: '100%',
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'stretch',
				background:
					'radial-gradient(circle at top, rgba(200,160,74,0.2), transparent 24%), linear-gradient(180deg, #1a1208 0%, #2a2010 48%, #0f0a04 100%)',
				padding: '8px',
			}}
		>
			<div
				style={{
					width: 'min(100%, 460px)',
					minHeight: '100%',
					display: 'flex',
					flexDirection: 'column',
					borderRadius: '28px',
					overflow: 'hidden',
					border: `1px solid ${colors.border}`,
					boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
					background:
						'linear-gradient(180deg, rgba(26,18,8,0.98) 0%, rgba(42,32,16,0.98) 100%)',
					position: 'relative',
				}}
			>
				{/* Header: Wave / HP / Gold / Status / Exit */}
				<div
					style={{
						padding: '14px 14px 12px',
						borderBottom: '1px solid rgba(148, 161, 178, 0.22)',
						display: 'grid',
						gridTemplateColumns: '1fr auto',
						gap: '12px',
						alignItems: 'start',
					}}
				>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
								flexWrap: 'wrap',
							}}
						>
							<span style={{ color: colors.accent, fontSize: '8px' }}>
								팔라스 개인랜덤타워디펜스
							</span>
							<span style={{ color: colors.textSecondary, fontSize: '8px' }}>
								웨이브 {formatWaveLabel(wave, totalWaves)}/{totalWaves}
							</span>
						</div>
						<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
							<div
								style={{
									padding: '8px 10px',
									borderRadius: '14px',
									background: 'rgba(229,49,112,0.12)',
									color: colors.danger,
									fontSize: '8px',
								}}
							>
								HP {lives}
							</div>
							<div
								style={{
									padding: '8px 10px',
									borderRadius: '14px',
									background: 'rgba(226,183,20,0.12)',
									color: colors.gold,
									fontSize: '8px',
								}}
							>
								골드 {gold}
							</div>
							<div
								style={{
									padding: '8px 10px',
									borderRadius: '14px',
									background: 'rgba(200,160,74,0.14)',
									color: colors.text,
									fontSize: '8px',
								}}
							>
								{runStatus === 'building' && `건설 ${countdown}s`}
								{runStatus === 'combat' && '전투'}
								{runStatus === 'victory' && '승리'}
								{runStatus === 'defeat' && '패배'}
							</div>
						</div>
					</div>

					<PixelButton
						variant="danger"
						style={{ fontSize: '8px', padding: '8px 12px', minWidth: 'auto' }}
						onClick={enterLobby}
					>
						나가기
					</PixelButton>
				</div>

				{/* Phaser canvas — dual field (AI top + player bottom + HUD) */}
				<div style={{ padding: '14px', flex: 1 }}>
					<div
						style={{
							position: 'relative',
							width: '100%',
							aspectRatio: '640 / 688',
							borderRadius: '24px',
							overflow: 'hidden',
							border: `1px solid rgba(127, 90, 240, 0.22)`,
							background: '#0b0d17',
						}}
					>
						<PhaserGame key={runId} />

						{!gameReady && (
							<div
								style={{
									position: 'absolute',
									inset: 0,
									background: 'rgba(4, 5, 12, 0.72)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									color: colors.textSecondary,
									fontSize: '9px',
									zIndex: 2,
								}}
							>
								그리드 부팅 중...
							</div>
						)}

						{myEmote && (
							<EmoteBubble
								emoteId={myEmote.id}
								onDone={clearMyEmote}
								position="right"
							/>
						)}

						{opponentEmote && (
							<EmoteBubble
								emoteId={opponentEmote.id}
								onDone={clearOpponentEmote}
								position="left"
							/>
						)}

						{(runStatus === 'victory' || runStatus === 'defeat') && (
							<div
								style={{
									position: 'absolute',
									inset: 0,
									zIndex: 3,
									background: 'rgba(6, 8, 16, 0.82)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									padding: '20px',
								}}
							>
								<div
									style={{
										width: '100%',
										padding: '20px',
										borderRadius: '20px',
										background: 'rgba(12, 15, 26, 0.96)',
										border: `1px solid ${runStatus === 'victory' ? colors.success : colors.danger}`,
										display: 'flex',
										flexDirection: 'column',
										gap: '14px',
										textAlign: 'center',
									}}
								>
									<h2
										style={{
											color:
												runStatus === 'victory'
													? colors.success
													: colors.danger,
											fontSize: '12px',
										}}
									>
										{resultTitle}
									</h2>
									<p
										style={{
											color: colors.textSecondary,
											fontSize: '8px',
											lineHeight: 1.8,
										}}
									>
										{runStatus === 'victory'
											? '상대를 물리치고 왕국을 지켰습니다!'
											: '방어선이 무너졌습니다.'}
									</p>
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
				</div>
			</div>
		</div>
	);
}
