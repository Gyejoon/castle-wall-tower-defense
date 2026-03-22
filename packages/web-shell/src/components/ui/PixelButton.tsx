import type { ButtonHTMLAttributes } from 'react';
import { colors } from '../../styles/tokens';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'gold';
}

const variantColors = {
  primary: colors.accent,
  danger: colors.danger,
  gold: colors.gold,
} as const;

export function PixelButton({ variant = 'primary', style, children, ...props }: PixelButtonProps) {
  const color = variantColors[variant];

  return (
    <button
      style={{
        fontFamily: "'Press Start 2P', cursive",
        fontSize: '10px',
        padding: '12px 24px',
        background: colors.panel,
        color: colors.text,
        border: `2px solid ${color}`,
        boxShadow: `4px 4px 0px ${color}`,
        cursor: 'pointer',
        transition: 'transform 0.1s, box-shadow 0.1s',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translate(2px, 2px)';
        e.currentTarget.style.boxShadow = `2px 2px 0px ${color}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translate(0, 0)';
        e.currentTarget.style.boxShadow = `4px 4px 0px ${color}`;
      }}
      {...props}
    >
      {children}
    </button>
  );
}
