interface BossWarningOverlayProps {
	visible: boolean;
}

export function BossWarningOverlay({ visible }: BossWarningOverlayProps) {
	if (!visible) return null;

	return (
		<div className="absolute inset-0 z-5 flex items-center justify-center bg-black/60">
			<div className="text-center font-pixel text-2xl text-[#ff4444] animate-[warningPulse_0.5s_ease-in-out_infinite]">
				⚠ WARNING ⚠
			</div>
		</div>
	);
}
