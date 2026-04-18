import { EventBus } from '@gld/phaser-game';
import { useState } from 'react';

interface UpgradeChoice {
	id: string;
	name: string;
	description: string;
	icon: string;
}

interface UpgradePickOverlayProps {
	choices: UpgradeChoice[];
}

export function UpgradePickOverlay({ choices }: UpgradePickOverlayProps) {
	// One reroll per offering; we lock the button after tapping so the user
	// can't spam the event while the ad service is still resolving. The lock
	// releases when a new offering arrives (React remounts on a fresh
	// `choices` payload) or the overlay is dismissed.
	const [rerollLocked, setRerollLocked] = useState(false);

	const handlePick = (upgradeId: string) => {
		EventBus.emit('request-apply-upgrade', { upgradeId });
	};

	const handleReroll = () => {
		if (rerollLocked) return;
		setRerollLocked(true);
		EventBus.emit('request-upgrade-reroll');
	};

	return (
		<div
			className="absolute inset-0 z-[8] flex flex-col items-center justify-center"
			style={{
				background: 'var(--color-overlay-70)',
				animation: 'fadeIn 0.2s ease-out',
				touchAction: 'manipulation',
			}}
		>
			<h2 className="font-pixel text-[15px] text-gold mb-1">강화 선택</h2>
			<p className="font-pixel text-[10px] text-text-secondary mb-4">
				보스 클리어 보상
			</p>

			<div className="flex flex-col gap-3 w-full max-w-[320px] px-4">
				{choices.map((choice, idx) => (
					<button
						key={`${choice.id}:${idx}`}
						type="button"
						onClick={() => handlePick(choice.id)}
						className="flex items-center gap-3 bg-panel border border-border px-4 py-3 transition-all active:scale-95 hover:border-gold focus:border-gold outline-none"
					>
						<span
							className="text-2xl shrink-0"
							role="img"
							aria-label={choice.name}
						>
							{choice.icon}
						</span>
						<div className="text-left min-w-0">
							<div className="font-pixel text-[12px] text-gold">
								{choice.name}
							</div>
							<div className="font-pixel text-[10px] text-text-secondary">
								{choice.description}
							</div>
						</div>
					</button>
				))}
			</div>

			<button
				type="button"
				onClick={handleReroll}
				disabled={rerollLocked}
				className="mt-4 flex items-center gap-2 bg-panel/80 border border-border px-4 py-2 transition-all active:scale-95 hover:border-gold focus:border-gold outline-none disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<span className="text-lg" role="img" aria-label="광고">
					🎬
				</span>
				<span className="font-pixel text-[11px] text-text-primary">
					{rerollLocked ? '재뽑기 준비 중…' : '광고 보고 다시 뽑기'}
				</span>
			</button>
		</div>
	);
}
