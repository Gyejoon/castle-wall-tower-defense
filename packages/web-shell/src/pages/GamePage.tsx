import { PixelButton } from '../components/ui/PixelButton';
import { UnityCanvas } from '../components/UnityCanvas';
import { useGameStore } from '../stores/gameStore';
import { colors } from '../styles/tokens';

export function GamePage() {
  const setScreen = useGameStore((s) => s.setScreen);

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
        <span style={{ fontSize: '10px', color: colors.accent }}>GRID LINE DEFENSE</span>
        <PixelButton
          variant="danger"
          style={{ fontSize: '8px', padding: '6px 12px' }}
          onClick={() => setScreen('lobby')}
        >
          EXIT
        </PixelButton>
      </div>

      {/* Unity canvas */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <UnityCanvas />
      </div>
    </div>
  );
}
