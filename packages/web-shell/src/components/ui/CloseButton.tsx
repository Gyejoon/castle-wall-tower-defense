import { cn } from '../../utils/cn';

interface CloseButtonProps {
	onClick: () => void;
	className?: string;
}

export function CloseButton({ onClick, className }: CloseButtonProps) {
	return (
		<button
			type="button"
			aria-label="닫기"
			onClick={onClick}
			className={cn(
				'flex items-center justify-center bg-transparent border border-border cursor-pointer',
				'min-h-[44px] min-w-[44px] px-3',
				'transition-all duration-100',
				'hover:opacity-80 active:scale-95 active:translate-x-[1px] active:translate-y-[1px]',
				className,
			)}
		>
			<span className="font-pixel text-[10px] text-text-secondary select-none">
				닫기
			</span>
		</button>
	);
}
