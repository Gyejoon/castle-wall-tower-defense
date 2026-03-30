import { PixelButton } from '../components/ui/PixelButton';
import { PixelPanel } from '../components/ui/PixelPanel';
import { uiMobileArt } from '../assets/uiMobileArt';
import { useGameStore } from '../stores/gameStore';
import { colors } from '../styles/tokens';

const featureCopy = [
  '10웨이브 생존 — 궁수 탑, 투석기, 서리 마탑, 성기사 제단',
  '웨이브마다 건설 시간 — 전략적 배치가 핵심',
  '모바일 최적화 수직 전장',
];

export function LobbyPage() {
  const resetRun = useGameStore((s) => s.resetRun);

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at top, rgba(200,160,74,0.28), transparent 30%), radial-gradient(circle at bottom left, rgba(122,182,72,0.18), transparent 34%), linear-gradient(180deg, #1a1208 0%, #2a2010 45%, #0f0a04 100%)',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: 'min(100%, 430px)',
          minHeight: 'min(100%, 860px)',
          border: `1px solid ${colors.border}`,
          boxShadow: `0 0 0 1px rgba(200,160,74,0.06), 0 24px 80px rgba(0,0,0,0.45)`,
          borderRadius: '28px',
          overflow: 'hidden',
          background:
            'linear-gradient(180deg, rgba(26,18,8,0.96) 0%, rgba(42,32,16,0.94) 100%)',
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
            padding: '32px 22px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            minHeight: '100%',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: colors.info, fontSize: '8px' }}>PALACE RANDOM TD</span>
            <span style={{ color: colors.textSecondary, fontSize: '8px' }}>PHASE 1</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h1
              style={{
                fontSize: '22px',
                lineHeight: 1.35,
                color: colors.text,
                textShadow: `0 0 14px rgba(200, 160, 74, 0.45)`,
              }}
            >
              팔라스
              <br />
              개인랜덤타워디펜스
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '9px', lineHeight: 1.9 }}>
              왕국을 향해 밀려오는 마물의 군대를 막아라. 10웨이브를 버텨내면 승리!
            </p>
          </div>

          <div
            style={{
              minHeight: '260px',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ color: colors.gold, fontSize: '8px' }}>전술 루프</span>
              <p style={{ color: colors.text, fontSize: '9px', lineHeight: 1.8 }}>
                건설.
                <br />
                방어.
                <br />
                재배치.
                <br />
                반복.
              </p>
            </div>
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
                <span style={{ width: '6px', height: '6px', background: colors.accent, display: 'inline-block' }} />
                <span>{item}</span>
              </div>
            ))}
          </PixelPanel>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              marginTop: 'auto',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '22px',
              padding: '16px',
              border: `1px solid rgba(200, 160, 74, 0.18)`,
              background: 'linear-gradient(180deg, rgba(26,18,8,0.9) 0%, rgba(15,10,4,0.95) 100%)',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `linear-gradient(90deg, rgba(26,18,8,0.9) 0%, rgba(26,18,8,0.66) 46%, rgba(26,18,8,0.78) 100%), url(${uiMobileArt.ctaPointArt})`,
                backgroundSize: 'cover',
                backgroundPosition: '72% center',
                opacity: 0.74,
              }}
            />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <PixelButton
                variant="gold"
                style={{
                  width: '100%',
                  padding: '16px 18px',
                  fontSize: '10px',
                  boxShadow: `0 0 0 1px rgba(240,208,96,0.28), 0 18px 30px rgba(240,208,96,0.14)`,
                }}
                onClick={resetRun}
              >
                게임 시작
              </PixelButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
