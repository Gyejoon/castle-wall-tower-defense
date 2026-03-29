import { useCallback, useEffect, useState } from 'react';
import {
  BASE_TOWERS,
  TOTAL_WAVES,
  GHOST_BATTLE_WAVES,
  type PlacementFailureReason,
  type PressureChoice,
} from '@gld/shared';
import { EventBus } from '@gld/phaser-game';
import { uiMobileArt } from '../assets/uiMobileArt';
import { PixelButton } from '../components/ui/PixelButton';
import { PressurePanel } from '../components/PressurePanel';
import { MatchSummary } from '../components/MatchSummary';
import { PhaserGame } from '../game/PhaserGame';
import { useGameStore } from '../stores/gameStore';
import { colors } from '../styles/tokens';

const feedbackCopy: Record<PlacementFailureReason, string> = {
  combat_phase: 'Build phase only. Wait for the next prep window.',
  insufficient_gold: 'Insufficient gold for that tower.',
  occupied: 'That tile is blocked. Pick another slot.',
  blocked_path: 'That placement would cut off the enemy path.',
  out_of_bounds: 'Tap inside the battlefield grid.',
};

const PRESSURE_WARNING_COPY: Record<PressureChoice, string> = {
  attack: 'GHOST ATTACKING! +3 scout drones incoming!',
  defend: 'Ghost is fortifying defenses.',
  invest: 'Ghost is investing in bounties.',
};

function formatWaveLabel(wave: number, totalWaves: number) {
  return Math.min(totalWaves, Math.max(1, wave || 1));
}

