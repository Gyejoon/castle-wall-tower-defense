import { EMOTES } from '@gld/shared';
import { colors, fonts } from '../styles/tokens';
import { useEmoteStore } from '../stores/emoteStore';
import { PixelPanel } from './ui/PixelPanel';

export function EmotePanel() {
  const { showEmotePanel, sendEmote, toggleEmotePanel } = useEmoteStore();

  if (!showEmotePanel) {
    return (
      <button
        onClick={toggleEmotePanel}
        aria-label="Open emotes"
        style={{
          background: colors.panel,
          border: `2px solid ${colors.accent}`,
          borderRadius: '50%',
          width: 44,
          height: 44,
          fontSize: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `2px 2px 0px ${colors.accent}`,
        }}
      >
        😊
      </button>
    );
  }

  return (
    <PixelPanel
      style={{
        position: 'absolute',
        bottom: 56,
        right: 0,
        zIndex: 100,
        padding: '8px',
        minWidth: 200,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '6px',
        }}
      >
        {EMOTES.map((emote) => (
          <button
            key={emote.id}
            onClick={() => sendEmote(emote.id)}
            data-testid={`emote-${emote.id}`}
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              color: colors.text,
              fontFamily: fonts.pixel,
              fontSize: '8px',
              padding: '8px 4px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '20px' }}>{emote.emoji}</span>
            <span>{emote.text}</span>
          </button>
        ))}
      </div>
    </PixelPanel>
  );
}
