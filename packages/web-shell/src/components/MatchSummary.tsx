import { useEffect, useState } from 'react';
import type { MatchResult } from '@gld/shared';
import { soundGenerator } from '@gld/phaser-game/src/audio/SoundGenerator';
import { PixelButton } from './ui/PixelButton';
import { fetchRandomGhost, GHOST_FETCH_ERROR_MESSAGE } from '../game/fetchRandomGhost';
import { useGameStore } from '../stores/gameStore';
import { colors } from '../styles/tokens';

const SURVEY_URL =
  'https://docs.google.com/forms/d/e/PLACEHOLDER/viewform?embedded=true';

const outcomeConfig = {
  victory: { title: '\u{2694} VICTORY! \u{2694}', color: colors.gold },
  defeat: { title: 'DEFEAT', color: colors.danger },
  draw: { title: 'DRAW', color: colors.textSecondary },
} as const;

export function MatchSummary() {
  const matchResult = useGameStore((s) => s.matchResult);
  const startGhostBattle = useGameStore((s) => s.startGhostBattle);
  const enterLobby = useGameStore((s) => s.enterLobby);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchResult || !soundEnabled) return;
    if (matchResult.outcome === 'victory') {
      soundGenerator.playMatchVictory();
    } else if (matchResult.outcome === 'defeat') {
      soundGenerator.playMatchDefeat();
    }
  }, [matchResult, soundEnabled]);

  if (!matchResult) return null;

  const config = outcomeConfig[matchResult.outcome];

  const handlePlayAgain = async () => {
    setRetrying(true);
    setRetryError(null);

    try {
      const ghost = await fetchRandomGhost();
      startGhostBattle(ghost);
    } catch {
      setRetryError(GHOST_FETCH_ERROR_MESSAGE);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 3,
        background: 'rgba(6, 8, 16, 0.88)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxHeight: '100%',
          overflowY: 'auto',
          padding: '20px',
          borderRadius: '20px',
          background: 'rgba(12, 15, 26, 0.96)',
          border: `1px solid ${config.color}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          textAlign: 'center',
        }}
      >
        <h2 style={{ color: config.color, fontSize: '14px', margin: 0 }}>{config.title}</h2>

        <p style={{ color: colors.textSecondary, fontSize: '8px', margin: 0 }}>
          vs {matchResult.ghostName} (Ghost)
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            padding: '12px',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <StatColumn
            label="YOU"
            waves={matchResult.playerWavesCompleted}
            gold={matchResult.playerGoldRemaining}
            color={colors.info}
          />
          <StatColumn
            label="GHOST"
            waves={matchResult.ghostWavesCompleted}
            gold={matchResult.ghostGoldRemaining}
            color={colors.danger}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <PixelButton
            variant="gold"
            style={{ flex: 1, fontSize: '8px', padding: '12px 8px' }}
            disabled={retrying}
            onClick={handlePlayAgain}
          >
            {retrying ? 'LOADING...' : 'PLAY AGAIN'}
          </PixelButton>
          <PixelButton
            variant="secondary"
            style={{ flex: 1, fontSize: '8px', padding: '12px 8px' }}
            onClick={enterLobby}
          >
            LOBBY
          </PixelButton>
        </div>

        {retryError ? (
          <p role="alert" style={{ color: colors.danger, fontSize: '7px', margin: 0 }}>
            {retryError}
          </p>
        ) : null}

        <div
          style={{
            borderRadius: '12px',
            overflow: 'hidden',
            border: `1px solid rgba(148, 161, 178, 0.15)`,
          }}
        >
          <p style={{ color: colors.textSecondary, fontSize: '7px', margin: '8px 0 4px' }}>
            Quick Survey
          </p>
          <iframe
            src={SURVEY_URL}
            title="Quick Survey"
            style={{
              width: '100%',
              height: '200px',
              border: 'none',
              background: 'rgba(255,255,255,0.02)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StatColumn(props: {
  label: string;
  waves: number;
  gold: number;
  color: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ color: props.color, fontSize: '8px', fontWeight: 'bold' }}>{props.label}</span>
      <span style={{ color: colors.text, fontSize: '7px' }}>Waves: {props.waves}</span>
      <span style={{ color: colors.text, fontSize: '7px' }}>Gold: {props.gold}</span>
    </div>
  );
}