export function GamePage() {
  const runId = useGameStore((s) => s.runId);
  const runStatus = useGameStore((s) => s.runStatus);
  const gameReady = useGameStore((s) => s.gameReady);
  const lives = useGameStore((s) => s.lives);
  const gold = useGameStore((s) => s.gold);
  const selectedTowerId = useGameStore((s) => s.selectedTowerId);
  const wave = useGameStore((s) => s.wave);
  const countdown = useGameStore((s) => s.countdown);
  const placementFeedback = useGameStore((s) => s.placementFeedback);
  const setRunStatus = useGameStore((s) => s.setRunStatus);
  const setLives = useGameStore((s) => s.setLives);
  const setGold = useGameStore((s) => s.setGold);
  const setSelectedTower = useGameStore((s) => s.setSelectedTower);
  const setWave = useGameStore((s) => s.setWave);
  const setWavePhase = useGameStore((s) => s.setWavePhase);
  const setCountdown = useGameStore((s) => s.setCountdown);
  const setPlacementFeedback = useGameStore((s) => s.setPlacementFeedback);
  const resetRun = useGameStore((s) => s.resetRun);
  const enterLobby = useGameStore((s) => s.enterLobby);

  // Ghost battle selectors
  const ghostBattleActive = useGameStore((s) => s.ghostBattleActive);
  const currentGhost = useGameStore((s) => s.currentGhost);
  const matchResult = useGameStore((s) => s.matchResult);
  const setMatchResult = useGameStore((s) => s.setMatchResult);
  const setGhostPressureWarning = useGameStore((s) => s.setGhostPressureWarning);
  const ghostPressureWarning = useGameStore((s) => s.ghostPressureWarning);

  const [warningFlash, setWarningFlash] = useState(false);

  const totalWaves = ghostBattleActive ? GHOST_BATTLE_WAVES : TOTAL_WAVES;

  const computeMatchResult = useCallback(
    (winnerId: string) => {
      if (!ghostBattleActive || !currentGhost) return;

      const playerWon = winnerId === 'local';
      const playerWaves = playerWon ? totalWaves : wave;
      const ghostResult = currentGhost.result;

      let outcome: 'victory' | 'defeat' | 'draw';
      if (playerWaves > ghostResult.wavesCompleted) {
        outcome = 'victory';
      } else if (playerWaves < ghostResult.wavesCompleted) {
        outcome = 'defeat';
      } else if (gold > ghostResult.goldRemaining) {
        outcome = 'victory';
      } else if (gold < ghostResult.goldRemaining) {
        outcome = 'defeat';
      } else {
        outcome = 'draw';
      }

      setMatchResult({
        playerWavesCompleted: playerWaves,
        playerGoldRemaining: gold,
        ghostWavesCompleted: ghostResult.wavesCompleted,
        ghostGoldRemaining: ghostResult.goldRemaining,
        outcome,
        ghostName: currentGhost.playerName,
      });
    },
    [ghostBattleActive, currentGhost, totalWaves, wave, gold, setMatchResult],
  );

  useEffect(() => {
    const onDamaged = (data: { remainingHp: number }) => setLives(data.remainingHp);
    const onGoldChanged = (data: { gold: number }) => setGold(data.gold);
    const onGameOver = (data: { winnerId: string }) => {
      setRunStatus(data.winnerId === 'local' ? 'victory' : 'defeat');
      computeMatchResult(data.winnerId);
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
    const onCountdownTick = (data: { secondsLeft: number }) => setCountdown(data.secondsLeft);
    const onTowerPlaced = (data: { success: boolean; reason?: PlacementFailureReason }) => {
      setPlacementFeedback(data.success ? null : data.reason ?? 'occupied');
    };
    const onGhostPressure = (data: { pressure: PressureChoice }) => {
      const msg = PRESSURE_WARNING_COPY[data.pressure];
      setGhostPressureWarning(msg);
      setWarningFlash(true);
      setTimeout(() => {
        setWarningFlash(false);
        setGhostPressureWarning(null);
      }, 2500);
    };

    EventBus.on('player-damaged', onDamaged);
    EventBus.on('gold-changed', onGoldChanged);
    EventBus.on('game-over', onGameOver);
    EventBus.on('wave-started', onWaveStarted);
    EventBus.on('building-phase-started', onBuildingPhase);
    EventBus.on('countdown-tick', onCountdownTick);
    EventBus.on('tower-placed', onTowerPlaced);
    EventBus.on('ghost-pressure-applied', onGhostPressure);

    return () => {
      EventBus.off('player-damaged', onDamaged);
      EventBus.off('gold-changed', onGoldChanged);
      EventBus.off('game-over', onGameOver);
      EventBus.off('wave-started', onWaveStarted);
      EventBus.off('building-phase-started', onBuildingPhase);
      EventBus.off('countdown-tick', onCountdownTick);
      EventBus.off('tower-placed', onTowerPlaced);
      EventBus.off('ghost-pressure-applied', onGhostPressure);
    };
  }, [
    computeMatchResult,
    setCountdown,
    setGold,
    setGhostPressureWarning,
    setLives,
    setPlacementFeedback,
    setRunStatus,
    setWave,
    setWavePhase,
  ]);

  // Notify Phaser game scene about ghost battle when game is ready
  useEffect(() => {
    if (!ghostBattleActive || !currentGhost || !gameReady) return;

    EventBus.emit('start-ghost-battle', { ghost: currentGhost });
  }, [ghostBattleActive, currentGhost, gameReady]);

  const selectTower = (towerId: string) => {
    if (selectedTowerId === towerId) {
      setSelectedTower(null);
      setPlacementFeedback(null);
      EventBus.emit('request-clear-tower-selection');
      return;
    }

    setSelectedTower(towerId);
    setPlacementFeedback(null);
    EventBus.emit('request-select-tower', { towerDefId: towerId });
  };

  const feedbackText = placementFeedback ? feedbackCopy[placementFeedback] : null;
  const resultTitle = runStatus === 'victory' ? 'SECTOR HELD' : 'DEFENSE LOST';

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
        background:
          'radial-gradient(circle at top, rgba(127,90,240,0.2), transparent 24%), linear-gradient(180deg, #080811 0%, #0c1020 48%, #070812 100%)',
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
          background: 'linear-gradient(180deg, rgba(9,11,18,0.98) 0%, rgba(14,18,32,0.98) 100%)',
          position: 'relative',
        }}
      >
        <div
          style={{
            padding: '14px 14px 12px',
            borderBottom: `1px solid rgba(148, 161, 178, 0.22)`,
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '12px',
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ color: colors.accent, fontSize: '8px' }}>GRID LINE DEFENSE</span>
              <span style={{ color: colors.textSecondary, fontSize: '8px' }}>
                WAVE {formatWaveLabel(wave, totalWaves)}/{totalWaves}
              </span>
              {ghostBattleActive && currentGhost && (
                <span style={{ color: colors.danger, fontSize: '7px' }}>
                  vs {currentGhost.playerName}
                </span>
              )}
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
                GOLD {gold}
              </div>
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '14px',
                  background: 'rgba(127,90,240,0.14)',
                  color: colors.text,
                  fontSize: '8px',
                }}
              >
                {runStatus === 'building' && `BUILD ${countdown}s`}
                {runStatus === 'combat' && 'COMBAT'}
                {runStatus === 'victory' && 'VICTORY'}
                {runStatus === 'defeat' && 'DEFEAT'}
              </div>
            </div>
          </div>

          <PixelButton
            variant="danger"
            style={{ fontSize: '8px', padding: '8px 12px', minWidth: 'auto' }}
            onClick={enterLobby}
          >
            EXIT
          </PixelButton>
        </div>

        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1 / 1',
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
                BOOTING GRID...
              </div>
            )}

            {/* Ghost pressure warning flash */}
            {warningFlash && ghostPressureWarning && (
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  right: '8px',
                  zIndex: 4,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'rgba(229, 49, 112, 0.25)',
                  border: `1px solid ${colors.danger}`,
                  color: colors.danger,
                  fontSize: '7px',
                  textAlign: 'center',
                  animation: 'fadeIn 0.2s ease-out',
                  pointerEvents: 'none',
                }}
              >
                {ghostPressureWarning}
              </div>
            )}

            {(runStatus === 'victory' || runStatus === 'defeat') && (
              ghostBattleActive && matchResult ? (
                <MatchSummary />
              ) : (
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
                        color: runStatus === 'victory' ? colors.success : colors.danger,
                        fontSize: '12px',
                      }}
                    >
                      {resultTitle}
                    </h2>
                    <p style={{ color: colors.textSecondary, fontSize: '8px', lineHeight: 1.8 }}>
                      {runStatus === 'victory'
                        ? 'You survived the full 10-wave pressure cycle.'
                        : 'The corridor broke before the run could stabilize.'}
                    </p>
                    <PixelButton variant="gold" style={{ width: '100%' }} onClick={resetRun}>
                      RESTART RUN
                    </PixelButton>
                    <PixelButton variant="secondary" style={{ width: '100%' }} onClick={enterLobby}>
                      BACK TO LOBBY
                    </PixelButton>
                  </div>
                </div>
              )
            )}
          </div>

          <div
            style={{
              borderRadius: '24px',
              padding: '14px',
              border: `1px solid rgba(148, 161, 178, 0.2)`,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              position: 'relative',
              overflow: 'hidden',
              background: '#0b101a',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `linear-gradient(180deg, rgba(8,11,20,0.42) 0%, rgba(8,11,20,0.22) 24%, rgba(7,9,18,0.82) 100%), url(${uiMobileArt.tacticalDockBackground})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.96,
              }}
            />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ghostBattleActive && runStatus === 'building' && <PressurePanel />}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ color: colors.text, fontSize: '8px' }}>TACTICAL DOCK</span>
                <span style={{ color: colors.textSecondary, fontSize: '8px' }}>
                  Select a tower, then tap the grid during build phase.
                </span>
              </div>
              <PixelButton
                variant="secondary"
                style={{ padding: '8px 12px', fontSize: '8px' }}
                onClick={() => {
                  setSelectedTower(null);
                  setPlacementFeedback(null);
                  EventBus.emit('request-clear-tower-selection');
                }}
              >
                CLEAR
              </PixelButton>
            </div>

            {feedbackText && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '14px',
                  background: 'rgba(229,49,112,0.12)',
                  color: colors.text,
                  fontSize: '8px',
                  lineHeight: 1.8,
                }}
              >
                {feedbackText}
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
              }}
            >
              {BASE_TOWERS.map((tower) => {
                const selected = selectedTowerId === tower.id;
                const disabled = gold < tower.cost;

                return (
                  <button
                    key={tower.id}
                    type="button"
                    onClick={() => selectTower(tower.id)}
                    disabled={disabled}
                    style={{
                      borderRadius: '18px',
                      border: `1px solid ${selected ? tower.color : 'rgba(148, 161, 178, 0.2)'}`,
                      background: selected ? `${tower.color}22` : 'rgba(255,255,255,0.02)',
                      color: colors.text,
                      padding: '12px',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center',
                      opacity: disabled ? 0.42 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                    aria-pressed={selected}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        border: `1px solid rgba(255,255,255,0.08)`,
                        backgroundImage: `url(/assets/towers/${tower.id}.png)`,
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '24px 24px',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                      <span style={{ fontSize: '8px', color: colors.text }}>{tower.name}</span>
                      <span style={{ fontSize: '8px', color: colors.textSecondary }}>{tower.cost} gold</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '18px',
                padding: '8px',
                background: 'rgba(4,6,12,0.34)',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `linear-gradient(90deg, rgba(8,11,20,0.92) 0%, rgba(8,11,20,0.5) 46%, rgba(8,11,20,0.84) 100%), url(${uiMobileArt.ctaPointArt})`,
                  backgroundSize: 'cover',
                  backgroundPosition: '78% center',
                  opacity: 0.68,
                }}
              />
              <PixelButton
                variant="gold"
                style={{ flex: 1, padding: '14px 16px', fontSize: '9px', position: 'relative', zIndex: 1 }}
                onClick={() => EventBus.emit('request-start-wave')}
                disabled={runStatus !== 'building'}
              >
                {runStatus === 'building' ? 'START WAVE' : 'WAVE LOCKED'}
              </PixelButton>
              <PixelButton
                variant="secondary"
                style={{ flex: 1, padding: '14px 16px', fontSize: '9px', position: 'relative', zIndex: 1 }}
                onClick={resetRun}
              >
                RESET
              </PixelButton>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
