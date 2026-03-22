import { PixelButton } from '../components/ui/PixelButton';
import { useGameStore } from '../stores/gameStore';
import { colors } from '../styles/tokens';

export function GamePage() {
  const setScreen = useGameStore((s) => s.setScreen);
  const unityLoaded = useGameStore((s) => s.unityLoaded);

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

      {/* Unity canvas area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.bg,
        }}
      >
        {!unityLoaded && (
          <p style={{ color: colors.textSecondary, fontSize: '10px' }}>
            Unity WebGL 로딩 대기중...
          </p>
        )}
        {/* UnityCanvas will be mounted here in Task 9 */}
        <div id="unity-container" style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
