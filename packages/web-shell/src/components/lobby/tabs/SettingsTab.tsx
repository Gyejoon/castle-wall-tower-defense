import { useState } from 'react';
import { TabBackground } from '../TabBackground';
import { uiMobileArt } from '../../../assets/uiMobileArt';
import { useGameStore } from '../../../stores/gameStore';
import { colors, fonts } from '../../../styles/tokens';

export function SettingsTab() {
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const [screenShake, setScreenShake] = useState(true);
  const [showDamageNumbers, setShowDamageNumbers] = useState(true);

  return (
    <div
      id="tabpanel-settings"
      role="tabpanel"
      aria-label="영주실"
      style={{ position: 'relative', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      {/* Background */}
      <TabBackground
        src={uiMobileArt.lordchamberBg}
        gradient="linear-gradient(180deg, #1a1208 0%, #2a1a10 100%)"
        overlayOpacity={0.25}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          overflow: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <span style={{ fontFamily: fonts.pixel, fontSize: '10px', color: colors.text }}>설정</span>

        <SettingsSection title="사운드">
          <ToggleRow label="효과음" checked={soundEnabled} onChange={toggleSound} />
        </SettingsSection>

        <SettingsSection title="화면">
          <ToggleRow label="화면 흔들림" checked={screenShake} onChange={() => setScreenShake(!screenShake)} />
          <ToggleRow label="데미지 숫자" checked={showDamageNumbers} onChange={() => setShowDamageNumbers(!showDamageNumbers)} />
        </SettingsSection>

        <SettingsSection title="정보">
          <InfoRow label="버전" value="0.1.0-alpha" />
          <InfoRow label="빌드" value="2026.03.31" />
        </SettingsSection>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1px',
        background: `rgba(42, 32, 16, 0.7)`,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div style={{ padding: '8px 12px', background: 'rgba(42, 32, 16, 0.9)' }}>
        <span style={{ fontFamily: fonts.pixel, fontSize: '7px', color: colors.accent }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 12px',
        background: 'rgba(26, 18, 8, 0.8)',
        border: 'none',
        cursor: 'pointer',
        touchAction: 'manipulation',
      }}
    >
      <span style={{ fontFamily: fonts.pixel, fontSize: '8px', color: colors.text }}>{label}</span>
      <div
        style={{
          width: 36,
          height: 18,
          background: checked ? colors.success : colors.border,
          position: 'relative',
          transition: 'background 0.15s',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 20 : 2,
            width: 14,
            height: 14,
            background: colors.text,
            transition: 'left 0.15s',
          }}
        />
      </div>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 12px',
        background: 'rgba(26, 18, 8, 0.8)',
      }}
    >
      <span style={{ fontFamily: fonts.pixel, fontSize: '8px', color: colors.text }}>{label}</span>
      <span style={{ fontFamily: fonts.pixel, fontSize: '7px', color: colors.textSecondary }}>{value}</span>
    </div>
  );
}
