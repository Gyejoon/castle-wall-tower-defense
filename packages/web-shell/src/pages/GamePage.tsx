import { EventBus, soundGenerator } from '@gld/phaser-game';
import { useCallback, useEffect, useState } from 'react';
import { BossHpBar } from '../components/game/BossHpBar';
import { BossWarningOverlay } from '../components/game/BossWarningOverlay';
import { GameOverScreen } from '../components/game/GameOverScreen';
import { PhaseAHud } from '../components/game/PhaseAHud';
import { SummonRevealOverlay } from '../components/game/SummonRevealOverlay';
import { ToastNotification } from '../components/game/ToastNotification';
import { TopHud } from '../components/game/TopHud';
import {
	type SelectedTower,
	TowerActionSheet,
} from '../components/game/TowerActionSheet';
import { TutorialOverlay } from '../components/game/TutorialOverlay';
import { UpgradePickOverlay } from '../components/game/UpgradePickOverlay';
import { PhaserGame } from '../game/PhaserGame';
import { useGameEvents } from '../hooks/useGameEvents';
import { useGameStore } from '../stores/gameStore';

export function GamePage() {
	const runId = useGameStore((s) => s.runId);
	const runStatus = useGameStore((s) => s.runStatus);
	const gameReady = useGameStore((s) => s.gameReady);
	const lives = useGameStore((s) => s.lives);
	const energy = useGameStore((s) => s.energy);
	const combatHud = useGameStore((s) => s.combatHud);
	const toast = useGameStore((s) => s.toast);
	const clearToast = useGameStore((s) => s.clearToast);
	const resetRun = useGameStore((s) => s.resetRun);
	const enterLobby = useGameStore((s) => s.enterLobby);
	const bossWarningVisible = useGameStore((s) => s.bossWarningVisible);
	const bossHpMap = useGameStore((s) => s.bossHpMap);
	const gameOverStats = useGameStore((s) => s.gameOverStats);
	const wavePhase = useGameStore((s) => s.wavePhase);
	const prepCountdown = useGameStore((s) => s.countdown);
	const gameSpeed = useGameStore((s) => s.gameSpeed);
	const setGameSpeed = useGameStore((s) => s.setGameSpeed);
	// Phase 6: Phase A is the only mode, so 2x speed is always available.
	const speed2xUnlocked = true;

	const { waitCountdown } = useGameEvents();
	const [showExitModal, setShowExitModal] = useState(false);
	const [upgradeChoices, setUpgradeChoices] = useState<Array<{
		id: string;
		name: string;
		description: string;
		icon: string;
	}> | null>(null);
	const [selectedTower, setSelectedTower] = useState<SelectedTower | null>(
		null,
	);
	const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);

	// Apply saved SFX volume to audio engine on mount
	useEffect(() => {
		const sfxVol = useGameStore.getState().sfxVolume;
		soundGenerator.setMasterVolume(sfxVol);
	}, []);

	// iOS AudioContext unlock on first user gesture
	useEffect(() => {
		const unlockAudio = async () => {
			document.removeEventListener('pointerdown', unlockAudio);
			document.removeEventListener('touchstart', unlockAudio);
			document.removeEventListener('click', unlockAudio);
			try {
				await soundGenerator.unlock();
				soundGenerator.setMasterVolume(useGameStore.getState().sfxVolume);
			} catch {
				/* AudioContext.resume() can reject in restricted contexts */
			}
		};
		document.addEventListener('pointerdown', unlockAudio);
		document.addEventListener('touchstart', unlockAudio);
		document.addEventListener('click', unlockAudio);
		return () => {
			document.removeEventListener('pointerdown', unlockAudio);
			document.removeEventListener('touchstart', unlockAudio);
			document.removeEventListener('click', unlockAudio);
		};
	}, []);

	useEffect(() => {
		const handleVisibility = async () => {
			if (document.visibilityState === 'visible') {
				try {
					await soundGenerator.unlock();
				} catch {
					/* AudioContext.resume() can reject in restricted contexts */
				}
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

	useEffect(() => {
		const handleUpgradeReady = (data: {
			choices: Array<{
				id: string;
				name: string;
				description: string;
				icon?: string;
			}>;
		}) => {
			setUpgradeChoices(
				data.choices.map((c) => ({
					id: c.id,
					name: c.name,
					description: c.description,
					icon: c.icon ?? '',
				})),
			);
		};
		const handleUpgradeApplied = () => {
			setUpgradeChoices(null);
		};
		const handleGameOver = () => {
			setUpgradeChoices(null);
		};

		EventBus.on('upgrade-choice-ready', handleUpgradeReady);
		EventBus.on('upgrade-applied', handleUpgradeApplied);
		EventBus.on('game-over', handleGameOver);
		return () => {
			EventBus.off('upgrade-choice-ready', handleUpgradeReady);
			EventBus.off('upgrade-applied', handleUpgradeApplied);
			EventBus.off('game-over', handleGameOver);
		};
	}, []);

	// Phase 8 Task 8.1 — subscribe to tower selection events and render the
	// floating TowerActionSheet. The Phaser scene emits tower-selected with
	// grid coords + def metadata; we mirror that into React state. On
	// tower-deselected / sold / moved / merged we clear the sheet.
	//
	// Phase 8 Task 8.5 [F10] — when mergeSourceId is non-null, the next
	// tower-selected becomes the merge target instead of opening the sheet.
	useEffect(() => {
		const handleSelected = (data: {
			towerDefId: string;
			towerName: string;
			col: number;
			row: number;
			refund: number;
			tier: number;
			level: number;
		}) => {
			const targetId = `${data.col},${data.row}`;
			// [F10] merge-target-picker branch: if we're waiting for a target,
			// fire request-merge-towers and stay out of the action sheet.
			if (mergeSourceId !== null && mergeSourceId !== targetId) {
				const [fromColStr, fromRowStr] = mergeSourceId.split(',');
				const fromCol = Number(fromColStr);
				const fromRow = Number(fromRowStr);
				if (Number.isFinite(fromCol) && Number.isFinite(fromRow)) {
					EventBus.emit('request-merge-towers', {
						fromCol,
						fromRow,
						toCol: data.col,
						toRow: data.row,
					});
				}
				setMergeSourceId(null);
				setSelectedTower(null);
				return;
			}
			setSelectedTower({
				instanceId: targetId,
				col: data.col,
				row: data.row,
				towerId: data.towerDefId,
				towerName: data.towerName,
				tier: data.tier,
				sellValue: data.refund,
				level: data.level,
			});
		};
		const clear = () => setSelectedTower(null);

		// Sync the action sheet's level after a successful enhance so the cost
		// badge bumps without needing the player to re-select the tower.
		const handleEnhanced = (data: {
			col: number;
			row: number;
			newLevel: number;
		}) => {
			setSelectedTower((prev) =>
				prev && prev.col === data.col && prev.row === data.row
					? { ...prev, level: data.newLevel }
					: prev,
			);
		};

		EventBus.on('tower-selected', handleSelected);
		EventBus.on('tower-deselected', clear);
		EventBus.on('tower-sold', clear);
		EventBus.on('tower-moved', clear);
		EventBus.on('towers-merged', clear);
		EventBus.on('tower-enhanced', handleEnhanced);
		return () => {
			EventBus.off('tower-selected', handleSelected);
			EventBus.off('tower-deselected', clear);
			EventBus.off('tower-sold', clear);
			EventBus.off('tower-moved', clear);
			EventBus.off('towers-merged', clear);
			EventBus.off('tower-enhanced', handleEnhanced);
		};
	}, [mergeSourceId]);

	// Phase 8 Task 8.5 [F10] — merge-mode state machine.
	//   enter-merge-mode → set sourceId (TowerActionSheet 합성 click)
	//   merge-failed    → clear (invalid pair, out of range, etc.)
	//   towers-merged   → clear (success)
	useEffect(() => {
		const enterHandler = (p: { sourceId: string }) =>
			setMergeSourceId(p.sourceId);
		const failedHandler = () => setMergeSourceId(null);
		const mergedHandler = () => setMergeSourceId(null);
		EventBus.on('enter-merge-mode', enterHandler);
		EventBus.on('merge-failed', failedHandler);
		EventBus.on('towers-merged', mergedHandler);
		return () => {
			EventBus.off('enter-merge-mode', enterHandler);
			EventBus.off('merge-failed', failedHandler);
			EventBus.off('towers-merged', mergedHandler);
		};
	}, []);

	// [F10] ESC key cancels merge-target-picker mode.
	useEffect(() => {
		if (!mergeSourceId) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setMergeSourceId(null);
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [mergeSourceId]);

	const handleToggleSpeed = useCallback(() => {
		const cur = useGameStore.getState().gameSpeed;
		const next = cur === 1 ? 2 : cur === 2 ? 3 : 1;
		setGameSpeed(next as 1 | 2 | 3);
	}, [setGameSpeed]);

	const handleExitRequest = useCallback(() => {
		if (runStatus !== 'running') return;
		setShowExitModal(true);
		EventBus.emit('request-pause');
	}, [runStatus]);

	const handleExitConfirm = useCallback(() => {
		setShowExitModal(false);
		enterLobby();
	}, [enterLobby]);

	const handleExitCancel = useCallback(() => {
		setShowExitModal(false);
		EventBus.emit('request-resume');
	}, []);

	const handleActionSheetClose = useCallback(() => {
		setSelectedTower(null);
		EventBus.emit('request-clear-tower-selection');
	}, []);

	const handleMergeCancel = useCallback(() => {
		setMergeSourceId(null);
	}, []);

	const isBossPhase = combatHud.bossWarning || combatHud.phase === 'boss';

	return (
		<div className="flex h-full w-full justify-center bg-bg">
			<div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-bg shadow-[0_0_40px_rgba(0,0,0,0.5)]">
				{!gameReady && (
					<div
						className="absolute inset-0 z-[5] flex flex-col items-center justify-center"
						style={{ background: 'var(--color-bg, #1a1208)' }}
					>
						<div
							className="font-pixel text-[15px] text-accent"
							style={{ letterSpacing: '0.16em' }}
						>
							&gt;_ 전투 개시
						</div>
						<div
							className="font-pixel text-[10px] text-text-secondary mt-2 matchmaking-dots"
							style={{ letterSpacing: '0.1em' }}
						>
							그리드 초기화 중
						</div>
					</div>
				)}
				<TopHud
					lives={lives}
					energy={energy}
					isBossPhase={isBossPhase}
					combatHud={combatHud}
					waitCountdown={waitCountdown}
					gameSpeed={gameSpeed}
					speed2xUnlocked={speed2xUnlocked}
					runStatus={runStatus}
					onToggleSpeed={handleToggleSpeed}
					onExitRequest={handleExitRequest}
				/>

				{/* Game Area */}
				<div
					className="relative w-full flex-1 min-h-0 overflow-hidden"
					style={{
						background:
							'linear-gradient(180deg, rgba(13,26,42,0.48) 0%, rgba(26,18,8,0.4) 100%)',
					}}
				>
					<PhaserGame key={runId} />

					{Object.keys(bossHpMap).length > 0 && (
						<div className="absolute top-0 left-0 right-0 z-[2] flex flex-col gap-1 px-3 pt-2">
							{Object.values(bossHpMap).map((entry) => (
								<BossHpBar key={entry.unitId} entry={entry} />
							))}
						</div>
					)}

					{runStatus !== 'victory' && runStatus !== 'defeat' && (
						<TutorialOverlay />
					)}

					<BossWarningOverlay visible={bossWarningVisible} />

					{upgradeChoices && <UpgradePickOverlay choices={upgradeChoices} />}

					{wavePhase === 'prep' && prepCountdown > 0 && (
						<div className="absolute top-20 left-1/2 -translate-x-1/2 z-[3] font-pixel text-3xl text-gold drop-shadow-[0_0_6px_rgba(0,0,0,0.8)] pointer-events-none">
							준비 {prepCountdown}
						</div>
					)}

					{/* Loading overlay moved to container level */}

					<ToastNotification toast={toast} />
					{/* Phase 8 Task 8.3 — 2s summon/gacha result celebration. */}
					<SummonRevealOverlay />
					{/* Phase 8 Task 8.1 — floating action sheet replaces the old inline
					    sell/move/merge buttons in PhaseAHud. Hidden while the merge
					    target picker is active (Task 8.5 [F10]). */}
					<TowerActionSheet
						selectedTower={mergeSourceId ? null : selectedTower}
						onDeselect={handleActionSheetClose}
					/>
					{mergeSourceId !== null && (
						<div
							data-testid="merge-mode-banner"
							className="absolute bottom-[120px] left-1/2 -translate-x-1/2 z-[4] flex items-center gap-3 px-4 py-2 border-2 rounded-sm"
							style={{
								background: 'var(--color-panel-95)',
								borderColor: 'var(--color-gold)',
							}}
						>
							<span className="font-pixel text-[11px] text-gold">
								합성할 타워를 탭하세요
							</span>
							<button
								type="button"
								data-testid="merge-mode-cancel"
								onClick={handleMergeCancel}
								className="font-pixel text-[10px] underline"
								style={{ color: 'var(--color-text-secondary)' }}
							>
								취소
							</button>
						</div>
					)}

					{/* Exit Confirm Modal */}
					{showExitModal && runStatus === 'running' && (
						<div
							className="absolute inset-0 z-[10] flex items-center justify-center"
							style={{
								background: 'var(--color-overlay-60)',
								animation: 'fadeIn 0.2s ease-out',
							}}
						>
							<div
								className="flex flex-col items-center gap-4 border border-border px-6 py-5"
								style={{ background: 'var(--color-panel)' }}
							>
								<p className="font-pixel text-[13px] text-text">
									정말 나가시겠습니까?
								</p>
								<p className="font-pixel text-[9px] text-text-secondary">
									진행 상황이 저장되지 않습니다
								</p>
								<div className="flex gap-3">
									<button
										type="button"
										className="border border-danger px-4 py-2 font-pixel text-[11px] text-danger"
										style={{ background: 'var(--color-danger-20)' }}
										onClick={handleExitConfirm}
									>
										나가기
									</button>
									<button
										type="button"
										className="border border-accent px-4 py-2 font-pixel text-[11px] text-accent"
										style={{ background: 'var(--color-accent-20)' }}
										onClick={handleExitCancel}
									>
										계속하기
									</button>
								</div>
							</div>
						</div>
					)}

					{(runStatus === 'victory' || runStatus === 'defeat') && (
						<GameOverScreen
							runStatus={runStatus}
							gameOverStats={gameOverStats}
							onRestart={resetRun}
							onLobby={enterLobby}
						/>
					)}
				</div>

				{runStatus !== 'victory' && runStatus !== 'defeat' && <PhaseAHud />}
			</div>
		</div>
	);
}
