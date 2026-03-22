import { PixelButton } from '../components/ui/PixelButton';
import { PixelPanel } from '../components/ui/PixelPanel';
import { useGameStore } from '../stores/gameStore';
import { colors } from '../styles/tokens';

export function LobbyPage() {
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '32px',
      }}
    >
      <h1
        style={{
          fontSize: '20px',
          color: colors.accent,
          textShadow: `2px 2px 0px ${colors.border}`,
        }}
      >
        GRID LINE DEFENSE
      </h1>

      <PixelPanel style={{ textAlign: 'center', maxWidth: '400px' }}>
        <p style={{ color: colors.textSecondary, marginBottom: '24px', lineHeight: '1.8' }}>
          SF PvP Tower Defense
        </p>
        <PixelButton onClick={() => setScreen('game')}>
          START GAME
        </PixelButton>
      </PixelPanel>

      <p style={{ color: colors.textSecondary, fontSize: '8px' }}>
        Phase 1 Prototype
      </p>
    </div>
  );
}
