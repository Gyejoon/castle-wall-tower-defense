import { useEffect } from 'react';
import { PixelButton } from '../components/ui/PixelButton';
import { PhaserGame } from '../game/PhaserGame';
import { useGameStore } from '../stores/gameStore';
import { colors } from '../styles/tokens';
import { EventBus } from '@gld/phaser-game';
import { BASE_TOWERS, TOTAL_WAVES } from '@gld/shared';

export function GamePage() {
  const setScreen = useGameStore((s) => s.setScreen);
  const lives = useGameStore((s) => s.lives);
  const gold = useGameStore((s) => s.gold);
  const setLives = useGameStore((s) => s.setLives);
  const setGold = useGameStore((s) => s.setGold);
  const selectedTowerId = useGameStore((s) => s.selectedTowerId);
  const setSelectedTower = useGameStore((s) => s.setSelectedTower);
  const wave = useGameStore((s) => s.wave);
  const wavePhase = useGameStore((s) => s.wavePhase);
  const countdown = useGameStore((s) => s.countdown);
  const setWave = useGameStore((s) => s.setWave);
  const setWavePhase = useGameStore((s) => s.setWavePhase);
  const setCountdown = useGameStore((s) => s.setCountdown);

  useEffect(() => {
    const onDamaged = (data: { remainingHp: number }) => setLives(data.remainingHp);
    const onGoldChanged = (data: { gold: number }) => setGold(data.gold);
    const onGameOver = (data: { winnerId: string }) => {
      if (data.winnerId === 'local') {
        setWavePhase('ended');
      } else {
        setScreen('lobby');
      }
    };
    const onWaveStarted = (data: { wave: number }) => {
      setWave(data.wave);
      setWavePhase('combat');
    };
    const onBuildingPhase = (data: { nextWave: number; countdown: number }) => {
      setWave(data.nextWave);
      setWavePhase('building');
      setCountdown(data.countdown);
    };
    const onCountdownTick = (data: { secondsLeft: number }) => setCountdown(data.secondsLeft);

    EventBus.on('player-damaged', onDamaged);
    EventBus.on('gold-changed', onGoldChanged);
    EventBus.on('game-over', onGameOver);
    EventBus.on('wave-started', onWaveStarted);
    EventBus.on('building-phase-started', onBuildingPhase);
    EventBus.on('countdown-tick', onCountdownTick);

    return () => {
      EventBus.off('player-damaged', onDamaged);
      EventBus.off('gold-changed', onGoldChanged);
      EventBus.off('game-over', onGameOver);
      EventBus.off('wave-started', onWaveStarted);
      EventBus.off('building-phase-started', onBuildingPhase);
      EventBus.off('countdown-tick', onCountdownTick);
    };
  }, [setLives, setGold, setScreen, setWave, setWavePhase, setCountdown]);

  const selectTower = (towerId: string) => {
    setSelectedTower(towerId);
    EventBus.emit('request-place-tower', { col: -1, row: -1, towerDefId: towerId });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          borderBottom: `2px solid ${colors.border}`,
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: colors.accent }}>GRID LINE DEFENSE</span>
          <span style={{ fontSize: '9px', color: colors.danger }}>HP: {lives}</span>
          <span style={{ fontSize: '9px', color: colors.gold }}>GOLD: {gold}</span>
        </div>
        <PixelButton
          variant="danger"
          style={{ fontSize: '8px', padding: '6px 12px' }}
          onClick={() => setScreen('lobby')}
        >
          EXIT
        </PixelButton>
      </div>

      {/* Main area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Game canvas */}
        <div style={{ flex: 1 }}>
          <PhaserGame />
        </div>

        {/* Side panel */}
        <div
          style={{
            width: '160px',
            borderLeft: `2px solid ${colors.border}`,
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
          }}
        >
          {/* Tower selection */}
          <p style={{ fontSize: '8px', color: colors.textSecondary, margin: 0 }}>TOWERS (1-4)</p>
          {BASE_TOWERS.map((tower, i) => (
            <PixelButton
              key={tower.id}
              style={{
                fontSize: '7px',
                padding: '6px 8px',
                textAlign: 'left',
                borderColor: tower.color,
                background: selectedTowerId === tower.id ? tower.color + '33' : undefined,
                opacity: gold < tower.cost ? 0.4 : 1,
              }}
              onClick={() => selectTower(tower.id)}
              disabled={gold < tower.cost}
            >
              {i + 1}. {tower.name} ({tower.cost}g)
            </PixelButton>
          ))}

          {/* Wave control */}
          <p style={{ fontSize: '8px', color: colors.textSecondary, margin: '8px 0 0 0' }}>
            WAVE {wave}/{TOTAL_WAVES}
          </p>
          {wavePhase === 'building' && (
            <>
              <p style={{ fontSize: '9px', color: colors.gold, margin: '4px 0' }}>
                Next wave in: {countdown}s
              </p>
              <PixelButton
                style={{ fontSize: '7px', padding: '8px' }}
                onClick={() => EventBus.emit('request-start-wave')}
              >
                START WAVE
              </PixelButton>
            </>
          )}
          {wavePhase === 'combat' && (
            <p style={{ fontSize: '8px', color: colors.danger, margin: '4px 0' }}>
              COMBAT IN PROGRESS
            </p>
          )}
          {wavePhase === 'ended' && (
            <>
              <p style={{ fontSize: '8px', color: colors.accent, margin: '4px 0' }}>
                VICTORY!
              </p>
              <PixelButton
                style={{ fontSize: '7px', padding: '8px' }}
                onClick={() => setScreen('lobby')}
              >
                BACK TO LOBBY
              </PixelButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
