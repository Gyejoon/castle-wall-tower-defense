import { uiMobileArt } from '../../../assets/uiMobileArt';
import { useGameStore } from '../../../stores/gameStore';
import { PixelButton } from '../../ui/PixelButton';
import { FloatingNavButtons } from '../FloatingNavButtons';
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

			{/* Floating mission/achievement buttons */}
			<FloatingNavButtons />

			{/* Content overlay */}
			<div
				className="relative z-1 flex flex-col justify-end h-full p-4 gap-3"
				style={{
					background:
						'linear-gradient(180deg, transparent 0%, transparent 40%, rgba(26,18,8,0.7) 70%, rgba(26,18,8,0.92) 100%)',
				}}
			>
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
					<span className="inline-flex items-center gap-2">
						<img
							src="assets/ui/icon-sword.webp"
							alt=""
							width={16}
							height={16}
							className="[image-rendering:pixelated]"
						/>
						성벽 막기
					</span>
				</PixelButton>
			</div>
		</div>
	);
}
