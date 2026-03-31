import { uiMobileArt } from '../../assets/uiMobileArt';
import { MOCK_PROFILE } from '../../data/mockLobbyData';
import { colors, fonts } from '../../styles/tokens';

export function ProfileBar() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        background: 'rgba(42, 32, 16, 0.85)',
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      {/* Avatar + Nickname */}
      <img
        src={uiMobileArt.profileAvatar}
        alt="profile"
        width={36}
        height={36}
        style={{ imageRendering: 'pixelated', flexShrink: 0 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: '1 1 0' }}>
        <span
          style={{
            fontFamily: fonts.pixel,
            fontSize: '9px',
            color: colors.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {MOCK_PROFILE.nickname}
        </span>
        <span style={{ fontFamily: fonts.pixel, fontSize: '7px', color: colors.textSecondary }}>
          Lv.{MOCK_PROFILE.level}
        </span>
      </div>

      {/* Trophy */}
      <div className="profile-currency" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        <img
          src={uiMobileArt.trophyIcon}
          alt="trophy"
          width={18}
          height={18}
          style={{ imageRendering: 'pixelated' }}
        />
        <span style={{ fontFamily: fonts.pixel, fontSize: '8px', color: colors.accent }}>
          {MOCK_PROFILE.trophies.toLocaleString()}
        </span>
      </div>

      {/* Gold */}
      <div className="profile-currency" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        <img
          src={uiMobileArt.coinIcon}
          alt="gold"
          width={18}
          height={18}
          style={{ imageRendering: 'pixelated' }}
        />
        <span style={{ fontFamily: fonts.pixel, fontSize: '8px', color: colors.gold }}>
          {MOCK_PROFILE.gold.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
