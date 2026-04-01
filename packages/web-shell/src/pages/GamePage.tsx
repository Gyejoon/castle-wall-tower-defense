import { EventBus } from '@gld/phaser-game';
import {
	EMOTES,
	type PlacementFailureReason,
	type PressurePacketId,
	type TowerDef,
} from '@gld/shared';
import { useEffect } from 'react';
import { EmoteBubble } from '../components/EmoteBubble';
import { PixelButton } from '../components/ui/PixelButton';
import { PhaserGame } from '../game/PhaserGame';
import { useEmoteStore } from '../stores/emoteStore';
import { useGameStore } from '../stores/gameStore';
import { colors } from '../styles/tokens';

function formatPressureLabel(packetId: PressurePacketId | null) {
	switch (packetId) {
		case 'scout_pressure':
			return '정찰';
		case 'mixed_pressure':
			return '혼합';
		case 'breach_pressure':
			return '돌파';
		default:
			return '없음';
	}
}

function formatTimerLabel(rawLabel: string) {
	if (rawLabel.startsWith('Boss')) return rawLabel.replace('Boss', '보스');
	if (rawLabel.startsWith('Sudden')) return '서든';
	if (rawLabel.startsWith('Slot')) return rawLabel.replace('Slot', '슬롯');
	return rawLabel;
}

function getToastStyle(tone: 'info' | 'success' | 'warning' | 'error') {
	switch (tone) {
		case 'success':
			return {
				color: colors.success,
				background: 'rgba(44,182,125,0.14)',
				border: 'rgba(44,182,125,0.35)',
			};
		case 'warning':
			return {
				color: colors.gold,
				background: 'rgba(226,183,20,0.14)',
				border: 'rgba(226,183,20,0.3)',
			};
		case 'error':
			return {
				color: colors.danger,
				background: 'rgba(229,49,112,0.14)',
				border: 'rgba(229,49,112,0.35)',
			};
		default:
			return {
				color: colors.info,
				background: 'rgba(91,200,232,0.14)',
				border: 'rgba(91,200,232,0.3)',
			};
	}
}

