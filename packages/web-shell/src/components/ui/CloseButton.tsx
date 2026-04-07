import { useState } from 'react';
import { cn } from '../../utils/cn';

interface CloseButtonProps {
  onClick: () => void;
  className?: string;
}

export function CloseButton({ onClick, className }: CloseButtonProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      type="button"
      aria-label="닫기"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center bg-transparent border border-border cursor-pointer',
        'min-h-[44px] min-w-[44px]',
        'transition-all duration-100',
        'hover:opacity-80 active:scale-95 active:translate-x-[1px] active:translate-y-[1px]',
        className,
      )}
    >
      {imgError ? (
        <span className="font-pixel text-sm text-text-secondary select-none">✕</span>
      ) : (
        <img
          src="assets/ui/icon-close.webp"
          alt="닫기"
          width={16}
          height={16}
          className="[image-rendering:pixelated]"
          onError={() => setImgError(true)}
        />
      )}
    </button>
  );
}
