import { Suspense, lazy } from 'react';
import { LobbyPage } from './pages/LobbyPage';
import { useGameStore } from './stores/gameStore';
import { colors } from './styles/tokens';

const GamePage = lazy(async () => import('./pages/GamePage').then((module) => ({ default: module.GamePage })));

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.textSecondary,
        letterSpacing: '0.12em',
      }}
    >
      그리드 로딩 중...
    </div>
  );
}

export function App() {
  const runStatus = useGameStore((s) => s.runStatus);

  if (runStatus === 'lobby') {
    return <LobbyPage />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <GamePage />
    </Suspense>
  );
}
