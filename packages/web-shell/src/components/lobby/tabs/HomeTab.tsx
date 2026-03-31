import { useState, useCallback, useEffect } from 'react';
import { PixelButton } from '../../ui/PixelButton';
import { uiMobileArt } from '../../../assets/uiMobileArt';
import { useEmoteStore } from '../../../stores/emoteStore';
import { useGameStore } from '../../../stores/gameStore';
import { MOCK_PROFILE } from '../../../data/mockLobbyData';
import { colors, fonts } from '../../../styles/tokens';

export function HomeTab() {
  const resetRun = useGameStore((s) => s.resetRun);
  const resetEmotes = useEmoteStore((s) => s.reset);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);

  const handleStartBattle = useCallback(() => {
    if (isMatchmaking) return;
    setIsMatchmaking(true);
  }, [isMatchmaking]);

  const handleCancelMatch = useCallback(() => {
    setIsMatchmaking(false);
  }, []);

  useEffect(() => {
    if (!isMatchmaking) return;
    const timer = setTimeout(() => {
      resetEmotes();
      resetRun();
    }, 1500);
    return () => clearTimeout(timer);
  }, [isMatchmaking, resetEmotes, resetRun]);

  return (
    <div
      id="tabpanel-home"
      role="tabpanel"
      aria-label="마당"
      style={{ position: 'relative', flex: 1, overflow: 'hidden' }}
    >
      {/* Background scene */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {/* CSS gradient fallback */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, #0d1a2a 0%, #14233a 50%, #1a1208 100%)',
          }}
        />
        {/* PNG background */}
        <img
          src={uiMobileArt.courtyardBg}
          alt=""
          onLoad={() => setBgLoaded(true)}
          onError={() => setBgLoaded(false)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            imageRendering: 'pixelated',
            opacity: bgLoaded ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        />
        {/* Torch flicker animations */}
        <div className="torch torch-left" />
        <div className="torch torch-right" />
        {/* Flag flutter */}
        <div className="castle-flag" />
        {/* Stars twinkle */}
        <div className="stars-overlay" />
      </div>

      {/* Content overlay */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          height: '100%',
          padding: '16px',
          gap: '12px',
          background: 'linear-gradient(180deg, transparent 0%, transparent 40%, rgba(26,18,8,0.7) 70%, rgba(26,18,8,0.92) 100%)',
        }}
      >
        {/* Record strip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            padding: '8px 12px',
            background: 'rgba(42, 32, 16, 0.8)',
            border: `1px solid ${colors.border}`,
          }}
        >
          <StatBadge label="승" value={MOCK_PROFILE.wins} color={colors.success} />
          <StatBadge label="패" value={MOCK_PROFILE.losses} color={colors.danger} />
          <StatBadge label="승률" value={`${MOCK_PROFILE.winRate}%`} color={colors.accent} />
          <StatBadge label="연승" value={MOCK_PROFILE.winStreak} color={colors.gold} />
        </div>

        {/* Battle CTA card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '14px',
            background: 'rgba(42, 32, 16, 0.9)',
            border: `2px solid ${colors.gold}`,
            boxShadow: `0 0 20px rgba(240, 208, 96, 0.15), 4px 4px 0px ${colors.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: fonts.pixel, fontSize: '11px', color: colors.text }}>
              PVP 대전
            </span>
            <span style={{ fontFamily: fonts.pixel, fontSize: '7px', color: colors.textSecondary }}>
              1 vs 1
            </span>
          </div>

          <PixelButton
            variant="gold"
            disabled={isMatchmaking}
            onClick={handleStartBattle}
            style={{
              width: '100%',
              padding: '14px 20px',
              fontSize: '11px',
              boxShadow: `0 0 0 1px rgba(240,208,96,0.28), 0 12px 24px rgba(240,208,96,0.14)`,
            }}
          >
            {isMatchmaking ? '매칭 중...' : '전투 시작'}
          </PixelButton>

          {/* Sub buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <PixelButton
              variant="secondary"
              style={{ flex: 1, fontSize: '7px', padding: '8px 10px' }}
              disabled
            >
              AI 연습
            </PixelButton>
            <PixelButton
              variant="secondary"
              style={{ flex: 1, fontSize: '7px', padding: '8px 10px' }}
              disabled
            >
              전적
            </PixelButton>
          </div>
        </div>
      </div>

      {/* Overlay icons (mock) */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 2,
          display: 'flex',
          gap: '8px',
        }}
      >
        <OverlayIcon label="우편" badge={3} />
        <OverlayIcon label="공지" badge={1} />
      </div>

      {/* Matchmaking overlay */}
      {isMatchmaking && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            background: 'rgba(10, 8, 4, 0.88)',
          }}
        >
          <div className="matchmaking-swords" style={{ width: 64, height: 64 }} />
          <span style={{ fontFamily: fonts.pixel, fontSize: '10px', color: colors.gold }}>
            상대를 찾는 중...
          </span>
          <div className="matchmaking-dots" />
          <PixelButton variant="danger" onClick={handleCancelMatch} style={{ fontSize: '8px', padding: '10px 20px' }}>
            취소
          </PixelButton>
        </div>
      )}
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <span style={{ fontFamily: fonts.pixel, fontSize: '10px', color }}>{value}</span>
      <span style={{ fontFamily: fonts.pixel, fontSize: '6px', color: colors.textSecondary }}>{label}</span>
    </div>
  );
}

function OverlayIcon({ label, badge }: { label: string; badge?: number }) {
  return (
    <div
      style={{
        position: 'relative',
        width: 36,
        height: 36,
        background: 'rgba(42, 32, 16, 0.8)',
        border: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontFamily: fonts.pixel, fontSize: '6px', color: colors.textSecondary }}>{label}</span>
      {badge != null && badge > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 14,
            height: 14,
            background: colors.danger,
            color: '#fff',
            fontFamily: fonts.pixel,
            fontSize: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 2px',
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
