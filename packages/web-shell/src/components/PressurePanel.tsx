import { EventBus } from '@gld/phaser-game';
import { soundGenerator } from '@gld/phaser-game/src/audio/SoundGenerator';
import type { PressureChoice } from '@gld/shared';
import { useGameStore } from '../stores/gameStore';
import { colors } from '../styles/tokens';

interface PressureOption {
  id: PressureChoice;
  icon: string;
  label: string;
  cost: string;
  effect: string;
  color: string;
  disabledCheck: (gold: number) => boolean;
}

const PRESSURE_OPTIONS: PressureOption[] = [
  {
    id: 'defend',
    icon: '\u{1F6E1}',
    label: 'DEFEND',
    cost: 'FREE',
    effect: '+20 gold',
    color: colors.info,
    disabledCheck: () => false,
  },
  {
    id: 'attack',
    icon: '\u{2694}',
    label: 'ATTACK',
    cost: '-50g',
    effect: 'Send 3 drones',
    color: colors.danger,
    disabledCheck: (gold) => gold < 50,
  },
  {
    id: 'invest',
    icon: '\u{1F4B0}',
    label: 'INVEST',
    cost: '-30g',
    effect: '1.5x bounty',
    color: colors.gold,
    disabledCheck: (gold) => gold < 30,
  },
];

export function PressurePanel() {
  const gold = useGameStore((s) => s.gold);
  const pressureChoice = useGameStore((s) => s.pressureChoice);
  const setPressureChoice = useGameStore((s) => s.setPressureChoice);

  const handleSelect = (choice: PressureChoice) => {
    setPressureChoice(choice);
    EventBus.emit('request-pressure-choice', { choice });
    if (useGameStore.getState().soundEnabled) {
      soundGenerator.playPressureSelect();
    }
  };

  return (
    <div
      style={{
        borderRadius: '18px',
        padding: '14px',
        border: `1px solid rgba(127, 90, 240, 0.3)`,
        background: 'rgba(12, 15, 26, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <span
        style={{
          color: colors.accent,
          fontSize: '8px',
          textAlign: 'center',
          letterSpacing: '0.1em',
        }}
      >
        CHOOSE YOUR STRATEGY
      </span>

      <div style={{ display: 'flex', gap: '8px' }}>
        {PRESSURE_OPTIONS.map((option) => {
          const selected = pressureChoice === option.id;
          const disabled = option.disabledCheck(gold);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              disabled={disabled}
              style={{
                flex: 1,
                padding: '10px 6px',
                borderRadius: '14px',
                border: `2px solid ${selected ? option.color : 'rgba(148, 161, 178, 0.2)'}`,
                background: selected ? `${option.color}18` : 'rgba(255,255,255,0.02)',
                color: colors.text,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                fontFamily: "'Press Start 2P', cursive",
                transition: 'border-color 0.15s, background 0.15s',
              }}
              aria-pressed={selected}
            >
              <span style={{ fontSize: '16px' }}>{option.icon}</span>
              <span style={{ fontSize: '7px', color: option.color }}>{option.label}</span>
              <span style={{ fontSize: '7px', color: colors.textSecondary }}>{option.cost}</span>
              <span style={{ fontSize: '6px', color: colors.textSecondary, lineHeight: 1.6 }}>
                {option.effect}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => EventBus.emit('request-start-wave')}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '14px',
          border: `2px solid ${colors.gold}`,
          background: `${colors.gold}22`,
          color: colors.gold,
          fontFamily: "'Press Start 2P', cursive",
          fontSize: '9px',
          cursor: 'pointer',
          letterSpacing: '0.05em',
          transition: 'background 0.15s',
        }}
      >
        START WAVE
      </button>
    </div>
  );
}
