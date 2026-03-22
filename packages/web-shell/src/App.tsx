import { useGameStore } from './stores/gameStore';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';

export function App() {
  const screen = useGameStore((s) => s.screen);

  return screen === 'lobby' ? <LobbyPage /> : <GamePage />;
}
