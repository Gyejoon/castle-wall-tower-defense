import { uiMobileArt } from '../../../assets/uiMobileArt';
import { useGameStore } from '../../../stores/gameStore';
import { PixelButton } from '../../ui/PixelButton';
import { TabBackground } from '../TabBackground';

export function HomeTab() {
	const enterStageSelect = useGameStore((s) => s.enterStageSelect);

	return (
		<div
			id="tabpanel-home"
			role="tabpanel"
			aria-label="마당"
			className="relative flex-1 overflow-hidden"
		>
			{/* Background scene */}
			<TabBackground
				src={uiMobileArt.courtyardBg}
				gradient="linear-gradient(180deg, #0d1a2a 0%, #14233a 50%, #1a1208 100%)"
			/>
			{/* Ambient animations */}
			<div className="torch torch-left" />
			<div className="torch torch-right" />
			<div className="castle-flag" />
			<div className="stars-overlay" />

			{/* Content overlay */}
			<div
				className="relative z-1 flex flex-col justify-end h-full p-4 gap-3"
				style={{
					background:
						'linear-gradient(180deg, transparent 0%, transparent 40%, rgba(26,18,8,0.7) 70%, rgba(26,18,8,0.92) 100%)',
				}}
			>
				{/* Battle CTA card */}
				<div className="flex flex-col gap-2 p-3.5 bg-[rgba(42,32,16,0.9)] border-2 border-gold shadow-[0_0_20px_rgba(240,208,96,0.15),4px_4px_0px_#4a3a20]">
					<span className="font-pixel text-[15px] text-text">성벽 막기</span>

					<PixelButton
						variant="gold"
						onClick={() => enterStageSelect()}
						style={{
							width: '100%',
							padding: '14px 20px',
							fontSize: '15px',
							boxShadow:
								'0 0 0 1px rgba(240,208,96,0.28), 0 12px 24px rgba(240,208,96,0.14)',
						}}
					>
						게임 시작
					</PixelButton>
				</div>
			</div>
		</div>
	);
}
