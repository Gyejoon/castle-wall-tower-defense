import { useCallback, useEffect, useState } from 'react';
import { colors, fonts } from '../styles/tokens';
import { PixelButton } from './ui/PixelButton';

const GACHA_BOXES = [
  { id: 'free', label: '무료 상자', cost: 0, image: 'assets/ui/gacha-box-free.png' },
  { id: 'ad', label: '광고 상자', cost: 0, image: 'assets/ui/gacha-box-ad.png' },
  { id: 'diamond', label: '다이아 상자', cost: 100, image: 'assets/ui/gacha-box-diamond.png' },
  { id: 'premium', label: '프리미엄 상자', cost: 300, image: 'assets/ui/gacha-box-premium.png' },
] as const;

interface GachaScreenProps {
  onClose: () => void;
}

export function GachaScreen({ onClose }: GachaScreenProps) {
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);

  const handleOpen = useCallback(() => {
    if (!selectedBox) return;
    setRevealing(true);
    // Reveal animation placeholder — 2s delay then reset
    setTimeout(() => {
      setRevealing(false);
      setSelectedBox(null);
    }, 2000);
  }, [selectedBox]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount — gacha assets unloaded by parent
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        background: 'rgba(10, 8, 4, 0.92)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '20px',
      }}
    >
      <h2
        style={{
          color: colors.gold,
          fontFamily: fonts.pixel,
          fontSize: '14px',
        }}
      >
        소환의 제단
      </h2>

      {revealing ? (
        <div
          style={{
            width: '120px',
            height: '120px',
            background: `radial-gradient(circle, ${colors.gold}33 0%, transparent 70%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: fonts.pixel,
            fontSize: '10px',
            color: colors.gold,
          }}
        >
          개봉 중...
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
          }}
        >
          {GACHA_BOXES.map((box) => (
            <div
              key={box.id}
              onClick={() => setSelectedBox(box.id)}
              style={{
                padding: '8px',
                border: `2px solid ${selectedBox === box.id ? colors.gold : colors.border}`,
                background: selectedBox === box.id ? 'rgba(240,208,96,0.1)' : 'rgba(42,32,16,0.9)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <img
                src={box.image}
                alt={box.label}
                style={{ width: '48px', height: '48px', imageRendering: 'pixelated' }}
              />
              <p
                style={{
                  fontFamily: fonts.pixel,
                  fontSize: '8px',
                  color: colors.text,
                  marginTop: '4px',
                }}
              >
                {box.label}
              </p>
              {box.cost > 0 && (
                <p
                  style={{
                    fontFamily: fonts.pixel,
                    fontSize: '7px',
                    color: colors.gold,
                  }}
                >
                  💎 {box.cost}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <PixelButton
          variant="gold"
          onClick={handleOpen}
          style={{ opacity: selectedBox && !revealing ? 1 : 0.4 }}
        >
          열기
        </PixelButton>
        <PixelButton variant="secondary" onClick={onClose}>
          닫기
        </PixelButton>
      </div>
    </div>
  );
}
