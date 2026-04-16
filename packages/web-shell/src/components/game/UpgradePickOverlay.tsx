import { EventBus } from '@gld/phaser-game';

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
	const handlePick = (upgradeId: string) => {
		EventBus.emit('request-apply-upgrade', { upgradeId });
	};

	return (
		<div
			className="absolute inset-0 z-[8] flex flex-col items-center justify-center"
			style={{
				background: 'rgba(0, 0, 0, 0.7)',
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
		</div>
	);
}
