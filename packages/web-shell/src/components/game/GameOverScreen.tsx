import { colors } from '../../styles/tokens';
import { PixelButton } from '../ui/PixelButton';

interface GameOverScreenProps {
	runStatus: 'victory' | 'defeat';
	gameOverStats: {
		wavesCleared: number;
		towersPlaced: number;
		timeSurvivedSec: number;
		goldEarned: number;
		xpEarned: number;
		selectedStar?: 1 | 2 | 3;
		starCleared?: boolean;
	} | null;
	onRestart: () => void;
	onLobby: () => void;
}

export function GameOverScreen({
	runStatus,
	gameOverStats,
	onRestart,
	onLobby,
}: GameOverScreenProps) {
	return (
		<div
			className="absolute inset-0 z-[10] flex items-center justify-center p-5"
			style={{ background: 'rgba(10, 8, 4, 0.88)' }}
		>
			<div
				className="flex w-[min(100%,360px)] flex-col gap-4 p-5 text-center"
				style={{
					background: 'rgba(26, 14, 6, 0.98)',
					border: `2px solid ${runStatus === 'victory' ? colors.success : colors.danger}`,
					boxShadow: `0 0 24px ${runStatus === 'victory' ? 'rgba(80,200,80,0.3)' : 'rgba(200,60,60,0.3)'}, 6px 6px 0px ${colors.border}`,
				}}
			>
				{/* 배너 */}
				<div
					className="py-3 -mx-5 -mt-5 flex flex-col items-center gap-1"
					style={{
						background:
							runStatus === 'victory'
								? 'rgba(40,80,40,0.8)'
								: 'rgba(80,20,20,0.8)',
						borderBottom: `1px solid ${runStatus === 'victory' ? colors.success : colors.danger}`,
					}}
				>
					<span
						className="font-pixel text-2xl"
						style={{
							color: runStatus === 'victory' ? colors.success : colors.danger,
						}}
					>
						{runStatus === 'victory' ? '⚔ 방어 성공 ⚔' : '✕ 방어 실패 ✕'}
					</span>
					<span className="font-pixel text-[11px] text-text-secondary">
						{runStatus === 'defeat'
							? `웨이브 ${gameOverStats?.wavesCleared ?? '?'}에서 돌파당했습니다`
							: gameOverStats?.wavesCleared === 10
								? '✨ 완벽한 방어! 왕국을 성공적으로 지켜냈습니다!'
								: '왕국을 성공적으로 지켜냈습니다!'}
					</span>
				</div>

				{/* Star clear result */}
				{gameOverStats?.selectedStar != null && runStatus === 'victory' && (
					<div
						className="flex items-center justify-center gap-2 py-2 -mx-5 animate-[fadeSlideIn_0.5s_ease-out_0.3s_both]"
						style={{
							background: gameOverStats.starCleared
								? 'rgba(200,160,74,0.15)'
								: 'rgba(80,20,20,0.3)',
							borderBottom: `1px solid ${gameOverStats.starCleared ? colors.gold : 'rgba(200,60,60,0.3)'}`,
						}}
					>
						<div className="flex gap-[2px]">
							{Array.from({ length: gameOverStats.selectedStar }, (_, i) => (
								<img
									key={`star-${i}`}
									src={
										gameOverStats.starCleared
											? 'assets/ui/icon-star-active.png'
											: 'assets/ui/icon-star-inactive.png'
									}
									alt={gameOverStats.starCleared ? '★' : '☆'}
									width={14}
									height={14}
									className="[image-rendering:pixelated]"
									style={{
										animation: gameOverStats.starCleared
											? `starPop 0.3s ease-out ${0.5 + i * 0.15}s both`
											: undefined,
									}}
								/>
							))}
						</div>
						<span
							className="font-pixel text-[10px]"
							style={{
								color: gameOverStats.starCleared ? colors.gold : colors.danger,
							}}
						>
							{gameOverStats.starCleared
								? `★${gameOverStats.selectedStar} 클리어!`
								: `★${gameOverStats.selectedStar} 조건 미달`}
						</span>
					</div>
				)}

				{/* 스탯 그리드 */}
				<div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2 text-left">
					<div
						className="flex flex-col gap-0.5 px-3 py-2"
						style={{
							background: 'rgba(0,0,0,0.3)',
							border: '1px solid rgba(255,255,255,0.08)',
						}}
					>
						<span className="font-pixel text-[10px] text-text-secondary">
							클리어 웨이브
						</span>
						<span className="font-pixel text-sm text-text">
							{gameOverStats?.wavesCleared ?? 0} / 10
						</span>
					</div>
					<div
						className="flex flex-col gap-0.5 px-3 py-2"
						style={{
							background: 'rgba(0,0,0,0.3)',
							border: '1px solid rgba(255,255,255,0.08)',
						}}
					>
						<span className="font-pixel text-[10px] text-text-secondary">
							배치한 타워
						</span>
						<span className="font-pixel text-sm text-text">
							{gameOverStats?.towersPlaced ?? 0}
						</span>
					</div>
					<div
						className="flex flex-col gap-0.5 px-3 py-2"
						style={{
							background: 'rgba(0,0,0,0.3)',
							border: '1px solid rgba(255,255,255,0.08)',
						}}
					>
						<span className="font-pixel text-[10px] text-text-secondary">
							생존 시간
						</span>
						<span className="font-pixel text-sm text-text">
							{(() => {
								const s = gameOverStats?.timeSurvivedSec ?? 0;
								const h = Math.floor(s / 3600);
								const m = Math.floor((s % 3600) / 60);
								const sec = s % 60;
								return h > 0
									? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
									: `${m}:${String(sec).padStart(2, '0')}`;
							})()}
						</span>
					</div>
					<div
						className="flex flex-col gap-0.5 px-3 py-2"
						style={{
							background: 'rgba(0,0,0,0.3)',
							border: '1px solid rgba(255,255,255,0.08)',
						}}
					>
						<span className="font-pixel text-[10px] text-text-secondary">
							획득 골드
						</span>
						<span className="font-pixel text-sm text-gold">
							{gameOverStats?.goldEarned ?? 0}G
						</span>
					</div>
				</div>

				{/* XP */}
				<div
					className="flex items-center justify-center gap-2 py-1.5"
					style={{
						background: 'rgba(20,30,80,0.5)',
						border: '1px solid rgba(100,150,255,0.2)',
					}}
				>
					<span className="font-pixel text-[11px] text-text-secondary">
						획득 XP
					</span>
					<span className="font-pixel text-base text-info">
						+{gameOverStats?.xpEarned ?? 0}
					</span>
				</div>

				{/* 버튼 */}
				<PixelButton
					variant="gold"
					style={{ width: '100%' }}
					onClick={onRestart}
				>
					다시 시작
				</PixelButton>
				<PixelButton
					variant="secondary"
					style={{ width: '100%' }}
					onClick={onLobby}
				>
					로비로 돌아가기
				</PixelButton>
			</div>
		</div>
	);
}