export function GamePage() {
	const runId = useGameStore((s) => s.runId);
	const runStatus = useGameStore((s) => s.runStatus);
	const gameReady = useGameStore((s) => s.gameReady);
	const lives = useGameStore((s) => s.lives);
	const gold = useGameStore((s) => s.gold);
	const playerTowerCount = useGameStore((s) => s.playerTowerCount);
	const opponentHp = useGameStore((s) => s.opponentHp);
	const opponentGold = useGameStore((s) => s.opponentGold);
	const opponentTowerCount = useGameStore((s) => s.opponentTowerCount);
	const combatHud = useGameStore((s) => s.combatHud);
	const toast = useGameStore((s) => s.toast);
	const setRunStatus = useGameStore((s) => s.setRunStatus);
	const setLives = useGameStore((s) => s.setLives);
	const setGold = useGameStore((s) => s.setGold);
	const setPlacementFeedback = useGameStore((s) => s.setPlacementFeedback);
	const setRolledTower = useGameStore((s) => s.setRolledTower);
	const setPlayerTowerCount = useGameStore((s) => s.setPlayerTowerCount);
	const setOpponentState = useGameStore((s) => s.setOpponentState);
	const patchCombatHud = useGameStore((s) => s.patchCombatHud);
	const pushToast = useGameStore((s) => s.pushToast);
	const clearToast = useGameStore((s) => s.clearToast);
	const resetRun = useGameStore((s) => s.resetRun);
	const enterLobby = useGameStore((s) => s.enterLobby);
	const myEmote = useEmoteStore((s) => s.myEmote);
	const opponentEmote = useEmoteStore((s) => s.opponentEmote);
	const receiveEmote = useEmoteStore((s) => s.receiveEmote);
	const sendEmote = useEmoteStore((s) => s.sendEmote);
	const clearMyEmote = useEmoteStore((s) => s.clearMyEmote);
	const clearOpponentEmote = useEmoteStore((s) => s.clearOpponentEmote);

	useEffect(() => {
		const onDamaged = (data: { remainingHp: number }) =>
			setLives(data.remainingHp);
		const onGoldChanged = (data: { gold: number }) => setGold(data.gold);
		const onGameOver = (data: { winnerId: string }) => {
			setRunStatus(data.winnerId === 'local' ? 'victory' : 'defeat');
		};
		const onWaveStarted = (data: {
			slotIndex: number;
			phase: 'running' | 'boss' | 'sudden_death' | 'ended';
			kind: 'normal' | 'pre_boss' | 'boss' | 'sudden_death' | 'hard_end';
			startAtSec: number;
		}) => {
			if (data.kind === 'hard_end') return;
			setRunStatus('running');
			patchCombatHud({
				currentSlot: data.slotIndex,
				phase: data.phase,
				bossWarning: data.kind === 'pre_boss',
				suddenDeath: data.phase === 'sudden_death',
				timerLabel:
					data.phase === 'boss'
						? `Boss ${data.slotIndex}`
						: data.phase === 'sudden_death'
							? 'Sudden Death'
							: data.kind === 'pre_boss'
								? 'Boss Soon'
								: `Slot ${data.slotIndex}`,
			});
			setPlacementFeedback(null);
		};
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
		const onPressureEarned = (data: {
			ownerId: string;
			pressureTokens: number;
			packetId: PressurePacketId;
		}) => {
			if (data.ownerId !== 'local') return;
			patchCombatHud({ pressureTokens: data.pressureTokens });
			pushToast(`압박 +1 (${formatPressureLabel(data.packetId)})`, 'success');
		};
		const onPressureQueued = (data: {
			ownerId: string;
			pressureTokens: number;
			packetId: PressurePacketId;
			targetSlotIndex: number;
		}) => {
			if (data.ownerId !== 'local') return;
			patchCombatHud({
				pressureTokens: data.pressureTokens,
				queuedPressureEffect: data.packetId,
			});
			pushToast(`다음 압박 예약 ${data.targetSlotIndex}`, 'info');
		};
		const onPressureExpired = (data: {
			ownerId: string;
			pressureTokens: number;
		}) => {
			if (data.ownerId !== 'local') return;
			patchCombatHud({ pressureTokens: data.pressureTokens });
			pushToast('미사용 압박 소멸', 'warning');
		};
		const onBossWarning = () => {
			patchCombatHud({ bossWarning: true, timerLabel: 'Boss Soon' });
			pushToast('보스 경고', 'warning');
		};
		const onSuddenDeathStarted = () => {
			patchCombatHud({
				phase: 'sudden_death',
				suddenDeath: true,
				bossWarning: false,
				timerLabel: 'Sudden Death',
			});
			pushToast('서든데스 시작', 'warning');
		};
		const onBuyCooldownUpdated = (data: { remainingMs: number }) => {
			patchCombatHud({ buyCooldownMs: data.remainingMs });
		};
		const onTowerMergeResolved = (data: { success: boolean }) => {
			if (!data.success) pushToast('합성 실패', 'error');
		};

		EventBus.on('player-damaged', onDamaged);
		EventBus.on('gold-changed', onGoldChanged);
		EventBus.on('game-over', onGameOver);
		EventBus.on('wave-started', onWaveStarted);
		EventBus.on('tower-placed', onTowerPlaced);
		EventBus.on('random-tower-rolled', onRandomTowerRolled);
		EventBus.on('opponent-state', onOpponentState);
		EventBus.on('emote-received', onEmoteReceived);
		EventBus.on('player-tower-count', onPlayerTowerCount);
		EventBus.on('request-reset-run', onResetRun);
		EventBus.on('pressure-earned', onPressureEarned);
		EventBus.on('pressure-queued', onPressureQueued);
		EventBus.on('pressure-expired', onPressureExpired);
		EventBus.on('boss-warning', onBossWarning);
		EventBus.on('sudden-death-started', onSuddenDeathStarted);
		EventBus.on('buy-cooldown-updated', onBuyCooldownUpdated);
		EventBus.on('tower-merge-resolved', onTowerMergeResolved);

		return () => {
			EventBus.off('player-damaged', onDamaged);
			EventBus.off('gold-changed', onGoldChanged);
			EventBus.off('game-over', onGameOver);
			EventBus.off('wave-started', onWaveStarted);
			EventBus.off('tower-placed', onTowerPlaced);
			EventBus.off('random-tower-rolled', onRandomTowerRolled);
			EventBus.off('opponent-state', onOpponentState);
			EventBus.off('emote-received', onEmoteReceived);
			EventBus.off('player-tower-count', onPlayerTowerCount);
			EventBus.off('request-reset-run', onResetRun);
			EventBus.off('pressure-earned', onPressureEarned);
			EventBus.off('pressure-queued', onPressureQueued);
			EventBus.off('pressure-expired', onPressureExpired);
			EventBus.off('boss-warning', onBossWarning);
			EventBus.off('sudden-death-started', onSuddenDeathStarted);
			EventBus.off('buy-cooldown-updated', onBuyCooldownUpdated);
			EventBus.off('tower-merge-resolved', onTowerMergeResolved);
		};
	}, [
		patchCombatHud,
		pushToast,
		receiveEmote,
		resetRun,
		setGold,
		setLives,
		setOpponentState,
		setPlacementFeedback,
		setPlayerTowerCount,
		setRolledTower,
		setRunStatus,
	]);

	useEffect(() => {
		if (!toast) return;
		const timeout = window.setTimeout(() => clearToast(), 1800);
		return () => window.clearTimeout(timeout);
	}, [clearToast, toast]);

	useEffect(() => {
		if (!myEmote) return;
		EventBus.emit('send-emote', { emoteId: myEmote.id });
	}, [myEmote]);

	const resultTitle = runStatus === 'victory' ? '방어 성공' : '방어 실패';
	const toastStyle = toast ? getToastStyle(toast.tone) : null;

	return (
		<div
			style={{
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				background: '#1a1a2e',
			}}
		>
			<div
				data-testid="top-hud"
				style={{
					padding: '8px 10px',
					display: 'flex',
					alignItems: 'center',
					gap: '6px',
					flexWrap: 'nowrap',
					whiteSpace: 'nowrap',
					overflow: 'hidden',
					background:
						'linear-gradient(180deg, rgba(20,20,36,0.98) 0%, rgba(26,26,46,0.95) 100%)',
					borderBottom: '1px solid rgba(127,90,240,0.15)',
					flexShrink: 0,
				}}
			>
				<div
					style={{
						padding: '4px 7px',
						borderRadius: '10px',
						background: 'rgba(229,49,112,0.15)',
						color: colors.danger,
						fontSize: '8px',
						flexShrink: 0,
					}}
				>
					HP {lives}
				</div>
				<div
					style={{
						padding: '4px 7px',
						borderRadius: '10px',
						background: 'rgba(226,183,20,0.15)',
						color: colors.gold,
						fontSize: '8px',
						flexShrink: 0,
					}}
				>
					G {gold}
				</div>
				<div
					data-testid="hud-timer"
					style={{
						padding: '4px 7px',
						borderRadius: '10px',
						background: combatHud.suddenDeath
							? 'rgba(229,49,112,0.18)'
							: combatHud.bossWarning || combatHud.phase === 'boss'
								? 'rgba(226,183,20,0.15)'
								: 'rgba(200,160,74,0.12)',
						color: combatHud.suddenDeath
							? colors.danger
							: combatHud.bossWarning || combatHud.phase === 'boss'
								? colors.gold
								: colors.text,
						fontSize: '8px',
						minWidth: 0,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
					}}
				>
					{formatTimerLabel(combatHud.timerLabel)}
				</div>
				<div
					data-testid="hud-pressure"
					style={{
						padding: '4px 7px',
						borderRadius: '10px',
						background:
							combatHud.pressureTokens > 0
								? 'rgba(91,200,232,0.16)'
								: 'rgba(91,200,232,0.08)',
						color: colors.info,
						fontSize: '8px',
						flexShrink: 0,
					}}
				>
					압박 {combatHud.pressureTokens}
				</div>
				<div
					data-testid="hud-next-pressure"
					style={{
						padding: '4px 7px',
						borderRadius: '10px',
						background: 'rgba(42,32,16,0.6)',
						color: colors.textSecondary,
						fontSize: '8px',
						minWidth: 0,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
					}}
				>
					다음 {formatPressureLabel(combatHud.queuedPressureEffect)}
				</div>

				<div style={{ marginLeft: 'auto', flexShrink: 0 }}>
					<PixelButton
						variant="danger"
						style={{ fontSize: '8px', padding: '4px 10px', minWidth: 'auto' }}
						onClick={enterLobby}
					>
						나가기
					</PixelButton>
				</div>
			</div>

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

				{toast && toastStyle && (
					<div
						style={{
							position: 'absolute',
							top: 12,
							left: '50%',
							transform: 'translateX(-50%)',
							zIndex: 4,
							padding: '8px 12px',
							borderRadius: '12px',
							border: `1px solid ${toastStyle.border}`,
							background: toastStyle.background,
							color: toastStyle.color,
							fontSize: '8px',
							maxWidth: 'min(80vw, 280px)',
							textAlign: 'center',
						}}
					>
						{toast.message}
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
										runStatus === 'victory' ? colors.success : colors.danger,
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

			<div
				style={{
					flex: 1,
					padding: '12px',
					background:
						'linear-gradient(180deg, rgba(26,26,46,0.95) 0%, rgba(20,20,36,0.98) 100%)',
					borderTop: '1px solid rgba(127,90,240,0.15)',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					gap: '8px',
					minHeight: '80px',
				}}
			>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<span
							style={{
								color: colors.text,
								fontSize: '7px',
								width: '24px',
								textAlign: 'right',
							}}
						>
							나
						</span>
						<div
							style={{
								flex: 1,
								height: '8px',
								borderRadius: '4px',
								background: 'rgba(229,49,112,0.1)',
								overflow: 'hidden',
								position: 'relative',
							}}
						>
							<div
								style={{
									position: 'absolute',
									left: 0,
									top: 0,
									bottom: 0,
									width: `${(lives / 20) * 100}%`,
									background: `linear-gradient(90deg, ${colors.danger}, rgba(229,49,112,0.6))`,
									borderRadius: '4px',
									transition: 'width 0.3s',
								}}
							/>
						</div>
						<span
							style={{ color: colors.danger, fontSize: '7px', width: '20px' }}
						>
							{lives}
						</span>
						<span style={{ color: colors.textSecondary, fontSize: '7px' }}>
							HP
						</span>
						<span
							style={{
								color: colors.danger,
								fontSize: '7px',
								width: '20px',
								textAlign: 'right',
								opacity: 0.6,
							}}
						>
							{opponentHp}
						</span>
						<div
							style={{
								flex: 1,
								height: '8px',
								borderRadius: '4px',
								background: 'rgba(229,49,112,0.1)',
								overflow: 'hidden',
								position: 'relative',
							}}
						>
							<div
								style={{
									position: 'absolute',
									right: 0,
									top: 0,
									bottom: 0,
									width: `${(opponentHp / 20) * 100}%`,
									background: `linear-gradient(270deg, rgba(229,49,112,0.4), rgba(229,49,112,0.15))`,
									borderRadius: '4px',
									transition: 'width 0.3s',
								}}
							/>
						</div>
						<span
							style={{
								color: colors.textSecondary,
								fontSize: '7px',
								width: '24px',
								opacity: 0.6,
							}}
						>
							AI
						</span>
					</div>

					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<span
							style={{
								color: colors.text,
								fontSize: '7px',
								width: '24px',
								textAlign: 'right',
							}}
						>
							나
						</span>
						<div
							style={{
								flex: 1,
								height: '8px',
								borderRadius: '4px',
								background: 'rgba(226,183,20,0.1)',
								overflow: 'hidden',
								position: 'relative',
							}}
						>
							<div
								style={{
									position: 'absolute',
									left: 0,
									top: 0,
									bottom: 0,
									width: `${Math.min(100, (gold / 500) * 100)}%`,
									background: `linear-gradient(90deg, ${colors.gold}, rgba(226,183,20,0.6))`,
									borderRadius: '4px',
									transition: 'width 0.3s',
								}}
							/>
						</div>
						<span
							style={{ color: colors.gold, fontSize: '7px', width: '20px' }}
						>
							{gold}
						</span>
						<span style={{ color: colors.textSecondary, fontSize: '7px' }}>
							골드
						</span>
						<span
							style={{
								color: colors.gold,
								fontSize: '7px',
								width: '20px',
								textAlign: 'right',
								opacity: 0.6,
							}}
						>
							{opponentGold}
						</span>
						<div
							style={{
								flex: 1,
								height: '8px',
								borderRadius: '4px',
								background: 'rgba(226,183,20,0.1)',
								overflow: 'hidden',
								position: 'relative',
							}}
						>
							<div
								style={{
									position: 'absolute',
									right: 0,
									top: 0,
									bottom: 0,
									width: `${Math.min(100, (opponentGold / 500) * 100)}%`,
									background: `linear-gradient(270deg, rgba(226,183,20,0.4), rgba(226,183,20,0.15))`,
									borderRadius: '4px',
									transition: 'width 0.3s',
								}}
							/>
						</div>
						<span
							style={{
								color: colors.textSecondary,
								fontSize: '7px',
								width: '24px',
								opacity: 0.6,
							}}
						>
							AI
						</span>
					</div>

					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<span
							style={{
								color: colors.text,
								fontSize: '7px',
								width: '24px',
								textAlign: 'right',
							}}
						>
							나
						</span>
						<div
							style={{
								flex: 1,
								height: '8px',
								borderRadius: '4px',
								background: 'rgba(127,90,240,0.1)',
								overflow: 'hidden',
								position: 'relative',
							}}
						>
							<div
								style={{
									position: 'absolute',
									left: 0,
									top: 0,
									bottom: 0,
									width: `${Math.min(100, (playerTowerCount / 10) * 100)}%`,
									background: `linear-gradient(90deg, ${colors.info}, rgba(91,200,232,0.6))`,
									borderRadius: '4px',
									transition: 'width 0.3s',
								}}
							/>
						</div>
						<span
							style={{ color: colors.info, fontSize: '7px', width: '20px' }}
						>
							{playerTowerCount}
						</span>
						<span style={{ color: colors.textSecondary, fontSize: '7px' }}>
							타워
						</span>
						<span
							style={{
								color: colors.info,
								fontSize: '7px',
								width: '20px',
								textAlign: 'right',
								opacity: 0.6,
							}}
						>
							{opponentTowerCount}
						</span>
						<div
							style={{
								flex: 1,
								height: '8px',
								borderRadius: '4px',
								background: 'rgba(127,90,240,0.1)',
								overflow: 'hidden',
								position: 'relative',
							}}
						>
							<div
								style={{
									position: 'absolute',
									right: 0,
									top: 0,
									bottom: 0,
									width: `${Math.min(100, (opponentTowerCount / 10) * 100)}%`,
									background: `linear-gradient(270deg, rgba(91,200,232,0.4), rgba(91,200,232,0.15))`,
									borderRadius: '4px',
									transition: 'width 0.3s',
								}}
							/>
						</div>
						<span
							style={{
								color: colors.textSecondary,
								fontSize: '7px',
								width: '24px',
								opacity: 0.6,
							}}
						>
							AI
						</span>
					</div>
				</div>

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
							type="button"
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
