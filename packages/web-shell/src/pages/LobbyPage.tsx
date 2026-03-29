import { useState } from 'react';
import { PixelButton } from '../components/ui/PixelButton';
import { PixelPanel } from '../components/ui/PixelPanel';
import { uiMobileArt } from '../assets/uiMobileArt';
import { fetchRandomGhost, GHOST_FETCH_ERROR_MESSAGE } from '../game/fetchRandomGhost';
import { useGameStore } from '../stores/gameStore';
import { colors } from '../styles/tokens';

const featureCopy = [
  '10웨이브 단일 경로 생존 모드',
  '4종 전술 타워, 페이즈 기반 건설',
  '모바일 최적화 수직 전장',
];

export function LobbyPage() {
  const resetRun = useGameStore((s) => s.resetRun);
  const startGhostBattle = useGameStore((s) => s.startGhostBattle);
  const [loadingGhost, setLoadingGhost] = useState(false);
  const [ghostLoadError, setGhostLoadError] = useState<string | null>(null);

  const handleGhostBattle = async () => {
    setLoadingGhost(true);
    setGhostLoadError(null);

    try {
      const ghost = await fetchRandomGhost();
      startGhostBattle(ghost);
    } catch {
      setGhostLoadError(GHOST_FETCH_ERROR_MESSAGE);
    } finally {
      setLoadingGhost(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at top, rgba(127,90,240,0.28), transparent 30%), radial-gradient(circle at bottom left, rgba(0,204,255,0.18), transparent 34%), linear-gradient(180deg, #080811 0%, #10131f 45%, #090a14 100%)',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: 'min(100%, 430px)',
          minHeight: 'min(100%, 860px)',
          border: `1px solid ${colors.border}`,
          boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 24px 80px rgba(0,0,0,0.45)`,
          borderRadius: '28px',
          overflow: 'hidden',
          background:
            'linear-gradient(180deg, rgba(9,11,20,0.96) 0%, rgba(16,19,31,0.94) 100%)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
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
            <span style={{ color: colors.info, fontSize: '8px' }}>모바일 버티컬 슬라이스</span>
            <span style={{ color: colors.textSecondary, fontSize: '8px' }}>페이즈 1</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h1
              style={{
                fontSize: '22px',
                lineHeight: 1.35,
                color: colors.text,
                textShadow: `0 0 14px rgba(127, 90, 240, 0.45)`,
              }}
            >
              그리드 라인
              <br />
              디펜스
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '9px', lineHeight: 1.9 }}>
              회랑을 사수하고, 웨이브 사이에만 건설하며, 10웨이브를 끝까지 생존하세요.
            </p>
          </div>

          <div
            style={{
              minHeight: '260px',
              borderRadius: '22px',
              padding: '18px',
              border: `1px solid rgba(127, 90, 240, 0.35)`,
              display: 'flex',
              alignItems: 'flex-end',
              position: 'relative',
              overflow: 'hidden',
              background: '#0a0d17',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `linear-gradient(180deg, rgba(8,11,20,0.18) 0%, rgba(6,9,18,0.26) 34%, rgba(6,8,14,0.9) 100%), url(${uiMobileArt.lobbyKeyart})`,
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
                전략 재구성.
                <br />
                반복.
              </p>
            </div>
          </div>

          <PixelPanel
            style={{
              background: 'rgba(15, 17, 29, 0.92)',
              borderColor: 'rgba(148, 161, 178, 0.35)',
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
              border: `1px solid rgba(127, 90, 240, 0.18)`,
              background: 'linear-gradient(180deg, rgba(10,12,22,0.9) 0%, rgba(7,9,18,0.95) 100%)',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `linear-gradient(90deg, rgba(8,11,20,0.9) 0%, rgba(8,11,20,0.66) 46%, rgba(8,11,20,0.78) 100%), url(${uiMobileArt.ctaPointArt})`,
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
                  boxShadow: `0 0 0 1px rgba(226,183,20,0.28), 0 18px 30px rgba(226,183,20,0.14)`,
                }}
                onClick={resetRun}
              >
                게임 시작
              </PixelButton>
              <PixelButton
                variant="danger"
                style={{
                  width: '100%',
                  padding: '16px 18px',
                  fontSize: '10px',
                  boxShadow: `0 0 0 1px rgba(229,49,112,0.28), 0 18px 30px rgba(229,49,112,0.14)`,
                }}
                onClick={handleGhostBattle}
                disabled={loadingGhost}
              >
                {loadingGhost ? '로딩 중...' : '고스트 배틀'}
              </PixelButton>
              <p style={{ color: colors.textSecondary, fontSize: '8px', lineHeight: 1.8 }}>
                고스트 배틀: 기록된 상대와 5웨이브 비동기 PvP 대전.
              </p>
              {ghostLoadError ? (
                <p
                  role="alert"
                  style={{ color: colors.danger, fontSize: '7px', lineHeight: 1.8, margin: 0 }}
                >
                  {ghostLoadError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
