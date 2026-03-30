import { PixelButton } from '../components/ui/PixelButton';
import { PixelPanel } from '../components/ui/PixelPanel';
import { uiMobileArt } from '../assets/uiMobileArt';
import { useEmoteStore } from '../stores/emoteStore';
import { useGameStore } from '../stores/gameStore';
import { colors } from '../styles/tokens';

const featureCopy = [
  '랜덤 타워 구매 + 합성으로 강화',
  '같은 타워 2개를 합쳐 더 강한 타워로',
  '처치한 적이 상대에게 전송! 1:1 대결',
];

export function LobbyPage() {
  const resetRun = useGameStore((s) => s.resetRun);
  const resetEmotes = useEmoteStore((s) => s.reset);

  const handleStartGame = () => {
    resetEmotes();
    resetRun();
  };

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at top left, rgba(200,160,74,0.28), transparent 40%), radial-gradient(circle at bottom right, rgba(122,182,72,0.18), transparent 40%), linear-gradient(135deg, #1a1208 0%, #2a2010 45%, #0f0a04 100%)',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: 'min(100%, 960px)',
          minHeight: 'min(100%, 540px)',
          border: `1px solid ${colors.border}`,
          boxShadow: `0 0 0 1px rgba(200,160,74,0.06), 0 24px 80px rgba(0,0,0,0.45)`,
          borderRadius: '28px',
          overflow: 'hidden',
          background:
            'linear-gradient(135deg, rgba(26,18,8,0.96) 0%, rgba(42,32,16,0.94) 100%)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(200,160,74,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(200,160,74,0.03) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            opacity: 0.25,
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '40px 48px',
            display: 'flex',
            flexDirection: 'row',
            gap: '48px',
            minHeight: '100%',
            alignItems: 'center',
          }}
        >
          {/* Left: Title + Features */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <span style={{ color: colors.info, fontSize: '8px', letterSpacing: '2px' }}>
              PALACE RANDOM TD
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h1
                style={{
                  fontSize: '26px',
                  lineHeight: 1.3,
                  color: colors.text,
                  textShadow: `0 0 14px rgba(200, 160, 74, 0.45)`,
                  margin: 0,
                }}
              >
                팔라스
                <br />
                개인랜덤타워디펜스
              </h1>
              <p
                style={{
                  color: colors.gold,
                  fontSize: '10px',
                  lineHeight: 1.6,
                  margin: 0,
                  letterSpacing: '1px',
                }}
              >
                Palace 개랜타디
              </p>
            </div>

            <PixelPanel
              style={{
                background: 'rgba(42, 32, 16, 0.92)',
                borderColor: 'rgba(200, 160, 74, 0.25)',
                boxShadow: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {featureCopy.map((item) => (
                <div
                  key={item}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: colors.textSecondary,
                    fontSize: '8px',
                    lineHeight: 1.7,
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      background: colors.accent,
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                  <span>{item}</span>
                </div>
              ))}
            </PixelPanel>
          </div>

          {/* Right: Key Art + CTA */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div
              style={{
                minHeight: '240px',
                borderRadius: '22px',
                padding: '18px',
                border: `1px solid rgba(200, 160, 74, 0.35)`,
                display: 'flex',
                alignItems: 'flex-end',
                position: 'relative',
                overflow: 'hidden',
                background: '#1a1208',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `linear-gradient(180deg, rgba(26,18,8,0.18) 0%, rgba(26,18,8,0.26) 34%, rgba(26,18,8,0.9) 100%), url(${uiMobileArt.lobbyKeyart})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <span style={{ color: colors.gold, fontSize: '8px' }}>전술 루프</span>
                <p style={{ color: colors.text, fontSize: '9px', lineHeight: 1.8, margin: 0 }}>
                  구매. 합성. 배치. 전송. 승리.
                </p>
              </div>
            </div>

            <PixelButton
              variant="gold"
              style={{
                width: '100%',
                padding: '18px 24px',
                fontSize: '12px',
                boxShadow: `0 0 0 1px rgba(240,208,96,0.28), 0 18px 30px rgba(240,208,96,0.14)`,
              }}
              onClick={handleStartGame}
            >
              게임 시작
            </PixelButton>
          </div>
        </div>
      </div>
    </div>
  );
}
