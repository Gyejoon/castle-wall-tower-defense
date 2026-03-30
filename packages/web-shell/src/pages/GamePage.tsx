import { useEffect } from 'react';
import { PixelButton } from '../components/ui/PixelButton';
import { PhaserGame } from '../game/PhaserGame';
import { useGameStore } from '../stores/gameStore';
import { colors } from '../styles/tokens';
import { EventBus } from '@gld/phaser-game';
import { BASE_TOWERS, UNITS, UNIT_SEND_COUNT } from '@gld/shared';

export function GamePage() {
  const setScreen = useGameStore((s) => s.setScreen);
  const lives = useGameStore((s) => s.lives);
  const gold = useGameStore((s) => s.gold);
  const setLives = useGameStore((s) => s.setLives);
  const setGold = useGameStore((s) => s.setGold);
  const selectedTowerId = useGameStore((s) => s.selectedTowerId);
  const setSelectedTower = useGameStore((s) => s.setSelectedTower);

  useEffect(() => {
    const onDamaged = (data: { remainingHp: number }) => setLives(data.remainingHp);
    const onGoldChanged = (data: { gold: number }) => setGold(data.gold);
    const onGameOver = () => setScreen('lobby');

    EventBus.on('player-damaged', onDamaged);
    EventBus.on('gold-changed', onGoldChanged);
    EventBus.on('game-over', onGameOver);

    return () => {
      EventBus.off('player-damaged', onDamaged);
      EventBus.off('gold-changed', onGoldChanged);
      EventBus.off('game-over', onGameOver);
    };
  }, [setLives, setGold, setScreen]);

  const selectTower = (towerId: string) => {
    setSelectedTower(towerId);
    EventBus.emit('request-select-tower', { towerDefId: towerId });
  };

  const sendUnit = (unitDefId: string) => {
    EventBus.emit('request-send-unit', { unitDefId, count: UNIT_SEND_COUNT });
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

          {/* Unit sending */}
          <p style={{ fontSize: '8px', color: colors.textSecondary, margin: '8px 0 0 0' }}>
            SEND UNITS
          </p>
          {UNITS.map((unit) => (
            <PixelButton
              key={unit.id}
              variant="secondary"
              style={{ fontSize: '7px', padding: '6px 8px', textAlign: 'left' }}
              onClick={() => sendUnit(unit.id)}
            >
              {unit.name} ({unit.sendCost}g)
            </PixelButton>
          ))}
        </div>
      </div>
    </div>
  );
}
