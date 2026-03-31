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
	const playerTowerCount = useGameStore((s) => s.playerTowerCount);
	const opponentHp = useGameStore((s) => s.opponentHp);
	const opponentGold = useGameStore((s) => s.opponentGold);
	const opponentTowerCount = useGameStore((s) => s.opponentTowerCount);
	const setRunStatus = useGameStore((s) => s.setRunStatus);
	const setLives = useGameStore((s) => s.setLives);
	const setGold = useGameStore((s) => s.setGold);
	const setWave = useGameStore((s) => s.setWave);
	const setWavePhase = useGameStore((s) => s.setWavePhase);
	const setCountdown = useGameStore((s) => s.setCountdown);
	const setPlacementFeedback = useGameStore((s) => s.setPlacementFeedback);
	const setRolledTower = useGameStore((s) => s.setRolledTower);
	const setPlayerTowerCount = useGameStore((s) => s.setPlayerTowerCount);
	const setOpponentState = useGameStore((s) => s.setOpponentState);
	const resetRun = useGameStore((s) => s.resetRun);
	const enterLobby = useGameStore((s) => s.enterLobby);
	const myEmote = useEmoteStore((s) => s.myEmote);
	const opponentEmote = useEmoteStore((s) => s.opponentEmote);
	const receiveEmote = useEmoteStore((s) => s.receiveEmote);
	const sendEmote = useEmoteStore((s) => s.sendEmote);
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
		const onPlayerTowerCount = (data: { count: number }) =>
			setPlayerTowerCount(data.count);
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
		EventBus.on('player-tower-count', onPlayerTowerCount);
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
			EventBus.off('player-tower-count', onPlayerTowerCount);
			EventBus.off('request-reset-run', onResetRun);
		};
	}, [
		setCountdown,
		setGold,
		setLives,
		setOpponentState,
		setPlacementFeedback,
		setPlayerTowerCount,
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
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				background: '#1a1a2e',
			}}
		>
			{/* Top HUD bar */}
			<div
				style={{
					padding: '8px 12px',
					display: 'flex',
					alignItems: 'center',
					gap: '8px',
					flexWrap: 'wrap',
					background: 'linear-gradient(180deg, rgba(20,20,36,0.98) 0%, rgba(26,26,46,0.95) 100%)',
					borderBottom: '1px solid rgba(127,90,240,0.15)',
					flexShrink: 0,
				}}
			>
				<span style={{ color: colors.accent, fontSize: '8px', marginRight: '4px' }}>
					팔라스 개인랜덤타워디펜스
				</span>
				<span style={{ color: colors.textSecondary, fontSize: '8px' }}>
					웨이브 {formatWaveLabel(wave, totalWaves)}/{totalWaves}
				</span>

				<div style={{ display: 'flex', gap: '6px', marginLeft: '4px' }}>
					<div
						style={{
							padding: '4px 8px',
							borderRadius: '10px',
							background: 'rgba(229,49,112,0.15)',
							color: colors.danger,
							fontSize: '8px',
						}}
					>
						HP {lives}
					</div>
					<div
						style={{
							padding: '4px 8px',
							borderRadius: '10px',
							background: 'rgba(226,183,20,0.15)',
							color: colors.gold,
							fontSize: '8px',
						}}
					>
						골드 {gold}
					</div>
					<div
						style={{
							padding: '4px 8px',
							borderRadius: '10px',
							background: 'rgba(200,160,74,0.12)',
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

				<div style={{ marginLeft: 'auto' }}>
					<PixelButton
						variant="danger"
						style={{ fontSize: '8px', padding: '4px 10px', minWidth: 'auto' }}
						onClick={enterLobby}
					>
						나가기
					</PixelButton>
				</div>
			</div>

			{/* Canvas area — sized to match Phaser aspect ratio */}
			<div
				style={{
					width: '100%',
					aspectRatio: '640 / 688',
					maxHeight: 'calc(100vh - 140px)',
					position: 'relative',
					overflow: 'hidden',
					flexShrink: 1,
					minHeight: 0,
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
								width: 'min(100%, 360px)',
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

			{/* Bottom panel — fills remaining space */}
			<div
				style={{
					flex: 1,
					padding: '12px',
					background: 'linear-gradient(180deg, rgba(26,26,46,0.95) 0%, rgba(20,20,36,0.98) 100%)',
					borderTop: '1px solid rgba(127,90,240,0.15)',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					gap: '8px',
					minHeight: '80px',
				}}
			>
				{/* Player vs AI comparison */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
					{/* HP comparison */}
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<span style={{ color: colors.text, fontSize: '7px', width: '24px', textAlign: 'right' }}>나</span>
						<div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(229,49,112,0.1)', overflow: 'hidden', position: 'relative' }}>
							<div style={{
								position: 'absolute', left: 0, top: 0, bottom: 0,
								width: `${(lives / 20) * 100}%`,
								background: `linear-gradient(90deg, ${colors.danger}, rgba(229,49,112,0.6))`,
								borderRadius: '4px',
								transition: 'width 0.3s',
							}} />
						</div>
						<span style={{ color: colors.danger, fontSize: '7px', width: '20px' }}>{lives}</span>
						<span style={{ color: colors.textSecondary, fontSize: '7px' }}>HP</span>
						<span style={{ color: colors.danger, fontSize: '7px', width: '20px', textAlign: 'right', opacity: 0.6 }}>{opponentHp}</span>
						<div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(229,49,112,0.1)', overflow: 'hidden', position: 'relative' }}>
							<div style={{
								position: 'absolute', right: 0, top: 0, bottom: 0,
								width: `${(opponentHp / 20) * 100}%`,
								background: `linear-gradient(270deg, rgba(229,49,112,0.4), rgba(229,49,112,0.15))`,
								borderRadius: '4px',
								transition: 'width 0.3s',
							}} />
						</div>
						<span style={{ color: colors.textSecondary, fontSize: '7px', width: '24px', opacity: 0.6 }}>AI</span>
					</div>

					{/* Gold comparison */}
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<span style={{ color: colors.text, fontSize: '7px', width: '24px', textAlign: 'right' }}>나</span>
						<div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(226,183,20,0.1)', overflow: 'hidden', position: 'relative' }}>
							<div style={{
								position: 'absolute', left: 0, top: 0, bottom: 0,
								width: `${Math.min(100, (gold / 500) * 100)}%`,
								background: `linear-gradient(90deg, ${colors.gold}, rgba(226,183,20,0.6))`,
								borderRadius: '4px',
								transition: 'width 0.3s',
							}} />
						</div>
						<span style={{ color: colors.gold, fontSize: '7px', width: '20px' }}>{gold}</span>
						<span style={{ color: colors.textSecondary, fontSize: '7px' }}>골드</span>
						<span style={{ color: colors.gold, fontSize: '7px', width: '20px', textAlign: 'right', opacity: 0.6 }}>{opponentGold}</span>
						<div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(226,183,20,0.1)', overflow: 'hidden', position: 'relative' }}>
							<div style={{
								position: 'absolute', right: 0, top: 0, bottom: 0,
								width: `${Math.min(100, (opponentGold / 500) * 100)}%`,
								background: `linear-gradient(270deg, rgba(226,183,20,0.4), rgba(226,183,20,0.15))`,
								borderRadius: '4px',
								transition: 'width 0.3s',
							}} />
						</div>
						<span style={{ color: colors.textSecondary, fontSize: '7px', width: '24px', opacity: 0.6 }}>AI</span>
					</div>

					{/* Tower count comparison */}
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<span style={{ color: colors.text, fontSize: '7px', width: '24px', textAlign: 'right' }}>나</span>
						<div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(127,90,240,0.1)', overflow: 'hidden', position: 'relative' }}>
							<div style={{
								position: 'absolute', left: 0, top: 0, bottom: 0,
								width: `${Math.min(100, (playerTowerCount / 10) * 100)}%`,
								background: `linear-gradient(90deg, ${colors.info}, rgba(91,200,232,0.6))`,
								borderRadius: '4px',
								transition: 'width 0.3s',
							}} />
						</div>
						<span style={{ color: colors.info, fontSize: '7px', width: '20px' }}>{playerTowerCount}</span>
						<span style={{ color: colors.textSecondary, fontSize: '7px' }}>타워</span>
						<span style={{ color: colors.info, fontSize: '7px', width: '20px', textAlign: 'right', opacity: 0.6 }}>{opponentTowerCount}</span>
						<div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(127,90,240,0.1)', overflow: 'hidden', position: 'relative' }}>
							<div style={{
								position: 'absolute', right: 0, top: 0, bottom: 0,
								width: `${Math.min(100, (opponentTowerCount / 10) * 100)}%`,
								background: `linear-gradient(270deg, rgba(91,200,232,0.4), rgba(91,200,232,0.15))`,
								borderRadius: '4px',
								transition: 'width 0.3s',
							}} />
						</div>
						<span style={{ color: colors.textSecondary, fontSize: '7px', width: '24px', opacity: 0.6 }}>AI</span>
					</div>
				</div>

				{/* Inline emote bar */}
				<div
					style={{
						display: 'flex',
						gap: '6px',
						overflow: 'hidden',
					}}
				>
					{EMOTES.map((emote) => (
						<button
							key={emote.id}
							onClick={() => sendEmote(emote.id)}
							style={{
								flex: 1,
								background: 'rgba(42,32,16,0.6)',
								border: '1px solid rgba(200,160,74,0.15)',
								borderRadius: '8px',
								padding: '8px 2px',
								cursor: 'pointer',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: '3px',
								color: colors.textSecondary,
								fontSize: '7px',
								fontFamily: "'Press Start 2P', cursive",
							}}
						>
							<span style={{ fontSize: '16px' }}>{emote.emoji}</span>
							<span>{emote.text}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
