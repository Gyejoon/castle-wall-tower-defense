import { colors } from '../../styles/tokens';

const TOAST_BG = 'rgba(42,32,16,0.94)';

const TOAST_COLOR_MAP: Record<string, string> = {
	success: colors.success,
	warning: colors.gold,
	error: colors.danger,
	info: colors.info,
};

function getToastStyle(tone: 'info' | 'success' | 'warning' | 'error') {
	const accent = TOAST_COLOR_MAP[tone] ?? colors.info;
	return { color: accent, background: TOAST_BG, border: accent };
}

interface ToastNotificationProps {
	toast: {
		message: React.ReactNode;
		tone: 'info' | 'success' | 'warning' | 'error';
	} | null;
}

export function ToastNotification({ toast }: ToastNotificationProps) {
	if (!toast) return null;

	const style = getToastStyle(toast.tone);

	return (
		<div
			className="absolute top-3 left-1/2 z-[4] max-w-[min(80vw,280px)] -translate-x-1/2 px-3 py-2 text-center font-pixel text-xs shadow-[3px_3px_0px_rgba(0,0,0,0.28)]"
			style={{
				border: `2px solid ${style.border}`,
				background: style.background,
				color: style.color,
			}}
		>
			{toast.message}
		</div>
	);
}
